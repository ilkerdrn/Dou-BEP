// Real-browser + real HTTP server + temporary SQLite: teacher issues code, student answers by keyboard, submits once.
import test from 'node:test';
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
const skip=chromium?false:'playwright yok';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const pass='Sentetik-BEP-Yalniz-Test-2026!';

test('gerçek sunucu: kod üret → öğrenci klavyeyle yanıtla → tek seferlik teslim → tekrar teslim reddi',{skip},async()=>{
 const temp=mkdtempSync(join(tmpdir(),'bep-pilot-e2e-'));let server,store,browser;
 try{
  const s=tcp();await new Promise(r=>s.listen(0,'127.0.0.1',r));const port=s.address().port;await new Promise(r=>s.close(r));
  process.env.PORT=String(port);process.env.BEP_DB_PATH=join(temp,'e2e.sqlite');process.env.BEP_NO_LISTEN='1';
  const {openStore}=await import('./server-foundation/institutional-store.mjs');
  store=openStore(process.env.BEP_DB_PATH);
  store.createTenantAdmin({tenantId:'anonim-e2e',tenantName:'Anonim',email:'t@anonim-e2e.invalid',password:pass});
  const {createServer}=await import('./server.mjs');server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
  const base=`http://127.0.0.1:${port}`;
  const api=(path,{method='GET',body,sess}={})=>fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(sess?{Cookie:sess.cookie,'X-CSRF-Token':sess.csrf}:{})},body:body?JSON.stringify(body):undefined});
  const lr=await api('/api/login',{method:'POST',body:{tenantId:'anonim-e2e',email:'t@anonim-e2e.invalid',password:pass}});
  const lv=await lr.json();const sess={cookie:lr.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),csrf:lv.csrf};
  const demo=createDemo();demo.adaptations.visualCues=false;demo.profile='';demo.duration=20;
  demo.questions=[{...demo.questions.find(q=>q.type==='choice'),prompt:'5 + 3 işleminin sonucu kaçtır?',options:['6','8','9'],answer:'8',teacherNote:''}];
  assert.ok(demo.questions.length>=1);
  const created=await(await api('/api/exams',{method:'POST',body:{exam:demo},sess})).json();
  const id=created.item.id;
  const ap=await api(`/api/exams/${id}/approve`,{method:'POST',body:{revision:1,confirmed:true},sess});assert.equal(ap.status,200,JSON.stringify(await ap.clone().json()));
  const issued=await api('/api/pilot',{method:'POST',body:{examId:id},sess});
  assert.equal(issued.status,201);const item=(await issued.json()).item;assert.ok(item.code);

  browser=await chromium.launch();const page=await browser.newPage();page.on('dialog',d=>d.accept());
  await page.goto(base+'/pilot');await page.fill('#code',item.code);await page.keyboard.press('Enter');
  await page.waitForSelector('#player:not([hidden])');
  assert.match(await page.textContent('#exam-info'),/Süre 20 dakika/);
  assert.ok((await page.textContent('#timer')).startsWith('20:')||(await page.textContent('#timer')).startsWith('19:'));
  await page.focus('#student-questions h2');await page.keyboard.press('Alt+Shift+2');
  assert.match(await page.textContent('#question-progress'),/Cevaplandı/);
  await page.click('#send');await page.waitForSelector('#done:not([hidden])');
  assert.match(await page.textContent('#receipt'),/Teslim referansı/);
  // Code is single-use.
  const again=await api('/api/pilot/redeem',{method:'POST',body:{code:item.code}});assert.notEqual(again.status,200);
  // Teacher sees exactly one submission.
  const list=await(await api('/api/pilot',{sess})).json();
  assert.equal(list.items.find(x=>x.id===item.id).status,'submitted');
 }finally{await browser?.close();if(server?.listening)await new Promise(r=>server.close(r));if(store?.db?.open)store.db.close();rmSync(temp,{recursive:true,force:true});}
});
