// Okuma eşzamanı: okunan bölüm (soru, şık, yönerge) ekranda vurgulanır; kapatılabilir; okuma bitince/durunca temizlenir.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer as tcp} from 'node:net';
import {createRequire} from 'node:module';
import {createDemo} from './core.mjs';
const require=createRequire(import.meta.url);
let chromium=null;try{({chromium}=require('playwright'));}catch{}
const dir=mkdtempSync(join(tmpdir(),'bep-sync-'));
const probe=tcp();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'s.sqlite');process.env.PORT=String(port);
const {openStore}=await import('./server-foundation/institutional-store.mjs');const store=openStore(process.env.BEP_DB_PATH);
const pass='Sentetik-BEP-Yalniz-Test-2026!';store.createTenantAdmin({tenantId:'anonim-s',tenantName:'Anonim',email:'t@anonim-s.invalid',password:pass});
const {createServer}=await import('./server.mjs');const server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
after(async()=>{await new Promise(r=>server.close(r));if(store.db.open)store.db.close();rmSync(dir,{recursive:true,force:true});});
const base=`http://127.0.0.1:${port}`;
const api=(path,{method='GET',body,sess}={})=>fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(sess?{Cookie:sess.cookie,'X-CSRF-Token':sess.csrf}:{})},body:body?JSON.stringify(body):undefined});
// Sınır olayı üreten yerel ses taklidi (Windows yerel sesleri gibi).
const FAKE=`(()=>{window.__utts=[];const voice={name:'Test Türkçe',lang:'tr-TR',localService:true,voiceURI:'test-tr'};
 Object.defineProperty(window,'SpeechSynthesisUtterance',{value:function(t){this.text=t;},configurable:true,writable:true});
 Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[voice],speak:u=>{window.__utts.push(u);setTimeout(()=>u.onstart&&u.onstart(),0);},cancel(){},pause(){},resume(){},addEventListener(){},removeEventListener(){}}});})();`;
test('okunan bölüm vurgulanır: soru → şık B → yazılı yönerge; bitince temizlenir; kapatılabilir',{skip:chromium?false:'playwright yok',timeout:90000},async()=>{
 const r=await api('/api/login',{method:'POST',body:{tenantId:'anonim-s',email:'t@anonim-s.invalid',password:pass}});const v=await r.json();
 const sess={cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),csrf:v.csrfToken||v.csrf};
 const d=createDemo();d.duration=30;d.adaptations.visualCues=false;d.profile='';const ch=d.questions.find(q=>q.type==='choice');
 d.questions=[{...ch,prompt:'Planlama hangi yönetim işlevidir?',options:['İlk işlev','Son işlev','Denetim işlevi'],answer:'İlk işlev',teacherNote:''}];
 const id=(await(await api('/api/exams',{method:'POST',body:{exam:d},sess})).json()).item.id;
 await api(`/api/exams/${id}/approve`,{method:'POST',body:{revision:1,confirmed:true},sess});
 const it=(await(await api('/api/pilot/batch',{method:'POST',body:{rows:[{candidateCode:'KOD-SY1',seat:'PC-01',examId:id,adjustments:[],extraMinutes:0,breakMinutes:0}]},sess})).json()).items[0];
 const browser=await chromium.launch();
 try{
  const ctx=await browser.newContext({viewport:{width:1200,height:1000}});await ctx.addInitScript(FAKE);const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(base+'/pilot');await p.fill('#code',it.code);await p.keyboard.press('Enter');await p.waitForSelector('label.option');
  await p.click('#student-questions section button');await p.waitForFunction(()=>window.__utts.length>=1);
  const text=await p.evaluate(()=>window.__utts[0].text);
  const at=k=>text.indexOf(k);assert.ok(at('Seçenek B')>0,text);
  const marked=()=>p.evaluate(()=>[...document.querySelectorAll('.reading-now')].map(e=>e.dataset.read));
  const fire=i=>p.evaluate(i=>window.__utts[0].onboundary({charIndex:i}),i);
  await fire(0);assert.deepEqual(await marked(),['number']);
  await fire(at('Planlama'));assert.deepEqual(await marked(),['prompt']);
  await fire(at('Seçenek B'));assert.deepEqual(await marked(),['option-B']);
  await fire(at('Seçenek C'));assert.deepEqual(await marked(),['option-C']);
  assert.equal(await p.evaluate(()=>getComputedStyle(document.querySelector('.reading-now')).outlineStyle),'solid');
  await p.evaluate(()=>window.__utts[0].onend());assert.deepEqual(await marked(),[],'okuma bitince vurgu kalkar');
  // kapatılabilir
  await p.uncheck('#reader-sync');await p.click('#student-questions section button');await p.waitForFunction(()=>window.__utts.length>=2);
  await p.evaluate(i=>window.__utts[1].onboundary({charIndex:i}),at('Seçenek B'));assert.deepEqual(await marked(),[]);
  // durdurunca temizlenir
  await p.check('#reader-sync');await p.click('#student-questions section button');await p.waitForFunction(()=>window.__utts.length>=3);
  await p.evaluate(i=>window.__utts[2].onboundary({charIndex:i}),at('Seçenek B'));assert.deepEqual(await marked(),['option-B']);
  await p.click('#reader-stop');assert.deepEqual(await marked(),[]);
  assert.deepEqual(errs,[]);
 }finally{await browser.close();}
});
