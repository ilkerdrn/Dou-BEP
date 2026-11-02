/** v2.81: Offline anonymous, isolated end-to-end exam lifecycle acceptance.
 * Creates a private TEMP SQLite database only; never touches live project/data.
 * Run: npm run exam:closure
 */
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash,webcrypto} from 'node:crypto';
import {createServer as createTcpServer} from 'node:net';
import {createDemo,generateDocx,printableHtml} from '../core.mjs';
import {verifyExamDownload} from '../exam-download-verify.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const temp=mkdtempSync(join(tmpdir(),'bep-closure-'));
let server,store,checks=0;
const pass='Sentetik-BEP-Yalniz-Test-2026!';
const inspect=(value,message)=>{if(!value)throw Error('DOU EXAM CLOSURE: '+message);checks++;};
const sha=data=>createHash('sha256').update(data).digest('hex');
async function localPort(){const s=createTcpServer();await new Promise((ok,no)=>{s.once('error',no);s.listen(0,'127.0.0.1',ok);});const n=s.address().port;await new Promise(r=>s.close(r));return n;}
try{
 const port=await localPort();
 process.env.PORT=String(port);
 process.env.BEP_DB_PATH=join(temp,'isolated.sqlite');
 process.env.BEP_NO_LISTEN='1';
 const {openStore}=await import('../server-foundation/institutional-store.mjs');
 store=openStore(process.env.BEP_DB_PATH);
 for(const id of ['anonim-uni-alpha','anonim-uni-beta'])store.createTenantAdmin({tenantId:id,tenantName:'Anonim Test Kurumu',email:'test@'+id+'.invalid',password:pass});
 const {createServer}=await import('../server.mjs');
 server=createServer();await new Promise((ok,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',ok);});
 const base=`http://127.0.0.1:${port}`;
 async function api(path,{method='GET',body,session,csrf}={}){
  const response=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(session?{Cookie:session}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(14000)});
  return response;
 }
 async function login(id){const response=await api('/api/login',{method:'POST',body:{tenantId:id,email:'test@'+id+'.invalid',password:pass}});const value=await response.json();inspect(response.status===200&&value.authenticated&&value.csrf,'Kurum girişi');return {cookie:response.headers.get('set-cookie')?.split(';')[0],csrf:value.csrf};}
 inspect((await api('/api/exams')).status===401,'Kimliksiz sınav listesi 401');
 const first=await login('anonim-uni-alpha'),other=await login('anonim-uni-beta');
 const sess=await api('/api/session',{session:first.cookie});inspect(sess.status===200&&(await sess.json()).authenticated,'Kurum oturumu');
 const demo=createDemo();demo.title='ANONİM ÖRNEK SINAV — BİLGİSAYAR TEMELLERİ';demo.profile='';demo.adaptations.visualCues=false;
 demo.questions=demo.questions.map(q=>({...q,teacherNote:''}));
 const create=await api('/api/exams',{method:'POST',session:first.cookie,csrf:first.csrf,body:{exam:demo}});
 const stored=await create.json();inspect(create.status===201&&stored.item?.id&&stored.item.revision===1,'Sınav taslağı oluşturma');
 const id=stored.item.id;
 const rejectUnapproved=await api('/api/exams/'+id+'/export',{method:'POST',body:{},session:first.cookie,csrf:first.csrf});inspect(rejectUnapproved.status===409,'Onaysız sınav ihracı kapalı');
 const cross=await api('/api/exams/'+id,{session:other.cookie});inspect(cross.status===404,'İkinci kurumdan sınav erişimi 404');
 const fetched=await api('/api/exams/'+id,{session:first.cookie});const previous=await fetched.json();inspect(fetched.status===200&&previous.item.revision===1,'Kaydedilen taslağı yeniden açma');
 const updateExam={...demo,title:'ANONİM REVİZE EDİLMİŞ SINAV'};
 const update=await api('/api/exams/'+id,{method:'PUT',body:{revision:1,exam:updateExam},session:first.cookie,csrf:first.csrf});
 const newRecord=await update.json();inspect(update.status===200&&newRecord.item.revision===2,'Sınav düzenleme ve revizyon artırma');
 const stale=await api('/api/exams/'+id,{method:'PUT',body:{revision:1,exam:updateExam},session:first.cookie,csrf:first.csrf});inspect(stale.status===409,'Eski revizyonla veri kaybını önleme');
 const badCsrf=await api('/api/exams/'+id+'/approve',{method:'POST',body:{revision:2,confirmed:true},session:first.cookie});inspect(badCsrf.status===403,'CSRF olmadan onay reddi');
 const approval=await api('/api/exams/'+id+'/approve',{method:'POST',body:{revision:2,confirmed:true},session:first.cookie,csrf:first.csrf});
 const approved=await approval.json();inspect(approval.status===200&&approved.item.status==='approved','Onaylı sınav revizyonu');
 const exported=await api('/api/exams/'+id+'/export',{method:'POST',body:{},session:first.cookie,csrf:first.csrf});const source=await exported.json();
 inspect(exported.status===200&&source.exam.title===updateExam.title,'Onaylı kaynaktan ihracat');
 const docx=generateDocx(source.exam,false);
 inspect(Buffer.from(docx).subarray(0,4).equals(Buffer.from([80,75,3,4])),'Word çıktısı gerçek DOCX ZIP imzası');
 const html=printableHtml(source.exam,false);inspect(/lang=["']tr["']/.test(html)&&html.includes('ANONİM'),'Türkçe HTML yazdırma çıktısı');
 const ready=await api('/api/exams/'+id+'/delivery-readiness?profile=large',{session:first.cookie});const readiness=await ready.json();
 inspect(ready.status===200&&readiness.ready===true,'Onaylı teslim ön kontrolü');
 const packageRes=await api('/api/exams/'+id+'/delivery-package',{method:'POST',body:{profile:'large'},session:first.cookie,csrf:first.csrf});
 inspect(packageRes.status===200,'Sunucu sahipli teslim ZIP HTTP');
 const packageFile=await verifyExamDownload(packageRes,{format:'zip'});
 inspect(packageFile.bytes.length>300&&packageFile.sha256===sha(packageFile.bytes),'Sunucudan indirilen gerçek ZIP SHA-256');
 const otherExport=await api('/api/exams/'+id+'/export',{method:'POST',body:{},session:other.cookie,csrf:other.csrf});inspect(otherExport.status===404,'Kurumlar arası ihracat kapalı');
 const pdfRes=await api('/api/exams/'+id+'/pdf-pilot',{method:'POST',body:{profile:'standard'},session:first.cookie,csrf:first.csrf});
 if(pdfRes.status===200){const pdf=await verifyExamDownload(pdfRes,{format:'pdf'});inspect(pdf.bytes.length>2000,'Yerel PDF pilotu SHA-256 ve imza');}
 else{inspect(pdfRes.status===422,'PDF yerel font/pilot kısıtı açık hata 422; PDF kanıtı geçilmedi');}
 for(const p of ['/server.mjs','/server-foundation/institutional-store.mjs','/tools/exam-closure-smoke.mjs','/exam-download-verify.test.mjs','/data/institution.sqlite']){
  const r=await api(p);inspect(r.status===404,'Özel yol 404: '+p);
 }
 console.log(JSON.stringify({result:'PASS',checks,examRevision:2,approved:true,deliveryZipSha256Verified:true,pdfPilotHttpStatus:pdfRes.status,temporaryDatabaseOnly:true,liveDatabaseTouched:false},null,2));
} finally{
 if(server?.listening)await new Promise(resolve=>server.close(resolve));
 if(store?.db?.open)store.db.close();
 rmSync(temp,{recursive:true,force:true});
}
