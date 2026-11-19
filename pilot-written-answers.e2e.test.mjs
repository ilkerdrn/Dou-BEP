// Yazılı (kısa/açık uçlu) yanıt: öğrenci yazar, teslim eder; öğretmen görür; puan ÖNERİSİ yalnız nesnel sorularda; kişisel veri uyarısı.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {webcrypto} from 'node:crypto';
import {createServer as tcp} from 'node:net';
import {createRequire} from 'node:module';
import {createDemo} from './core.mjs';
const require=createRequire(import.meta.url);
let chromium=null;try{({chromium}=require('playwright'));}catch{}
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const dir=mkdtempSync(join(tmpdir(),'bep-written-'));
const probe=tcp();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'w.sqlite');process.env.PORT=String(port);
const {openStore}=await import('./server-foundation/institutional-store.mjs');const store=openStore(process.env.BEP_DB_PATH);
const pass='Sentetik-BEP-Yalniz-Test-2026!';store.createTenantAdmin({tenantId:'anonim-w',tenantName:'Anonim',email:'t@anonim-w.invalid',password:pass});
const {createServer}=await import('./server.mjs');const server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
after(async()=>{await new Promise(r=>server.close(r));if(store.db.open)store.db.close();rmSync(dir,{recursive:true,force:true});});
const base=`http://127.0.0.1:${port}`;
const api=(path,{method='GET',body,sess,token}={})=>fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(sess?{Cookie:sess.cookie,'X-CSRF-Token':sess.csrf}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
async function login(){const r=await api('/api/login',{method:'POST',body:{tenantId:'anonim-w',email:'t@anonim-w.invalid',password:pass}});const v=await r.json();return {cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),csrf:v.csrf};}
function examBody(){
 const d=createDemo();d.adaptations.visualCues=false;d.profile='';d.duration=40;
 const base={...d.questions.find(q=>q.type==='choice'),teacherNote:''};
 const tf=d.questions.find(q=>q.type==='truefalse'),mt=d.questions.find(q=>q.type==='matching'),sh=d.questions.find(q=>q.type==='short');
 d.questions=[
  {...base,id:'q1',prompt:'5 + 3 işleminin sonucu kaçtır?',options:['6','8','9'],answer:'8',points:10},
  {...tf,id:'q2',prompt:'4 + 4 = 8',answer:'Doğru',points:10,teacherNote:''},
  {...mt,id:'q3',prompt:'Hayvanları sesleriyle eşleştirin.',pairs:[{left:'Kedi',right:'Miyav'},{left:'Köpek',right:'Havla'}],points:10,teacherNote:''},
  {...sh,id:'q4',type:'short',prompt:'Bir ağın temel amacını açıklayınız.',answer:'Cihazların veri paylaşması',points:20,options:[],pairs:[],teacherNote:''},
  {...sh,id:'q5',type:'short',prompt:'Protokol nedir? Örnek veriniz.',answer:'',points:20,options:[],pairs:[],teacherNote:''}
 ];return d;
}
async function issue(sess,id){return (await(await api('/api/pilot',{method:'POST',body:{examId:id},sess})).json()).item;}
async function prepare(){
 const sess=await login();const created=await(await api('/api/exams',{method:'POST',body:{exam:examBody()},sess})).json();const id=created.item.id;
 const ap=await api(`/api/exams/${id}/approve`,{method:'POST',body:{revision:1,confirmed:true},sess});
 assert.equal(ap.status,200,JSON.stringify(await ap.clone().json()));return {sess,id};
}
test('API: yazılı yanıt kabul edilir; sınır, tür ve denetim karakteri reddedilir; teslim tek seferlik',async()=>{
 const {sess,id}=await prepare();const it=await issue(sess,id);
 const r=await(await api('/api/pilot/redeem',{method:'POST',body:{code:it.code}})).json();
 const qs=r.exam.questions;assert.equal(qs.length,5);assert.equal(qs[3].type,'short');
 assert.equal(JSON.stringify(r.exam).includes('Cihazların veri paylaşması'),false,'cevap anahtarı öğrenciye gitmez');
 const sub=(answers)=>api('/api/pilot/submit',{method:'POST',body:{answers},token:r.token});
 assert.equal((await sub({q4:'x'.repeat(4001)})).status,413);
 assert.equal((await sub({q4:{a:1}})).status,400);
 assert.equal((await sub({q4:'a\u0000b'})).status,400);
 assert.equal((await sub({q1:'B',q2:'A',q3:{'1':'B','2':'A'},q4:'Ağ, cihazların veri paylaşmasıdır.\nİkinci satır.',q5:''})).status,200);
 assert.equal((await sub({q4:'tekrar'})).status,401);
 // Öğretmen görünümü
 const list=await(await api('/api/pilot',{sess})).json();const sid=list.items.find(x=>x.id===it.id).id;
 const rev=(await(await api(`/api/pilot/${sid}/review`,{sess})).json()).review;const by=Object.fromEntries(rev.questions.map(q=>[q.number,q]));
 assert.equal(by[4].response,'Ağ, cihazların veri paylaşmasıdır.\nİkinci satır.');assert.equal(by[5].response,null);
 // Puan önerisi yalnız nesnel sorularda: choice B=8 doğru, truefalse A=Doğru doğru, eşleştirme sıralı (Kedi→Miyav, Köpek→Havla) doğru
 assert.equal(by[1].suggestedScore,10);assert.equal(by[2].suggestedScore,10);assert.equal(by[3].suggestedScore,10);
 assert.equal(by[4].suggestedScore,null,'yazılı yanıt için öneri yok');assert.equal(by[5].suggestedScore,null);
 assert.equal(rev.assessedPoints,0,'öneri kaydedilmez, puan öğretmenden gelir');
});
test('puan önerisi yanlış ve kısmi cevapları doğru hesaplar',async()=>{
 const {sess,id}=await prepare();const it=await issue(sess,id);
 const r=await(await api('/api/pilot/redeem',{method:'POST',body:{code:it.code}})).json();
 const choiceRight=r.exam.questions[0].options.find(o=>o.label==='8').id,matchingLeft=r.exam.questions[2];
 const wrongChoice=r.exam.questions[0].options.find(o=>o.label==='6').id;
 const miyav=matchingLeft.right.find(x=>x.label==='Miyav').id,havla=matchingLeft.right.find(x=>x.label==='Havla').id;
 void choiceRight;
 assert.equal((await api('/api/pilot/submit',{method:'POST',body:{answers:{q1:wrongChoice,q2:'B',q3:{'1':miyav,'2':miyav}}},token:r.token})).status,200);
 const sid=it.id;const by=Object.fromEntries((await(await api(`/api/pilot/${sid}/review`,{sess})).json()).review.questions.map(q=>[q.number,q]));
 assert.equal(by[1].suggestedScore,0);assert.equal(by[2].suggestedScore,0);assert.equal(by[3].suggestedScore,5,'iki çiftten biri doğru');
});
test('kişisel veri içeren yazılı yanıt kaydedilir ama öğretmen ekranında uyarı bayrağı taşır',async()=>{
 const {sess,id}=await prepare();const it=await issue(sess,id);
 const r=await(await api('/api/pilot/redeem',{method:'POST',body:{code:it.code}})).json();
 assert.equal((await api('/api/pilot/submit',{method:'POST',body:{answers:{q4:'İletişim: ali@ornek.com'}},token:r.token})).status,200,'süre sonu otomatik teslimi PII yüzünden kaybolmaz');
 const q4=(await(await api(`/api/pilot/${it.id}/review`,{sess})).json()).review.questions.find(q=>q.number===4);
 assert.ok(q4.flags.length===1&&/kişisel veri/i.test(q4.flags[0]));
});
test('tarayıcı: öğrenci yazılı yanıt yazar, harita/ilerleme güncellenir, sayaç çalışır, teslim edilir',{skip:chromium?false:'playwright yok',timeout:90000},async()=>{
 const {sess,id}=await prepare();const it=await issue(sess,id);const browser=await chromium.launch();
 try{
  const page=await browser.newPage();page.on('dialog',d=>d.accept());
  await page.goto(base+'/pilot');await page.fill('#code',it.code);await page.keyboard.press('Enter');await page.waitForSelector('#player:not([hidden])');
  await page.click('#question-map button:nth-child(4)');
  const ta=page.locator('#student-questions textarea:visible');assert.equal(await ta.count(),1);
  assert.equal(await page.getAttribute('#question-map button:nth-child(4)','aria-label'),'Soru 4, boş, şu an açık');
  await ta.fill('Ağ, cihazların veri paylaşmasıdır.');
  assert.match(await page.textContent('#student-questions'),/34 \/ 4000 karakter/);
  assert.equal(await page.getAttribute('#question-map button:nth-child(4)','aria-label'),'Soru 4, cevaplandı, şu an açık');
  assert.equal(await page.evaluate(()=>document.querySelector('#student-questions textarea').maxLength),4000);
  // Metin kutusunda kısayollar yazıyı bozmaz (Alt+Shift+N ileri gitmez, 1-9 yazılır).
  await ta.press('Alt+Shift+N');assert.match(await page.textContent('#question-progress'),/Soru 4 \/ 5/);
  await page.click('#send');await page.waitForSelector('#done:not([hidden])');
  const q4=(await(await api(`/api/pilot/${it.id}/review`,{sess})).json()).review.questions.find(q=>q.number===4);
  assert.equal(q4.response,'Ağ, cihazların veri paylaşmasıdır.');
 }finally{await browser.close();}
});
