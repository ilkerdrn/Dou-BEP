// Tek giriş: oturumsuz paneller /kurum'a yönlendirir; giriş sonrası menü görünür ve kalınan panele dönülür.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {webcrypto} from 'node:crypto';
import {createServer as tcp} from 'node:net';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let chromium=null;try{({chromium}=require('playwright'));}catch{}
const skip=chromium?false:'playwright yok';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const pass='Sentetik-BEP-Yalniz-Test-2026!';
test('tek giriş: yönlendirme, gizli menü, giriş sonrası dönüş, açık yönlendirme yok',{skip},async()=>{
 const temp=mkdtempSync(join(tmpdir(),'bep-login-e2e-'));let server,store,browser;
 try{
  const s=tcp();await new Promise(r=>s.listen(0,'127.0.0.1',r));const port=s.address().port;await new Promise(r=>s.close(r));
  process.env.PORT=String(port);process.env.BEP_DB_PATH=join(temp,'e2e.sqlite');process.env.BEP_NO_LISTEN='1';
  const {openStore}=await import('./server-foundation/institutional-store.mjs');store=openStore(process.env.BEP_DB_PATH);
  store.createTenantAdmin({tenantId:'anonim-e2e',tenantName:'Anonim',email:'t@anonim-e2e.invalid',password:pass});
  const {createServer}=await import('./server.mjs');server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
  const base=`http://127.0.0.1:${port}`;
  // Oturumsuz HTTP: korumalı sayfa 302, herkese açık sayfalar 200.
  for(const p of ['/toplu-sinav','/kurumsal-sinav','/sinav-operasyon','/pilot-yonetim']){
   const r=await fetch(base+p,{redirect:'manual'});assert.equal(r.status,302,p);assert.equal(r.headers.get('location'),'/kurum?next='+encodeURIComponent(p));
  }
  for(const p of ['/kurum','/pilot','/','/dou-reader-demo'])assert.equal((await fetch(base+p)).status,200,p);
  browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.goto(base+'/toplu-sinav');
  assert.match(page.url(),/\/kurum\?next=%2Ftoplu-sinav$/);
  assert.equal(await page.locator('.dou-nav').isHidden(),true,'giriş öncesi modül menüsü gizli');
  await page.fill('input[name=tenantId]','anonim-e2e');await page.fill('input[name=email]','t@anonim-e2e.invalid');await page.fill('input[name=password]',pass);
  await page.keyboard.press('Enter');
  await page.waitForURL('**/toplu-sinav');
  assert.equal(await page.locator('.dou-nav').isVisible(),true,'giriş sonrası menü görünür');
  // Girişli: /kurum üzerinden bütün paneller açılır.
  for(const p of ['/kurumsal-sinav','/sinav-operasyon'])assert.equal((await page.goto(base+p)).status(),200,p);
  // Açık yönlendirme: dış adres next ile kabul edilmez.
  const ctx=await browser.newContext();const p2=await ctx.newPage();
  await p2.goto(base+'/kurum?next=https://evil.example/x');
  await p2.fill('input[name=tenantId]','anonim-e2e');await p2.fill('input[name=email]','t@anonim-e2e.invalid');await p2.fill('input[name=password]',pass);await p2.keyboard.press('Enter');
  await p2.waitForSelector('.dou-nav',{state:'visible'});assert.ok(p2.url().startsWith(base+'/kurum'),p2.url());
 }finally{await browser?.close();if(server?.listening)await new Promise(r=>server.close(r));if(store?.db?.open)store.db.close();rmSync(temp,{recursive:true,force:true});}
});
