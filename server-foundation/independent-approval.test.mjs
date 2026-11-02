import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openStore} from './institutional-store.mjs';
import {createDemo} from '../core.mjs';
const password='Strict-Academic-Approval-2026!!';
const sample=()=>{const e=createDemo();e.profile='';e.questions=e.questions.map(q=>({...q,teacherNote:''}));return e;};

test('opt-in independent exam approval blocks the draft owner and permits a different authorized reviewer',()=>{
 const dir=mkdtempSync(join(tmpdir(),'bep-independent-'));
 const store=openStore(join(dir,'database.sqlite'),{requireIndependentExamApproval:true});
 try{
  store.createTenantAdmin({tenantId:'test-uni',tenantName:'Test Üniversitesi',email:'admin@test-uni.test',password});
  const admin=store.requireActor(store.signIn({tenantId:'test-uni',email:'admin@test-uni.test',password}).token);
  store.addMember(admin,{email:'reviewer@test-uni.test',role:'reviewer',password});
  const reviewer=store.requireActor(store.signIn({tenantId:'test-uni',email:'reviewer@test-uni.test',password}).token);
  const created=store.createExam(admin,{exam:sample()});
  assert.throws(()=>store.approveExam(admin,created.id,{revision:1,confirmed:true}),{code:'separation_of_duties'});
  assert.equal(store.approvalHistory(admin,created.id).records.length,0);
  const approved=store.approveExam(reviewer,created.id,{revision:1,confirmed:true});
  assert.equal(approved.status,'approved');
  assert.equal(store.approvalHistory(admin,created.id).records.length,1);
 }finally{store.db.close();rmSync(dir,{recursive:true,force:true});}
});

test('legacy anonymous pilot still supports original approval behavior unless explicitly required',()=>{
 const dir=mkdtempSync(join(tmpdir(),'bep-approval-legacy-'));
 const store=openStore(join(dir,'database.sqlite'),{requireIndependentExamApproval:false});
 try{
  store.createTenantAdmin({tenantId:'legacy',tenantName:'Eski Anonim',email:'admin@legacy.test',password});
  const admin=store.requireActor(store.signIn({tenantId:'legacy',email:'admin@legacy.test',password}).token);
  const created=store.createExam(admin,{exam:sample()});
  assert.equal(store.approveExam(admin,created.id,{revision:1,confirmed:true}).status,'approved');
 }finally{store.db.close();rmSync(dir,{recursive:true,force:true});}
});
