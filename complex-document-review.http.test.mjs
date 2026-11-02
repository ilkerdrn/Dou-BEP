import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import http from 'node:http';
import {zipStore} from './core.mjs';
import {openStore} from './server-foundation/institutional-store.mjs';
import {createApiHandler} from './server-foundation/institutional-api.mjs';
const password='Anonymous-Testing-Local-2026-Password!';
const xml='<w:document xmlns:w="w"><w:body><w:p><w:r><w:t>1. Tabloyu analiz ediniz.</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>X</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>';
const source={filename:'Anonim-Tablolu-Sinav.docx',base64:Buffer.from(zipStore({'word/document.xml':xml})).toString('base64')};
const transcription='1. Tabloyu analiz ediniz. Tablo satır 1: X sütunundaki değer beştir.';
test('HTTP teacher-only rich-source review: reparse, hash, mandatory item acknowledgment and blocked direct auto-import',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'rich-source-test-'));const store=openStore(join(dir,'db.sqlite'));
 store.createTenantAdmin({tenantId:'school-a',tenantName:'Anonim Üniversite',email:'admin@local.test',password});
 const login=store.signIn({tenantId:'school-a',email:'admin@local.test',password});
 const actor=store.requireActor(login.token);store.addMember(actor,{email:'observe@local.test',role:'observer',password});
 const api=createApiHandler(store,{port:0});const srv=http.createServer((req,res)=>api(req,res,new URL(req.url,'http://localhost').pathname));
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));const port=srv.address().port;
 srv.removeAllListeners('request');const handler=createApiHandler(store,{port});srv.on('request',(req,res)=>handler(req,res,new URL(req.url,'http://localhost').pathname));
 async function post(path,body,headers={}){const r=await fetch(`http://127.0.0.1:${port}/api/exam-source/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
 try{
  assert.equal((await post('manual-preview',{...source,transcription,acknowledgedIds:['item-001']})).status,401);
  const raw=await fetch(`http://127.0.0.1:${port}/api/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenantId:'school-a',email:'admin@local.test',password})});
  const cookie=raw.headers.get('set-cookie').split(';')[0],session=await raw.json();const auth={Cookie:cookie,'X-CSRF-Token':session.csrf};
  assert.equal((await post('manual-preview',{...source,transcription,acknowledgedIds:['item-001']},{Cookie:cookie})).status,403);
  assert.equal((await post('manual-preview',{...source,transcription,acknowledgedIds:['item-001']},{...auth,Origin:'https://evil.invalid'})).status,403);
  const orig=await post('preview',source,auth);assert.equal(orig.status,200);assert.equal(orig.data.blocked,true);assert.equal(orig.data.manualEligible,true);
  assert.equal((await post('create-draft',{...source,selectedNumbers:[1],title:'Vize',subject:'İşletim Sistemleri',confirmed:true,sourceSha256:orig.data.sourceSha256},auth)).status,422);
  assert.equal((await post('manual-preview',{...source,transcription,acknowledgedIds:[]},auth)).status,422);
  const manual=await post('manual-preview',{...source,transcription,acknowledgedIds:['item-001']},auth);
  assert.equal(manual.status,200);assert.equal(manual.data.questions.length,1);
  const req={...source,transcription,acknowledgedIds:['item-001'],title:'İşletim Sistemleri Vize',subject:'İşletim Sistemleri',duration:60,selectedNumbers:[1],sourceSha256:manual.data.sourceSha256,transcriptionSha256:manual.data.transcriptionSha256};
  assert.equal((await post('create-manual-draft',req,auth)).status,422);
  assert.equal((await post('create-manual-draft',{...req,confirmed:true,transcriptionSha256:'a'.repeat(64)},auth)).status,422);
  assert.equal((await post('create-manual-draft',{...req,confirmed:true,sourceSha256:'b'.repeat(64)},auth)).status,422);
  assert.equal((await post('create-manual-draft',{...req,confirmed:true,transcription:transcription+' 2. Değişiklik'},auth)).status,422);
  const made=await post('create-manual-draft',{...req,confirmed:true},auth);assert.equal(made.status,201);assert.equal(made.data.item.status,'draft');
  const exam=store.getExam(actor,made.data.item.id).exam;
  assert.equal(exam.questions[0].provenance.reviewed,false);assert.equal(exam.questions[0].answer,'');
  assert.throws(()=>store.approveExam(actor,made.data.item.id,{confirmed:true,revision:1}),{code:'quality_errors'});
  const obRaw=await fetch(`http://127.0.0.1:${port}/api/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenantId:'school-a',email:'observe@local.test',password})});
  const obCookie=obRaw.headers.get('set-cookie').split(';')[0],ob=await obRaw.json();
  assert.equal((await post('manual-preview',{...source,transcription,acknowledgedIds:['item-001']},{Cookie:obCookie,'X-CSRF-Token':ob.csrf})).status,403);
  assert.equal(store.listExams(actor).length,1);
 }finally{await new Promise(resolve=>srv.close(resolve));store.db.close();rmSync(dir,{recursive:true,force:true});}
});
