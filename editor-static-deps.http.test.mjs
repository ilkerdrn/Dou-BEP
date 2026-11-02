/** Regression: the exam editor must not load as a blank page because a browser module is 404. */
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {request} from 'node:http';
const root=dirname(fileURLToPath(import.meta.url));
const isolated=mkdtempSync(join(tmpdir(),'bep-editor-module-'));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(isolated,'isolated.sqlite');process.env.PORT='4173';
const {createServer}=await import('./server.mjs');
const server=createServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
after(async()=>{await new Promise(resolve=>server.close(resolve));rmSync(isolated,{force:true,recursive:true});});
function get(path){return new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port:server.address().port,path,headers:{host:'127.0.0.1:4173'}},res=>{const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve({status:res.statusCode,mime:res.headers['content-type'],text:Buffer.concat(chunks).toString('utf8')}));});req.on('error',reject).end();});}
const source=readFileSync(join(root,'server.mjs'),'utf8');
const published=new Set([...source.matchAll(/^ '([^']+)':\['([^']+)'/gm)].map(x=>x[1]));
function normalize(spec){return '/'+spec.replace(/^\.\//,'').replace(/^\//,'');}
function dependencies(content){return [...content.matchAll(/(?:import|export)\s+(?:[^\n;]*?\s+from\s+)?['"](\.[^'"]+)['"]/g)].map(x=>normalize(x[1]));}
test('exam endpoint delivers HTML and all three once-missing dependencies serve JS MIME',async()=>{
 const page=await get('/kurumsal-sinav');assert.equal(page.status,200);assert.match(page.text,/id="exam-workspace"/);
 for(const item of ['question-access.mjs','presentation-variants.mjs','objective-observations.mjs']){
  const r=await get('/'+item);assert.equal(r.status,200,item);assert.match(r.mime,/text\/javascript/,item);
 }
});
test('all browser module imports reachable from public HTML entrypoints are published',()=>{
 const htmlNames=[...new Set([...source.matchAll(/^ '\/[^']+':\['([^']+\.html)'/gm)].map(x=>x[1]))];
 const entries=[];
 for(const name of htmlNames){const html=readFileSync(join(root,name),'utf8');for(const src of html.matchAll(/<script\b[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/g))entries.push(normalize(src[1]));}
 assert.ok(entries.includes('/institutional-exams.mjs'));
 const seen=new Set(),stack=entries.slice();
 while(stack.length){const path=stack.pop();if(seen.has(path))continue;seen.add(path);
  assert.ok(published.has(path),`Missing public browser module: ${path}`);
  const filepath=join(root,path.slice(1));assert.ok(existsSync(filepath),`Missing module file: ${path}`);
  for(const dep of dependencies(readFileSync(filepath,'utf8')))stack.push(dep);
 }
 assert.ok(seen.size>=60,`Unexpectedly few browser modules checked (${seen.size})`);
});
test('private test scripts and runtime database are still denied',async()=>{
 for(const path of ['/editor-static-deps.http.test.mjs','/server.mjs','/data/institution.sqlite','/.env','/README.md']){
  assert.equal((await get(path)).status,404,path);
 }
});
