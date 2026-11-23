// Canlı müdahale: sınav sırasında öğretmen ek süre verir ve mesaj gönderir; aday ekranı bunu alır.
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
const dir=mkdtempSync(join(tmpdir(),'bep-live-'));
const probe=tcp();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'l.sqlite');process.env.PORT=String(port);
const {openStore}=await import('./server-foundation/institutional-store.mjs');const store=openStore(process.env.BEP_DB_PATH);
const pass='Sentetik-BEP-Yalniz-Test-2026!';
store.createTenantAdmin({tenantId:'anonim-l',tenantName:'Anonim',email:'t@anonim-l.invalid',password:pass});store.createTenantAdmin({tenantId:'anonim-m',tenantName:'Diger',email:'t@anonim-m.invalid',password:pass});
const {createServer}=await import('./server.mjs');const server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
after(async()=>{await new Promise(r=>server.close(r));if(store.db.open)store.db.close();rmSync(dir,{recursive:true,force:true});});
const base=`http://127.0.0.1:${port}`;
const api=(path,{method='GET',body,sess,headers={}}={})=>fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(sess?{Cookie:sess.cookie,'X-CSRF-Token':sess.csrf}:{}),...headers},body:body?JSON.stringify(body):undefined});
async function login(t){const r=await api('/api/login',{method:'POST',body:{tenantId:'anonim-'+t,email:`t@anonim-${t}.invalid`,password:pass}});const v=await r.json();return {cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),csrf:v.csrfToken||v.csrf};}
test('ek süre ve mesaj: sınırlar, yetki, aday ekranına ulaşma, kayıtta görünme',{skip:chromium?false:'playwright yok',timeout:120000},async()=>{
 const sess=await login('l'),other=await login('m');
 const d=createDemo();d.title='CAN101 Canlı Sınav';d.duration=10;d.adaptations.visualCues=false;d.profile='';const ch=d.questions.find(q=>q.type==='choice');
 d.questions=[{...ch,id:'a',prompt:'5 + 3 kaçtır?',options:['6','8','9'],answer:'8',points:10,teacherNote:''}];
 const id=(await(await api('/api/exams',{method:'POST',body:{exam:d},sess})).json()).item.id;
 await api(`/api/exams/${id}/approve`,{method:'POST',body:{revision:1,confirmed:true},sess});
 const items=(await(await api('/api/pilot/batch',{method:'POST',body:{rows:[
  {candidateCode:'KOD-L1',seat:'PC-01',examId:id,adjustments:[],extraMinutes:0,breakMinutes:0},
  {candidateCode:'KOD-L2',seat:'PC-02',examId:id,adjustments:[],extraMinutes:0,breakMinutes:0}]},sess})).json()).items;
 const list=async()=>(await(await api('/api/pilot/live',{sess})).json()).items;
 const sid1=(await list()).find(x=>x.candidateCode==='KOD-L1').id;
 assert.equal((await api(`/api/pilot/${sid1}/extend`,{method:'POST',body:{minutes:5},sess})).status,409,'girmemiş aday');
 const A=await(await api('/api/pilot/redeem',{method:'POST',body:{code:items[0].code}})).json();
 const bad=await api(`/api/pilot/${sid1}/extend`,{method:'POST',body:{minutes:0},sess});assert.equal(bad.status,422);
 assert.ok((await api(`/api/pilot/${sid1}/extend`,{method:'POST',body:{minutes:5},sess:other})).status>=400,'başka kurum veremez');
 const ok=await api(`/api/pilot/${sid1}/extend`,{method:'POST',body:{minutes:5},sess});assert.equal(ok.status,200);const j=await ok.json();assert.equal(j.liveExtraMinutes,5);
 const st=await(await api('/api/pilot/state?after=0',{headers:{Authorization:'Bearer '+A.token}})).json();
 assert.ok(st.remainingSeconds>10*60+4*60,'kalan süre uzadı: '+st.remainingSeconds);
 assert.equal((await api(`/api/pilot/${sid1}/extend`,{method:'POST',body:{minutes:60},sess})).status,200);
 assert.equal((await api(`/api/pilot/${sid1}/extend`,{method:'POST',body:{minutes:60},sess})).status,422,'toplam sınır');
 // mesaj: tek aday / herkes
 assert.equal((await api('/api/pilot/message',{method:'POST',body:{text:'  '},sess})).status,422);
 assert.equal((await api('/api/pilot/message',{method:'POST',body:{text:'Sadece KOD-L1: lütfen kaydınızı kontrol edin.',sessionId:sid1},sess})).status,200);
 assert.equal((await api('/api/pilot/message',{method:'POST',body:{text:'Herkese: 10 dakika kaldı.'},sess})).status,200);
 const m1=(await(await api('/api/pilot/state?after=0',{headers:{Authorization:'Bearer '+A.token}})).json()).messages.map(x=>x.text);
 assert.deepEqual(m1,['Sadece KOD-L1: lütfen kaydınızı kontrol edin.','Herkese: 10 dakika kaldı.']);
 const B=await(await api('/api/pilot/redeem',{method:'POST',body:{code:items[1].code}})).json();
 assert.deepEqual((await(await api('/api/pilot/state?after=0',{headers:{Authorization:'Bearer '+B.token}})).json()).messages,[],'B girmeden önceki mesajı almaz');
 assert.equal((await api('/api/pilot/state?after=0')).status,401,'oturumsuz');
 // tarayıcı: aday ekranı uzatmayı ve mesajı alır
 const browser=await chromium.launch();
 try{
  const sid2=(await list()).find(x=>x.candidateCode==='KOD-L2').id;
  const ctx=await browser.newContext({viewport:{width:1200,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  p.on('dialog',x=>x.accept());
  const it3=(await(await api('/api/pilot/batch',{method:'POST',body:{rows:[{candidateCode:'KOD-L3',seat:'PC-03',examId:id,adjustments:[],extraMinutes:0,breakMinutes:0}]},sess})).json()).items[0];
  await p.goto(base+'/pilot');await p.fill('#code',it3.code);await p.keyboard.press('Enter');await p.waitForSelector('label.option');
  const sid3=(await list()).find(x=>x.candidateCode==='KOD-L3').id;
  await api(`/api/pilot/${sid3}/extend`,{method:'POST',body:{minutes:10},sess});
  await api('/api/pilot/message',{method:'POST',body:{text:'Gözetmen: sorunuz varsa elinizi kaldırın.',sessionId:sid3},sess});
  await p.waitForSelector('#teacher-message:not([hidden])',{timeout:20000});
  assert.match(await p.textContent('#teacher-message-text'),/elinizi kaldırın/);
  await p.waitForFunction(()=>/Gözetmen sürenizi uzattı/.test(document.getElementById('time-alert').textContent),null,{timeout:20000});
  assert.ok(await p.evaluate(()=>{const t=document.getElementById('timer').textContent;return /\d/.test(t);}));
  await p.click('#teacher-message-ok');assert.equal(await p.locator('#teacher-message').isHidden(),true);
  await p.locator('label.option').first().click();await p.click('#send');await p.waitForSelector('#done:not([hidden])');
  const rec=(await(await api(`/api/pilot/${sid3}/record`,{sess})).json()).record;assert.equal(rec.liveExtraMinutes,10);
  assert.deepEqual(errs,[]);
 }finally{await browser.close();}
});
