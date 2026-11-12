/**
 * Creates one additional pilot-session-compatible approved exam.
 * This script NEVER edits PILOT-01/02/03, existing approvals, or the default DB.
 * It preserves the privacy limit: 1..30 choice, truefalse, matching questions only.
 */
import {existsSync,readFileSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openStore} from '../server-foundation/institutional-store.mjs';
import {createDemo} from '../core.mjs';
import {reviewExam} from '../quality.mjs';
import {createStudentPayload} from '../accessible-player.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dbPath=join(root,'.local-pilot-v4','pilot.sqlite');
const marker=join(root,'.local-pilot-v4','pilot-only.marker');
const tenantId='dou-pilot-v4';
const title='PILOT-04 | OTURUM UYUMLU ONAYLI MATEMATIK';
const password='BEP-Sentetik-Pilot-2026!';
const supported=new Set(['choice','truefalse','matching']);

if(process.env.BEP_DB_PATH!==dbPath ||
   process.env.BEP_REQUIRE_INDEPENDENT_EXAM_APPROVAL!=='1' ||
   process.env.BEP_PILOT_ONLY!=='1' ||
   !existsSync(dbPath)||!existsSync(marker) ||
   readFileSync(marker,'utf8').trim()!=='DOU-BEP-SYNTHETIC-PILOT-V4'){
 throw Error('Yalnizca var olan, isaretli ve ayri V4 pilot veritabaninda calisir.');
}
function eligible(exam){
 const payload=createStudentPayload(exam);
 if(!payload.questions.length||payload.questions.length>30||
    payload.questions.some(q=>!supported.has(q.type)))
  throw Error('Pilot oturumu en fazla 30 coktan secmeli, dogru/yanlis ve eslestirme sorusunu destekler.');
 return payload;
}
const store=openStore(dbPath,{requireIndependentExamApproval:true});
try{
 const actor=(email,role)=>{
  const session=store.signIn({tenantId,email,password});
  if(!session?.token)throw Error('Sentetik pilot oturumu acilamadi: '+email);
  const user=store.requireActor(session.token);
  if(user.tenantId!==tenantId||user.role!==role)throw Error('Pilot rolu veya kurumu yanlis: '+email);
  return user;
 };
 const teacher=actor('ogretmen@dou-pilot.test','teacher');
 const reviewer=actor('incelemeci@dou-pilot.test','reviewer');
 if(teacher.id===reviewer.id)throw Error('Ogretmen ve incelemeci hesaplari ayri olmalidir.');
 const matches=store.listExams(teacher).filter(item=>item.title===title);
 if(matches.length>1)throw Error('Tekrarlanan PILOT-04 kaydi var; mevcut kayitlar degistirilmedi.');
 let item=matches[0];
 if(!item){
  const exam=createDemo();
  exam.title=title;
  exam.profile='';
  exam.adaptations.visualCues=false;
  exam.questions=exam.questions
   .filter(q=>supported.has(q.type))
   .map(q=>({...q,points:25,teacherNote:''}));
  eligible(exam);
  const report=reviewExam(exam);
  if(report.errorCount)throw Error('Kalite denetiminde zorunlu hata: '+report.issues.filter(q=>q.level==='error').map(q=>q.text).join(' | '));
  item=store.createExam(teacher,{exam});
  console.log('PILOT-04 sentetik taslak olusturuldu: '+item.id);
 }
 // Never change any existing exam. Existing PILOT-04 must belong to our pilot teacher.
 const current=store.getExam(reviewer,item.id);
 if(current.ownerId!==teacher.id)throw Error('PILOT-04 sahibi beklenenden farkli: dokunulmadi.');
 const payload=eligible(current.exam);
 const report=reviewExam(current.exam);
 if(report.errorCount)throw Error('PILOT-04 kalite kontrolunden gecmedi; onaylanmadi.');
 if(current.status==='draft'){
  // Uses the real server-side reviewer path, not a direct status update.
  store.approveExam(reviewer,current.id,{revision:current.revision,confirmed:true});
 }else if(current.status!=='approved'){
  throw Error('Beklenmeyen sinav durumu: '+current.status);
 }
 const saved=store.getExam(reviewer,current.id);
 const history=store.approvalHistory(reviewer,current.id);
 if(saved.status!=='approved'||saved.approvedBy!==reviewer.id||
    !history.records?.some(record=>record.current&&record.approvedBy===reviewer.id)){
  throw Error('Bagimsiz onay ve surumlu gecmis dogrulanamadi.');
 }
 eligible(saved.exam);
 console.log('PILOT-04 ONAYLI VE OTURUMA UYUMLU');
 console.log('Baslik: '+saved.exam.title);
 console.log('Sinav ID: '+saved.id+' | Surum: '+saved.revision+' | Soru: '+payload.questions.length);
 console.log('Turler: '+payload.questions.map(q=>q.type).join(', '));
 console.log('Kod olusturmak icin yerel pilot panelinde /pilot-yonetim sayfasini acin.');
 console.log('Bu bir sentetik teknik onaydir; gercek ogrenci verisi veya akademik kabul degildir.');
}finally{
 store.db.close();
}
