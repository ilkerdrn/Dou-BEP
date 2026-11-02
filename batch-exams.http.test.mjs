import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request} from 'node:http';
const dir=mkdtempSync(join(tmpdir(),'bep-batch-route-'));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'test.sqlite');process.env.PORT='4173';
const {createServer}=await import('./server.mjs');
const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
after(async()=>{await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true});});
function get(path){return new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port:server.address().port,path,headers:{host:'127.0.0.1:4173'}},res=>{const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString()}));});req.on('error',reject);req.end();});}
test('v2.16 serves new route and assets without exposing database',async()=>{
 const page=await get('/toplu-sinav');assert.equal(page.status,200);assert.match(page.body,/Toplu sınav uyarlama/);
 assert.match(page.headers['content-security-policy'],/default-src 'none'/);
 for(const path of ['/batch-exams.mjs','/batch-accommodations.mjs','/xlsx-import.mjs','/batch-exams.css']){const r=await get(path);assert.equal(r.status,200,path);assert.match(r.headers['content-type'],/text\/(?:javascript|css)/);}
 assert.equal((await get('/data/institution.sqlite')).status,404);
 assert.equal((await get('/api/exams')).status,401);
 const health=await get('/api/health');assert.equal(JSON.parse(health.body).version,'2.81.0');
});
test('No exam data is exposed in the page; no network roster upload or browser persistence',async()=>{
 const page=(await get('/toplu-sinav')).body,script=(await get('/batch-exams.mjs')).body;
 assert.match(page,/örnek CSV indir/i);assert.doesNotMatch(page,/ORNEK-001|ogrenci@|\bT\.C\./);
 assert.doesNotMatch(script,/localStorage|sessionStorage|indexedDB|\/api\/students|\/api\/roster/);
 assert.match(script,/file\.text\(\)/);assert.match(script,/batch\/authorized-package/);assert.match(page,/Ders – sınav eşleştirmeleri/);assert.match(script,/\['admin','coordinator','teacher'\]/);
});

test('Excel şablonu ve dönemli yükleyici yalnız yerelde sunulur',async()=>{
 const x=await get('/ORNEK-ANONIM-DONEMLI-SINAV-LISTESI.xlsx');assert.equal(x.status,200);assert.match(x.headers['content-type'],/spreadsheetml/);
 const html=(await get('/toplu-sinav')).body;assert.match(html,/batch-template-xlsx/);assert.match(html,/\.xlsx/);
 const script=(await get('/batch-exams.mjs')).body;assert.match(script,/readAnonymousXlsx/);assert.match(script,/validateTermMappings/);
 assert.doesNotMatch(script,/localStorage\.setItem|sessionStorage\.setItem/);
});
