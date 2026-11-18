// Real-browser test of the server-connected student page (/pilot) with a stubbed API.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {dirname,join,extname} from 'node:path';
const require=createRequire(import.meta.url);
let chromium=null;try{({chromium}=require('playwright'));}catch{}
const skip=chromium?false:'playwright yok';
const dir=dirname(fileURLToPath(import.meta.url));
const types={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html; charset=utf-8'};
const examPayload=(extra=0)=>({number:0,title:'Deneme',subject:'Matematik',grade:'2',durationMinutes:10,extraMinutes:extra,questions:[
 {number:1,id:'q1',type:'choice',prompt:'4+3?',audioAllowed:true,largeTargets:false,writtenCue:'',visualDescription:'',options:[{id:'A',label:'Altı'},{id:'B',label:'Yedi'}]},
 {number:2,id:'q2',type:'choice',prompt:'2+2?',audioAllowed:true,largeTargets:false,writtenCue:'',visualDescription:'',options:[{id:'A',label:'Dört'},{id:'B',label:'Beş'}]}]});
function server(extra){const submitted=[];const s=http.createServer(async(req,res)=>{
 const url=req.url.split('?')[0];
 if(req.method==='POST'){let b='';for await(const c of req)b+=c;res.setHeader('Content-Type','application/json');
  if(url==='/api/pilot/redeem')return res.end(JSON.stringify({token:'t'.repeat(40),exam:examPayload(extra)}));
  if(url==='/api/pilot/submit'){submitted.push({auth:req.headers.authorization,body:JSON.parse(b)});return res.end(JSON.stringify({receipt:'R-1'}));}}
 const file=url==='/pilot'?'pilot.html':url.slice(1);
 try{const data=await readFile(join(dir,file));res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404).end();}
});return new Promise(r=>s.listen(0,'127.0.0.1',()=>r({s,submitted,port:s.address().port})));}

async function enter(page,port){await page.goto(`http://127.0.0.1:${port}/pilot`);await page.fill('#code','ABCDEF');await page.click('#redeem-form button');await page.waitForSelector('#player:not([hidden])');}

test('öğrenci /pilot: süre, durum, kısayol, onaylı tek seferlik teslim, ek süre',{skip},async()=>{
 const {s,submitted,port}=await server(5);const browser=await chromium.launch();
 try{
  const page=await browser.newPage();const dialogs=[];page.on('dialog',d=>{dialogs.push(d.message());d.accept();});
  await enter(page,port);
  assert.match(await page.textContent('#exam-info'),/10 dakika \+ kurum onaylı 5 dakika ek süre/);
  assert.ok((await page.textContent('#timer')).startsWith('15:'));
  assert.match(await page.textContent('#question-progress'),/Henüz cevaplanmadı/);
  await page.focus('#student-questions h2');
  await page.keyboard.press('Alt+Shift+T');assert.match(await page.textContent('#message'),/Kalan süre: (14|15) dakika/);
  await page.keyboard.press('Alt+Shift+2');
  assert.match(await page.textContent('#message'),/Seçenek B seçildi/);
  assert.match(await page.textContent('#question-progress'),/Cevaplandı/);
  await page.keyboard.press('Alt+Shift+D');assert.match(await page.textContent('#message'),/1 soru cevaplandı, 1 soru boş/);
  await page.check('#simple-mode');await page.check('#big-targets');
  assert.equal(await page.locator('#dou-reader').isHidden(),true);
  await page.click('#send');
  assert.match(dialogs[0],/1 soru cevaplandı, 1 soru boş/);
  await page.waitForSelector('#done:not([hidden])');
  assert.equal(submitted.length,1);assert.deepEqual(submitted[0].body.answers,{q1:'B'});
 }finally{await browser.close();s.close();}
});

test('öğrenci /pilot: süre dolunca yanıtlar kilitlenir (görsel uyarı)',{skip},async()=>{
 const {s,port}=await server(0);const browser=await chromium.launch();
 try{
  const page=await browser.newPage();await page.clock.install({time:0});await enter(page,port);
  await page.clock.fastForward(541*1000);await page.waitForTimeout(1300);
  assert.match(await page.textContent('#time-alert'),/1 dakika kaldı|5 dakika kaldı|10 dakika kaldı|Süre doldu/);
  await page.clock.fastForward(70*1000);await page.waitForTimeout(1300);
  assert.match(await page.textContent('#time-alert'),/Süre doldu/);
  assert.equal(await page.locator('#student-questions input').first().isDisabled(),true);
 }finally{await browser.close();s.close();}
});

test('öğrenci /pilot: oturum sırasında yenileme/kapatma uyarısı',{skip},async()=>{
 const {s,port}=await server(0);const browser=await chromium.launch();
 try{
  const page=await browser.newPage();await enter(page,port);
  const warned=await page.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;});
  assert.equal(warned,true);
  await page.evaluate(()=>{});
 }finally{await browser.close();s.close();}
});
