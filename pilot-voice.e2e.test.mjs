// Sesli yanıt: yalnız onaylı aday, kurum anahtarı açıkken; ses sunucuda saklanır, yalnız yetkili öğretmen dinler; metne çevrilmez.
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
const dir=mkdtempSync(join(tmpdir(),'bep-voice-'));
const probe=tcp();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'v.sqlite');process.env.PORT=String(port);process.env.BEP_VOICE_ANSWERS='1';
const {openStore}=await import('./server-foundation/institutional-store.mjs');const store=openStore(process.env.BEP_DB_PATH);
const pass='Sentetik-BEP-Yalniz-Test-2026!';
store.createTenantAdmin({tenantId:'anonim-v',tenantName:'Anonim',email:'t@anonim-v.invalid',password:pass});store.createTenantAdmin({tenantId:'anonim-w',tenantName:'Diger',email:'t@anonim-w.invalid',password:pass});
const {createServer}=await import('./server.mjs');const server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
after(async()=>{await new Promise(r=>server.close(r));if(store.db.open)store.db.close();rmSync(dir,{recursive:true,force:true});});
const base=`http://127.0.0.1:${port}`;
const api=(path,{method='GET',body,sess,headers={},raw}={})=>fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(sess?{Cookie:sess.cookie,'X-CSRF-Token':sess.csrf}:{}),...headers},body:raw??(body?JSON.stringify(body):undefined)});
async function login(t){const r=await api('/api/login',{method:'POST',body:{tenantId:'anonim-'+t,email:`t@anonim-${t}.invalid`,password:pass}});const v=await r.json();return {cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),csrf:v.csrfToken||v.csrf};}
const WEBM=Buffer.concat([Buffer.from([0x1A,0x45,0xDF,0xA3]),Buffer.alloc(2000,7)]);
test('sesli yanıt kuralları: onaylı aday, biçim/boyut denetimi, yetkili dinleme, kurum anahtarı',{skip:chromium?false:'playwright yok',timeout:120000},async()=>{
 const sess=await login('v'),other=await login('w');
 const d=createDemo();d.title='SES101 Sesli Sınav';d.duration=30;d.adaptations.visualCues=false;d.profile='';
 const ch=d.questions.find(q=>q.type==='choice'),sh=d.questions.find(q=>q.type==='short');
 d.questions=[{...ch,id:'a',prompt:'5 + 3 kaçtır?',options:['6','8','9'],answer:'8',points:10,teacherNote:''},{...sh,id:'b',type:'short',prompt:'Kavramı açıklayınız.',answer:'',points:30,options:[],pairs:[],teacherNote:''}];
 const id=(await(await api('/api/exams',{method:'POST',body:{exam:d},sess})).json()).item.id;
 await api(`/api/exams/${id}/approve`,{method:'POST',body:{revision:1,confirmed:true},sess});
 // anahtar kapalıyken sesli yanıt kodu üretilemez
 process.env.BEP_VOICE_ANSWERS='';
 const off=await api('/api/pilot/batch',{method:'POST',body:{rows:[{candidateCode:'KOD-V0',seat:'PC-00',examId:id,adjustments:['VOICE_ANSWER'],extraMinutes:0,breakMinutes:0}]},sess});
 assert.equal(off.status,422);assert.match((await off.json()).message,/Sesli yanıt bu kurulumda kapalı/);
 process.env.BEP_VOICE_ANSWERS='1';
 const items=(await(await api('/api/pilot/batch',{method:'POST',body:{rows:[
  {candidateCode:'KOD-V1',seat:'PC-01',examId:id,adjustments:['VOICE_ANSWER','ONE_PER_PAGE'],extraMinutes:0,breakMinutes:0},
  {candidateCode:'KOD-V2',seat:'PC-02',examId:id,adjustments:[],extraMinutes:0,breakMinutes:0}]},sess})).json()).items;
 const redeem=async it=>(await(await api('/api/pilot/redeem',{method:'POST',body:{code:it.code}})).json());
 const B=await redeem(items[1]);
 const bAud=(m,b,t)=>api('/api/pilot/voice/q2',{method:m,raw:b,headers:{Authorization:'Bearer '+B.token,'Content-Type':t||'audio/webm','X-Voice-Seconds':'3'}});
 assert.equal(B.profile.voiceAnswer,false);assert.equal((await bAud('PUT',WEBM)).status,403,'onaysız aday ses yükleyemez');
 const A=await redeem(items[0]);assert.equal(A.profile.voiceAnswer,true);
 const aAud=(m,b,t,q='q2')=>api('/api/pilot/voice/'+q,{method:m,raw:b,headers:{Authorization:'Bearer '+A.token,'Content-Type':t||'audio/webm','X-Voice-Seconds':'3'}});
 assert.equal((await aAud('PUT',WEBM,'video/mp4')).status,415,'yanlış biçim');
 assert.equal((await aAud('PUT',Buffer.alloc(2000,1),'audio/webm')).status,415,'sihirli bayt uyuşmuyor');
 assert.equal((await aAud('PUT',Buffer.concat([WEBM,Buffer.alloc(3*1024*1024)]))).status,413,'çok büyük');
 assert.equal((await aAud('PUT',WEBM,'audio/webm','q1')).status,400,'çoktan seçmeli soruya ses yok');
 assert.equal((await aAud('PUT',WEBM)).status,200);
 const own=await aAud('GET');assert.equal(own.headers.get('content-type'),'audio/webm');assert.equal(Buffer.from(await own.arrayBuffer()).length,WEBM.length);
 const live=(await(await api('/api/pilot/live',{sess})).json()).items.find(x=>x.candidateCode==='KOD-V1');assert.equal(live.answered,1,'sesli yanıt cevaplanmış sayılır');
 // teslim → öğretmen dinler; başka kurum dinleyemez; oturumsuz dinleyemez
 const sub=await api('/api/pilot/submit',{method:'POST',headers:{Authorization:'Bearer '+A.token},body:{answers:{q1:A.exam.questions[0].options[0].id}}});assert.equal(sub.status,200);
 const sid=(await(await api('/api/pilot',{sess})).json()).items.find(x=>x.status==='submitted').id;
 const t=await api(`/api/pilot/${sid}/voice/q2`,{sess});assert.equal(t.status,200);assert.equal(t.headers.get('content-type'),'audio/webm');assert.equal(Buffer.from(await t.arrayBuffer()).subarray(0,4).toString('hex'),'1a45dfa3');
 assert.ok((await api(`/api/pilot/${sid}/voice/q2`,{sess:other})).status>=400);assert.ok((await api(`/api/pilot/${sid}/voice/q2`)).status>=400);
 const review=(await(await api(`/api/pilot/${sid}/review`,{sess})).json()).review;assert.equal(review.questions[1].voice.seconds,3);assert.equal(review.questions[0].voice,null);
 const rec=(await(await api(`/api/pilot/${sid}/record`,{sess})).json()).record;assert.equal(rec.questions[1].voice.seconds,3);
 // teslimden sonra yeni ses yüklenemez
 assert.ok((await aAud('PUT',WEBM)).status>=400);
 // silme: oturum silinince ses de silinir
 await api(`/api/pilot/${sid}`,{method:'DELETE',sess});
 assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM pilot_voice').get().n,0,'oturumla birlikte ses silinir');
});
test('tarayıcı: sesli yanıt onayla kaydedilir, tek soru ekranında yanıtlandı sayılır, öğretmen dinler',{skip:chromium?false:'playwright yok',timeout:120000},async()=>{
 const sess=await login('v');
 const d=createDemo();d.title='SES102 Tarayıcı';d.duration=30;d.adaptations.visualCues=false;d.profile='';const sh=d.questions.find(q=>q.type==='short');
 d.questions=[{...sh,id:'b',type:'short',prompt:'Kavramı sesinizle açıklayınız.',answer:'',points:30,options:[],pairs:[],teacherNote:''}];
 const id=(await(await api('/api/exams',{method:'POST',body:{exam:d},sess})).json()).item.id;
 await api(`/api/exams/${id}/approve`,{method:'POST',body:{revision:1,confirmed:true},sess});
 const it=(await(await api('/api/pilot/batch',{method:'POST',body:{rows:[{candidateCode:'KOD-V9',seat:'PC-09',examId:id,adjustments:['VOICE_ANSWER'],extraMinutes:0,breakMinutes:0}]},sess})).json()).items[0];
 const browser=await chromium.launch({args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 try{
  const ctx=await browser.newContext({viewport:{width:1200,height:1000},permissions:['microphone']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',x=>x.accept());
  await p.goto(base+'/pilot');await p.fill('#code',it.code);await p.keyboard.press('Enter');await p.waitForSelector('.voice-box');
  await p.click('.v-start');assert.match(await p.textContent('.v-status'),/kabul ettiğinizi belirten kutuyu işaretleyin/);
  await p.check('.v-consent');await p.click('.v-start');await p.waitForFunction(()=>/Kayıt başladı/.test(document.querySelector('.v-status').textContent));
  assert.equal(await p.locator('.v-stop').isEnabled(),true);await p.waitForTimeout(1500);
  await p.click('.v-stop');await p.waitForFunction(()=>/kaydedildi/.test(document.querySelector('.v-status').textContent),null,{timeout:20000});
  assert.equal(await p.locator('.v-play').isEnabled(),true);assert.equal(await p.locator('.v-del').isEnabled(),true);
  assert.match(await p.textContent('#map-summary'),/1 soru cevaplandı/);
  await p.click('#send');await p.waitForSelector('#done:not([hidden])');
  const sid=(await(await api('/api/pilot',{sess})).json()).items.find(x=>x.status==='submitted').id;
  const t=await api(`/api/pilot/${sid}/voice/q1`,{sess});assert.equal(t.status,200);const bytes=Buffer.from(await t.arrayBuffer());assert.ok(bytes.length>500);
  // öğretmen ekranı ses oynatıcısını gösterir
  const ctx2=await browser.newContext({viewport:{width:1300,height:900}});await ctx2.addCookies(sess.cookie.split('; ').map(c=>{const [n,...v]=c.split('=');return {name:n,value:v.join('='),url:base};}));
  const T=await ctx2.newPage();await T.goto(base+'/sinav-kaydi?id='+sid);await T.waitForSelector('.record');assert.match(await T.textContent('#records'),/Sesli yanıt var/);
  assert.deepEqual(errs,[]);
 }finally{await browser.close();}
});
