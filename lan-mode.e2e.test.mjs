// Salon (LAN) modu: sunucunun ağ adresi üzerinden "başka bir bilgisayar" gibi bağlanıp yalnızca öğrenci yüzeyine erişilebildiğini doğrular.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir,networkInterfaces} from 'node:os';
import {webcrypto} from 'node:crypto';
import {createServer as tcp} from 'node:net';
import http from 'node:http';
import {createDemo} from './core.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);let chromium=null;try{({chromium}=require('playwright'));}catch{}
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const lanIp=Object.values(networkInterfaces()).flat().find(i=>i&&i.family==='IPv4'&&!i.internal)?.address;
const dir=mkdtempSync(join(tmpdir(),'bep-lan-'));
const probe=tcp();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
process.env.BEP_LAN_MODE='1';process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'l.sqlite');process.env.PORT=String(port);
const {openStore}=await import('./server-foundation/institutional-store.mjs');const store=openStore(process.env.BEP_DB_PATH);
const pass='Sentetik-BEP-Yalniz-Test-2026!';store.createTenantAdmin({tenantId:'anonim-n',tenantName:'Anonim',email:'t@anonim-n.invalid',password:pass});
const {createServer}=await import('./server.mjs');const server=createServer();await new Promise(r=>server.listen(port,'0.0.0.0',r));
after(async()=>{await new Promise(r=>server.close(r));if(store.db.open)store.db.close();rmSync(dir,{recursive:true,force:true});});
const req=(host,path,{method='GET',body,headers={}}={})=>new Promise((resolve,reject)=>{
 const data=body?JSON.stringify(body):null;
 const r=http.request({host,port,path,method,headers:{...(data?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}:{}),...headers}},res=>{const c=[];res.on('data',x=>c.push(x));res.on('end',()=>resolve({status:res.statusCode,text:Buffer.concat(c).toString(),headers:res.headers}));});
 r.on('error',reject);if(data)r.write(data);r.end();});
