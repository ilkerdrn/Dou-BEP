/**
 * Create exactly one explicitly synthetic approved exam in the isolated V4 pilot.
 * Does not change the teacher's six-question BLP103 draft or any production DB.
 * Uses the real review and server-side independent approval paths.
 */
import {existsSync,readFileSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openStore} from '../server-foundation/institutional-store.mjs';
import {createDemo} from '../core.mjs';
import {reviewExam} from '../quality.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dbPath=join(root,'.local-pilot-v4','pilot.sqlite');
const marker=join(root,'.local-pilot-v4','pilot-only.marker');
const title='PILOT-03 | ONAYLI SENTETIK MATEMATIK SINAVI';
const tenantId='dou-pilot-v4';
const password='BEP-Sentetik-Pilot-2026!';
if(process.env.BEP_DB_PATH!==dbPath ||
   process.env.BEP_REQUIRE_INDEPENDENT_EXAM_APPROVAL!=='1' ||
   process.env.BEP_PILOT_ONLY!=='1' ||
   !existsSync(dbPath)||!existsSync(marker) ||
   readFileSync(marker,'utf8').trim()!=='DOU-BEP-SYNTHETIC-PILOT-V4'){
 throw Error('Yalnizca onceden kurulmus izole V4 pilot veritabaninda calisir. Canli veriye dokunulmaz.');
}
const store=openStore(dbPath,{requireIndependentExamApproval:true});
try{
 const actor=email=>{
  const session=store.signIn({tenantId,email,password});
  if(!session?.token)throw Error('Pilot hesabinda oturum acilamadi: '+email);
  return store.requireActor(session.token);
 };
 const teacher=actor('ogretmen@dou-pilot.test');
 const reviewer=actor('incelemeci@dou-pilot.test');
 if(teacher.id===reviewer.id||teacher.role!=='teacher'||reviewer.role!=='reviewer')
  throw Error('Bagimsiz ogretmen/incelemeci rolleri dogrulanamadi.');
 const matches=store.listExams(teacher).filter(item=>item.title===title);
 if(matches.length>1)throw Error('Ayni pilot baslikli birden fazla sinav var. Mevcut veriler korunuyor.');
 let item=matches[0];
 if(item?.status==='approved'){
  console.log('ZATEN ONAYLI: '+title+' | '+item.id+' | surum '+item.revision);
  process.exitCode=0;
 }else{
  if(!item){
   const exam=createDemo();
   exam.title=title;
   exam.profile='';
   exam.questions=exam.questions.map(q=>({...q,teacherNote:''}));
   exam.adaptations.visualCues=false;
   const report=reviewExam(exam);
   if(report.errorCount)throw Error('Kalite kontrolu engelledi: '+report.issues.filter(x=>x.level==='error').map(x=>x.text).join(' | '));
   item=store.createExam(teacher,{exam});
   console.log('SENTETIK TASLAK: '+item.id+' | '+item.revision);
  }
  const current=store.getExam(reviewer,item.id);
  if(current.ownerId!==teacher.id||current.status!=='draft')
   throw Error('Pilot sinav sahibi veya durumu beklenenden farkli. Islemler durduruldu.');
  const report=reviewExam(current.exam);
  if(report.errorCount)throw Error('Onay engellendi: '+report.issues.filter(x=>x.level==='error').map(x=>x.text).join(' | '));
  // A genuine server-side reviewer approval, not a direct DB status update.
  // This approval is for synthetic test data, NOT human pedagogical acceptance.
  const approved=store.approveExam(reviewer,current.id,{revision:current.revision,confirmed:true});
  const history=store.approvalHistory(reviewer,current.id);
  const saved=store.getExam(reviewer,current.id);
  if(approved.status!=='approved'||saved.status!=='approved'||
     saved.approvedBy!==reviewer.id||!history.records?.some(record=>record.current&&record.approvedBy===reviewer.id))
   throw Error('Onay sonrasi kalici durum/incelemeci/gecmis dogrulamasi basarisiz.');
  console.log('ONAYLI SENTETIK SINAV: '+saved.exam.title);
  console.log('SINAV ID: '+saved.id+' | SURUM: '+saved.revision);
  console.log('ONAYLAYAN: '+reviewer.email+' | KURUM: '+tenantId);
  console.log('UYARI: Bu yalnizca izole pilot onayidir; gercek akademik degerlendirme degildir.');
 }
}finally{
 store.db.close();
}
