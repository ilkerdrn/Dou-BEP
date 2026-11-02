import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request} from 'node:http';
const root=mkdtempSync(join(tmpdir(),'bep-matrix-smoke-'));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(root,'test.sqlite');process.env.PORT='4173';
const {createServer}=await import('./server.mjs');
const srv=createServer();await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
after(async()=>{await new Promise(resolve=>srv.close(resolve));rmSync(root,{recursive:true,force:true});});
const fetchLocal=path=>new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port:srv.address().port,path,headers:{host:'127.0.0.1:4173'}},res=>{const data=[];res.on('data',b=>data.push(b));res.on('end',()=>resolve({status:res.statusCode,mime:res.headers['content-type'],body:Buffer.concat(data).toString()}));});req.on('error',reject).end();});
test('v2.9 goal matrix module is explicitly allowlisted and served with JS MIME',async()=>{const r=await fetchLocal('/goal-coverage.mjs');assert.equal(r.status,200);assert.match(r.mime,/text\/javascript/);assert.match(r.body,/buildGoalCoverage/);});
test('teacher editor exposes one navigable matrix and does not change auth or output controls',async()=>{const r=await fetchLocal('/kurumsal-sinav');assert.equal(r.status,200);for(const id of ['exam-goal-matrix-summary','exam-goal-matrix-filter','exam-goal-matrix-body','exam-goal-matrix-export','exam-save','exam-approve'])assert.equal([...r.body.matchAll(new RegExp(`id="${id}"`,'g'))].length,1);assert.match(r.body,/Gerçek öğrenci bilgisi girmeyin/);});
test('matrix script wired to teacher confirmation, existing autosave and prohibited from browser storage',()=>{const s=readFileSync(new URL('./institutional-exams.mjs',import.meta.url),'utf8');assert.match(s,/window\.confirm\(message\)/);assert.match(s,/question\.goalId=nextId/);assert.match(s,/touch\(\);draw\(\)/);assert.match(s,/goalCoverageCsv\(buildGoalCoverage\(state\.exam\)\)/);const module=readFileSync(new URL('./goal-coverage.mjs',import.meta.url),'utf8');assert.doesNotMatch(module,/localStorage|sessionStorage|fetch\(|XMLHttpRequest|cookie|window\./);});
test('new module / CSS are served but backup files remain nonpublic',async()=>{const css=await fetchLocal('/ui-refresh.css');assert.match(css.body,/goal-matrix-workbench/);assert.equal((await fetchLocal('/README-v2.9.md')).status,404);assert.equal((await fetchLocal('/SIFRE-SIFIRLA.ps1')).status,404);});

test('live HTTP version matches package and launcher, avoiding mistaken old-version warning',async()=>{const health=await fetchLocal('/api/health');assert.equal(health.status,200);assert.equal(JSON.parse(health.body).version,'2.81.0');});
