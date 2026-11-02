import test,{after} from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {request} from 'node:http';
const dir=mkdtempSync(join(tmpdir(),'bep-reader-route-'));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'reader.sqlite');process.env.PORT='4173';
const {createServer}=await import('./server.mjs');const server=createServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
after(async()=>{await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true});});
function get(path){return new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port:server.address().port,path,headers:{host:'127.0.0.1:4173'}},res=>{const chunks=[];res.on('data',x=>chunks.push(x));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString()}));});req.on('error',reject);req.end();});}
test('anonymous reader panel and all four modules work locally with CSP',async()=>{
 const demo=await get('/dou-reader-demo');assert.equal(demo.status,200);assert.match(demo.body,/NVDA/);assert.match(demo.body,/reader-voice/);
 assert.equal((await get('/dou-reader-demo.mjs')).status,200);
 const listening=await get('/dou-speech-listening');assert.equal(listening.status,200);assert.match(listening.body,/Kör A\/B/);
 for(const path of ['/dou-speech-listening.mjs','/dou-speech-listening-ui.mjs'])assert.equal((await get(path)).status,200);
 for(const path of ['/dou-speech-listening.test.mjs','/dou-speech-coarticulation.test.mjs'])assert.equal((await get(path)).status,404);
 assert.match(demo.body,/lab-play/);
 const lab=await get('/dou-speech-waveform.mjs');assert.equal(lab.status,200);assert.match(lab.body,/synthesizeTurkishPreview/);
 const page=await get('/pilot');assert.equal(page.status,200);
 for(const id of ['reader-read','reader-stop','reader-next','reader-voice','reader-rate','reader-status','reader-shortcuts'])assert.match(page.body,new RegExp(`id="${id}"`));
 assert.match(page.headers['content-security-policy'],/script-src 'self'/);
 for(const path of ['/dou-reader-core.mjs','/dou-speech.mjs','/dou-reader-panel.mjs','/dou-reader.css']){
  const r=await get(path);assert.equal(r.status,200,path);assert.match(r.headers['content-type'],/text\/(javascript|css)/);
 }
 assert.match((await get('/dou-reader-panel.mjs')).body,/readerShortcut/);
 for(const path of ['/dou-speech-number-words.mjs','/dou-speech-free-text.mjs','/dou-speech-free-text-ui.mjs']){
  const resource=await get(path);assert.equal(resource.status,200,path);assert.match(resource.headers['content-type'],/text\/javascript/);
 }
 assert.equal((await get('/dou-speech-number-words.test.mjs')).status,404);
 assert.match(demo.body,/id="free-text-number-mode"/);
 assert.match(demo.body,/id="free-text-pronunciation"/);
 for(const path of ['/dou-reader-core.test.mjs','/dou-speech.test.mjs','/tools/dou-speech-preview.mjs','/dou-speech-waveform.test.mjs','/server-foundation/pilot-sessions.mjs','/data/institution.sqlite'])assert.equal((await get(path)).status,404,path);
});
test('v2.60 local A/B technical rehearsal is served in reader with synthetic-only module',async()=>{
 const page=await get('/dou-reader-demo');assert.equal(page.status,200);
 assert.match(page.body,/lab-rehearsal-open/);
 assert.match(page.body,/lab-rehearsal-body/);
 const js=await get('/dou-reader-demo.mjs');assert.equal(js.status,200);assert.match(js.body,/synthesizeFixedRehearsalArm/);
 const lib=await get('/dou-speech-corpus.mjs');assert.equal(lib.status,200);assert.match(lib.body,/listFixedRehearsalTrials/);
 for(const path of ['/dou-speech-rehearsal.test.mjs','/data/institution.sqlite']){
  assert.equal((await get(path)).status,404);
 }
});
