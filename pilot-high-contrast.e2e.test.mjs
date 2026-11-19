// Yüksek kontrast: seçenek kartlarında yazı, zeminden ayırt edilebilir olmalı (beyaz zemin + beyaz yazı hatası).
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
const dir=mkdtempSync(join(tmpdir(),'bep-hc-'));
const probe=tcp();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'h.sqlite');process.env.PORT=String(port);
const {openStore}=await import('./server-foundation/institutional-store.mjs');const store=openStore(process.env.BEP_DB_PATH);
const pass='Sentetik-BEP-Yalniz-Test-2026!';store.createTenantAdmin({tenantId:'anonim-h',tenantName:'Anonim',email:'t@anonim-h.invalid',password:pass});
const {createServer}=await import('./server.mjs');const server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
after(async()=>{await new Promise(r=>server.close(r));if(store.db.open)store.db.close();rmSync(dir,{recursive:true,force:true});});
const base=`http://127.0.0.1:${port}`;
const api=(path,{method='GET',body,sess}={})=>fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(sess?{Cookie:sess.cookie,'X-CSRF-Token':sess.csrf}:{})},body:body?JSON.stringify(body):undefined});
test('yüksek kontrast: seçenek kartı yazısı zeminle en az 7:1 kontrast verir (seçili ve seçili değil)',{skip:chromium?false:'playwright yok',timeout:60000},async()=>{
 const r=await api('/api/login',{method:'POST',body:{tenantId:'anonim-h',email:'t@anonim-h.invalid',password:pass}});const v=await r.json();
 const sess={cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),csrf:v.csrfToken||v.csrf};
 const d=createDemo();d.duration=30;d.adaptations.visualCues=false;d.profile='';const ch=d.questions.find(q=>q.type==='choice');
 d.questions=[{...ch,prompt:'5 + 3 kaçtır?',options:['6','8','9'],answer:'8',teacherNote:''}];
 const id=(await(await api('/api/exams',{method:'POST',body:{exam:d},sess})).json()).item.id;
 await api(`/api/exams/${id}/approve`,{method:'POST',body:{revision:1,confirmed:true},sess});
 const it=(await(await api('/api/pilot/batch',{method:'POST',body:{rows:[{candidateCode:'KOD-HC1',seat:'PC-01',examId:id,adjustments:['HIGH_CONTRAST','LARGE_PRINT'],extraMinutes:0,breakMinutes:0}]},sess})).json()).items[0];
 const browser=await chromium.launch();
 try{
  const p=await browser.newPage({viewport:{width:1200,height:900}});await p.goto(base+'/pilot');await p.fill('#code',it.code);await p.keyboard.press('Enter');
  await p.waitForSelector('label.option');assert.equal(await p.evaluate(()=>document.body.classList.contains('high')),true);
  await p.click('label.option:nth-of-type(2)');
  const ratios=await p.evaluate(()=>{
   const lum=c=>{const [r,g,b]=c.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.03928?x/12.92:((x+.055)/1.055)**2.4});return .2126*r+.7152*g+.0722*b;};
   return [...document.querySelectorAll('label.option')].map(l=>{const s=getComputedStyle(l);const a=lum(s.color),b=lum(s.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});});
  assert.ok(ratios.length>=3);for(const x of ratios)assert.ok(x>=7,'kontrast '+x.toFixed(2));
 }finally{await browser.close();}
});
