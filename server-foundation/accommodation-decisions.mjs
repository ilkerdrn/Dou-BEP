/** v2.17: pseudonymous, synthetic-only accommodation decision registry.
 * Never enter real candidate numbers, names, diagnoses or medical documentation.
 * An approval confirms a local workflow action, not a real institutional entitlement.
 */
import {randomUUID,createHash} from 'node:crypto';
import {ADJUSTMENTS} from '../batch-accommodations.mjs';
import {roleCan} from '../roles.mjs';
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
 return {accommodationList:list,accommodationHistory:history,accommodationCreate:create,accommodationUpdate:update,accommodationApprove:approve,accommodationRevoke:revoke,accommodationVerifyBatch:verifyBatch,accommodationDurationPreview:durationPreview};
}
