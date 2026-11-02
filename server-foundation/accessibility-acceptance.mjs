/** v2.34: tenant-isolated, revision-pinned human acceptance evidence for anonymous exam templates.
 * Records are declarations, not proof of PDF/UA, assistive-technology, or institutional certification.
 */
import {randomUUID} from 'node:crypto';
import {roleCan} from '../roles.mjs';
export const ACCEPTANCE_CHECKS=Object.freeze({
 teacher:Object.freeze([
  ['question_equivalence','Sorular, seçenekler, puanlar ve kazanımlar kaynak sınavla karşılaştırıldı'],
  ['alternatives_examined','Denklem, tablo, kod ve görsellerin açıklamaları kaynakla karşılaştırıldı veya bulunmadığı teyit edildi'],
  ['accessible_formats_reviewed','Word, HTML ve PDF pilotunun erişilebilirlik sınırları incelendi'],
  ['manual_followup_declared','Gerekli insan/ekran okuyucu testleri ile eksikler ayrıca belirlendi']
 ]),
 coordinator:Object.freeze([
  ['independent_review','Bağımsız öğretmen inceleme kaydı ve sınav revizyonu kontrol edildi'],
  ['accommodation_workflow','Bireysel uyarlama ve sınav oturumlarının ayrıca kontrol edileceği teyit edildi'],
  ['delivery_constraints','Çıktı sınırları, çevrimdışı çalışma ve teslim kontrolleri gözden geçirildi'],
  ['institutional_limitations','Bu onayın PDF/UA, KVKK, gerçek kullanıcı testi veya kurumsal üretim onayı olmadığı kabul edildi']
 ])
});
const phases=['teacher','coordinator'];
const uuid=/^[a-f0-9-]{36}$/;
export function createAccessibilityAcceptance(db,{StoreError,log,getExam,approvalHistory,listExams,deliveryCheck}){
 const fail=(code,msg,status=400)=>{throw new StoreError(code,msg,status);};
 db.exec(`CREATE TABLE IF NOT EXISTS exam_accessibility_acceptance (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  exam_id TEXT NOT NULL REFERENCES exams(id), revision INTEGER NOT NULL,
  content_sha256 TEXT NOT NULL, phase TEXT NOT NULL CHECK(phase IN ('teacher','coordinator')),
  actor_id TEXT NOT NULL REFERENCES members(id), checklist_json TEXT NOT NULL,
  created_at INTEGER NOT NULL, UNIQUE(exam_id,revision,phase)
 );CREATE INDEX IF NOT EXISTS idx_exam_accessibility_acceptance ON exam_accessibility_acceptance(tenant_id,exam_id,revision);`);
 function examFor(actor,id){
  if(!['teacher','coordinator','admin'].includes(actor?.role)||!roleCan(actor.role,'exam.view')||actor.mfaSetupRequired)fail('forbidden','Öğretmen veya koordinatör yetkisi gerekli.',403);
  if(typeof id!=='string'||!uuid.test(id))fail('bad_id','Sınav kimliği geçersiz.');
  return getExam(actor,id); // tenant isolation and owner visibility enforced in exam repository
 }
 function currentApproval(actor,id,exam){
  if(exam.status!=='approved')return null;
  const history=approvalHistory(actor,id);
  const match=history.records.find(x=>x.current===true&&x.revision===exam.revision);
  return match?.contentHash||null;
 }
 function evidence(actor,exam,sha){
  const rows=db.prepare(`SELECT phase,actor_id,created_at FROM exam_accessibility_acceptance
   WHERE tenant_id=? AND exam_id=? AND revision=? AND content_sha256=? ORDER BY created_at`)
   .all(actor.tenantId,exam.id,exam.revision,sha||'');
  const teacher=rows.find(x=>x.phase==='teacher');
  const coordinator=rows.find(x=>x.phase==='coordinator'&&x.actor_id!==teacher?.actor_id);
  return {teacher:teacher?{completed:true,at:teacher.created_at}:null,
   coordinator:coordinator?{completed:true,at:coordinator.created_at}:null,
   teacherActorId:teacher?.actor_id,coordinatorActorId:coordinator?.actor_id};
 }
 function get(actor,id,{withDelivery=false}={}){
  const exam=examFor(actor,id),sha=currentApproval(actor,id,exam);
  const reviews=evidence(actor,exam,sha);
  const status=!sha?'source_blocked':!reviews.teacher?'teacher_pending':!reviews.coordinator?'coordinator_pending':'reviewed';
  let delivery=null;
  if(withDelivery&&sha&&roleCan(actor.role,'exam.export')){
   try{const check=deliveryCheck(actor,id,'standard');delivery={ready:check.ready,problems:check.problems.map(x=>({code:x.code,message:x.message})),manualReviewRequired:true};}
   catch{delivery={ready:false,problems:[{code:'delivery_check_failed',message:'Çıktı denetimi tamamlanamadı.'}],manualReviewRequired:true};}
  }
  return {id:exam.id,title:exam.title,revision:exam.revision,examStatus:exam.status,
   approvalIntegrity:!!sha,acceptanceStatus:status,
   teacherReview:reviews.teacher,coordinatorReview:reviews.coordinator,
   canSubmitTeacher:!!sha&&exam.ownerId===actor.id&&roleCan(actor.role,'exam.edit')&&!reviews.teacher,
   canSubmitCoordinator:!!sha&&['admin','coordinator'].includes(actor.role)&&!!reviews.teacher&&!reviews.coordinator&&reviews.teacherActorId!==actor.id,
   delivery,manualReviewRequired:true,productionReady:false,pdfUaCertified:false};
 }
 function list(actor){
  if(!['admin','coordinator','teacher'].includes(actor?.role)||actor.mfaSetupRequired)fail('forbidden','Öğretmen veya koordinatör rolü gerekli.',403);
  return {scope:'anonymous-local-pilot',manualReviewRequired:true,productionReady:false,
   items:listExams(actor).map(x=>get(actor,x.id))};
 }
 function submit(actor,id,phase,body){
  if(!phases.includes(phase))fail('bad_phase','Kabul aşaması geçersiz.');
  if(!body||typeof body!=='object'||Array.isArray(body)||!Number.isInteger(body.revision))fail('bad_review','Sürüm ve kontrol beyanları gerekli.');
  const required=ACCEPTANCE_CHECKS[phase];const checks=body.checks;
  if(!checks||typeof checks!=='object'||Array.isArray(checks)||Object.keys(checks).length!==required.length||
    !required.every(([id])=>Object.hasOwn(checks,id)&&checks[id]===true)||
    typeof body.confirmed!=='boolean'||body.confirmed!==true)
   fail('checks_required','Her manuel kontrol ayrı ayrı teyit edilmelidir.',422);
  // Nothing unstructured is persisted; no student names, comments, diagnoses, or raw exam content.
  const exam=examFor(actor,id);
  if(exam.revision!==body.revision)fail('revision_conflict','Sınav revizyonu değişti.',409);
  if(phase==='teacher'&&(exam.ownerId!==actor.id||!roleCan(actor.role,'exam.edit')))
   fail('forbidden','İlk kontrol yalnız sınavın öğretim sorumlusu tarafından yapılır.',403);
  if(phase==='coordinator'&&!['admin','coordinator'].includes(actor.role))
   fail('forbidden','İkinci kontrol koordinatör veya yönetici gerektirir.',403);
  db.exec('BEGIN IMMEDIATE');
  try{
   // Recheck revision, status and approval hash inside the write transaction.
   const latest=examFor(actor,id),sha=currentApproval(actor,id,latest);
   if(!sha||latest.revision!==body.revision)fail('source_blocked','Onaylı sınav revizyonunun bütünlüğü doğrulanamadı.',409);
   const previous=evidence(actor,latest,sha);
   if(phase==='coordinator'){
    if(!previous.teacher)fail('teacher_pending','Bağımsız koordinatör onayından önce öğretim sorumlusu kontrolü gerekli.',409);
    if(previous.teacherActorId===actor.id)fail('separation_of_duties','Aynı hesap her iki kabul aşamasını tamamlayamaz.',403);
   }
   if(phase==='teacher'&&previous.teacher||phase==='coordinator'&&previous.coordinator)
    fail('already_reviewed','Bu revizyonun ilgili kabul aşaması tamamlanmış.',409);
   const at=Date.now();
   db.prepare(`INSERT INTO exam_accessibility_acceptance
    (id,tenant_id,exam_id,revision,content_sha256,phase,actor_id,checklist_json,created_at)
    VALUES(?,?,?,?,?,?,?,?,?)`).run(randomUUID(),actor.tenantId,id,latest.revision,sha,phase,actor.id,JSON.stringify(checks),at);
   log(actor,`exam.accessibility_${phase}_reviewed`,id);
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  return get(actor,id);
 }
 return {acceptanceList:list,acceptanceGet:(actor,id)=>get(actor,id,{withDelivery:true}),acceptanceSubmit:submit};
}
