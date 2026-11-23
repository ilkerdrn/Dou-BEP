// Gerçek tarayıcıda karar rehberi: öneri gösterir, yalnız otomatik düzenlemeleri işaretler, rehber seçimini kaydetmez.
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
const dir=mkdtempSync(join(tmpdir(),'bep-guide-'));
const probe=tcp();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'g.sqlite');process.env.PORT=String(port);
const {openStore}=await import('./server-foundation/institutional-store.mjs');const store=openStore(process.env.BEP_DB_PATH);
const pass='Sentetik-BEP-Yalniz-Test-2026!';store.createTenantAdmin({tenantId:'anonim-g',tenantName:'Anonim',email:'t@anonim-g.invalid',password:pass});
const {createServer}=await import('./server.mjs');const server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
after(async()=>{await new Promise(r=>server.close(r));if(store.db.open)store.db.close();rmSync(dir,{recursive:true,force:true});});
test('karar rehberi: öneri, otomatik düzenlemelerin işaretlenmesi, görevli öğenin işaretlenmemesi, kaydın rehberi içermemesi',{skip:chromium?false:'playwright yok',timeout:60000},async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();const posts=[];page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/accommodations'))posts.push(r.postData());});
  await page.goto(`http://127.0.0.1:${port}/kurum`);
  await page.fill('input[name=tenantId]','anonim-g');await page.fill('input[name=email]','t@anonim-g.invalid');await page.fill('input[name=password]',pass);await page.keyboard.press('Enter');
  await page.waitForSelector('.dou-nav',{state:'visible'});
  await page.goto(`http://127.0.0.1:${port}/uyarlama-kararlari`);await page.waitForSelector('#adjustment-guide summary',{state:'visible'});
  await page.click('#adjustment-guide summary');await page.waitForSelector('#guide-area',{state:'visible'});
  assert.match(await page.textContent('#guide-note'),/tanı veya otomatik karar değildir/);
  await page.selectOption('#guide-area','vision');
  assert.match(await page.textContent('#guide-output'),/Ekran okuyucu ve klavyeyle bağımsız sınav/);
  assert.match(await page.textContent('#guide-output'),/görevli gerektirir; sistem uygulamaz/);
  await page.click('#guide-apply');
  const checked=await page.$$eval('input[name=adjustment]:checked',els=>els.map(e=>e.value));
  assert.deepEqual(checked.sort(),['ACCESSIBLE_HTML','HIGH_CONTRAST','LARGE_PRINT'],'yalnız otomatik düzenlemeler');
  assert.equal(await page.isChecked('input[name=adjustment][value=READER]'),false,'görevli düzenleme işaretlenmez');
  await page.fill('input[name=courseCode]','BLP103');await page.fill('input[name=examLabel]','VIZE');await page.fill('input[name=candidateCode]','KOD-001');
  await page.fill('input[name=extraMinutes]','0').catch(()=>{});
  await page.click('#decision-save');await page.waitForTimeout(1200);
  if(posts.length){assert.doesNotMatch(posts[0],/vision|guide|gereksinim|need/i,'rehber seçimi kayda girmez');}
  // "Diğer": öneri yok.
  await page.selectOption('#guide-area','other');assert.match(await page.textContent('#guide-output'),/Bireysel değerlendirme/);assert.equal(await page.isDisabled('#guide-apply'),true);
 }finally{await browser.close();}
});
