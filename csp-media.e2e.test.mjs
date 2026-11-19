// Gerçek tarayıcıda: sunucu güvenlik politikası yerel (blob:) ses dosyalarına izin verir; harici medya yine engelli kalır.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer as tcp} from 'node:net';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let chromium=null;try{({chromium}=require('playwright'));}catch{}
const dir=mkdtempSync(join(tmpdir(),'bep-csp-'));
const probe=tcp();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'c.sqlite');process.env.PORT=String(port);
const {createServer}=await import('./server.mjs');const server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
after(async()=>{await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});});
const base=`http://127.0.0.1:${port}`;
test('CSP başlığı yalnız kendi kaynağı ve blob: medyaya izin verir',async()=>{
 const csp=(await fetch(base+'/dou-reader-demo')).headers.get('content-security-policy');
 assert.match(csp,/media-src 'self' blob:/);assert.match(csp,/default-src 'none'/);assert.doesNotMatch(csp,/media-src[^;]*https?:/);assert.match(csp,/connect-src 'self'/);
});
test('tarayıcı: blob: WAV sesi sayfalarda yüklenir (CSP ihlali yok); dış medya engellenir',{skip:chromium?false:'playwright yok',timeout:60000},async()=>{
 const browser=await chromium.launch();
 try{
  for(const path of ['/dou-reader-demo','/dou-speech-phoneme','/ses-inceleme','/hazirlik']){
   const page=await browser.newPage();await page.goto(base+path);
   const r=await page.evaluate(async()=>{
    const violations=[];document.addEventListener('securitypolicyviolation',e=>violations.push(e.violatedDirective+' '+e.blockedURI.slice(0,30)));
    // 0,1 sn sessiz 8 kHz mono WAV
    const n=800,buf=new ArrayBuffer(44+n*2),v=new DataView(buf);const w=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i));};
    w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,8000,true);v.setUint32(28,16000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
    const local=await new Promise(res=>{const a=new Audio(URL.createObjectURL(new Blob([buf],{type:'audio/wav'})));a.onloadedmetadata=()=>res('yüklendi '+a.duration.toFixed(2));a.onerror=()=>res('hata');setTimeout(()=>res('zaman aşımı'),4000);});
    const remote=await new Promise(res=>{const a=new Audio('https://example.invalid/x.wav');a.onerror=()=>res('engellendi/hata');a.onloadedmetadata=()=>res('YÜKLENDİ');setTimeout(()=>res('engellendi/hata'),2500);});
    await new Promise(r=>setTimeout(r,200));return {local,remote,violations};
   });
   assert.match(r.local,/^yüklendi 0\.10$/,path+' yerel ses: '+r.local);
   assert.equal(r.remote,'engellendi/hata',path+' dış medya engelli');
   assert.ok(!r.violations.some(x=>/^media-src blob/.test(x)),path+' blob: ihlali: '+r.violations.join(','));
   await page.close();
  }
 }finally{await browser.close();}
});
