import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request} from 'node:http';

const tmp=mkdtempSync(join(tmpdir(),'bep-guided-smoke-'));
process.env.BEP_NO_LISTEN='1';
process.env.BEP_DB_PATH=join(tmp,'test.sqlite');
process.env.PORT='4173';
const {createServer}=await import('./server.mjs');
const server=createServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
after(async()=>{await new Promise(resolve=>server.close(resolve));rmSync(tmp,{recursive:true,force:true});});
function get(path){return new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port:server.address().port,path,headers:{host:'127.0.0.1:4173'}},res=>{
 const chunks=[];res.on('data',x=>chunks.push(x));res.on('end',()=>resolve({status:res.statusCode,type:res.headers['content-type'],body:Buffer.concat(chunks).toString()}));
});req.on('error',reject);req.end();});}
test('v2.10 guided frame ES module served, internal documentation remains private',async()=>{
 const js=await get('/guided-questions.mjs');
 assert.equal(js.status,200);assert.match(js.type,/text\/javascript/);
 assert.match(js.body,/createGuidedQuestion/);
 assert.equal((await get('/README-v2.10.md')).status,404);
 assert.equal((await get('/KURULUM-YONETICI.ps1')).status,404);
});
test('v2.10 teacher workbench contains accessible selects and single add button',async()=>{
 const page=await get('/kurumsal-sinav');
 assert.equal(page.status,200);
 for(const id of ['exam-guided-panel','exam-guided-pattern','exam-guided-target','exam-guided-preview','exam-guided-add']){
  assert.equal([...page.body.matchAll(new RegExp(`id="${id}"`,'g'))].length,1,id);
 }
 assert.match(page.body,/aria-live="polite"/);
 assert.match(page.body,/v2.20/);
 const js=await get('/institutional-exams.mjs');
 assert.match(js.body,/createGuidedQuestion/);
 assert.match(js.body,/state\.exam\.questions\.push\(q\)/);
 assert.match(js.body,/touch\(\);draw\(\)/);
});
test('v2.10 health matches launcher version; new CSS served',async()=>{
 const health=await get('/api/health');
 assert.equal(health.status,200);
 assert.equal(JSON.parse(health.body).version,'2.81.0');
 const css=await get('/ui-refresh.css');
 assert.match(css.body,/guided-questions-panel/);
});
test('v2.10 pattern module does not persist to browser storage, invoke a generator or handle PII',()=>{
 const raw=readFileSync(new URL('./guided-questions.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(raw,/localStorage|sessionStorage|fetch\(|XMLHttpRequest|openai|anthropic|studentName|tcKimlik/i);
});
