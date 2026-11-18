// Gerçek tarayıcıda çevrimdışı sinir ağı sesi: model yüklenir, anlamlı uzunlukta ve sessiz olmayan ses üretilir.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import {createServer as tcp} from 'node:net';
const require=createRequire(import.meta.url);
let chromium=null;try{({chromium}=require('playwright'));}catch{}
const dir=mkdtempSync(join(tmpdir(),'bep-neural-'));
const probe=tcp();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'n.sqlite');process.env.PORT=String(port);
const {createServer}=await import('./server.mjs');const server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
after(async()=>{await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});});
const base=`http://127.0.0.1:${port}`;
test('WebAssembly izni yalnızca ses kullanan sayfa ve çalıştırıcıda; diğer sayfalarda yok',async()=>{
 for(const p of ['/pilot','/dou-reader-demo','/okur/okur-worker.js'])assert.match((await fetch(base+p)).headers.get('content-security-policy'),/script-src 'self' 'wasm-unsafe-eval'/,p);
 for(const p of ['/kurum','/','/kurumsal-sinav'])assert.doesNotMatch((await fetch(base+p,{redirect:'manual'})).headers.get('content-security-policy')||'',/wasm-unsafe-eval/,p);
 const wasm=await fetch(base+'/okur/models/frontend.1f03663afe58.wasm');assert.equal(wasm.headers.get('content-type'),'application/wasm');
 assert.equal((await fetch(base+'/okur/SHA256SUMS')).status,404,'yalnızca açıkça yayımlanan dosyalar');
});
test('gerçek model Türkçe ses üretir (sessiz değil, süre makul)',{skip:chromium?false:'playwright yok',timeout:120000},async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const external=[];page.on('request',r=>{const u=r.url();if(!u.startsWith(base)&&!u.startsWith('data:')&&!u.startsWith('blob:'))external.push(u);});
  await page.goto(base+'/dou-reader-demo');
  const r=await page.evaluate(async()=>{
   const {createNeuralSpeech}=await import('/dou-speech-neural.mjs');
   const v=createNeuralSpeech({win:window});
   const short=await v.synthesize('Merhaba.');
   const long=await v.synthesize('Soru bir. Beş artı üç işleminin sonucu kaçtır? Seçenek A. Altı. Seçenek B. Sekiz.');
   const stat=a=>{let sum=0,peak=0;for(const x of a.samples){sum+=x*x;if(Math.abs(x)>peak)peak=Math.abs(x);}return {seconds:a.seconds,rms:Math.sqrt(sum/a.samples.length),peak};};
   return {short:stat(short),long:stat(long),wavHead:String.fromCharCode(...long.wav.slice(0,4))};
  });
  assert.equal(r.wavHead,'RIFF');
  assert.ok(r.short.seconds>0.3&&r.short.seconds<3,'kısa: '+r.short.seconds);
  assert.ok(r.long.seconds>r.short.seconds*3,'uzun metin daha uzun ses üretir');
  assert.ok(r.long.rms>0.005&&r.long.peak>0.05&&r.long.peak<=1,'sessiz/bozuk değil: '+JSON.stringify(r.long));
  assert.deepEqual(external,[],'dış ağ isteği yok');assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
test('DOU Reader: Windows Türkçe sesi yokken sinir ağı sesi seçilir ve okur',{skip:chromium?false:'playwright yok',timeout:120000},async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();await page.goto(base+'/dou-reader-demo');
  await page.waitForFunction(()=>document.getElementById('reader-voice').options.length>0);
  assert.equal(await page.inputValue('#reader-voice'),'dou-neural');
  assert.match(await page.textContent('#reader-voice'),/sinir ağı/);
  assert.equal(await page.locator('#reader-read').isDisabled(),false);
  await page.click('#reader-read');
  await page.waitForFunction(()=>/Okunuyor \(DOU Speech|Okuma tamamlandı|çalışmadı/.test(document.getElementById('reader-status').textContent),null,{timeout:90000});
  assert.doesNotMatch(await page.textContent('#reader-status'),/çalışmadı/);
  await page.click('#reader-stop');assert.match(await page.textContent('#reader-status'),/durduruldu/);
 }finally{await browser.close();}
});
