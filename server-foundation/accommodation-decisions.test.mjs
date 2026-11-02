import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
import {openStore} from './institutional-store.mjs';
import {createApiHandler} from './institutional-api.mjs';
import {normalizeDecision} from './accommodation-decisions.mjs';
const password='Strong-Local-Anon-Password-2026!';
const sample={term:'2026-GUZ',courseCode:'BLP103',examLabel:'VIZE',candidateCode:'KOD-001',adjustments:['LARGE_PRINT','HIGH_CONTRAST'],extraMinutes:15};
function make(){const dir=mkdtempSync(join(tmpdir(),'bep-decisions-')),s=openStore(join(dir,'db.sqlite'));
 s.createTenantAdmin({tenantId:'a-school',tenantName:'Anonim A',email:'admin@a.test',password});s.createTenantAdmin({tenantId:'b-school',tenantName:'Anonim B',email:'admin@b.test',password});
 const adminA=s.requireActor(s.signIn({tenantId:'a-school',email:'admin@a.test',password}).token),adminB=s.requireActor(s.signIn({tenantId:'b-school',email:'admin@b.test',password}).token);
 s.addMember(adminA,{email:'reviewer@a.test',role:'reviewer',password});s.addMember(adminA,{email:'coordinator@a.test',role:'coordinator',password});s.addMember(adminA,{email:'teacher@a.test',role:'teacher',password});
 const reviewer=s.requireActor(s.signIn({tenantId:'a-school',email:'reviewer@a.test',password}).token),coordinator=s.requireActor(s.signIn({tenantId:'a-school',email:'coordinator@a.test',password}).token),teacher=s.requireActor(s.signIn({tenantId:'a-school',email:'teacher@a.test',password}).token);
 return {s,adminA,adminB,reviewer,coordinator,teacher,dispose(){s.db.close();rmSync(dir,{recursive:true,force:true});}};
}
test('strict normalization rejects real identifiers, unsupported keys and unsafe values',()=>{
 assert.deepEqual(normalizeDecision(sample).adjustments,['HIGH_CONTRAST','LARGE_PRINT']);
 for(const changed of [
  {...sample,studentName:'Ali'}, {...sample,diagnosis:'blind'}, {...sample,candidateCode:'123456789'},
  {...sample,candidateCode:'ABC-999'}, {...sample,extraMinutes:121}, {...sample,adjustments:['LARGE_PRINT','LARGE_PRINT']},
  {...sample,adjustments:['constructor']}, {...sample,adjustments:[],extraMinutes:0},
  {...sample,term:'2026-02-01'}, {...sample,courseCode:'../SECRET'},
 ])assert.throws(()=>normalizeDecision(changed));
});
test('creator cannot approve; reviewer approves; revisioned edits invalidate and audit persists',()=>{
 const f=make();try{const {s,adminA:a,reviewer:r,coordinator:c}=f;
  const d=s.accommodationCreate(a,sample);assert.equal(d.revision,1);assert.equal(d.status,'draft');
  assert.throws(()=>s.accommodationApprove(a,d.id,1),{code:'separation_of_duties'});
  assert.throws(()=>s.accommodationApprove(r,d.id,2),{code:'revision_conflict'});
  assert.equal(s.accommodationVerifyBatch(a,[sample]).ok,false);
  const approved=s.accommodationApprove(r,d.id,1);assert.equal(approved.status,'approved');assert.equal(approved.approvedSha256,approved.contentSha256);
  assert.equal(s.accommodationVerifyBatch(a,[sample]).ok,true);
  assert.equal(s.accommodationVerifyBatch(a,[{...sample,extraMinutes:20}]).results[0].reason,'mismatch');
  assert.throws(()=>s.accommodationUpdate(c,d.id,{...sample,revision:50}),{code:'revision_conflict'});
  const edit=s.accommodationUpdate(c,d.id,{...sample,extraMinutes:20,revision:1});assert.equal(edit.status,'draft');assert.equal(edit.revision,2);assert.equal(edit.approvedSha256,null);
  assert.equal(s.accommodationVerifyBatch(a,[{...sample,extraMinutes:20}]).ok,false);
  assert.throws(()=>s.accommodationApprove(c,d.id,2),{code:'separation_of_duties'});
  assert.equal(s.accommodationApprove(r,d.id,2).status,'approved');
 }finally{f.dispose();}
});
test('approval, revocation and history require exact roles and remain tenant-isolated',()=>{
 const f=make();try{const {s,adminA:a,adminB:b,reviewer:r,coordinator:c,teacher:t}=f;
  const d=s.accommodationCreate(c,sample);
  assert.equal(s.accommodationList(b).length,0);
  assert.throws(()=>s.accommodationUpdate(b,d.id,{...sample,revision:1}),{code:'missing'});
  assert.throws(()=>s.accommodationApprove(b,d.id,1),{code:'missing'});
  assert.throws(()=>s.accommodationList(t),{code:'forbidden'});
  assert.throws(()=>s.accommodationCreate(r,sample),{code:'forbidden'});
  assert.throws(()=>s.accommodationApprove(t,d.id,1),{code:'forbidden'});
  assert.equal(s.accommodationApprove(r,d.id,1).status,'approved');
  assert.equal(s.accommodationRevoke(r,d.id,1).status,'revoked');
  assert.equal(s.accommodationVerifyBatch(t,[sample]).ok,false);
  assert.deepEqual(s.accommodationHistory(a,d.id).map(x=>x.event),['created','approved','revoked']);
  assert.throws(()=>s.accommodationCreate(c,sample),{code:'duplicate'});
 }finally{f.dispose();}
});
test('batch rejects empty, oversize and duplicate inputs without accepting client approval status',()=>{
 const f=make();try{const {s,adminA:a}=f;
  for(const rows of [[],Array(101).fill(sample),[sample,sample]])assert.throws(()=>s.accommodationVerifyBatch(a,rows));
  assert.throws(()=>s.accommodationVerifyBatch(a,[{...sample,approved:true}]));
  assert.equal(s.accommodationVerifyBatch(a,[sample]).results[0].reason,'not_registered');
 }finally{f.dispose();}
});
test('HTTP decision endpoints require auth, origin and CSRF and preserve dual-control',async()=>{
 const f=make();let port;
 const server=http.createServer((req,res)=>createApiHandler(f.s,{port})(req,res,new URL(req.url,'http://localhost').pathname));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));port=server.address().port;
 async function request(path,method='GET',body,headers={}){const r=await fetch(`http://127.0.0.1:${port}/api${path}`,{method,headers:{Host:`127.0.0.1:${port}`,...headers},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')};}
 try{
  assert.equal((await request('/accommodations')).status,401);
  const login=await request('/login','POST',{tenantId:'a-school',email:'admin@a.test',password});assert.equal(login.status,200);
  const cookie=login.cookie.split(';')[0],csrf=login.body.csrf;
  assert.equal((await request('/accommodations','POST',sample,{Cookie:cookie})).status,403);
  assert.equal((await request('/accommodations','POST',sample,{Cookie:cookie,'X-CSRF-Token':csrf,Origin:'https://evil.test'})).status,403);
  const created=await request('/accommodations','POST',sample,{Cookie:cookie,'X-CSRF-Token':csrf});assert.equal(created.status,201);
  assert.equal((await request('/accommodations/'+created.body.item.id+'/approve','POST',{revision:1},{Cookie:cookie,'X-CSRF-Token':csrf})).status,403);
  const other=await request('/login','POST',{tenantId:'a-school',email:'reviewer@a.test',password});const reviewerCookie=other.cookie.split(';')[0];
  const approved=await request('/accommodations/'+created.body.item.id+'/approve','POST',{revision:1},{Cookie:reviewerCookie,'X-CSRF-Token':other.body.csrf});assert.equal(approved.status,200);
  const verified=await request('/accommodations/verify-batch','POST',{rows:[sample]},{Cookie:cookie,'X-CSRF-Token':csrf});assert.equal(verified.status,200);assert.equal(verified.body.ok,true);
  const wrong=await request('/accommodations/verify-batch','POST',{rows:[{...sample,extraMinutes:20}]},{Cookie:cookie,'X-CSRF-Token':csrf});assert.equal(wrong.body.ok,false);
 }finally{await new Promise(resolve=>server.close(resolve));f.dispose();}
});
