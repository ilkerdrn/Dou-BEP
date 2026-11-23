import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer as tcp} from 'node:net';
import {createRequire} from 'node:module';
import {replaceTerms} from './terminology.mjs';
const require=createRequire(import.meta.url);
let chromium=null;try{({chromium}=require('playwright'));}catch{}
const u=t=>replaceTerms(t,'university');
test('okul profili metni değiştirmez; üniversite profili elle yazılmış kalıpları dilbilgisine uygun çevirir',()=>{
 assert.equal(replaceTerms('BEP kazanımı','school'),'BEP kazanımı');
 assert.equal(u('BEP kazanım aktarımı'),'Öğrenme çıktısı aktarımı');
 assert.equal(u('Bir soru biçimi ve BEP kazanımı seçin.'),'Bir soru biçimi ve ders öğrenme çıktısı seçin.');
 assert.equal(u('BEP kazanımlarını yönetin, sınavları hazırlayın.'),'Ders öğrenme çıktılarını yönetin, sınavları hazırlayın.');
 assert.equal(u('Kazanım kodu'),'Öğrenme çıktısı kodu');
 assert.equal(u('Bağlanacak kazanım'),'Bağlanacak öğrenme çıktısı');
 assert.equal(u('Seçili kazanıma boş soru oluştur'),'Seçili öğrenme çıktısına boş soru oluştur');
 assert.equal(u('Kazanımlar'),'Öğrenme çıktıları');assert.equal(u('Tüm kazanımlar listelendi'),'Tüm öğrenme çıktıları listelendi');
 assert.equal(u('Genel BEP hedefi (8–400 karakter)'),'Genel ders öğrenme çıktısı (8–400 karakter)');
 assert.equal(u('2. Sınıf'),'Lisans / Önlisans');assert.equal(u('Öğretmen onayı gerekli'),'Öğretim elemanı onayı gerekli');
});
test('belirsiz ek almış biçimler tahmin edilmez; sözcük içindeki eşleşmeler değişmez; işlem tekrarlanabilir',()=>{
 assert.equal(u('Sınavın kazanımını okuyun'),'Sınavın kazanımını okuyun','"kazanımını" belirsiz: dokunulmaz');
 assert.equal(u('yenikazanımsız'),'yenikazanımsız');
 for(const t of ['BEP kazanım aktarımı','Tüm kazanımlar','Kazanım kodu','Genel BEP hedefi'])assert.equal(u(u(t)),u(t),t);
 assert.equal(u(''),'');assert.equal(u(null),null);
});
const dir=mkdtempSync(join(tmpdir(),'bep-term-'));
const probe=tcp();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'t.sqlite');process.env.PORT=String(port);
const {openStore}=await import('./server-foundation/institutional-store.mjs');const store=openStore(process.env.BEP_DB_PATH);
const pass='Sentetik-BEP-Yalniz-Test-2026!';store.createTenantAdmin({tenantId:'anonim-t',tenantName:'Anonim',email:'t@anonim-t.invalid',password:pass});
const {createServer}=await import('./server.mjs');const server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
after(async()=>{await new Promise(r=>server.close(r));if(store.db.open)store.db.close();rmSync(dir,{recursive:true,force:true});delete process.env.BEP_TERMINOLOGY;});
const base=`http://127.0.0.1:${port}`;
test('sunucu profili: varsayılan okul; BEP_TERMINOLOGY=university ise üniversite',async()=>{
 delete process.env.BEP_TERMINOLOGY;assert.deepEqual(await(await fetch(base+'/terminology.json')).json(),{profile:'school'});
 process.env.BEP_TERMINOLOGY='kötü-değer';assert.deepEqual(await(await fetch(base+'/terminology.json')).json(),{profile:'school'});
 process.env.BEP_TERMINOLOGY='university';assert.deepEqual(await(await fetch(base+'/terminology.json')).json(),{profile:'university'});
});
test('tarayıcı: üniversite profilinde sayfa metinleri ve dinamik içerik çevrilir; okul profilinde dokunulmaz',{skip:chromium?false:'playwright yok',timeout:60000},async()=>{
 const browser=await chromium.launch();
 try{
  for(const [profile,expect] of [['school',/BEP kazanım/],['university',/Öğrenme çıktısı|ders öğrenme çıktısı/]]){
   process.env.BEP_TERMINOLOGY=profile;
   const page=await browser.newPage();await page.goto(base+'/kurum');
   await page.fill('input[name=tenantId]','anonim-t');await page.fill('input[name=email]','t@anonim-t.invalid');await page.fill('input[name=password]',pass);await page.keyboard.press('Enter');
   await page.waitForSelector('.dou-nav',{state:'visible'});await page.goto(base+'/kurumsal-sinav');await page.waitForTimeout(1500);
   const text=await page.evaluate(()=>document.body.innerText);
   assert.match(text,expect,profile);
   if(profile==='university'){assert.doesNotMatch(text,/BEP kazanım/);assert.equal(await page.evaluate(()=>document.documentElement.dataset.terminology),'university');}
   await page.close();
  }
 }finally{await browser.close();}
});
