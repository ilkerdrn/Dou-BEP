/** Local synthetic authorization handoff. Not a student token or time entitlement. */
import {randomBytes,createHash,randomUUID} from 'node:crypto';
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
   now>=row.expires_at?'expired':!bindingValid(actor,row.binding_id)?'stale':'issued';
  return {id:row.id,bindingId:row.binding_id,mode:'synthetic_permit_only',
   studentEntitlement:false,studentSessionCreated:false,
   status:state,issuedAt:row.issued_at,expiresAt:row.expires_at,
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
  if(typeof oneTimeSecret!=='string'||!/^[a-f0-9]{64}$/.test(oneTimeSecret))
   fail('invalid_secret','Geçerli tek kullanımlık kod gerekli.',422);
  if(row.revoked_at||row.consumed_at||Date.now()>=row.expires_at)
   fail('not_available','İzin süresi dolmuş, iptal edilmiş veya kullanılmış.',409);
  if(!bindingValid(actor,row.binding_id))fail('not_ready','Yapay bağlantı geçersizleşmiş.',409);
  if(digest(oneTimeSecret)!==row.token_sha256)fail('invalid_secret','Kod doğrulanamadı.',403);
  const at=Date.now();
  db.exec('BEGIN IMMEDIATE');
  try{
   const updated=db.prepare(`UPDATE accommodation_synthetic_permits SET consumed_by=?,consumed_at=?
    WHERE tenant_id=? AND id=? AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at>?`)
    .run(actor.id,at,actor.tenantId,id,at);
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
 function history(actor,id){
  access(actor,'accommodation.view');select(actor,id);
  return {mode:'synthetic_permit_only',studentEntitlement:false,
   events:db.prepare('SELECT event,created_at AS createdAt FROM accommodation_synthetic_permit_events WHERE tenant_id=? AND permit_id=? ORDER BY id LIMIT 100').all(actor.tenantId,id)};
 }
 return {syntheticPermitIssue:issue,syntheticPermitConsume:consume,
  syntheticPermitRevoke:revoke,syntheticPermitList:list,syntheticPermitHistory:history};
}
