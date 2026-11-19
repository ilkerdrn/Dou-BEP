// Görme engelli aday: kendi sınavı, soru metni değiştikçe otomatik seslendirilir. Ses önceden kaydedilmez; metin sınav anında okunur.
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
const dir=mkdtempSync(join(tmpdir(),'bep-autoread-'));
const probe=tcp();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'a.sqlite');process.env.PORT=String(port);
const {openStore}=await import('./server-foundation/institutional-store.mjs');const store=openStore(process.env.BEP_DB_PATH);
const pass='Sentetik-BEP-Yalniz-Test-2026!';store.createTenantAdmin({tenantId:'anonim-r',tenantName:'Anonim',email:'t@anonim-r.invalid',password:pass});
const {createServer}=await import('./server.mjs');const server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
after(async()=>{await new Promise(r=>server.close(r));if(store.db.open)store.db.close();rmSync(dir,{recursive:true,force:true});});
const base=`http://127.0.0.1:${port}`;
const api=(path,{method='GET',body,sess}={})=>fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(sess?{Cookie:sess.cookie,'X-CSRF-Token':sess.csrf}:{})},body:body?JSON.stringify(body):undefined});
async function login(){const r=await api('/api/login',{method:'POST',body:{tenantId:'anonim-r',email:'t@anonim-r.invalid',password:pass}});const v=await r.json();return {cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),csrf:v.csrf};}
async function exam(sess,title,first){
 const d=createDemo();d.title=title;d.duration=30;d.adaptations.visualCues=false;d.profile='';
 const ch=d.questions.find(q=>q.type==='choice'),sh=d.questions.find(q=>q.type==='short');
 d.questions=[{...ch,prompt:first,options:['6','8','9'],answer:'8',teacherNote:''},{...sh,type:'short',prompt:title+': kavramı açıklayınız.',answer:'',options:[],pairs:[],points:20,teacherNote:''}];
 const id=(await(await api('/api/exams',{method:'POST',body:{exam:d},sess})).json()).item.id;
 const ap=await api(`/api/exams/${id}/approve`,{method:'POST',body:{revision:1,confirmed:true},sess});assert.equal(ap.status,200,JSON.stringify(await ap.clone().json()));return id;
}
// Tarayıcıda yerel Türkçe ses taklidi: okunan metni toplar.
const FAKE_SPEECH=`(()=>{window.__spoken=[];const voice={name:'Test Türkçe',lang:'tr-TR',localService:true,voiceURI:'test-tr'};
 Object.defineProperty(window,'SpeechSynthesisUtterance',{value:function(t){this.text=t;},configurable:true,writable:true});
 Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[voice],speak:u=>{window.__spoken.push(u.text);setTimeout(()=>u.onend&&u.onend(),5);},cancel(){},pause(){},resume(){},addEventListener(){},removeEventListener(){}}});})();`;
test('OTOMATİK OKUMA profili: soru metni değiştikçe o sorunun metni okunur; profil yoksa kendiliğinden okunmaz; kapatılabilir',{skip:chromium?false:'playwright yok',timeout:90000},async()=>{
 const sess=await login();
 const e1=await exam(sess,'FIZ101 Fizik Vize','Hız 20 km/sa ise 3 saatte kaç km yol alınır?');
 const e2=await exam(sess,'KIM102 Kimya Vize','Suyun kaynama noktası kaç derecedir?');
 const items=(await(await api('/api/pilot/batch',{method:'POST',body:{rows:[
  {candidateCode:'KOD-101',seat:'PC-01',examId:e1,adjustments:['AUTO_READ','ACCESSIBLE_HTML','ONE_PER_PAGE'],extraMinutes:15,breakMinutes:0},
  {candidateCode:'KOD-102',seat:'PC-02',examId:e2,adjustments:['AUTO_READ'],extraMinutes:0,breakMinutes:0},
  {candidateCode:'KOD-103',seat:'PC-03',examId:e1,adjustments:[],extraMinutes:0,breakMinutes:0}]},sess})).json()).items;
 const browser=await chromium.launch();
 try{
  const open=async it=>{const ctx=await browser.newContext({viewport:{width:1200,height:900}});await ctx.addInitScript(FAKE_SPEECH);const p=await ctx.newPage();p.on('dialog',d=>d.accept());await p.goto(base+'/pilot');await p.fill('#code',it.code);await p.keyboard.press('Enter');await p.waitForSelector('#player:not([hidden])');return p;};
  const [A,B,C]=await Promise.all(items.map(open));
  const spoken=async p=>p.evaluate(()=>window.__spoken.slice());
  // A: sınav başında yönerge + 1. soru, kendi sorusunun metniyle
  await A.waitForFunction(()=>window.__spoken.length>=1,null,{timeout:6000});
  const a1=(await spoken(A))[0];
  assert.match(a1,/^Sınav başladı\. Sorular otomatik okunur\./);assert.match(a1,/Alt Shift R/);assert.match(a1,/Soru 1\. Hız 20 km\/sa ise 3 saatte kaç km yol alınır\?/);assert.match(a1,/Seçenek A: 6\. Seçenek B: 8\. Seçenek C: 9$/);
  assert.equal(await A.isChecked('#auto-read'),true);assert.match(await A.textContent('#profile-note'),/Otomatik sesli okuma/);
  // Sonraki soru: yazılı soru, kendi metni + nasıl yanıtlanacağı
  await A.focus('#student-questions h2');await A.keyboard.press('Alt+Shift+N');
  await A.waitForFunction(()=>window.__spoken.length>=2,null,{timeout:6000});
  const a2=(await spoken(A)).at(-1);assert.match(a2,/^Soru 2\. FIZ101 Fizik Vize: kavramı açıklayınız/);assert.match(a2,/Bu bir yazılı yanıt sorusudur\. Yanıtınızı yazı alanına yazın$/);
  // B: başka sınav, başka soru metni (soru değişince ses de değişir; kayıt yok)
  await B.waitForFunction(()=>window.__spoken.length>=1,null,{timeout:6000});
  assert.match((await spoken(B))[0],/Soru 1\. Suyun kaynama noktası kaç derecedir\?/);
  assert.doesNotMatch((await spoken(B))[0],/Fizik/);
  // C: profil yok → kendiliğinden okunmaz; Alt+Shift+R ile istenince okunur
  await C.waitForTimeout(900);assert.deepEqual(await spoken(C),[]);assert.equal(await C.isChecked('#auto-read'),false);
  await C.focus('#student-questions h2');await C.keyboard.press('Alt+Shift+R');await C.waitForFunction(()=>window.__spoken.length>=1);
  assert.match((await spoken(C))[0],/^Soru 1\. Hız 20 km\/sa/);
  // A: otomatik okumayı kapatınca sonraki soru okunmaz
  await A.uncheck('#auto-read');const before=(await spoken(A)).length;await A.focus('#student-questions h2').catch(()=>{});await A.click('#question-map button:nth-child(1)');await A.waitForTimeout(700);
  assert.equal((await spoken(A)).length,before,'kapatılınca otomatik okuma yok');
 }finally{await browser.close();}
});
