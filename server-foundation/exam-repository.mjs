/** Durable, tenant-scoped anonymous exam drafts. Never store learner identities. */
import {randomUUID, createHash} from 'node:crypto';
import {normalizeExam} from '../core.mjs';
import {reviewExam} from '../quality.mjs';
import {roleCan} from '../roles.mjs';
import {detectSensitive} from '../bep-plan-import.mjs';
import {deliveryReadiness,makeDeliveryPackage} from './delivery-package.mjs';

const identifier=/^[a-f0-9-]{36}$/;
export function examRepository(db,{StoreError,log,requireIndependentExamApproval=false}){
 const fail=(code,message,status=400)=>{throw new StoreError(code,message,status);};
 db.exec(`CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  owner_id TEXT NOT NULL REFERENCES members(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved')),
  approved_by TEXT REFERENCES members(id),
  approved_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
 ); CREATE INDEX IF NOT EXISTS idx_exams_tenant ON exams(tenant_id,updated_at);
 CREATE TABLE IF NOT EXISTS exam_approval_history (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   tenant_id TEXT NOT NULL REFERENCES tenants(id),
   exam_id TEXT NOT NULL REFERENCES exams(id),
   revision INTEGER NOT NULL,
   body_sha256 TEXT NOT NULL,
   approved_by TEXT NOT NULL REFERENCES members(id),
   approved_at INTEGER NOT NULL,
   UNIQUE(exam_id,revision)
 );
 CREATE INDEX IF NOT EXISTS idx_exam_approvals_tenant ON exam_approval_history(tenant_id,exam_id,id);
 CREATE TABLE IF NOT EXISTS exam_delivery_events (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  exam_id TEXT NOT NULL REFERENCES exams(id),actor_id TEXT NOT NULL REFERENCES members(id),
  revision INTEGER NOT NULL,profile TEXT NOT NULL,source_sha256 TEXT NOT NULL,
  package_sha256 TEXT NOT NULL,manifest_sha256 TEXT NOT NULL, created_at INTEGER NOT NULL
 );CREATE INDEX IF NOT EXISTS idx_delivery_events ON exam_delivery_events(tenant_id,exam_id,created_at);`);
 const allow=(actor,permission)=>{if(!roleCan(actor?.role,permission))fail('forbidden','Bu işlem için yetkiniz yok.',403);};
 const checkId=id=>{if(!identifier.test(id||''))fail('bad_id','Sınav kimliği geçersiz.');};
 const elevated=actor=>['admin','coordinator'].includes(actor.role);
 function visible(actor,row){return elevated(actor)||row.owner_id===actor.id||actor.role==='reviewer'||(actor.role==='observer'&&row.status==='approved');}
 function rowFor(actor,id,permission='exam.view'){
  allow(actor,permission);checkId(id);
  const row=db.prepare('SELECT * FROM exams WHERE id=? AND tenant_id=?').get(id,actor.tenantId);
  if(!row)fail('missing','Sınav bulunamadı.',404);
  if(!visible(actor,row))fail('forbidden','Bu sınavı görüntüleme yetkiniz yok.',403);
  return row;
 }
 function sanitize(input){
  if(!input||typeof input!=='object'||Array.isArray(input))fail('invalid_exam','Sınav nesnesi gerekli.');
  if(JSON.stringify(input).length>260000)fail('too_large','Sınav 260 KB sınırını aşıyor.',413);
  if(String(input.profile||'').trim())fail('profile_not_allowed','Kurumsal taslaklarda öğrenci profili saklanmaz.');
  if(['diagnosis','disability','medical','studentName','student','learner','needArea','health'].some(k=>Object.hasOwn(input,k)))fail('sensitive_field','Kurumsal sınavda öğrenci/tanı bilgisi saklanamaz.');
  let exam;
  try{exam=normalizeExam(input);}catch(error){fail('invalid_exam',error.message||'Sınav biçimi geçersiz.');}
  // Guard common structured identifiers across question and goal-bank text, not only top-level fields.
  // Heuristic defense-in-depth only; this is NOT a general de-identification service.
  const candidateTexts=[exam.title,exam.objective,exam.instruction,...(exam.bepGoals||[]).map(g=>g.text),
   ...exam.questions.flatMap(q=>[q.prompt,q.simplifiedPrompt,q.objective,q.visualNote,q.access?.writtenCue])];
  if(detectSensitive(candidateTexts.join('\n')).length)fail('sensitive_text','Öğrenciye ait kişisel bilgi alanı algılandı; anonim hale getirin.',422);
  if(exam.questions.length>100)fail('too_many_questions','En fazla 100 soru kaydedilebilir.');
  if(exam.questions.some(q=>q.teacherNote?.trim()))fail('note_not_allowed','Kurumsal taslakta serbest öğretmen gözlem notu saklanmaz.');
  // Approval metadata never comes from the browser.
  exam.profile='';
  return exam;
 }
 function meta(row){return {id:row.id,title:row.title,ownerId:row.owner_id,revision:row.revision,status:row.status,approvedBy:row.approved_by||null,approvedAt:row.approved_at||null,updatedAt:row.updated_at,createdAt:row.created_at};}
 function listExams(actor){allow(actor,'exam.view');const rows=db.prepare('SELECT * FROM exams WHERE tenant_id=? ORDER BY updated_at DESC LIMIT 100').all(actor.tenantId);return rows.filter(x=>visible(actor,x)).map(meta);}
 function getExam(actor,id){const row=rowFor(actor,id);return {...meta(row),exam:JSON.parse(row.body)};}
 function createExam(actor,payload){allow(actor,'exam.edit');const exam=sanitize(payload?.exam);const count=db.prepare('SELECT COUNT(*) AS n FROM exams WHERE tenant_id=?').get(actor.tenantId).n;
  if(count>=200)fail('quota','Kurum sınav sınırına ulaşıldı.',409);
  const stamp=Date.now(),id=randomUUID();db.prepare('INSERT INTO exams(id,tenant_id,owner_id,title,body,revision,status,created_at,updated_at) VALUES(?,?,?,?,?,1,\'draft\',?,?)').run(id,actor.tenantId,actor.id,exam.title,JSON.stringify(exam),stamp,stamp);
  log(actor,'exam.created',id);return getExam(actor,id);
 }
 /** Copy a visible exam into a new, independently owned draft. Never transfer approvals. */
 function duplicateExam(actor,id,payload){
  allow(actor,'exam.edit');
  const source=rowFor(actor,id);
  if(!Number.isInteger(payload?.revision)||payload.revision!==source.revision)fail('revision_conflict','Kaynak sınav değişmiş; listeyi yenileyip yeniden deneyin.',409);
  const existing=JSON.parse(source.body);
  const suffix=' — Kopya';
  const defaultTitle=source.title.slice(0,250-suffix.length).trimEnd()+suffix;
  if(payload.title!==undefined&&(typeof payload.title!=='string'||!payload.title.trim()||payload.title.length>250))fail('invalid_title','Kopya başlığı 1-250 karakter olmalıdır.');
  const title=payload.title===undefined?defaultTitle:payload.title.trim();
  // Review attestations and source-review flags describe the original assessment,
  // not the new teaching context. Keep question text and accessibility adaptations.
  const exam=sanitize({...existing,title,reviewPolicy:'guided',goalAttestations:[],questions:existing.questions.map(q=>({
   ...q,equivalenceReview:{checks:{},fingerprint:''},
   provenance:q.provenance?{...q.provenance,reviewed:false}:null
  }))});
  const count=db.prepare('SELECT COUNT(*) AS n FROM exams WHERE tenant_id=?').get(actor.tenantId).n;
  if(count>=200)fail('quota','Kurum sınav sınırına ulaşıldı.',409);
  const stamp=Date.now(),newId=randomUUID();
  db.prepare('INSERT INTO exams(id,tenant_id,owner_id,title,body,revision,status,created_at,updated_at) VALUES(?,?,?,?,?,1,\'draft\',?,?)')
   .run(newId,actor.tenantId,actor.id,exam.title,JSON.stringify(exam),stamp,stamp);
  log(actor,'exam.duplicated',newId);
  return getExam(actor,newId);
 }
 function updateExam(actor,id,payload){allow(actor,'exam.edit');const row=rowFor(actor,id);if(!(row.owner_id===actor.id||elevated(actor)))fail('forbidden','Yalnızca sınav sahibi veya koordinatör düzenleyebilir.',403);
  const expectedRevision=payload?.revision;if(!Number.isInteger(expectedRevision)||expectedRevision<1)fail('bad_revision','Sürüm numarası geçersiz.');
  const exam=sanitize(payload?.exam);if(JSON.parse(row.body).reviewPolicy==='guided'&&exam.reviewPolicy!=='guided')fail('review_downgrade','Öğretmen denetimi yeni sürümde kaldırılamaz.',422);
  const result=db.prepare('UPDATE exams SET title=?,body=?,revision=revision+1,status=\'draft\',approved_by=NULL,approved_at=NULL,updated_at=? WHERE id=? AND tenant_id=? AND revision=?').run(exam.title,JSON.stringify(exam),Date.now(),id,actor.tenantId,expectedRevision);
  if(!result.changes)fail('revision_conflict','Başka bir oturum kaydı değiştirdi; yeniden açıp kontrol edin.',409);
  log(actor,'exam.updated',id);return getExam(actor,id);
 }
 function approveExam(actor,id,payload){allow(actor,'exam.approve');const row=rowFor(actor,id);
  if(requireIndependentExamApproval&&row.owner_id===actor.id)fail('separation_of_duties','Sınavın taslağını oluşturan hesap bu sınavı onaylayamaz.',403);
  if(payload?.confirmed!==true)fail('confirmation_required','Sınav sürümünün onaylanması için yetkili onaylayıcının açık teyidi gerekli.');
  if(!Number.isInteger(payload.revision)||payload.revision!==row.revision)fail('revision_conflict','Sınav sürümü değişmiş. Yeniden gözden geçirin.',409);
  const report=reviewExam(JSON.parse(row.body));if(report.errorCount>0)fail('quality_errors',`${report.errorCount} zorunlu kontrol hatası bulundu.`,422);
  if(row.status==='approved')return {...meta(row),report:{errorCount:report.errorCount,warningCount:report.warningCount}};
  const stamp=Date.now();
  db.exec('BEGIN IMMEDIATE');
  try{
   const result=db.prepare("UPDATE exams SET status='approved',approved_by=?,approved_at=?,updated_at=? WHERE id=? AND tenant_id=? AND revision=? AND status='draft'").run(actor.id,stamp,stamp,id,actor.tenantId,row.revision);
   if(!result.changes)fail('revision_conflict','Sınav kaydı değişti.',409);
   const hash=createHash('sha256').update(row.body).digest('hex');
   db.prepare('INSERT INTO exam_approval_history(tenant_id,exam_id,revision,body_sha256,approved_by,approved_at) VALUES(?,?,?,?,?,?)').run(actor.tenantId,id,row.revision,hash,actor.id,stamp);
   log(actor,'exam.approved',id);
   db.exec('COMMIT');
  }catch(err){db.exec('ROLLBACK');throw err;}
  return {...meta(db.prepare('SELECT * FROM exams WHERE id=?').get(id)),report:{errorCount:0,warningCount:report.warningCount}};
 }
 function approvalHistory(actor,id){
  const row=rowFor(actor,id);
  const records=db.prepare('SELECT id,revision,body_sha256 AS contentHash,approved_by AS approvedBy,approved_at AS approvedAt FROM exam_approval_history WHERE tenant_id=? AND exam_id=? ORDER BY id DESC LIMIT 100').all(actor.tenantId,id);
  const currentHash=createHash('sha256').update(row.body).digest('hex');
  return {examId:id,currentRevision:row.revision,status:row.status,records:records.map(x=>({...x,current:x.revision===row.revision&&row.status==='approved'&&x.contentHash===currentHash}))};
 }
 function approvedRow(actor,id){
  allow(actor,'exam.export');
  const row=rowFor(actor,id);
  if(row.status!=='approved'||!row.approved_by||!row.approved_at)fail('not_approved','Sınav henüz kurumsal onay almadı.',409);
  const hash=createHash('sha256').update(row.body).digest('hex');
  const approval=db.prepare('SELECT body_sha256 FROM exam_approval_history WHERE tenant_id=? AND exam_id=? AND revision=? AND approved_by=? ORDER BY id DESC LIMIT 1')
   .get(actor.tenantId,id,row.revision,row.approved_by);
  if(!approval||approval.body_sha256!==hash)fail('approval_integrity','Onaylı sınavın içerik özeti doğrulanamadı.',409);
  return {row,hash,approval};
 }
 function exportExam(actor,id){
  const {row}=approvedRow(actor,id);const exam=JSON.parse(row.body);
  if(reviewExam(exam).errorCount)fail('quality_errors','Onaylı sınav kontrol hatası içeriyor.',422);
  log(actor,'exam.exported',id);return {meta:meta(row),exam};
 }
 function deliveryCheck(actor,id,profile='standard'){
  const {row,hash,approval}=approvedRow(actor,id);
  return {meta:meta(row),...deliveryReadiness(JSON.parse(row.body),{
   approved:true,sourceSha256:hash,approvalSha256:approval.body_sha256,profile
  })};
 }
 function deliveryProduce(actor,id,profile='standard'){
  const {row,hash,approval}=approvedRow(actor,id);
  let pkg;
  try{pkg=makeDeliveryPackage(JSON.parse(row.body),{id,revision:row.revision,
   profile,sourceSha256:hash,approvalSha256:approval.body_sha256,approved:true});}
  catch(err){if(err.code==='too_large')fail('package_too_large',err.message,413);
   if(err.code==='not_ready')fail('delivery_not_ready',err.problems.map(x=>x.message).join(' '),422);throw err;}
  db.prepare('INSERT INTO exam_delivery_events(id,tenant_id,exam_id,actor_id,revision,profile,source_sha256,package_sha256,manifest_sha256,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
   .run(pkg.packageId,actor.tenantId,id,actor.id,row.revision,profile,hash,pkg.sha256,pkg.manifestSha256,Date.now());
  log(actor,'exam.delivery_package',pkg.packageId);
  return pkg;
 }
 function deliveryAudit(actor,id){
  allow(actor,'audit.view');rowFor(actor,id);
  return db.prepare('SELECT id,revision,profile,source_sha256 AS sourceSha256,package_sha256 AS packageSha256,manifest_sha256 AS manifestSha256,created_at AS createdAt FROM exam_delivery_events WHERE tenant_id=? AND exam_id=? ORDER BY created_at DESC LIMIT 50').all(actor.tenantId,id);
 }
 return {listExams,getExam,createExam,duplicateExam,updateExam,approveExam,approvalHistory,exportExam,deliveryCheck,deliveryProduce,deliveryAudit};
}
