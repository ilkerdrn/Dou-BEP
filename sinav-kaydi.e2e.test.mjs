// Sınav kaydı (evrak): sorular + öğrencinin yanıtları + doğru yanıt + öğretmen puanı, tarayıcıda yazdırılabilir sayfa.
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
const dir=mkdtempSync(join(tmpdir(),'bep-rec-'));
const probe=tcp();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'r.sqlite');process.env.PORT=String(port);
const {openStore}=await import('./server-foundation/institutional-store.mjs');const store=openStore(process.env.BEP_DB_PATH);
const pass='Sentetik-BEP-Yalniz-Test-2026!';store.createTenantAdmin({tenantId:'anonim-k',tenantName:'Anonim Kurum',email:'t@anonim-k.invalid',password:pass});store.createTenantAdmin({tenantId:'anonim-z',tenantName:'Diger Kurum',email:'t@anonim-z.invalid',password:pass});
const {createServer}=await import('./server.mjs');const server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
after(async()=>{await new Promise(r=>server.close(r));if(store.db.open)store.db.close();rmSync(dir,{recursive:true,force:true});});
const base=`http://127.0.0.1:${port}`;
const api=(path,{method='GET',body,sess}={})=>fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(sess?{Cookie:sess.cookie,'X-CSRF-Token':sess.csrf}:{})},body:body?JSON.stringify(body):undefined});
async function login(t){const r=await api('/api/login',{method:'POST',body:{tenantId:'anonim-'+t,email:`t@anonim-${t}.invalid`,password:pass}});const v=await r.json();return {cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),csrf:v.csrfToken||v.csrf};}
test('kayıt: soru, öğrenci yanıtı, doğru yanıt ve puan; başka kurum göremez; yazdırılabilir sayfa',{skip:chromium?false:'playwright yok',timeout:90000},async()=>{
 const sess=await login('k'),other=await login('z');
 const d=createDemo();d.title='KAY101 Kayıt Sınavı';d.subject='Deneme';d.duration=30;d.adaptations.visualCues=false;d.profile='';
 const ch=d.questions.find(q=>q.type==='choice'),sh=d.questions.find(q=>q.type==='short'),mt=d.questions.find(q=>q.type==='matching');
 d.questions=[{...ch,id:'a',prompt:'5 + 3 kaçtır?',options:['6','8','9'],answer:'8',points:10,teacherNote:''},
  {...mt,id:'b',type:'matching',prompt:'Eşleştirin.',pairs:[{left:'2 + 3',right:'5'},{left:'8 − 2',right:'6'}],points:20,options:[],answer:'',teacherNote:''},
  {...sh,id:'c',type:'short',prompt:'Kavramı açıklayınız.',answer:'Beklenen örnek yanıt',points:30,options:[],pairs:[],teacherNote:''}];
 const id=(await(await api('/api/exams',{method:'POST',body:{exam:d},sess})).json()).item.id;
 await api(`/api/exams/${id}/approve`,{method:'POST',body:{revision:1,confirmed:true},sess});
 const it=(await(await api('/api/pilot/batch',{method:'POST',body:{rows:[{candidateCode:'KOD-777',seat:'PC-07',examId:id,adjustments:['LARGE_PRINT'],extraMinutes:10,breakMinutes:5}]},sess})).json()).items[0];
 const red=await(await api('/api/pilot/redeem',{method:'POST',body:{code:it.code}})).json();
 const q=red.exam.questions;const opt8=q[0].options.find(o=>o.label==='8').id;
 const m={};for(const l of q[1].left){m[l.id]=q[1].right.find(r=>r.label===(l.label==='2 + 3'?'5':'6')).id;}
 const sub=await fetch(base+'/api/pilot/submit',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+red.token},body:JSON.stringify({answers:{q1:opt8,q2:m,q3:'Benim yazılı yanıtım ÖRNEK-METİN'}})});assert.equal(sub.status,200,await sub.clone().text());
 const live=(await(await api('/api/pilot',{sess})).json()).items;const sid=live[0].id;
 const rec=(await(await api(`/api/pilot/${sid}/record`,{sess})).json()).record;
 assert.equal(rec.candidateCode,'KOD-777');assert.equal(rec.questions.length,3);
 assert.equal(rec.questions[0].responseLabel,'8');assert.equal(rec.questions[0].correctLabel,'8');assert.equal(rec.questions[0].suggestedScore,10);
 assert.deepEqual(rec.questions[1].pairs.map(p=>[p.response,p.correct]),[['5','5'],['6','6']]);
 assert.equal(rec.questions[2].response,'Benim yazılı yanıtım ÖRNEK-METİN');assert.equal(rec.questions[2].modelAnswer,'Beklenen örnek yanıt');
 assert.equal(rec.totals.objectiveMax,30);assert.equal(rec.totals.complete,false);
 assert.equal((await api(`/api/pilot/${sid}/record`)).status>=400,true,'oturumsuz erişim yok');
 assert.equal((await api(`/api/pilot/${sid}/record`,{sess:other})).status>=400,true,'başka kurum erişemez');
 const browser=await chromium.launch();
 try{
  const ctx=await browser.newContext({viewport:{width:1100,height:900}});
  await ctx.addCookies(sess.cookie.split('; ').map(c=>{const [n,...v]=c.split('=');return {name:n,value:v.join('='),url:base};}));
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(base+'/sinav-kaydi');await p.waitForSelector('.record');
  const text=await p.textContent('#records');
  for(const s of ['KAY101 Kayıt Sınavı','KOD-777','PC-07','5 + 3 kaçtır?','Benim yazılı yanıtım ÖRNEK-METİN','Beklenen örnek yanıt','SHA-256'])assert.ok(text.includes(s),s);
  assert.equal(await p.locator('li.correct').count(),1);assert.equal(await p.locator('li.chosen').count(),1);
  assert.equal(await p.locator('#print').isEnabled(),true);
  await p.emulateMedia({media:'print'});assert.equal(await p.locator('.toolbar').isVisible(),false,'araç çubuğu yazdırmada gizli');assert.equal(await p.locator('.record').isVisible(),true);
  const pdf=await p.pdf({format:'A4'});assert.ok(pdf.length>2000);
  assert.deepEqual(errs,[]);
 }finally{await browser.close();}
});
