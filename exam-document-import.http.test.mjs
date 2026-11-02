import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import http from 'node:http';
import {openStore} from './server-foundation/institutional-store.mjs';import {createApiHandler} from './server-foundation/institutional-api.mjs';
const password='Anonymous-Testing-Local-2026-Password!';
const bytes=Buffer.from('1. CPU zamanlayıcı nedir?\n2. Bellek koruması nasıl sağlanır?', 'utf8');
const sample={filename:'Ornek.txt',base64:bytes.toString('base64')};
test('HTTP document preview + draft requires authenticated teacher, same origin, CSRF and confirmation',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'source-preview-'));const store=openStore(join(dir,'temp.sqlite'));
 store.createTenantAdmin({tenantId:'university-a',tenantName:'Hayali Universite A',email:'a@local.test',password});
 store.createTenantAdmin({tenantId:'university-b',tenantName:'Hayali Universite B',email:'b@local.test',password});
 const actor=store.requireActor(store.signIn({tenantId:'university-a',email:'a@local.test',password}).token);
 store.addMember(actor,{email:'read@local.test',role:'observer',password});
 let port;const api=createApiHandler(store,{port:0}),server=http.createServer((req,res)=>api(req,res,new URL(req.url,'http://localhost').pathname));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));port=server.address().port;
 // API port whitelist is fixed during creation; create another handler for current port.
 const handler=createApiHandler(store,{port});server.removeAllListeners('request');server.on('request',(req,res)=>handler(req,res,new URL(req.url,'http://localhost').pathname));
 async function ask(path,body,headers={}){const r=await fetch(`http://127.0.0.1:${port}/api/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
 try{
  assert.equal((await ask('exam-source/preview',sample)).status,401);
  const login=await ask('login',{tenantId:'university-a',email:'a@local.test',password});assert.equal(login.status,200);
  // Cookie is only present in response headers; login again to obtain cookie.
  const rawLogin=await fetch(`http://127.0.0.1:${port}/api/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenantId:'university-a',email:'a@local.test',password})});const cookie=rawLogin.headers.get('set-cookie').split(';')[0],session=await rawLogin.json();
  assert.equal((await ask('exam-source/preview',sample,{Cookie:cookie})).status,403);
  assert.equal((await ask('exam-source/preview',sample,{Cookie:cookie,'X-CSRF-Token':session.csrf,Origin:'https://evil.test'})).status,403);
  const auth={Cookie:cookie,'X-CSRF-Token':session.csrf};const prev=await ask('exam-source/preview',sample,auth);assert.equal(prev.status,200);assert.equal(prev.data.questions.length,2);
  const payload={...sample,sourceSha256:prev.data.sourceSha256,title:'İşletim Sistemleri Vize',subject:'İşletim Sistemleri',selectedNumbers:[1,2],duration:45};
  assert.equal((await ask('exam-source/create-draft',payload,auth)).status,422);
  assert.equal((await ask('exam-source/create-draft',{...payload,confirmed:true,sourceSha256:'0'.repeat(64)},auth)).status,422);
  assert.equal((await ask('exam-source/create-draft',{...payload,confirmed:true,base64:Buffer.from('1. Başka soru').toString('base64')},auth)).status,422);
  const made=await ask('exam-source/create-draft',{...payload,confirmed:true},auth);assert.equal(made.status,201);assert.equal(made.data.item.status,'draft');assert.equal(made.data.questionCount,2);
  assert.equal(store.listExams(actor).length,1);
  const read=store.getExam(actor,made.data.item.id);assert.equal(read.exam.questions[0].provenance.reviewed,false);assert.equal(read.exam.questions[0].answer,'');
  assert.throws(()=>store.approveExam(actor,made.data.item.id,{confirmed:true,revision:1}),{code:'quality_errors'});
  const other=store.requireActor(store.signIn({tenantId:'university-b',email:'b@local.test',password}).token);assert.equal(store.listExams(other).length,0);
  const observerLogin=await fetch(`http://127.0.0.1:${port}/api/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenantId:'university-a',email:'read@local.test',password})});const obCookie=observerLogin.headers.get('set-cookie').split(';')[0],obData=await observerLogin.json();assert.equal((await ask('exam-source/preview',sample,{Cookie:obCookie,'X-CSRF-Token':obData.csrf})).status,403);
 }finally{await new Promise(resolve=>server.close(resolve));store.db.close();rmSync(dir,{recursive:true,force:true});}
});
