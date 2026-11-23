// Soru dili: İngilizce sorular İngilizce yerel sesle ve İngilizce etiketlerle okunur; ses tercihi kadın/erkek; dil öznitelikleri.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer as tcp} from 'node:net';
import {createRequire} from 'node:module';
import {createDemo} from './core.mjs';
import {readerParts,voiceGender} from './dou-reader-core.mjs';
const require=createRequire(import.meta.url);
let chromium=null;try{({chromium}=require('playwright'));}catch{}
const dir=mkdtempSync(join(tmpdir(),'bep-en-'));
const probe=tcp();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'e.sqlite');process.env.PORT=String(port);
const {openStore}=await import('./server-foundation/institutional-store.mjs');const store=openStore(process.env.BEP_DB_PATH);
const pass='Sentetik-BEP-Yalniz-Test-2026!';store.createTenantAdmin({tenantId:'anonim-e',tenantName:'Anonim',email:'t@anonim-e.invalid',password:pass});
const {createServer}=await import('./server.mjs');const server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
after(async()=>{await new Promise(r=>server.close(r));if(store.db.open)store.db.close();rmSync(dir,{recursive:true,force:true});});
const base=`http://127.0.0.1:${port}`;
const api=(path,{method='GET',body,sess}={})=>fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(sess?{Cookie:sess.cookie,'X-CSRF-Token':sess.csrf}:{})},body:body?JSON.stringify(body):undefined});
test('saf işlev: ses cinsiyeti tahmini ve İngilizce okuma etiketleri',()=>{
 assert.equal(voiceGender({name:'Microsoft Emel Online'}),'female');assert.equal(voiceGender({name:'Microsoft Tolga'}),'male');assert.equal(voiceGender({name:'Microsoft Zira Desktop'}),'female');assert.equal(voiceGender({name:'Xyz Voice'}),'unknown');
 const parts=readerParts({number:1,lang:'en',prompt:'What is 5 + 3?',options:[{id:'A',label:'Eight'}],type:'choice'});
 assert.deepEqual(parts.map(p=>p.text),['Question 1','What is 5 + 3?','Option A: Eight']);
});
const FAKE=`(()=>{window.__utts=[];const V=(name,lang)=>({name,lang,localService:true,voiceURI:name});const voices=[V('Microsoft Emel','tr-TR'),V('Microsoft Tolga','tr-TR'),V('Microsoft Zira','en-US'),V('Microsoft David','en-US')];
 Object.defineProperty(window,'SpeechSynthesisUtterance',{value:function(t){this.text=t;},configurable:true,writable:true});
 Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>voices,speak:u=>{window.__utts.push({text:u.text,voice:u.voice&&u.voice.name,lang:u.lang});setTimeout(()=>u.onend&&u.onend(),5);},cancel(){},pause(){},resume(){},addEventListener(){},removeEventListener(){}}});})();`;
test('tarayıcı: İngilizce soru İngilizce sesle, Türkçe soru Türkçe sesle; kadın/erkek tercihi; lang öznitelikleri',{skip:chromium?false:'playwright yok',timeout:90000},async()=>{
 const r=await api('/api/login',{method:'POST',body:{tenantId:'anonim-e',email:'t@anonim-e.invalid',password:pass}});const v=await r.json();
 const sess={cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),csrf:v.csrfToken||v.csrf};
 const d=createDemo();d.title='ENG101 English';d.duration=20;d.adaptations.visualCues=false;d.profile='';const ch=d.questions.find(q=>q.type==='choice');
 d.questions=[{...ch,id:'a',lang:'en',prompt:'What is 5 + 3?',options:['Six','Eight','Nine'],answer:'Eight',points:10,teacherNote:''},{...ch,id:'b',lang:'tr',prompt:'5 + 3 kaçtır?',options:['6','8','9'],answer:'8',points:10,teacherNote:''}];
 const id=(await(await api('/api/exams',{method:'POST',body:{exam:d},sess})).json()).item.id;
 await api(`/api/exams/${id}/approve`,{method:'POST',body:{revision:1,confirmed:true},sess});
 const it=(await(await api('/api/pilot/batch',{method:'POST',body:{rows:[{candidateCode:'KOD-E1',seat:'PC-01',examId:id,adjustments:['ONE_PER_PAGE'],extraMinutes:0,breakMinutes:0}]},sess})).json()).items[0];
 const browser=await chromium.launch();
 try{
  const ctx=await browser.newContext({viewport:{width:1200,height:1000}});await ctx.addInitScript(FAKE);const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(base+'/pilot');await p.fill('#code',it.code);await p.keyboard.press('Enter');await p.waitForSelector('label.option');
  assert.equal(await p.locator('[data-read=prompt]').first().getAttribute('lang'),'en');assert.equal(await p.locator('label.option span').first().getAttribute('lang'),'en');
  assert.equal(await p.locator('#reader-voice-en-label').isVisible(),true);
  await p.click('#student-questions section:visible button');await p.waitForFunction(()=>window.__utts.length>=1);
  let u=await p.evaluate(()=>window.__utts.at(-1));assert.equal(u.voice,'Microsoft David'.replace('David','David'),'varsayılan: ilk İngilizce ses');
  assert.match(u.text,/^Question 1\. What is 5 \+ 3\? Option A|^Question 1\. What is 5 \+ 3\?/);assert.equal(u.lang,'en-US');
  // kadın tercihi
  await p.selectOption('#reader-gender','female');await p.click('#student-questions section:visible button');await p.waitForFunction(()=>window.__utts.length>=2);
  u=await p.evaluate(()=>window.__utts.at(-1));assert.equal(u.voice,'Microsoft Zira');
  // Türkçe soru: kadın Türkçe ses (Emel), Türkçe etiket ve matematik okunuşu
  await p.click('#next-question');await p.click('#student-questions section:visible button');await p.waitForFunction(()=>window.__utts.length>=3);
  u=await p.evaluate(()=>window.__utts.at(-1));assert.equal(u.voice,'Microsoft Emel');assert.match(u.text,/^Soru 2\./);
  // erkek tercihi
  await p.selectOption('#reader-gender','male');await p.click('#student-questions section:visible button');await p.waitForFunction(()=>window.__utts.length>=4);
  assert.equal((await p.evaluate(()=>window.__utts.at(-1))).voice,'Microsoft Tolga');
  assert.deepEqual(errs,[]);
 }finally{await browser.close();}
});
