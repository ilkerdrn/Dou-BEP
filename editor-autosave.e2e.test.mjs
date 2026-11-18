// Gerçek tarayıcıda sınav editörü otomatik kaydı: düzenleme sunucuya kaydedilir; betik hatası yok.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {webcrypto} from 'node:crypto';
import {createServer as tcp} from 'node:net';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let chromium=null;try{({chromium}=require('playwright'));}catch{}
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const dir=mkdtempSync(join(tmpdir(),'bep-editor-'));
const probe=tcp();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'e.sqlite');process.env.PORT=String(port);
const {openStore}=await import('./server-foundation/institutional-store.mjs');const store=openStore(process.env.BEP_DB_PATH);
const pass='Sentetik-BEP-Yalniz-Test-2026!';store.createTenantAdmin({tenantId:'anonim-e',tenantName:'Anonim',email:'t@anonim-e.invalid',password:pass});
const {createServer}=await import('./server.mjs');const server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
after(async()=>{await new Promise(r=>server.close(r));if(store.db.open)store.db.close();rmSync(dir,{recursive:true,force:true});});
const base=`http://127.0.0.1:${port}`;
test('sınav editörü: değişiklik otomatik kaydedilir (sunucuda taslak oluşur), betik hatası olmaz',{skip:chromium?false:'playwright yok',timeout:60000},async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(base+'/kurum');await page.fill('input[name=tenantId]','anonim-e');await page.fill('input[name=email]','t@anonim-e.invalid');await page.fill('input[name=password]',pass);await page.keyboard.press('Enter');await page.waitForSelector('.dou-nav',{state:'visible'});
  const cookies=(await page.context().cookies()).map(c=>c.name+'='+c.value).join('; ');
  const before=(await(await fetch(base+'/api/exams',{headers:{Cookie:cookies}})).json()).items.length;
  await page.goto(base+'/kurumsal-sinav');await page.waitForSelector('#exam-new');await page.click('#exam-new');
  await page.locator('[data-field="title"]').first().fill('Otomatik Kayıt Denemesi');
  await page.click('#exam-add-question');
  await page.waitForFunction(()=>/Kaydedildi|kaydedildi/.test(document.getElementById('exam-autosave-state').textContent)&&!/bekleniyor|Kaydedilmemiş/.test(document.getElementById('exam-autosave-state').textContent),null,{timeout:15000});
  const items=(await(await fetch(base+'/api/exams',{headers:{Cookie:cookies}})).json()).items;
  assert.equal(items.length,before+1,'otomatik kayıt sunucuda yeni taslak oluşturdu');
  assert.ok(items.some(x=>x.title==='Otomatik Kayıt Denemesi'));
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