test('ağ adresi üzerinden: yalnızca öğrenci yüzeyi açık; yönetim ve giriş kapalı; sahte Host/Origin reddedilir',{skip:lanIp?false:'ağ arayüzü yok'},async()=>{
 // Öğretmen sunucu bilgisayarında (loopback) kod üretir.
 const lr=await req('127.0.0.1','/api/login',{method:'POST',body:{tenantId:'anonim-n',email:'t@anonim-n.invalid',password:pass},headers:{Host:`127.0.0.1:${port}`}});assert.equal(lr.status,200);
 const sess={Cookie:lr.headers['set-cookie'].map(c=>c.split(';')[0]).join('; '),'X-CSRF-Token':JSON.parse(lr.text).csrf,Host:`127.0.0.1:${port}`};
 const d=createDemo();d.adaptations.visualCues=false;d.profile='';const ch=d.questions.find(q=>q.type==='choice');
 d.questions=[{...ch,prompt:'5 + 3 işleminin sonucu kaçtır?',options:['6','8','9'],answer:'8',teacherNote:''}];
 const id=JSON.parse((await req('127.0.0.1','/api/exams',{method:'POST',body:{exam:d},headers:sess})).text).item.id;
 await req('127.0.0.1',`/api/exams/${id}/approve`,{method:'POST',body:{revision:1,confirmed:true},headers:sess});
 globalThis.__lan={sess,id};
 const item=JSON.parse((await req('127.0.0.1','/api/pilot',{method:'POST',body:{examId:id,candidateCode:'KOD-001',seat:'PC-01',adjustments:['LARGE_PRINT']},headers:sess})).text).item;
 const H={Host:`${lanIp}:${port}`};
 // Öğrenci bilgisayarı gibi (LAN IP üzerinden)
 for(const p of ['/pilot','/pilot.mjs','/dou-reader-panel.mjs','/dou-speech-neural.mjs','/dou-theme.css','/okur/models.json'])assert.equal((await req(lanIp,p,{headers:H})).status,200,p);
 const red=await req(lanIp,'/api/pilot/redeem',{method:'POST',body:{code:item.code},headers:{...H,Origin:`http://${lanIp}:${port}`}});assert.equal(red.status,200);const r=JSON.parse(red.text);
 assert.equal(r.profile.fontSize,28);assert.equal(r.candidateCode,'KOD-001');
 assert.equal((await req(lanIp,'/api/pilot/draft',{method:'POST',body:{answers:{q1:'B'}},headers:{...H,Authorization:'Bearer '+r.token}})).status,200);
 // Kapalı olanlar
 for(const p of ['/kurum','/kurumsal-sinav','/salon-oturumu','/pilot-yonetim','/lab.mjs','/institution.mjs','/server.mjs','/terminology.json'])assert.equal((await req(lanIp,p,{headers:H})).status,403,p);
 for(const [m,p] of [['POST','/api/login'],['GET','/api/session'],['GET','/api/pilot'],['GET','/api/pilot/live'],['POST','/api/pilot/batch'],['GET','/api/lan-info'],['GET','/api/exams']])assert.equal((await req(lanIp,p,{method:m,body:m==='POST'?{}:undefined,headers:H})).status,403,m+' '+p);
 assert.equal((await req(lanIp,'/api/pilot/submit',{method:'GET',headers:H})).status,403,'öğrenci API\'si yalnız POST');
 // Sahte Host ve Origin
 assert.equal((await req(lanIp,'/pilot',{headers:{Host:'evil.example'}})).status,403,'DNS rebinding: bilinmeyen Host');
 assert.equal((await req(lanIp,'/api/pilot/submit',{method:'POST',body:{answers:{}},headers:{...H,Origin:'http://evil.example',Authorization:'Bearer '+r.token}})).status,403,'bilinmeyen Origin');
 // Teslim LAN üzerinden; sonuç öğretmen tarafında loopback ile
 assert.equal((await req(lanIp,'/api/pilot/submit',{method:'POST',body:{answers:{q1:'B'}},headers:{...H,Authorization:'Bearer '+r.token}})).status,200);
 const live=JSON.parse((await req('127.0.0.1','/api/pilot/live',{headers:sess})).text).items;assert.equal(live[0].status,'submitted');
 // Salon bilgisi yalnız loopback
 const info=JSON.parse((await req('127.0.0.1','/api/lan-info',{headers:sess})).text);assert.equal(info.enabled,true);assert.ok(info.urls.some(u=>u.startsWith(`http://${lanIp}:${port}/pilot`)));
 // Loopback yönetim sayfaları etkilenmez
 assert.equal((await req('127.0.0.1','/kurum',{headers:{Host:`127.0.0.1:${port}`}})).status,200);
});

test('gerçek tarayıcı, ağ adresi üzerinden: öğrenci sayfası açılır, kod girilir, profil uygulanır, yanıt kaydı ve teslim çalışır',{skip:(lanIp&&chromium)?false:'ağ arayüzü veya playwright yok',timeout:90000},async()=>{
 const {sess,id}=globalThis.__lan;
 const item=JSON.parse((await req('127.0.0.1','/api/pilot',{method:'POST',body:{examId:id,candidateCode:'KOD-002',seat:'PC-02',adjustments:['HIGH_CONTRAST','LARGE_TARGETS'],extraMinutes:5},headers:sess})).text).item;
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  const failed=[];page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+r.url());});
  await page.goto(`http://${lanIp}:${port}/pilot`);
  await page.fill('#code',item.code);await page.keyboard.press('Enter');await page.waitForSelector('#player:not([hidden])');
  assert.equal(await page.isChecked('#contrast'),true);assert.equal(await page.isChecked('#big-targets'),true);assert.match(await page.textContent('#exam-info'),/KOD-002.*PC-02/);
  await page.focus('#student-questions h2');await page.keyboard.press('Alt+Shift+2');
  await page.waitForFunction(()=>/otomatik kaydedildi/.test(document.getElementById('save-status').textContent),null,{timeout:8000});
  await page.click('#send');await page.waitForSelector('#done:not([hidden])');
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[],'LAN üzerinden hiçbir kaynak reddedilmedi');
 }finally{await browser.close();}
});
