// Sunucu tarafı ek süre ve bitiş zamanı: öğrenci başına ek süre, sunucu denetimli süre, süre bitince otomatik teslim.
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
const pass='Sentetik-BEP-Yalniz-Test-2026!';
async function boot(){
 const temp=mkdtempSync(join(tmpdir(),'bep-time-e2e-'));
 const s=tcp();await new Promise(r=>s.listen(0,'127.0.0.1',r));const port=s.address().port;await new Promise(r=>s.close(r));
 process.env.PORT=String(port);process.env.BEP_DB_PATH=join(temp,'e2e.sqlite');process.env.BEP_NO_LISTEN='1';
 const {openStore}=await import('./server-foundation/institutional-store.mjs');const store=openStore(process.env.BEP_DB_PATH);
 store.createTenantAdmin({tenantId:'anonim-e2e',tenantName:'Anonim',email:'t@anonim-e2e.invalid',password:pass});
 const {createServer}=await import('./server.mjs');const server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
 const base=`http://127.0.0.1:${port}`;
 const api=(path,{method='GET',body,sess}={})=>fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(sess?{Cookie:sess.cookie,'X-CSRF-Token':sess.csrf}:{})},body:body?JSON.stringify(body):undefined});
 const lr=await api('/api/login',{method:'POST',body:{tenantId:'anonim-e2e',email:'t@anonim-e2e.invalid',password:pass}});
 const lv=await lr.json();const sess={cookie:lr.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),csrf:lv.csrf};
 const demo=createDemo();demo.adaptations.visualCues=false;demo.profile='';demo.duration=20;
 demo.questions=[{...demo.questions.find(q=>q.type==='choice'),prompt:'5 + 3 işleminin sonucu kaçtır?',options:['6','8','9'],answer:'8',teacherNote:''}];
 const id=(await(await api('/api/exams',{method:'POST',body:{exam:demo},sess})).json()).item.id;
 await api(`/api/exams/${id}/approve`,{method:'POST',body:{revision:1,confirmed:true},sess});
 const close=async()=>{if(server.listening)await new Promise(r=>server.close(r));if(store.db.open)store.db.close();rmSync(temp,{recursive:true,force:true});};
 return {base,api,sess,id,store,close};
}
const env=await boot();after(()=>env.close());
test('ek süre doğrulanır; süre kodu girince başlar ve sunucu bitişi denetler',async()=>{
 const {api,sess,id,store,base}=env;
 try{
  for(const bad of [-1,121,1.5,'5'])assert.equal((await api('/api/pilot',{method:'POST',body:{examId:id,extraMinutes:bad},sess})).status,422,String(bad));
  const item=(await(await api('/api/pilot',{method:'POST',body:{examId:id,extraMinutes:5},sess})).json()).item;
  const redeemed=await(await api('/api/pilot/redeem',{method:'POST',body:{code:item.code}})).json();
  assert.equal(redeemed.remainingSeconds,25*60);assert.equal(redeemed.exam.extraMinutes,5);assert.equal(redeemed.exam.durationMinutes,20);
  const row=store.db.prepare('SELECT started_at,expires_at FROM pilot_sessions WHERE id=?').get(item.id);
  assert.equal(row.expires_at-row.started_at,25*60000+120000,'bitiş = süre + ek süre + 2 dk ağ payı');
  // Süre sunucuda geçmişse teslim reddedilir.
  store.db.prepare('UPDATE pilot_sessions SET expires_at=? WHERE id=?').run(Date.now()-1000,item.id);
  const late=await fetch(base+'/api/pilot/submit',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+redeemed.token},body:JSON.stringify({answers:{[redeemed.exam.questions[0].id]:'B'}})});
  assert.equal(late.status,401);
  // Ek süresiz oturumda varsayılan 0.
  const plain=(await(await api('/api/pilot',{method:'POST',body:{examId:id},sess})).json()).item;
  const r2=await(await api('/api/pilot/redeem',{method:'POST',body:{code:plain.code}})).json();
  assert.equal(r2.remainingSeconds,20*60);assert.equal(r2.exam.extraMinutes,0);
 }finally{}
});
test('süre dolunca tarayıcı yanıtları otomatik teslim eder',{skip:chromium?false:'playwright yok'},async()=>{
 const {base,api,sess,id}=env;let browser;
 try{
  const item=(await(await api('/api/pilot',{method:'POST',body:{examId:id},sess})).json()).item;
  browser=await chromium.launch();const page=await browser.newPage();
  await page.clock.install({time:Date.now()});
  await page.goto(base+'/pilot');await page.fill('#code',item.code);await page.keyboard.press('Enter');await page.waitForSelector('#player:not([hidden])');
  await page.focus('#student-questions h2');await page.keyboard.press('Alt+Shift+2');
  await page.clock.fastForward(20*60*1000+2000);
  await page.waitForSelector('#done:not([hidden])',{timeout:10000});
  assert.match(await page.textContent('#receipt'),/Teslim referansı/);
  const list=await(await api('/api/pilot',{sess})).json();assert.equal(list.items.find(x=>x.id===item.id).status,'submitted');
  const view=await(await api('/api/pilot/'+item.id,{sess})).json();
  assert.deepEqual(Object.values(view.item.answers),['B'],'kilitlenmeden önce işaretlenen yanıt gönderildi');
 }finally{await browser?.close();}
});
