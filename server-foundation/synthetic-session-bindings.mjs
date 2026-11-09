/** Synthetic, institution-scoped linkage rehearsal.
 * Deliberately cannot bind a real student, pilot code, or login session.
 */
import {randomUUID} from 'node:crypto';
export function createSyntheticBindingRepository(db,{StoreError,roleCan,log,planState}){
 const fail=(code,message,status=400)=>{throw new StoreError(code,message,status);};
 const access=(actor,permission)=>{if(!actor||!roleCan(actor.role,permission))fail('forbidden','Bu işlem için yetkiniz yok.',403);};
 const ID=/^[a-f0-9-]{36}$/;
 db.exec(`CREATE TABLE IF NOT EXISTS accommodation_synthetic_bindings(
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  plan_id TEXT NOT NULL REFERENCES accommodation_time_plans(id),
  created_by TEXT NOT NULL REFERENCES members(id),
  created_at INTEGER NOT NULL,
  approved_by TEXT REFERENCES members(id),
  approved_at INTEGER,
  revoked_by TEXT REFERENCES members(id),
  revoked_at INTEGER,
  UNIQUE(tenant_id,plan_id)
 );
 CREATE TABLE IF NOT EXISTS accommodation_synthetic_binding_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  binding_id TEXT NOT NULL REFERENCES accommodation_synthetic_bindings(id),
  actor_id TEXT NOT NULL REFERENCES members(id),
  event TEXT NOT NULL,
  created_at INTEGER NOT NULL
 );`);
 // A separate pin table keeps existing SQLite schemas intact. Missing legacy pins fail closed.
 db.exec(`CREATE TABLE IF NOT EXISTS accommodation_synthetic_binding_pins(
  binding_id TEXT PRIMARY KEY REFERENCES accommodation_synthetic_bindings(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  coordination_id TEXT NOT NULL REFERENCES exam_coordination(id),
  starts_at TEXT NOT NULL, exam_id TEXT NOT NULL, exam_revision INTEGER NOT NULL
 );`);
 const sittingPin=(actor,id)=>db.prepare(`SELECT starts_at,exam_id,exam_revision
  FROM exam_coordination WHERE tenant_id=? AND id=?`).get(actor.tenantId,id);
 const recordedPin=(actor,id)=>db.prepare(`SELECT coordination_id,starts_at,exam_id,exam_revision
  FROM accommodation_synthetic_binding_pins WHERE tenant_id=? AND binding_id=?`).get(actor.tenantId,id);
 const pinValid=(actor,r,plan)=>{
  const pin=recordedPin(actor,r.id);
  if(!pin||!plan||pin.coordination_id!==plan.coordinationId)return false;
  const live=sittingPin(actor,pin.coordination_id);
  return Boolean(live&&live.starts_at===pin.starts_at&&live.exam_id===pin.exam_id&&live.exam_revision===pin.exam_revision);
 };
 const row=(actor,id)=>{if(typeof id!=='string'||!ID.test(id))fail('bad_id','Geçersiz bağlantı kimliği.');
  const found=db.prepare('SELECT * FROM accommodation_synthetic_bindings WHERE tenant_id=? AND id=?').get(actor.tenantId,id);
  if(!found)fail('missing','Anonim bağlantı kaydı bulunamadı.',404);
  return found;
 };
 const view=(actor,r)=>{
  const plan=planState(actor,r.plan_id);
  const valid=plan?.status==='verified'&&plan?.approvalStatus==='approved'&&pinValid(actor,r,plan);
  return {id:r.id,planId:r.plan_id,mode:'synthetic_binding_only',studentEntitlement:false,
   status:r.revoked_at?'revoked':!valid?'stale':r.approved_at?'approved':'pending',
   createdAt:r.created_at,approvedAt:r.approved_at,revokedAt:r.revoked_at,
   message:'Yapay oturum eşleştirmesi. Gerçek öğrenciye süre uygulanmaz.'};
 };
 function create(actor,planId,coordinationId){
  access(actor,'accommodation.manage');
  if(typeof planId!=='string'||!ID.test(planId))fail('bad_id','Geçersiz plan kimliği.');
  const state=planState(actor,planId);
  if(!state)fail('missing','Süre planı bulunamadı.',404);
  if(state.status!=='verified'||state.approvalStatus!=='approved')
   fail('not_ready','Onaylı ve güncel süre planı gerekli.',409);
  if(typeof coordinationId!=='string'||!ID.test(coordinationId)||coordinationId!==state.coordinationId)
   fail('session_mismatch','Süre planıyla aynı sınav oturumunu açıkça seçin.',409);
  const pin=sittingPin(actor,coordinationId);
  if(!pin||!pin.starts_at||!pin.exam_id||!Number.isInteger(pin.exam_revision))
   fail('not_ready','Güncel, kaynak sınavı onaylı oturum bulunamadı.',409);
  const id=randomUUID(),at=Date.now();
  db.exec('BEGIN IMMEDIATE');
  try{
   db.prepare('INSERT INTO accommodation_synthetic_bindings(id,tenant_id,plan_id,created_by,created_at) VALUES(?,?,?,?,?)')
    .run(id,actor.tenantId,planId,actor.id,at);
   db.prepare(`INSERT INTO accommodation_synthetic_binding_pins
    (binding_id,tenant_id,coordination_id,starts_at,exam_id,exam_revision) VALUES(?,?,?,?,?,?)`)
    .run(id,actor.tenantId,coordinationId,pin.starts_at,pin.exam_id,pin.exam_revision);
   db.prepare('INSERT INTO accommodation_synthetic_binding_events(tenant_id,binding_id,actor_id,event,created_at) VALUES(?,?,?,?,?)')
    .run(actor.tenantId,id,actor.id,'created',at);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');
   if(/UNIQUE constraint failed: accommodation_synthetic_bindings\.tenant_id, accommodation_synthetic_bindings\.plan_id/.test(e.message||''))
    fail('duplicate','Bu planın zaten bir yapay bağlantısı var.',409);
   throw e;
  }
  log(actor,'accommodation.synthetic_binding.created',id);
  return view(actor,row(actor,id));
 }
 function decide(actor,id,action){
  access(actor,'accommodation.approve');
  if(!['approve','revoke'].includes(action))fail('bad_action','İşlem geçersiz.',422);
  const r=row(actor,id);
  if(action==='approve'&&r.created_by===actor.id)
   fail('separation_of_duties','Hazırlayan kişi kendi bağlantısını onaylayamaz.',403);
  if(action==='approve'&&r.approved_at)fail('already_reviewed','Bağlantı önceden incelendi.',409);
  if(r.revoked_at)fail('revoked','İptal edilmiş bağlantı tekrar açılamaz.',409);
  if(action==='revoke'&&!r.approved_at)fail('not_approved','Yalnızca onaylanmış bağlantı iptal edilebilir.',409);
  if(action==='approve'){
   const plan=planState(actor,r.plan_id);
   if(!plan||plan.status!=='verified'||plan.approvalStatus!=='approved'||!pinValid(actor,r,plan))
    fail('not_ready','Plan veya sabitlenen sınav oturumu değişmiş.',409);
  }
  const at=Date.now();
  db.exec('BEGIN IMMEDIATE');
  try{
   const stmt=action==='approve'?
    'UPDATE accommodation_synthetic_bindings SET approved_by=?,approved_at=? WHERE tenant_id=? AND id=? AND approved_at IS NULL AND revoked_at IS NULL':
    'UPDATE accommodation_synthetic_bindings SET revoked_by=?,revoked_at=? WHERE tenant_id=? AND id=? AND approved_at IS NOT NULL AND revoked_at IS NULL';
   const update=db.prepare(stmt).run(actor.id,at,actor.tenantId,id);
   if(!update.changes)fail('revision_conflict','Bağlantı başka işlemde değişti.',409);
   db.prepare('INSERT INTO accommodation_synthetic_binding_events(tenant_id,binding_id,actor_id,event,created_at) VALUES(?,?,?,?,?)')
    .run(actor.tenantId,id,actor.id,action==='approve'?'approved':'revoked',at);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  log(actor,'accommodation.synthetic_binding.'+action,id);
  return view(actor,row(actor,id));
 }
 function list(actor){
  access(actor,'accommodation.view');
  return db.prepare('SELECT * FROM accommodation_synthetic_bindings WHERE tenant_id=? ORDER BY created_at DESC LIMIT 100')
   .all(actor.tenantId).map(r=>view(actor,r));
 }
 function history(actor,id){
  access(actor,'accommodation.view');row(actor,id);
  return {mode:'synthetic_binding_only',studentEntitlement:false,
   events:db.prepare('SELECT event,created_at AS createdAt FROM accommodation_synthetic_binding_events WHERE tenant_id=? AND binding_id=? ORDER BY id ASC LIMIT 100').all(actor.tenantId,id)};
 }
 return {syntheticBindingCreate:create,syntheticBindingDecide:decide,syntheticBindingList:list,syntheticBindingHistory:history};
}
