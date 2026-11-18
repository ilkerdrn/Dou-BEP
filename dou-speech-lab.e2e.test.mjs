// DOU Reader laboratuvarı: "WAV üret ve dinle" gerçekten ses üretmeli, kendi "durdur" olayıyla iptal olmamalı.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import {createServer as tcp} from 'node:net';
const require=createRequire(import.meta.url);
let chromium=null;try{({chromium}=require('playwright'));}catch{}
const dir=mkdtempSync(join(tmpdir(),'bep-lab-'));
const probe=tcp();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'lab.sqlite');process.env.PORT=String(port);
const {createServer}=await import('./server.mjs');const server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
after(async()=>{await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});});
test('ses laboratuvarı WAV üretir, durdur düğmesi çalışır ve indirme açılır',{skip:chromium?false:'playwright yok'},async()=>{
 const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/dou-reader-demo`,{waitUntil:'load'});
  assert.equal(await page.locator('#free-text-play').isDisabled(),false);
  await page.click('#free-text-play');
  await page.waitForFunction(()=>/sözcük|üretilemedi|oynatamadı|başlatılamadı/.test(document.getElementById('free-text-status').textContent),null,{timeout:15000});
  const status=await page.textContent('#free-text-status');
  // Başsız Chromium'da ses aygıtı yok: WAV üretilir ama play() reddedilebilir. İkisi de "ses üretildi" demektir.
  assert.match(status,/\d+ sözcük · \d+ ses parçası|otomatik başlatılamadı/,'ses üretildi: '+status);
  assert.doesNotMatch(status,/durduruldu/);
  assert.equal(await page.locator('#free-text-download').isDisabled(),false);
  await page.click('#free-text-stop');
  assert.match(await page.textContent('#free-text-status'),/durduruldu/);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
