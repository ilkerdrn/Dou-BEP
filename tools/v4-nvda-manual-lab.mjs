/**
 * DOU BEP — MANUAL Windows NVDA acceptance lab.
 * Only synthetic content in a NEW temp SQLite DB. Never reads an existing
 * BEP_DB_PATH, real student data, private profile or production endpoints.
 * One-time code is printed for the human tester but never saved to a file.
 * The lab binds exclusively to 127.0.0.1 and is not an accessibility certificate.
 */
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createTcpServer} from 'node:net';
import {openStore} from '../server-foundation/institutional-store.mjs';
import {createDemo} from '../core.mjs';
import {reviewExam} from '../quality.mjs';

function localPort(){
 return new Promise((resolve,reject)=>{
  const socket=createTcpServer();
  socket.once('error',reject);
  socket.listen(0,'127.0.0.1',()=>{
   const port=socket.address().port;
   socket.close(error=>error?reject(error):resolve(port));
  });
 });
}
const folder=mkdtempSync(join(tmpdir(),'dou-bep-nvda-manual-'));
const dbPath=join(folder,'manual-fixture.sqlite');
let server=null,finished=false;
async function closeLab(){
 if(finished)return;
 finished=true;
 if(server){
  await new Promise(resolve=>server.close(()=>resolve()));
  server=null;
 }
 try{rmSync(folder,{recursive:true,force:true,maxRetries:6,retryDelay:300});}
 catch{console.warn('Windows temporary profile cleanup pending (test DB only).');}
}
async function main(){
 // Create and approve the same safe exam fixture proven by real Edge tests.
 const store=openStore(dbPath,{requireIndependentExamApproval:true});
 let code=null;
 try{
  const tenantId='nvda-manual-fixture';
  const email='admin@nvda-manual.test';
  const reviewerEmail='reviewer@nvda-manual.test';
  const password='Temporary-Anonymous-NVDA-Only-2026!';
  store.createTenantAdmin({tenantId,tenantName:'Sentetik Erişilebilirlik Laboratuvarı',email,password});
  const admin=store.requireActor(store.signIn({tenantId,email,password}).token);
  store.addMember(admin,{email:reviewerEmail,role:'reviewer',password,reauthPassword:password});
  const reviewer=store.requireActor(store.signIn({tenantId,email:reviewerEmail,password}).token);
  const exam=createDemo();
  exam.title='NVDA anonim öğrenci erişilebilirlik denemesi';
  exam.profile='';
  exam.adaptations.visualCues=false;
  exam.questions=exam.questions.filter(q=>q.type!=='short').map(q=>({...q,teacherNote:''}));
  if(exam.questions.length!==4||reviewExam(exam).errorCount)throw Error('Synthetic exam preflight rejected');
  const draft=store.createExam(admin,{exam});
  const approved=store.approveExam(reviewer,draft.id,{revision:draft.revision,confirmed:true});
  if(approved.status!=='approved')throw Error('Synthetic independent approval rejected');
  const session=store.pilotIssue(admin,draft.id);
  code=session.code;
 }finally{store.db.close();}
 const port=await localPort();
 // Override ALL inherited project DB/port settings, including a user's
 // BEP_DB_PATH; importing server.mjs happens only after the safe overrides.
 process.env.BEP_DB_PATH=dbPath;
 process.env.PORT=String(port);
 process.env.BEP_NO_LISTEN='1';
 process.env.BEP_REQUIRE_INDEPENDENT_EXAM_APPROVAL='1';
 const {createServer}=await import('../server.mjs');
 server=createServer();
 await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(port,'127.0.0.1',resolve);
 });
 const url='http://127.0.0.1:'+port+'/pilot';
 console.log('\n=== DOU BEP — ANONIM NVDA KABUL LABORATUVARI ===');
 console.log('Yalnizca bu Windows bilgisayarinda calisir; sentetik veriler.');
 console.log('Ogrenci sinav sayfasi: '+url);
 console.log('TEK KULLANIMLIK SENTETIK KOD: '+code);
 console.log('Bu kod sinav suresi nedeniyle 45 dakika icinde kullanilmalidir.');
 console.log('Sorular: 2 coktan secmeli + 1 dogru/yanlis + 1 eslestirme.');
 console.log('NVDA ile oku -> secenekleri dolas -> eslestir -> tekrar bak -> teslim et.');
 console.log('DOU Reader seslendirmesi ile NVDA ayni anda konusmasin: ayri ayri deneyin.');
 console.log('Lutfen gercek ogrenci bilgisi veya saglik verisi yazmayin.');
 console.log('Test bitince Ctrl+C: sentetik veritabani silinir.\n');
}
process.once('SIGINT',()=>{void closeLab().then(()=>process.exit(0));});
process.once('SIGTERM',()=>{void closeLab().then(()=>process.exit(0));});
try{await main();}
catch{
 console.error('Anonim NVDA laboratuvari baslatilamadi. Gercek ogrenci verisi kullanmayin.');
 await closeLab();
 process.exitCode=1;
}
