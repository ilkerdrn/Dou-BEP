/** Local synthetic authorization handoff. Not a student token or time entitlement. */
import {randomBytes,createHash,randomUUID,timingSafeEqual} from 'node:crypto';
const digest=value=>createHash('sha256').update(value).digest('hex');
const ID=/^[a-f0-9-]{36}$/;
const LIFETIME_MS=5*60*1000;
export function createSyntheticPermitRepository(db,{StoreError,roleCan,log,bindingState}){
 const fail=(code,message,status=400)=>{throw new StoreError(code,message,status);};
 const access=(actor,permission)=>{if(!actor||!roleCan(actor.role,permission))fail('forbidden','Yetkiniz yok.',403);};
 db.exec(`CREATE TABLE IF NOT EXISTS accommodation_synthetic_permits(
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  binding_id TEXT NOT NULL REFERENCES accommodation_synthetic_bindings(id),
  token_sha256 TEXT NOT NULL UNIQUE,issued_by TEXT NOT NULL REFERENCES members(id),
  issued_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
  consumed_by TEXT REFERENCES members(id),consumed_at INTEGER,
  revoked_by TEXT REFERENCES members(id),revoked_at INTEGER,
  UNIQUE(tenant_id,binding_id)
 );
 CREATE TABLE IF NOT EXISTS accommodation_synthetic_permit_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,tenant_id TEXT NOT NULL,
  permit_id TEXT NOT NULL REFERENCES accommodation_synthetic_permits(id),
  actor_id TEXT NOT NULL REFERENCES members(id),event TEXT NOT NULL,created_at INTEGER NOT NULL
 );`);
 db.exec(`CREATE TABLE IF NOT EXISTS accommodation_synthetic_permit_attempts(
  permit_id TEXT PRIMARY KEY REFERENCES accommodation_synthetic_permits(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK(failed_count BETWEEN 0 AND 5),
  last_failed_at INTEGER
 );`);
 const failures=(actor,id)=>db.prepare('SELECT failed_count FROM accommodation_synthetic_permit_attempts WHERE tenant_id=? AND permit_id=?')
  .get(actor.tenantId,id)?.failed_count??0;
 const recordFailure=(actor,id,at)=>{
  db.exec('BEGIN IMMEDIATE');
  try{
   db.prepare(`INSERT INTO accommodation_synthetic_permit_attempts(permit_id,tenant_id,failed_count,last_failed_at)
    VALUES(?,?,1,?) ON CONFLICT(permit_id) DO UPDATE SET
    failed_count=MIN(5,failed_count+1),last_failed_at=excluded.last_failed_at
    WHERE tenant_id=excluded.tenant_id`).run(id,actor.tenantId,at);
   db.prepare(`INSERT INTO accommodation_synthetic_permit_events
    (tenant_id,permit_id,actor_id,event,created_at) VALUES(?,?,?,?,?)`)
    .run(actor.tenantId,id,actor.id,'rejected_code',at);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
 };
 const select=(actor,id)=>{
  if(typeof id!=='string'||!ID.test(id))fail('bad_id','Geçersiz izin kimliği.',422);
  const result=db.prepare('SELECT * FROM accommodation_synthetic_permits WHERE tenant_id=? AND id=?')
   .get(actor.tenantId,id);
  if(!result)fail('missing','Yapay izin kaydı bulunamadı.',404);
  return result;
 };
 const bindingValid=(actor,id)=>bindingState(actor,id)?.status==='approved';
 const view=(actor,row)=>{
  const now=Date.now();
  const state=row.revoked_at?'revoked':row.consumed_at?'consumed':
   now>=row.expires_at?'expired':failures(actor,row.id)>=5?'locked':
   !bindingValid(actor,row.binding_id)?'stale':'issued';
  return {id:row.id,bindingId:row.binding_id,mode:'synthetic_permit_only',
   studentEntitlement:false,studentSessionCreated:false,
   status:state,failedAttempts:failures(actor,row.id),maxAttempts:5,issuedAt:row.issued_at,expiresAt:row.expires_at,
   consumedAt:row.consumed_at,revokedAt:row.revoked_at};
 };
 function issue(actor,bindingId){
  access(actor,'accommodation.manage');
  if(typeof bindingId!=='string'||!ID.test(bindingId))fail('bad_id','Geçersiz bağlantı kimliği.',422);
  if(!bindingValid(actor,bindingId))fail('not_ready','Onaylı ve geçerli yapay bağlantı gerekli.',409);
  const secret=randomBytes(32).toString('hex'),id=randomUUID(),at=Date.now();
  db.exec('BEGIN IMMEDIATE');
  try{
   db.prepare(`INSERT INTO accommodation_synthetic_permits
    (id,tenant_id,binding_id,token_sha256,issued_by,issued_at,expires_at)
    VALUES(?,?,?,?,?,?,?)`).run(id,actor.tenantId,bindingId,digest(secret),actor.id,at,at+LIFETIME_MS);
   db.prepare('INSERT INTO accommodation_synthetic_permit_events(tenant_id,permit_id,actor_id,event,created_at) VALUES(?,?,?,?,?)')
    .run(actor.tenantId,id,actor.id,'issued',at);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');
   if(/UNIQUE constraint failed: accommodation_synthetic_permits\.tenant_id, accommodation_synthetic_permits\.binding_id/.test(e.message||''))
    fail('duplicate','Bu yapay bağlantı için izin zaten oluşturuldu.',409);
   throw e;
  }
  log(actor,'accommodation.synthetic_permit.issued',id);
  return {item:view(actor,select(actor,id)),oneTimeSecret:secret};
 }
 function consume(actor,id,oneTimeSecret){
  access(actor,'accommodation.approve');
  const row=select(actor,id);
  if(row.issued_by===actor.id)fail('separation_of_duties','İzni oluşturan yetkili kendi iznini kullanamaz.',403);
  const atCheck=Date.now();
  if(row.revoked_at||row.consumed_at||atCheck>=row.expires_at)
   fail('not_available','İzin süresi dolmuş, iptal edilmiş veya kullanılmış.',409);
  if(failures(actor,id)>=5)fail('attempts_exceeded','Beş başarısız denemeden sonra yapay izin kilitlendi.',409);
  if(!bindingValid(actor,row.binding_id))fail('not_ready','Yapay bağlantı geçersizleşmiş.',409);
  const syntaxOk=typeof oneTimeSecret==='string'&&/^[a-f0-9]{64}$/.test(oneTimeSecret);
  const provided=syntaxOk?Buffer.from(digest(oneTimeSecret),'hex'):Buffer.alloc(32);
  const correct=timingSafeEqual(provided,Buffer.from(row.token_sha256,'hex'));
  if(!syntaxOk||!correct){
   recordFailure(actor,id,atCheck);
   fail('invalid_secret','Kod doğrulanamadı.',403);
  }
  const at=Date.now();
  db.exec('BEGIN IMMEDIATE');
  try{
   const updated=db.prepare(`UPDATE accommodation_synthetic_permits SET consumed_by=?,consumed_at=?
    WHERE tenant_id=? AND id=? AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at>?
    AND NOT EXISTS (SELECT 1 FROM accommodation_synthetic_permit_attempts a
     WHERE a.permit_id=? AND a.tenant_id=? AND a.failed_count>=5)`)
    .run(actor.id,at,actor.tenantId,id,at,id,actor.tenantId);
   if(!updated.changes)fail('not_available','İzin artık kullanılamaz.',409);
   db.prepare('INSERT INTO accommodation_synthetic_permit_events(tenant_id,permit_id,actor_id,event,created_at) VALUES(?,?,?,?,?)')
    .run(actor.tenantId,id,actor.id,'consumed',at);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  log(actor,'accommodation.synthetic_permit.consumed',id);
  return view(actor,select(actor,id));
 }
 function revoke(actor,id){
  access(actor,'accommodation.approve');
  const row=select(actor,id);
  const at=Date.now();
  if(row.revoked_at||row.consumed_at||at>=row.expires_at)
   fail('not_available','İzin kullanılmış, iptal edilmiş veya süresi dolmuş.',409);
  db.exec('BEGIN IMMEDIATE');
  try{
   const updated=db.prepare(`UPDATE accommodation_synthetic_permits SET revoked_by=?,revoked_at=?
    WHERE tenant_id=? AND id=? AND revoked_at IS NULL AND consumed_at IS NULL AND expires_at>?`)
    .run(actor.id,at,actor.tenantId,id,at);
   if(!updated.changes)fail('not_available','İzin başka oturumda değiştirildi.',409);
   db.prepare('INSERT INTO accommodation_synthetic_permit_events(tenant_id,permit_id,actor_id,event,created_at) VALUES(?,?,?,?,?)')
    .run(actor.tenantId,id,actor.id,'revoked',at);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  log(actor,'accommodation.synthetic_permit.revoked',id);
  return view(actor,select(actor,id));
 }
 function list(actor){
  access(actor,'accommodation.view');
  return db.prepare('SELECT * FROM accommodation_synthetic_permits WHERE tenant_id=? ORDER BY issued_at DESC LIMIT 100')
   .all(actor.tenantId).map(row=>view(actor,row));
 }
 function overview(actor){
  access(actor,'accommodation.view');
  const rows=db.prepare(`SELECT p.*,COALESCE(a.failed_count,0) AS failed_count
   FROM accommodation_synthetic_permits p LEFT JOIN accommodation_synthetic_permit_attempts a
    ON a.permit_id=p.id AND a.tenant_id=p.tenant_id
   WHERE p.tenant_id=? ORDER BY p.issued_at DESC LIMIT 100`).all(actor.tenantId);
  const result={issued:0,consumed:0,revoked:0,expired:0,stale:0,locked:0};
  let failedAttempts=0;
  for(const permit of rows){
   const item=view(actor,permit);
   if(!Object.hasOwn(result,item.status))fail('invalid_status','Bilinmeyen yapay izin durumu.',500);
   result[item.status]++;
   failedAttempts+=permit.failed_count;
  }
  return {scope:'synthetic_only',studentEntitlement:false,limit:100,
   total:rows.length,failedAttempts,statusCounts:result,
   note:'Yalnızca son 100 anonim yapay izin; tüm kurum kayıtlarının toplamı değildir.'};
 }
 function auditExport(actor){
  access(actor,'accommodation.view');
  const rows=db.prepare(`SELECT * FROM accommodation_synthetic_permits
   WHERE tenant_id=? ORDER BY issued_at DESC,id DESC LIMIT 100`).all(actor.tenantId);
  const counts=db.prepare(`SELECT event,COUNT(*) AS n FROM accommodation_synthetic_permit_events
   WHERE tenant_id=? AND permit_id=? GROUP BY event`);
  return {scope:'synthetic_only',studentEntitlement:false,limit:100,
   items:rows.map(r=>{
    const item=view(actor,r);
    const eventCounts={issued:0,rejected_code:0,consumed:0,revoked:0};
    for(const record of counts.all(actor.tenantId,r.id)){
     if(Object.hasOwn(eventCounts,record.event))eventCounts[record.event]=record.n;
    }
    return {status:item.status,studentEntitlement:false,
     issuedAt:item.issuedAt,expiresAt:item.expiresAt,failedAttempts:item.failedAttempts,eventCounts};
   })};
 }
 function history(actor,id){
  access(actor,'accommodation.view');select(actor,id);
  return {mode:'synthetic_permit_only',studentEntitlement:false,
   events:db.prepare('SELECT event,created_at AS createdAt FROM accommodation_synthetic_permit_events WHERE tenant_id=? AND permit_id=? ORDER BY id LIMIT 100').all(actor.tenantId,id)};
 }
 return {syntheticPermitIssue:issue,syntheticPermitConsume:consume,
  syntheticPermitRevoke:revoke,syntheticPermitList:list,syntheticPermitOverview:overview,syntheticPermitAuditExport:auditExport,syntheticPermitHistory:history};
}
