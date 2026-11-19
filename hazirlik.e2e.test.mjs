// Salon hazırlık kontrolü: her öğrenci bilgisayarında sunucu, tarayıcı, ses, model ve kısayol denetimi.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer as tcp} from 'node:net';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let chromium=null;try{({chromium}=require('playwright'));}catch{}
const dir=mkdtempSync(join(tmpdir(),'bep-ready-'));
const probe=tcp();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'h.sqlite');process.env.PORT=String(port);
const {createServer}=await import('./server.mjs');const server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
after(async()=>{await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});});
const base=`http://127.0.0.1:${port}`;
test('hazırlık sayfası oturumsuz açılır, WebAssembly izni vardır, ping çalışır',async()=>{
 const r=await fetch(base+'/hazirlik');assert.equal(r.status,200);assert.match(r.headers.get('content-security-policy'),/'wasm-unsafe-eval'/);
 const p=await(await fetch(base+'/api/ping')).json();assert.equal(p.ok,true);assert.ok(Math.abs(p.at-Date.now())<5000);
 assert.notEqual((await fetch(base+'/api/ping',{method:'POST'})).status,200,'ping yalnız GET');
});
test('tarayıcı: tüm kontroller çalışır; yerel ses yoksa model hazırlanır; kısayol algılanır; genel durum hazır olur',{skip:chromium?false:'playwright yok',timeout:90000},async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1200,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/hazirlik');
  assert.match(await page.textContent('#summary'),/Henüz kontrol yapılmadı/);
  await page.click('#b-server');await page.waitForFunction(()=>/Hazır/.test(document.getElementById('s-server').textContent));
  assert.match(await page.textContent('#s-server'),/Yanıt süresi ortalama \d+ ms/);
  await page.click('#b-browser');assert.match(await page.textContent('#s-browser'),/✓ Hazır/);
  await page.click('#b-voice');assert.match(await page.textContent('#s-voice'),/✗ Sorun var\. Yerel Türkçe ses yok/);
  assert.match(await page.textContent('#summary'),/Eksik var: ses/,'ses yok → genel durum eksik');
  await page.click('#b-neural');await page.waitForFunction(()=>/Model hazır/.test(document.getElementById('s-neural').textContent),null,{timeout:60000});
  assert.match(await page.textContent('#summary'),/✓ Bu bilgisayar sınava hazır/);
  await page.click('#b-screen');assert.match(await page.textContent('#s-screen'),/Pencere 1200×800/);
  await page.keyboard.press('Alt+Shift+T');assert.match(await page.textContent('#s-keys'),/algılandı/);
  await page.click('#b-sound');await page.waitForTimeout(300);await page.click('#b-notheard');
  assert.match(await page.textContent('#s-sound'),/Ses duyulmadı/);assert.match(await page.textContent('#summary'),/Dikkat: ses denemesi duyulmadı/);
  await page.setViewportSize({width:500,height:700});await page.click('#b-screen');assert.match(await page.textContent('#s-screen'),/Pencere dar/);assert.match(await page.textContent('#summary'),/ekran küçük/);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
test('hazırlık sayfası yerel Türkçe ses varken sesi bulur ve ses denemesi yerel sesle yapılır',{skip:chromium?false:'playwright yok',timeout:60000},async()=>{
 const browser=await chromium.launch();
 try{
  const ctx=await browser.newContext({viewport:{width:1200,height:800}});
  await ctx.addInitScript(`(()=>{window.__said=[];const v={name:'Test Türkçe',lang:'tr-TR',localService:true,voiceURI:'t'};Object.defineProperty(window,'SpeechSynthesisUtterance',{value:function(t){this.text=t;},configurable:true,writable:true});Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[v],speak:u=>window.__said.push(u.text),cancel(){},addEventListener(){}}});})();`);
  const page=await ctx.newPage();await page.goto(base+'/hazirlik');
  await page.click('#run-all');await page.waitForFunction(()=>/Hazır/.test(document.getElementById('s-screen').textContent)&&!document.getElementById('run-all').disabled,null,{timeout:20000});
  assert.match(await page.textContent('#s-voice'),/✓ Hazır\. Yerel Türkçe ses bulundu: Test Türkçe/);
  assert.match(await page.textContent('#s-neural'),/Denenmedi/,'yerel ses varken model indirilmez');
  assert.match(await page.textContent('#summary'),/✓ Bu bilgisayar sınava hazır/);
  await page.click('#b-sound');await page.click('#b-heard');
  assert.deepEqual(await page.evaluate(()=>window.__said),['Merhaba. Bu bir ses denemesidir.']);assert.match(await page.textContent('#s-sound'),/✓ Hazır\. Sesi duydunuz/);
 }finally{await browser.close();}
});
