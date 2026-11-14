/**
 * Two independent SQLite connections exercise the same revision from separate
 * app instances. Only synthetic metadata in a fresh OS-temp database is used.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openStore} from './institutional-store.mjs';
import {createDemo} from '../core.mjs';
import {reviewExam} from '../quality.mjs';

const PASSWORD='Only-Synthetic-Approval-Gate-2026!';
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'dou-v4-review-serialize-'));
 const path=join(dir,'acceptance.sqlite');
 const a=openStore(path,{requireIndependentExamApproval:true});
 a.createTenantAdmin({tenantId:'synthetic-gate',tenantName:'Synthetic Gate',email:'admin@gate.test',password:PASSWORD});
 const login=(store,email)=>store.requireActor(
  store.signIn({tenantId:'synthetic-gate',email,password:PASSWORD}).token);
 const admin=login(a,'admin@gate.test');
 a.addMember(admin,{email:'teacher@gate.test',role:'teacher',password:PASSWORD,reauthPassword:PASSWORD});
 a.addMember(admin,{email:'reviewer@gate.test',role:'reviewer',password:PASSWORD,reauthPassword:PASSWORD});
 const b=openStore(path,{requireIndependentExamApproval:true});
 return {
  a,b,teacher:login(a,'teacher@gate.test'),reviewerA:login(a,'reviewer@gate.test'),
  reviewerB:login(b,'reviewer@gate.test'),
  close(){a.db.close();b.db.close();rmSync(dir,{recursive:true,force:true});}
 };
}
function exam(){
 const e=createDemo();
 e.profile='';
 e.adaptations.visualCues=false;
 e.questions=e.questions.filter(q=>q.type!=='short').map(q=>({...q,points:25,teacherNote:''}));
 assert.equal(reviewExam(e).errorCount,0);
 return e;
}
const correction=revision=>({revision,stageIds:['questions'],questionNumbers:[1],confirmed:true});

test('feedback on one connection blocks approval on another until a new revision',()=>{
 const f=fixture();
 try{
  const draft=exam(),created=f.a.createExam(f.teacher,{exam:draft});
  const feedback=f.b.reviewFeedbackCreate(f.reviewerB,created.id,correction(1));
  assert.equal(feedback.items.length,1);
  assert.throws(()=>f.a.approveExam(f.reviewerA,created.id,{revision:1,confirmed:true}),
   {code:'review_feedback_pending'});
  assert.equal(f.a.getExam(f.teacher,created.id).status,'draft');
  const updated=structuredClone(draft);
  updated.questions[0].prompt+=' Sadece sentetik düzeltme.';
  assert.equal(reviewExam(updated).errorCount,0);
  const revision=f.a.updateExam(f.teacher,created.id,{revision:1,exam:updated});
  assert.equal(revision.revision,2);
  assert.throws(()=>f.b.reviewFeedbackCreate(f.reviewerB,created.id,correction(1)),
   {code:'revision_conflict'});
  assert.equal(f.a.approveExam(f.reviewerA,created.id,{revision:2,confirmed:true}).status,'approved');
  const records=f.b.reviewFeedbackList(f.reviewerB,created.id);
  assert.equal(records.items.length,1);
  assert.equal(records.items[0].revision,1);
  assert.equal(records.items[0].current,false);
 }finally{f.close();}
});

test('approval on one connection prevents a later feedback write on another',()=>{
 const f=fixture();
 try{
  const created=f.a.createExam(f.teacher,{exam:exam()});
  const confirmed=f.a.approveExam(f.reviewerA,created.id,{revision:1,confirmed:true});
  assert.equal(confirmed.status,'approved');
  assert.throws(()=>f.b.reviewFeedbackCreate(f.reviewerB,created.id,correction(1)),
   {code:'not_draft'});
  const recordCount=f.b.db.prepare('SELECT COUNT(*) AS n FROM exam_review_feedback WHERE exam_id=?')
   .get(created.id).n;
  assert.equal(recordCount,0);
  const history=f.b.approvalHistory(f.reviewerB,created.id);
  assert.equal(history.records.length,1);
  assert.equal(history.records[0].current,true);
 }finally{f.close();}
});

test('invalid feedback rolls back its writer lock, leaving another connection able to approve',()=>{
 const f=fixture();
 try{
  const created=f.a.createExam(f.teacher,{exam:exam()});
  assert.throws(()=>f.b.reviewFeedbackCreate(f.reviewerB,created.id,{
   ...correction(1),studentName:'Do not store'
  }),{code:'invalid_feedback'});
  assert.equal(f.b.db.isTransaction,false);
  const approved=f.a.approveExam(f.reviewerA,created.id,{revision:1,confirmed:true});
  assert.equal(approved.status,'approved');
  assert.equal(f.a.db.prepare('SELECT COUNT(*) AS n FROM exam_review_feedback WHERE exam_id=?')
   .get(created.id).n,0);
 }finally{f.close();}
});
