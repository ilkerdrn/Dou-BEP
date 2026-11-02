import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request} from 'node:http';
const dir=mkdtempSync(join(tmpdir(),'bep-decision-route-'));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'local.sqlite');process.env.PORT='4173';
const {createServer}=await import('./server.mjs');
const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
after(async()=>{await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true});});
function get(path){return new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port:server.address().port,path,headers:{host:'127.0.0.1:4173'}},res=>{const chunks=[];res.on('data',x=>chunks.push(x));res.on('end',()=>resolve({status:res.statusCode,type:res.headers['content-type'],headers:res.headers,body:Buffer.concat(chunks).toString()}));});req.on('error',reject);req.end();});}
test('decision page and JS/CSS served with local-only security headers',async()=>{
 const page=await get('/uyarlama-kararlari');assert.equal(page.status,200);assert.match(page.body,/Karar kayıtları/);assert.match(page.body,/Yalnız sentetik veriler/);
 assert.match(page.headers['content-security-policy'],/default-src 'none'/);
 for(const path of ['/accommodation-admin.mjs','/accommodation-admin.css']){const r=await get(path);assert.equal(r.status,200);assert.match(r.type,/text\/(?:javascript|css)/);}
 for(const path of ['/server-foundation/accommodation-decisions.mjs','/data/institution.sqlite','/README-v2.19.md'])assert.equal((await get(path)).status,404);
 assert.equal((await get('/api/accommodations')).status,401);
 assert.equal(JSON.parse((await get('/api/health')).body).version,'2.81.0');
});
test('term-based batch requests server-generated package with only anonymous lookup keys',async()=>{
 const js=(await get('/batch-exams.mjs')).body,page=(await get('/toplu-sinav')).body;
 assert.match(js,/\/api\/batch\/authorized-package/);
 assert.doesNotMatch(js,/makeMultiCourseBatchFiles/);
 assert.match(js,/candidateCode:r.code/);
 assert.match(js,/X-CSRF-Token/);
 assert.match(page,/ayrı onay kaydı/);
 assert.doesNotMatch(js,/localStorage|indexedDB/);
});
