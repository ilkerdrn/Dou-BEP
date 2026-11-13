/**
 * Synthetic V4 closure: teacher -> independent reviewer -> anonymous learner ->
 * teacher review. Runs only against a new OS-temp SQLite DB; never pilot.sqlite.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from '../server-foundation/institutional-store.mjs';
import {createDemo} from '../core.mjs';
import {reviewExam} from '../quality.mjs';

const password='Izole-Sentetik-Kabul-2026!';
const tenantId='v4-closure-test';

function login(store,email){
 const session=store.signIn({tenantId,email,password});
 return store.requireActor(session.token);
}

test('V4 synthetic closure keeps independent approval, one-use code, anonymous delivery and manual review',()=>{
 const dir=mkdtempSync(join(tmpdir(),'dou-bep-v4-closure-'));
 let store;
 try{
  store=openStore(join(dir,'closure.sqlite'),{requireIndependentExamApproval:true});
  store.createTenantAdmin({tenantId,tenantName:'Yalnizca Sentetik V4 Kabul',email:'admin@v4-closure.test',password});
  const admin=login(store,'admin@v4-closure.test');
  store.addMember(admin,{email:'teacher@v4-closure.test',role:'teacher',password,reauthPassword:password});
  store.addMember(admin,{email:'reviewer@v4-closure.test',role:'reviewer',password,reauthPassword:password});
  const teacher=login(store,'teacher@v4-closure.test');
  const reviewer=login(store,'reviewer@v4-closure.test');
  assert.notEqual(teacher.id,reviewer.id);

  const exam=createDemo();
  exam.title='V4 Sentetik Onay ve Anonim Teslim Kabul Sinavi';
  exam.profile='';
  exam.adaptations.visualCues=false;
  exam.questions=exam.questions.filter(q=>q.type!=='short')
   .map(q=>({...q,points:25,teacherNote:''}));
  assert.equal(reviewExam(exam).errorCount,0);
  const created=store.createExam(teacher,{exam});
  assert.equal(created.status,'draft');
  assert.throws(()=>store.approveExam(teacher,created.id,{revision:created.revision,confirmed:true}),{code:'separation_of_duties'});
  assert.throws(()=>store.pilotIssue(teacher,created.id),{code:'not_approved'});
  const approved=store.approveExam(reviewer,created.id,{revision:created.revision,confirmed:true});
  assert.equal(approved.status,'approved');
  assert.equal(approved.approvedBy,reviewer.id);
  assert.equal(store.approvalHistory(reviewer,created.id).records[0].current,true);
  const candidates=store.pilotEligibleExams(teacher);
  assert.deepEqual(candidates.map(x=>x.id),[created.id]);
  assert.equal(candidates[0].eligible,true);
  assert.equal(candidates[0].questionCount,4);

  const issued=store.pilotIssue(teacher,created.id);
  assert.match(issued.code,/^[0-9A-F]{5}(?:-[0-9A-F]{5}){3}$/);
  assert.equal(store.pilotView(teacher,issued.id).answers,null);
  const learner=store.pilotRedeem(issued.code);
  assert.equal(learner.exam.questions.length,4);
  assert.equal(JSON.stringify(learner.exam).includes('teacherNote'),false);
  assert.equal(JSON.stringify(learner.exam).includes('"answer"'),false);
  assert.throws(()=>store.pilotRedeem(issued.code),{code:'invalid_code'});
  assert.equal(store.pilotSave(learner.token,{q1:'B',q2:'A'}).saved,true);
  assert.deepEqual(store.pilotProgress(learner.token).answers,{q1:'B',q2:'A'});
  assert.equal(store.pilotView(teacher,issued.id).answers,null);
  assert.throws(()=>store.pilotReviewGet(teacher,issued.id),{code:'not_submitted'});

  const responses={q1:'B',q2:'A',q3:'A',q4:{'1':'A','2':'B'}};
  const submitted=store.pilotSubmit(learner.token,responses);
  assert.equal(submitted.ok,true);
  assert.equal(store.pilotView(teacher,issued.id).status,'submitted');
  assert.throws(()=>store.pilotSubmit(learner.token,responses),{code:'invalid_session'});
  assert.deepEqual(store.pilotView(teacher,issued.id).answers,responses);
  const before=store.pilotReviewGet(teacher,issued.id);
  assert.equal(before.reviewVersion,0);
  assert.equal(before.reviewedQuestions,0);
  const entries=Object.fromEntries(before.questions.map(q=>[q.id,{score:q.maxPoints,note:'Sentetik pilot gozlemi'}]));
  const after=store.pilotReviewSave(teacher,issued.id,{reviewVersion:0,entries});
  assert.equal(after.reviewVersion,1);
  assert.equal(after.complete,true);
  assert.equal(after.reviewedQuestions,4);
  assert.throws(()=>store.pilotReviewSave(teacher,issued.id,{reviewVersion:0,entries}),{code:'review_conflict'});
  const csv=store.pilotReviewCsv(teacher,issued.id);
  assert.match(csv,/Oturum referans/);
  assert.match(csv,/Sentetik pilot gozlemi/);
  assert.ok(!csv.includes('teacher@v4-closure.test'));
  assert.ok(!csv.includes('reviewer@v4-closure.test'));
  assert.equal(store.pilotObjectiveCohort(teacher,created.id).available,false);
  assert.throws(()=>store.pilotObjectiveCsv(teacher,created.id),{code:'not_enough_reviews'});
 }finally{
  if(store)store.db.close();
  rmSync(dir,{recursive:true,force:true});
 }
});
