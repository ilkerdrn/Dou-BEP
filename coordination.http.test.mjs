import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request} from 'node:http';
const path=mkdtempSync(join(tmpdir(),'bep-coordination-routes-'));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(path,'db.sqlite');process.env.PORT='4173';
const {createServer}=await import('./server.mjs');
const srv=createServer();await new Promise(r=>srv.listen(0,'127.0.0.1',r));
after(async()=>{await new Promise(r=>srv.close(r));rmSync(path,{recursive:true,force:true});});
const get=url=>new Promise((resolve,reject)=>{const q=request({hostname:'127.0.0.1',port:srv.address().port,path:url,headers:{host:'127.0.0.1:4173'}},res=>{const all=[];res.on('data',data=>all.push(data));res.on('end',()=>resolve({code:res.statusCode,headers:res.headers,body:Buffer.concat(all).toString()}));});q.on('error',reject).end();});
test('coordinator UI is local, accessible by explicit allowlist and does not leak private files',async()=>{
 const page=await get('/sinav-koordinasyon');assert.equal(page.code,200);assert.match(page.body,/Üniversite sınav koordinasyon merkezi/);assert.match(page.body,/Gerçek öğrenci/);assert.match(page.headers['content-security-policy'],/default-src 'none'/);
 for(const asset of ['/coordination.mjs','/coordination.css']){const r=await get(asset);assert.equal(r.code,200,asset);assert.match(r.headers['content-type'],/text\/(?:javascript|css)/);}
 for(const privatePath of ['/server-foundation/exam-coordination.mjs','/data/institution.sqlite','/README-v2.16.md'])assert.equal((await get(privatePath)).code,404);
 assert.equal((await get('/api/coordination/sessions')).code,401);
 assert.equal(JSON.parse((await get('/api/health')).body).version,'2.81.0');
});
test('portal links coordinator and batch workflows while retaining exam editor',async()=>{
 for(const route of ['/kurum','/kurumsal-sinav','/toplu-sinav']){const r=await get(route);assert.equal(r.code,200);assert.match(r.body,/\/sinav-koordinasyon/);}
 const s=(await get('/batch-exams.mjs')).body;assert.match(s,/state\.schedule/);assert.match(s,/coordination\/sessions/);assert.match(s,/state\.mappings/);
});
