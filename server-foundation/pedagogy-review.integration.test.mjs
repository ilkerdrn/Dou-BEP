import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {openStore} from './institutional-store.mjs';
import {createDemo} from '../core.mjs';
import {confirmGoal,confirmQuestion,REVIEW_CRITERIA} from '../pedagogy-review.mjs';
const password='Ornek-Cok-Guv3nli-2026!';
function setup(){const dir=mkdtempSync(join(tmpdir(),'bep-v22-'));const store=openStore(join(dir,'db.sqlite'));store.createTenantAdmin({tenantId:'pilot-a',tenantName:'Anonim pilot',email:'admin@pilot-a.test',password});const actor=store.requireActor(store.signIn({tenantId:'pilot-a',email:'admin@pilot-a.test',password}).token);return {dir,store,actor,done(){store.db.close();rmSync(dir,{recursive:true,force:true});}};}
function sample(){const e=createDemo();e.profile='';e.questions=e.questions.map(q=>({...q,teacherNote:''}));e.reviewPolicy='guided';e.bepGoals=[{id:'H01',level:'short',text:'20 içinde toplama işlemleri yapar.'}];e.questions[0].goalId='H01';e.questions[0].objective=e.bepGoals[0].text;e.questions[0].presentationMode='simplified';return e;}
const checks=Object.fromEntries(Object.keys(REVIEW_CRITERIA).map(k=>[k,true]));
test('v2.2 server refuses approval until both goal and alternative-equivalence attestations are present',()=>{
 const f=setup();try{
  const e=sample(),d=f.store.createExam(f.actor,{exam:e});assert.throws(()=>f.store.approveExam(f.actor,d.id,{revision:1,confirmed:true}),{code:'quality_errors'});
  const first=f.store.getExam(f.actor,d.id).exam;first.goalAttestations=[confirmGoal(first.bepGoals[0])];first.questions[0].equivalenceReview=confirmQuestion(first.questions[0],first,checks);
  const next=f.store.updateExam(f.actor,d.id,{revision:1,exam:first});assert.equal(next.revision,2);
  assert.equal(f.store.approveExam(f.actor,d.id,{revision:2,confirmed:true}).status,'approved');
  const changed=f.store.getExam(f.actor,d.id).exam;changed.questions[0].options[0]='2';
  const update=f.store.updateExam(f.actor,d.id,{revision:2,exam:changed});assert.equal(update.status,'draft');
  assert.throws(()=>f.store.approveExam(f.actor,d.id,{revision:3,confirmed:true}),{code:'quality_errors'});
 }finally{f.done();}
});

test('a guided exam cannot downgrade review policy when later edited',()=>{const f=setup();try{const e=sample(),d=f.store.createExam(f.actor,{exam:e});const modified=f.store.getExam(f.actor,d.id).exam;modified.reviewPolicy='legacy';assert.throws(()=>f.store.updateExam(f.actor,d.id,{revision:1,exam:modified}),{code:'review_downgrade'});}finally{f.done();}});
