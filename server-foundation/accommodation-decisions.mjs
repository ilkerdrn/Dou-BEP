/** v2.17: pseudonymous, synthetic-only accommodation decision registry.
 * Never enter real candidate numbers, names, diagnoses or medical documentation.
 * An approval confirms a local workflow action, not a real institutional entitlement.
 */
import {randomUUID,createHash} from 'node:crypto';
import {ADJUSTMENTS} from '../batch-accommodations.mjs';
import {roleCan} from '../roles.mjs';
import {calculateExamWindow,beginExamBreak,endExamBreak,inspectExamBreakLimits} from './exam-time-policy.mjs';
import {evaluateBepRelease} from './live-release-readiness.mjs';
import {createSyntheticBindingRepository} from './synthetic-session-bindings.mjs';
import {createSyntheticPermitRepository} from './synthetic-session-permits.mjs';
const TERM=/^20\d{2}-(GUZ|BAHAR|YAZ)$/;
const COURSE=/^[A-Z][A-Z0-9_-]{1,23}$/;
const CODE=/^(?:KOD|ORNEK|TEST|DEMO|ANON)-[A-Z0-9_-]{2,24}$/;
const ID=/^[a-f0-9-]{36}$/;
const ALLOWED=['term','courseCode','examLabel','candidateCode','adjustments','extraMinutes'];
function fail(message){throw Error(message);}
export function normalizeDecision(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!ALLOWED.includes(k)))fail('Yalnızca onaylı anonim alanlar kullanılabilir; ad/tanı/sağlık bilgisi yasaktır.');
 const term=String(raw.term??'').trim().toUpperCase();if(!TERM.test(term))fail('Akademik dönem geçersiz.');
 const courseCode=String(raw.courseCode??'').trim().toUpperCase();if(!COURSE.test(courseCode))fail('Ders kodu geçersiz.');
 const examLabel=String(raw.examLabel??'').trim().toUpperCase();if(!COURSE.test(examLabel))fail('Sınav etiketi geçersiz.');
 const candidateCode=String(raw.candidateCode??'').trim().toUpperCase();if(!CODE.test(candidateCode))fail('Sadece KOD-, ORNEK-, TEST-, DEMO- veya ANON- ile başlayan yapay kodlar kabul edilir.');
 if(!Array.isArray(raw.adjustments)||raw.adjustments.length>11||raw.adjustments.some(k=>typeof k!=='string'||!Object.hasOwn(ADJUSTMENTS,k))||new Set(raw.adjustments).size!==raw.adjustments.length)fail('Düzenleme kodları geçersiz veya yineleniyor.');
 const adjustments=[...raw.adjustments].sort();
 const extraMinutes=raw.extraMinutes;
 if(!Number.isInteger(extraMinutes)||extraMinutes<0||extraMinutes>120)fail('Ek süre 0–120 dakika olmalıdır.');
 if(!adjustments.length&&extraMinutes===0)fail('En az bir düzenleme veya pozitif ek süre gerekli.');
 return {term,courseCode,examLabel,candidateCode,adjustments,extraMinutes};
}
const digest=d=>createHash('sha256').update(JSON.stringify(d)).digest('hex');
function rowData(row){return {term:row.term,courseCode:row.course_code,examLabel:row.exam_label,candidateCode:row.candidate_code,adjustments:JSON.parse(row.adjustments),extraMinutes:row.extra_minutes};}
export function createDecisionRepository(db,{StoreError,log}){
 const error=(code,message,status=400)=>{throw new StoreError(code,message,status);};
 const permit=(a,p)=>{if(!a||!roleCan(a.role,p))error('forbidden','Bu işlem için yetkiniz yok.',403);};
 db.exec(`CREATE TABLE IF NOT EXISTS accommodation_decisions (
  id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),creator_id TEXT NOT NULL REFERENCES members(id),last_editor_id TEXT NOT NULL REFERENCES members(id),
  term TEXT NOT NULL,course_code TEXT NOT NULL,exam_label TEXT NOT NULL,candidate_code TEXT NOT NULL,
  adjustments TEXT NOT NULL,extra_minutes INTEGER NOT NULL,revision INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK(status IN ('draft','approved','revoked')),
  content_sha256 TEXT NOT NULL,approved_sha256 TEXT,approved_by TEXT REFERENCES members(id),approved_at INTEGER,
  created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,
  UNIQUE(tenant_id,term,course_code,exam_label,candidate_code)
 );
 CREATE INDEX IF NOT EXISTS idx_accommodation_tenant ON accommodation_decisions(tenant_id,term,course_code,exam_label);
 CREATE TABLE IF NOT EXISTS accommodation_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,tenant_id TEXT NOT NULL,decision_id TEXT NOT NULL,
  revision INTEGER NOT NULL,actor_id TEXT NOT NULL,event TEXT NOT NULL,content_sha256 TEXT NOT NULL,created_at INTEGER NOT NULL
 );
 CREATE INDEX IF NOT EXISTS idx_accommodation_events ON accommodation_events(tenant_id,decision_id,id);`);
 function select(actor,id){if(!ID.test(id||''))error('bad_id','Geçersiz karar kodu.');const row=db.prepare('SELECT * FROM accommodation_decisions WHERE id=? AND tenant_id=?').get(id,actor.tenantId);if(!row)error('missing','Karar bulunamadı.',404);return row;}
 function view(r){const data=rowData(r);return {...data,id:r.id,revision:r.revision,status:r.status,creatorId:r.creator_id,lastEditorId:r.last_editor_id,approvedBy:r.approved_by,approvedAt:r.approved_at,updatedAt:r.updated_at,contentSha256:r.content_sha256,approvedSha256:r.approved_sha256};}
 function event(actor,r,type){db.prepare('INSERT INTO accommodation_events(tenant_id,decision_id,revision,actor_id,event,content_sha256,created_at) VALUES(?,?,?,?,?,?,?)').run(actor.tenantId,r.id,r.revision,actor.id,type,r.content_sha256,Date.now());log(actor,'accommodation.'+type,r.id);}
 function list(actor){permit(actor,'accommodation.view');return db.prepare('SELECT * FROM accommodation_decisions WHERE tenant_id=? ORDER BY updated_at DESC LIMIT 500').all(actor.tenantId).map(view);}
 function history(actor,id){permit(actor,'accommodation.view');select(actor,id);return db.prepare('SELECT revision,actor_id AS actorId,event,content_sha256 AS contentSha256,created_at AS createdAt FROM accommodation_events WHERE tenant_id=? AND decision_id=? ORDER BY id ASC LIMIT 100').all(actor.tenantId,id);}
 function create(actor,input){permit(actor,'accommodation.manage');let data;try{data=normalizeDecision(input);}catch(e){error('invalid_decision',e.message,422);}
  if(db.prepare('SELECT COUNT(*) AS n FROM accommodation_decisions WHERE tenant_id=?').get(actor.tenantId).n>=500)error('quota','Anonim karar kotası doldu.',409);
  const id=randomUUID(),at=Date.now(),hash=digest(data);db.exec('BEGIN IMMEDIATE');
  try{db.prepare(`INSERT INTO accommodation_decisions(id,tenant_id,creator_id,last_editor_id,term,course_code,exam_label,candidate_code,adjustments,extra_minutes,revision,status,content_sha256,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,1,'draft',?,?,?)`)
   .run(id,actor.tenantId,actor.id,actor.id,data.term,data.courseCode,data.examLabel,data.candidateCode,JSON.stringify(data.adjustments),data.extraMinutes,hash,at,at);
   event(actor,select(actor,id),'created');db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');if(e.code==='ERR_SQLITE_ERROR')error('duplicate','Bu anonim kod ve ders-sınav için zaten bir karar var.',409);throw e;}
  return view(select(actor,id));
 }
 function update(actor,id,input){permit(actor,'accommodation.manage');const previous=select(actor,id);
  if(!Number.isInteger(input?.revision)||input.revision!==previous.revision)error('revision_conflict','Karar başka oturumda değişmiş, yeniden yükleyin.',409);
  let data;try{const {revision,...rest}=input;data=normalizeDecision(rest);}catch(e){error('invalid_decision',e.message,422);}
  const newHash=digest(data);
  if(newHash===previous.content_sha256)return view(previous);
  // An approved decision cannot be silently edited: any change clears approval.
  db.exec('BEGIN IMMEDIATE');try{const result=db.prepare(`UPDATE accommodation_decisions SET term=?,course_code=?,exam_label=?,candidate_code=?,adjustments=?,extra_minutes=?,revision=revision+1,status='draft',approved_sha256=NULL,approved_by=NULL,approved_at=NULL,last_editor_id=?,content_sha256=?,updated_at=? WHERE id=? AND tenant_id=? AND revision=?`)
   .run(data.term,data.courseCode,data.examLabel,data.candidateCode,JSON.stringify(data.adjustments),data.extraMinutes,actor.id,newHash,Date.now(),id,actor.tenantId,input.revision);
   if(!result.changes)error('revision_conflict','Sürüm değişmiş.',409);event(actor,select(actor,id),'updated');db.exec('COMMIT');}
  catch(e){db.exec('ROLLBACK');if(e.code==='ERR_SQLITE_ERROR')error('duplicate','Bu anonim kod için kayıt mevcut.',409);throw e;}
  return view(select(actor,id));
 }
 function approve(actor,id,revision){permit(actor,'accommodation.approve');const prior=select(actor,id);
  if(!Number.isInteger(revision)||prior.revision!==revision)error('revision_conflict','Onaylamak istediğiniz sürüm güncel değil.',409);
  if(prior.last_editor_id===actor.id)error('separation_of_duties','Kararı giren kullanıcı aynı kararı onaylayamaz.',403);
  if(prior.status!=='draft')error('invalid_status','Yalnızca taslak karar onaylanabilir.',409);
  const hash=digest(rowData(prior));if(hash!==prior.content_sha256)error('integrity','Kararın içerik bütünlüğü uyuşmuyor.',409);
  db.exec('BEGIN IMMEDIATE');try{const result=db.prepare("UPDATE accommodation_decisions SET status='approved',approved_sha256=?,approved_by=?,approved_at=?,updated_at=? WHERE id=? AND tenant_id=? AND revision=? AND status='draft'")
   .run(hash,actor.id,Date.now(),Date.now(),id,actor.tenantId,revision);
   if(!result.changes)error('revision_conflict','Karar güncellendi.',409);event(actor,select(actor,id),'approved');db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
  return view(select(actor,id));
 }
 function revoke(actor,id,revision){permit(actor,'accommodation.approve');const prior=select(actor,id);
  if(!Number.isInteger(revision)||prior.revision!==revision)error('revision_conflict','Karar sürümü değişmiş.',409);
  if(prior.status!=='approved')error('invalid_status','Yalnızca onaylı karar iptal edilebilir.',409);
  db.exec('BEGIN IMMEDIATE');try{db.prepare("UPDATE accommodation_decisions SET status='revoked',approved_sha256=NULL,approved_by=NULL,approved_at=NULL,updated_at=? WHERE id=? AND tenant_id=? AND revision=?")
   .run(Date.now(),id,actor.tenantId,revision);event(actor,select(actor,id),'revoked');db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
  return view(select(actor,id));
 }
 function durationPreview(actor,id,coordinationId=null){
  permit(actor,'accommodation.view');
  if(coordinationId!==null&&(typeof coordinationId!=='string'||!ID.test(coordinationId)))
   error('bad_id','Geçersiz koordinasyon oturumu kimliği.',400);
  const decision=select(actor,id),data=rowData(decision);
  if(decision.status!=='approved'||!decision.approved_at||!decision.approved_by||
     decision.approved_sha256!==decision.content_sha256||digest(data)!==decision.content_sha256)
   return {ready:false,reason:'decision_not_approved',message:'Bu kararın onayı veya içerik bütünlüğü doğrulanamadı. Süre planı uygulanamaz.'};
  // Multiple sittings are never auto-selected. An explicitly selected sitting
  // must match tenant, term, course and exam label exactly.
  const matches=coordinationId
   ?db.prepare(`SELECT id,starts_at,duration_minutes,exam_id,exam_revision FROM exam_coordination
     WHERE tenant_id=? AND term=? AND course_code=? AND exam_label=? AND id=?`)
     .all(actor.tenantId,data.term,data.courseCode,data.examLabel,coordinationId)
   :db.prepare(`SELECT id,starts_at,duration_minutes,exam_id,exam_revision FROM exam_coordination
     WHERE tenant_id=? AND term=? AND course_code=? AND exam_label=?
     ORDER BY starts_at ASC LIMIT 25`).all(actor.tenantId,data.term,data.courseCode,data.examLabel);
  if(matches.length!==1)return {ready:false,reason:coordinationId?'session_mismatch':matches.length?'ambiguous_session':'session_missing',
   message:coordinationId?'Seçilen oturum kararın dönemi, dersi ve sınavıyla eşleşmiyor.':matches.length?'Bu ders ve sınav için birden fazla oturum var. Süreyi hesaplamak için koordinasyon oturumunu açıkça seçin.':'Bu karar için eşleşen sınav koordinasyon oturumu yok.',
   ...(!coordinationId&&matches.length?{choices:matches.map(m=>({id:m.id,startsAt:m.starts_at,baseMinutes:m.duration_minutes}))}:{})};
  const sitting=matches[0];
  if(!sitting.exam_id||!Number.isInteger(sitting.exam_revision))
   return {ready:false,reason:'exam_unmapped',message:'Koordinasyon oturumu onaylı bir sınav sürümüne bağlı değil.'};
  const exam=db.prepare('SELECT status,revision FROM exams WHERE id=? AND tenant_id=?')
   .get(sitting.exam_id,actor.tenantId);
  if(!exam||exam.status!=='approved'||exam.revision!==sitting.exam_revision)
   return {ready:false,reason:'exam_not_ready',message:'Bağlı sınav onaylı değil veya sürümü değişmiş.'};
  const baseMinutes=sitting.duration_minutes;
  const totalMinutes=baseMinutes+data.extraMinutes;
  return {ready:true,reason:'verified_preview',decisionId:decision.id,decisionRevision:decision.revision,
   coordinationId:sitting.id,startsAt:sitting.starts_at,baseMinutes,extraMinutes:data.extraMinutes,totalMinutes,
   message:'Onaylı anonim karar ve eşleşen sınav için planlama önizlemesi. Öğrenciye otomatik süre verilmez.'};
 }
 // Planning-only assignment snapshot: not a student entitlement or pilot clock.
 // Always revalidate against the live approved decision and exam before display.
 db.exec(`CREATE TABLE IF NOT EXISTS accommodation_time_plans(
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  decision_id TEXT NOT NULL REFERENCES accommodation_decisions(id),
  coordination_id TEXT NOT NULL REFERENCES exam_coordination(id),
  decision_revision INTEGER NOT NULL, decision_sha256 TEXT NOT NULL,
  base_minutes INTEGER NOT NULL, extra_minutes INTEGER NOT NULL,
  total_minutes INTEGER NOT NULL, exam_id TEXT NOT NULL REFERENCES exams(id),
  exam_revision INTEGER NOT NULL, created_by TEXT NOT NULL REFERENCES members(id),
  created_at INTEGER NOT NULL,
  UNIQUE(tenant_id,decision_id,coordination_id)
 );CREATE INDEX IF NOT EXISTS idx_time_plans_tenant ON accommodation_time_plans(tenant_id,created_at);`);
 db.exec(`CREATE TABLE IF NOT EXISTS accommodation_time_plan_approvals(
  plan_id TEXT PRIMARY KEY REFERENCES accommodation_time_plans(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  status TEXT NOT NULL CHECK(status IN ('approved','revoked')),
  approved_by TEXT NOT NULL REFERENCES members(id),
  approved_at INTEGER NOT NULL,
  revoked_by TEXT REFERENCES members(id),
  revoked_at INTEGER
 );
 CREATE TABLE IF NOT EXISTS accommodation_time_plan_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,plan_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,event TEXT NOT NULL,created_at INTEGER NOT NULL
 );
 CREATE INDEX IF NOT EXISTS idx_time_plan_events ON accommodation_time_plan_events(tenant_id,plan_id,id);`);
 function planView(actor,row){
  const preview=durationPreview(actor,row.decision_id,row.coordination_id);
  const sitting=db.prepare('SELECT exam_id,exam_revision FROM exam_coordination WHERE tenant_id=? AND id=?')
   .get(actor.tenantId,row.coordination_id);
  const valid=preview.ready&&preview.decisionRevision===row.decision_revision&&
   preview.baseMinutes===row.base_minutes&&preview.extraMinutes===row.extra_minutes&&
   preview.totalMinutes===row.total_minutes&&sitting?.exam_id===row.exam_id&&
   sitting?.exam_revision===row.exam_revision&&
   db.prepare('SELECT content_sha256 FROM accommodation_decisions WHERE tenant_id=? AND id=?')
    .get(actor.tenantId,row.decision_id)?.content_sha256===row.decision_sha256;
  const approval=db.prepare('SELECT * FROM accommodation_time_plan_approvals WHERE tenant_id=? AND plan_id=?')
   .get(actor.tenantId,row.id);
  const approvalStatus=!approval?'pending':approval.status==='revoked'?'revoked':valid?'approved':'stale';
  return {id:row.id,decisionId:row.decision_id,coordinationId:row.coordination_id,
   startsAt:preview.ready?preview.startsAt:null,
   baseMinutes:row.base_minutes,extraMinutes:row.extra_minutes,totalMinutes:row.total_minutes,
   createdAt:row.created_at,status:valid?'verified':'recheck',
   approvalStatus,approvedAt:approval?.approved_at??null,
   canApprove:valid&&!approval&&roleCan(actor.role,'accommodation.approve')&&row.created_by!==actor.id,
   canRevoke:approval?.status==='approved'&&roleCan(actor.role,'accommodation.approve'),
   message:valid?'Onaylı süre planı doğrulandı. Öğrenci süresine uygulanmadı.':'Karar veya sınav değişmiş. Plan yeniden incelenmeli; öğrenciye uygulanamaz.'};
 }
 function planCreate(actor,decisionId,coordinationId){
  permit(actor,'accommodation.manage');
  if(typeof coordinationId!=='string'||!ID.test(coordinationId))
   error('bad_id','Koordinasyon oturumunu açıkça seçin.');
  const preview=durationPreview(actor,decisionId,coordinationId);
  if(!preview.ready)error('not_ready',preview.message,409);
  const decision=select(actor,decisionId);
  const sitting=db.prepare('SELECT exam_id,exam_revision FROM exam_coordination WHERE tenant_id=? AND id=?')
   .get(actor.tenantId,coordinationId);
  if(db.prepare('SELECT COUNT(*) AS n FROM accommodation_time_plans WHERE tenant_id=?').get(actor.tenantId).n>=500)
   error('quota','Kurumun planlama kaydı sınırı doldu.',409);
  const id=randomUUID();
  try{
   db.prepare(`INSERT INTO accommodation_time_plans(
    id,tenant_id,decision_id,coordination_id,decision_revision,decision_sha256,
    base_minutes,extra_minutes,total_minutes,exam_id,exam_revision,created_by,created_at
   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id,actor.tenantId,decisionId,coordinationId,decision.revision,decision.content_sha256,
      preview.baseMinutes,preview.extraMinutes,preview.totalMinutes,sitting.exam_id,sitting.exam_revision,actor.id,Date.now());
  }catch(e){
   if((e.code==='ERR_SQLITE_CONSTRAINT_UNIQUE'||e.code==='ERR_SQLITE_ERROR')&&/^UNIQUE constraint failed: accommodation_time_plans\.tenant_id, accommodation_time_plans\.decision_id, accommodation_time_plans\.coordination_id$/.test(e.message||''))error('duplicate','Bu karar ve oturum için plan zaten kaydedilmiş.',409);
   throw e;
  }
  log(actor,'accommodation.time_plan.created',id);
  return planView(actor,db.prepare('SELECT * FROM accommodation_time_plans WHERE tenant_id=? AND id=?').get(actor.tenantId,id));
 }
 function planApprove(actor,id){
  permit(actor,'accommodation.approve');
  if(!ID.test(id||''))error('bad_id','Geçersiz plan kimliği.');
  const row=db.prepare('SELECT * FROM accommodation_time_plans WHERE tenant_id=? AND id=?').get(actor.tenantId,id);
  if(!row)error('missing','Süre planı bulunamadı.',404);
  if(row.created_by===actor.id)error('separation_of_duties','Planı oluşturan kişi kendi planını onaylayamaz.',403);
  const current=planView(actor,row);
  if(current.status!=='verified')error('not_ready','Süre planı artık geçerli değil. Yeniden inceleyin.',409);
  const existing=db.prepare('SELECT status FROM accommodation_time_plan_approvals WHERE tenant_id=? AND plan_id=?')
   .get(actor.tenantId,id);
  if(existing)error('already_reviewed','Plan daha önce onaylanmış veya iptal edilmiş.',409);
  db.exec('BEGIN IMMEDIATE');
  try{
   // Prevent duplicate concurrent approvals and preserve a trace of who approved.
   const stamp=Date.now();
   db.prepare(`INSERT INTO accommodation_time_plan_approvals(plan_id,tenant_id,status,approved_by,approved_at)
    VALUES(?,?,'approved',?,?)`).run(id,actor.tenantId,actor.id,stamp);
   db.prepare(`INSERT INTO accommodation_time_plan_events(tenant_id,plan_id,actor_id,event,created_at)
    VALUES(?,?,?,'approved',?)`).run(actor.tenantId,id,actor.id,stamp);
   db.exec('COMMIT');
  }catch(err){db.exec('ROLLBACK');if(/UNIQUE constraint failed: accommodation_time_plan_approvals\.plan_id/.test(err.message||''))
   error('already_reviewed','Plan başka oturumda onaylanmış.',409);throw err;}
  log(actor,'accommodation.time_plan.approved',id);
  return planView(actor,row);
 }
 function planRevoke(actor,id){
  permit(actor,'accommodation.approve');
  if(!ID.test(id||''))error('bad_id','Geçersiz plan kimliği.');
  const row=db.prepare('SELECT * FROM accommodation_time_plans WHERE tenant_id=? AND id=?').get(actor.tenantId,id);
  if(!row)error('missing','Süre planı bulunamadı.',404);
  db.exec('BEGIN IMMEDIATE');
  try{
   const stamp=Date.now();
   const updated=db.prepare(`UPDATE accommodation_time_plan_approvals
    SET status='revoked',revoked_by=?,revoked_at=?
    WHERE tenant_id=? AND plan_id=? AND status='approved'`).run(actor.id,stamp,actor.tenantId,id);
   if(!updated.changes)error('invalid_status','Yalnızca onaylanmış plan iptal edilebilir.',409);
   db.prepare(`INSERT INTO accommodation_time_plan_events(tenant_id,plan_id,actor_id,event,created_at)
    VALUES(?,?,?,'revoked',?)`).run(actor.tenantId,id,actor.id,stamp);
   db.exec('COMMIT');
  }catch(err){db.exec('ROLLBACK');throw err;}
  log(actor,'accommodation.time_plan.revoked',id);
  return planView(actor,row);
 }
 function planReleaseReadiness(actor,id){
  permit(actor,'accommodation.view');
  if(typeof id!=='string'||!ID.test(id))error('bad_id','Geçersiz plan kimliği.');
  const row=db.prepare('SELECT * FROM accommodation_time_plans WHERE tenant_id=? AND id=?')
   .get(actor.tenantId,id);
  if(!row)error('missing','Süre planı bulunamadı.',404);
  const item=planView(actor,row);
  // No live readiness flags can be supplied through this API; all future
  // prerequisites must be determined independently by server-owned systems.
  return {planId:id,...evaluateBepRelease({
   planStatus:item.status,approvalStatus:item.approvalStatus,
   coordinationVerified:item.status==='verified'
  })};
 }
 function planWindowPreview(actor,id){
  permit(actor,'accommodation.view');
  if(!ID.test(id||''))error('bad_id','Geçersiz plan kimliği.');
  const row=db.prepare('SELECT * FROM accommodation_time_plans WHERE tenant_id=? AND id=?')
   .get(actor.tenantId,id);
  if(!row)error('missing','Süre planı bulunamadı.',404);
  const state=planView(actor,row);
  if(state.approvalStatus!=='approved'||state.status!=='verified')
   error('not_ready','Yalnızca bağımsız onaylı ve geçerli planın süre hesabı önizlenebilir.',409);
  // A hypothetical start at server now: no learner claim, no pause permission,
  // no actual exam session, no entitlement and no database update.
  const startedAt=Date.now();
  return {planId:id,mode:'simulation_only',window:calculateExamWindow({
   startedAt,totalMinutes:row.total_minutes,pauses:[],breaksAllowed:false,now:startedAt
  }),message:'Bu hesap yalnızca başlangıç anı varsayımıdır; gerçek sınav başlamadı ve süre atanmadı.'};
 }
 // Synthetic execution rehearsal only; never references pilot_sessions or student tokens.
 db.exec(`CREATE TABLE IF NOT EXISTS accommodation_time_simulations(
  id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),
  plan_id TEXT NOT NULL REFERENCES accommodation_time_plans(id),
  started_at INTEGER NOT NULL,total_minutes INTEGER NOT NULL,
  breaks_allowed INTEGER NOT NULL CHECK(breaks_allowed IN (0,1)),
  pauses_json TEXT NOT NULL DEFAULT '[]',version INTEGER NOT NULL DEFAULT 1,
  started_by TEXT NOT NULL REFERENCES members(id),
  UNIQUE(tenant_id,plan_id)
 );
 CREATE TABLE IF NOT EXISTS accommodation_time_simulation_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,tenant_id TEXT NOT NULL,simulation_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,event TEXT NOT NULL,created_at INTEGER NOT NULL
 );`);
 // Immutable local simulation closure; does not touch pilot sessions.
 db.exec(`CREATE TABLE IF NOT EXISTS accommodation_time_simulation_closures(
  simulation_id TEXT PRIMARY KEY REFERENCES accommodation_time_simulations(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  closed_by TEXT NOT NULL REFERENCES members(id),
  closed_at INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK(reason IN ('limit_review','plan_invalid','elapsed','operator_stopped')),
  final_version INTEGER NOT NULL
 );`);
 // Frozen, integrity-checked closing summary; separate table preserves old SQLite files.
 db.exec(`CREATE TABLE IF NOT EXISTS accommodation_time_simulation_summaries(
  simulation_id TEXT PRIMARY KEY REFERENCES accommodation_time_simulations(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  summary_json TEXT NOT NULL,
  summary_sha256 TEXT NOT NULL
 );`);
 function simulationSummary(actor,id){
  const row=db.prepare('SELECT summary_json,summary_sha256 FROM accommodation_time_simulation_summaries WHERE tenant_id=? AND simulation_id=?')
   .get(actor.tenantId,id);
  if(!row)return null;
  const verified=digestString(row.summary_json)===row.summary_sha256;
  if(!verified)return {integrity:'failed',message:'Kapanış özeti bütünlüğü doğrulanamadı.'};
  try{return {integrity:'verified',...JSON.parse(row.summary_json)};}
  catch{return {integrity:'failed',message:'Kapanış özeti okunamıyor.'};}
 }
 function digestString(value){return createHash('sha256').update(value).digest('hex');}
 function buildClosingSummary(row,at,reason){
  const pauses=JSON.parse(row.pauses_json);
  const completedMs=pauses.reduce((acc,p)=>acc+Math.max(0,(p.endedAt??at)-p.startedAt),0);
  const policy=inspectExamBreakLimits({startedAt:row.started_at,pauses,now:at,breaksAllowed:Boolean(row.breaks_allowed)});
  let remainingMs=null,plannedEnd=null;
  if(!policy.reviewRequired){
   try{
    const calculated=calculateExamWindow({startedAt:row.started_at,totalMinutes:row.total_minutes,
     breaksAllowed:Boolean(row.breaks_allowed),pauses,now:at});
    remainingMs=calculated.remainingMs;plannedEnd=calculated.plannedEnd;
   }catch{/* No authoritative deadline for an invalid history. */}
  }
  return {startedAt:row.started_at,closedAt:at,totalDurationMinutes:row.total_minutes,
   pauseCount:pauses.length,completedPauseMs:completedMs,
   openPauseAtClosure:pauses.some(p=>p.endedAt===null),
   plannedEnd,remainingMs,reviewRequired:reason==='limit_review'||reason==='plan_invalid'||policy.reviewRequired,
   reason,mode:'simulation_only',studentEntitlement:false};
 }
 function simulationRow(actor,id){
  if(!ID.test(id||''))error('bad_id','Geçersiz simülasyon kimliği.');
  const row=db.prepare('SELECT * FROM accommodation_time_simulations WHERE tenant_id=? AND id=?').get(actor.tenantId,id);
  if(!row)error('missing','Simülasyon bulunamadı.',404);
  return row;
 }
 function simulationClosure(actor,id){
  return db.prepare('SELECT reason,closed_by AS closedBy,closed_at AS closedAt,final_version AS finalVersion FROM accommodation_time_simulation_closures WHERE tenant_id=? AND simulation_id=?')
   .get(actor.tenantId,id);
 }
 function simulationRead(actor,row){
  const closure=simulationClosure(actor,row.id);
  if(closure)return {id:row.id,planId:row.plan_id,version:row.version,
   status:'closed',closure,summary:simulationSummary(actor,row.id),breaksAllowed:Boolean(row.breaks_allowed),
   message:'Yerel simülasyon denetim kaydıyla kapatıldı. Öğrenci oturumuna uygulanmadı.'};
  const plan=db.prepare('SELECT * FROM accommodation_time_plans WHERE tenant_id=? AND id=?').get(actor.tenantId,row.plan_id);
  const valid=plan&&planView(actor,plan).approvalStatus==='approved';
  const now=Date.now(),pauses=JSON.parse(row.pauses_json);
  if(valid&&pauses.length){
   const limits=inspectExamBreakLimits({
    startedAt:row.started_at,pauses,now,breaksAllowed:Boolean(row.breaks_allowed)
   });
   if(limits.reviewRequired)return {id:row.id,planId:row.plan_id,version:row.version,
    status:'break_limit_review',limitReason:limits.reason,breaksAllowed:Boolean(row.breaks_allowed),
    message:'Mola sınırı aşıldı veya mola geçmişi geçersiz. Yeni süre verilmez; yetkili incelemesi gerekli.'};
  }
  let window;
  try{window=calculateExamWindow({startedAt:row.started_at,totalMinutes:row.total_minutes,
    breaksAllowed:Boolean(row.breaks_allowed),pauses,now});}
  catch(e){return {id:row.id,planId:row.plan_id,version:row.version,status:'review_required',
   message:'Mola sınırı veya veri tutarlılığı kontrolü başarısız. Manuel inceleme gerekli.'};}
  return {id:row.id,planId:row.plan_id,version:row.version,status:valid?window.phase:'review_required',
   breaksAllowed:Boolean(row.breaks_allowed),window,
   message:valid?'Yalnızca yerel simülasyon; öğrenci oturumu değişmedi.':'Onay veya sınav geçerliliği değişti; simülasyon durduruldu.'};
 }
 function simulationStart(actor,planId){
  permit(actor,'accommodation.manage');
  if(!ID.test(planId||''))error('bad_id','Geçersiz süre planı kimliği.');
  const plan=db.prepare('SELECT * FROM accommodation_time_plans WHERE tenant_id=? AND id=?').get(actor.tenantId,planId);
  if(!plan)error('missing','Süre planı bulunamadı.',404);
  if(planView(actor,plan).approvalStatus!=='approved')error('not_ready','Sadece geçerli ve bağımsız onaylı plan simüle edilebilir.',409);
  const decision=select(actor,plan.decision_id);
  const breaksAllowed=rowData(decision).adjustments.includes('BREAKS');
  const id=randomUUID(),stamp=Date.now();
  db.exec('BEGIN IMMEDIATE');
  try{
   db.prepare(`INSERT INTO accommodation_time_simulations(
    id,tenant_id,plan_id,started_at,total_minutes,breaks_allowed,pauses_json,started_by
   ) VALUES(?,?,?,?,?,?,'[]',?)`).run(id,actor.tenantId,planId,stamp,plan.total_minutes,Number(breaksAllowed),actor.id);
   db.prepare(`INSERT INTO accommodation_time_simulation_events(tenant_id,simulation_id,actor_id,event,created_at)
    VALUES(?,?,?,'started',?)`).run(actor.tenantId,id,actor.id,stamp);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');
   if(/UNIQUE constraint failed: accommodation_time_simulations\.tenant_id, accommodation_time_simulations\.plan_id/.test(e.message||''))
    error('duplicate','Bu plan için simülasyon zaten başlatılmış.',409);
   throw e;
  }
  log(actor,'accommodation.simulation.started',id);
  return simulationRead(actor,simulationRow(actor,id));
 }
 function simulationAction(actor,id,action,version){
  permit(actor,'accommodation.manage');
  if(action!=='pause'&&action!=='resume')error('bad_action','Geçersiz mola işlemi.',422);
  if(!Number.isInteger(version)||version<1)error('bad_version','Güncel simülasyon sürümü gerekli.',422);
  const row=simulationRow(actor,id);
  if(simulationClosure(actor,id))error('closed','Kapatılmış simülasyonda mola işlemi yapılamaz.',409);
  if(row.version!==version)error('revision_conflict','Simülasyon başka oturumda değişti.',409);
  const current=simulationRead(actor,row);
  if(current.status==='review_required'||current.status==='break_limit_review')error('not_ready','Simülasyon yeniden incelenmeli; mola işlemi ve otomatik süre uzatması yapılamaz.',409);
  const now=Date.now(),pauses=JSON.parse(row.pauses_json);
  let next;
  try{
   const input={startedAt:row.started_at,totalMinutes:row.total_minutes,breaksAllowed:Boolean(row.breaks_allowed),pauses};
   next=action==='pause'?beginExamBreak(input,now):endExamBreak(input,now);
  }catch(e){error('invalid_break',e.message,409);}
  db.exec('BEGIN IMMEDIATE');
  try{
   const changed=db.prepare(`UPDATE accommodation_time_simulations SET pauses_json=?,version=version+1
    WHERE tenant_id=? AND id=? AND version=?`).run(JSON.stringify(next),actor.tenantId,id,version);
   if(!changed.changes)error('revision_conflict','Simülasyon güncellendi.',409);
   db.prepare(`INSERT INTO accommodation_time_simulation_events(tenant_id,simulation_id,actor_id,event,created_at)
    VALUES(?,?,?,?,?)`).run(actor.tenantId,id,actor.id,action==='pause'?'paused':'resumed',now);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  log(actor,'accommodation.simulation.'+action,id);
  return simulationRead(actor,simulationRow(actor,id));
 }
 function simulationClose(actor,id,version){
  permit(actor,'accommodation.manage');
  if(!Number.isInteger(version)||version<1)error('bad_version','Güncel sürüm gerekli.',422);
  const row=simulationRow(actor,id);
  if(simulationClosure(actor,id))error('closed','Simülasyon zaten kapatılmış.',409);
  if(row.version!==version)error('revision_conflict','Simülasyon sürümü güncel değil.',409);
  const current=simulationRead(actor,row);
  const reason=current.status==='break_limit_review'?'limit_review':
   current.status==='review_required'?'plan_invalid':
   current.status==='expired'?'elapsed':'operator_stopped';
  const at=Date.now();
  db.exec('BEGIN IMMEDIATE');
  try{
   const updated=db.prepare(`UPDATE accommodation_time_simulations SET version=version+1
    WHERE tenant_id=? AND id=? AND version=?`).run(actor.tenantId,id,version);
   if(!updated.changes)error('revision_conflict','Simülasyon başka oturumda değişti.',409);
   db.prepare(`INSERT INTO accommodation_time_simulation_closures
    (simulation_id,tenant_id,closed_by,closed_at,reason,final_version) VALUES(?,?,?,?,?,?)`)
    .run(id,actor.tenantId,actor.id,at,reason,version+1);
   const snapshot=JSON.stringify(buildClosingSummary(row,at,reason));
   db.prepare(`INSERT INTO accommodation_time_simulation_summaries
    (simulation_id,tenant_id,summary_json,summary_sha256) VALUES(?,?,?,?)`)
    .run(id,actor.tenantId,snapshot,digestString(snapshot));
   db.prepare(`INSERT INTO accommodation_time_simulation_events
    (tenant_id,simulation_id,actor_id,event,created_at) VALUES(?,?,?,?,?)`)
    .run(actor.tenantId,id,actor.id,'closed:'+reason,at);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');if(/UNIQUE constraint failed: accommodation_time_simulation_closures\.simulation_id/.test(e.message||''))
   error('closed','Simülasyon zaten kapatılmış.',409);throw e;}
  log(actor,'accommodation.simulation.closed',id);
  return simulationRead(actor,simulationRow(actor,id));
 }
 function simulationReport(actor,id){
  permit(actor,'accommodation.view');
  const row=simulationRow(actor,id);
  const item=simulationRead(actor,row);
  const events=db.prepare(`SELECT event,actor_id AS actorId,created_at AS createdAt FROM accommodation_time_simulation_events
   WHERE tenant_id=? AND simulation_id=? ORDER BY id ASC LIMIT 100`).all(actor.tenantId,id);
  return {mode:'simulation_only',item,events,studentEntitlement:false};
 }
 function simulationList(actor){
  permit(actor,'accommodation.view');
  return db.prepare('SELECT * FROM accommodation_time_simulations WHERE tenant_id=? ORDER BY started_at DESC LIMIT 100')
   .all(actor.tenantId).map(row=>simulationRead(actor,row));
 }
 function planList(actor){
  permit(actor,'accommodation.view');
  return db.prepare('SELECT * FROM accommodation_time_plans WHERE tenant_id=? ORDER BY created_at DESC LIMIT 100')
   .all(actor.tenantId).map(row=>planView(actor,row));
 }
 const syntheticBindings=createSyntheticBindingRepository(db,{StoreError,roleCan,log,
  planState:(actor,id)=>{
   const plan=db.prepare('SELECT * FROM accommodation_time_plans WHERE tenant_id=? AND id=?').get(actor.tenantId,id);
   return plan?planView(actor,plan):null;
  }
 });
 const syntheticPermits=createSyntheticPermitRepository(db,{StoreError,roleCan,log,
  bindingState:(actor,id)=>{
   const binding=syntheticBindings.syntheticBindingList(actor).find(x=>x.id===id);
   return binding??null;
  }
 });
 function verifyBatch(actor,rows){permit(actor,'accommodation.verify');if(!Array.isArray(rows)||!rows.length||rows.length>100)error('invalid_batch','1–100 anonim kayıt gereklidir.',422);
  const seen=new Set(),results=[];
  for(const input of rows){let data;try{data=normalizeDecision(input);}catch(e){error('invalid_batch',e.message,422);}
   const key=[data.term,data.courseCode,data.examLabel,data.candidateCode].join('::');if(seen.has(key))error('invalid_batch','Tekrarlı anonim kayıt.',422);seen.add(key);
   const found=db.prepare('SELECT * FROM accommodation_decisions WHERE tenant_id=? AND term=? AND course_code=? AND exam_label=? AND candidate_code=?')
    .get(actor.tenantId,data.term,data.courseCode,data.examLabel,data.candidateCode);
   const exact=found&&found.status==='approved'&&found.approved_sha256===found.content_sha256&&found.content_sha256===digest(data);
   results.push({term:data.term,courseCode:data.courseCode,examLabel:data.examLabel,candidateCode:data.candidateCode,approved:Boolean(exact),reason:!found?'not_registered':found.status!=='approved'?'not_approved':exact?'':'mismatch'});
  }
  return {ok:results.every(r=>r.approved),total:results.length,approved:results.filter(r=>r.approved).length,results};
 }
 return {...syntheticBindings,...syntheticPermits,accommodationList:list,accommodationHistory:history,accommodationCreate:create,accommodationUpdate:update,accommodationApprove:approve,accommodationRevoke:revoke,accommodationVerifyBatch:verifyBatch,accommodationDurationPreview:durationPreview,accommodationTimePlanCreate:planCreate,accommodationTimePlanList:planList,accommodationTimePlanApprove:planApprove,accommodationTimePlanRevoke:planRevoke,accommodationTimePlanWindowPreview:planWindowPreview,accommodationTimePlanReleaseReadiness:planReleaseReadiness,accommodationSimulationStart:simulationStart,accommodationSimulationList:simulationList,accommodationSimulationAction:simulationAction,accommodationSimulationClose:simulationClose,accommodationSimulationReport:simulationReport};
}
