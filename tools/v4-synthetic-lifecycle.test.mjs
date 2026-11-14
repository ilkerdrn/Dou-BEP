/**
 * Synthetic E2E lifecycle across the V4 institutional exam, independent
 * reviewer, anonymous student and teacher-scored assessment boundaries.
 * Uses a NEW OS temp SQLite DB only, never a local pilot or production DB.
 * No real student identity, health record, answer publication or AI grading.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from '../server-foundation/institutional-store.mjs';
import {createDemo} from '../core.mjs';
import {reviewExam} from '../quality.mjs';

const PASSWORD='V4-Sentetik-Zincir-2026-Guv3nli!';
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'dou-bep-v4-lifecycle-'));
 const dbPath=join(dir,'lifecycle.sqlite');
 const store=openStore(dbPath,{requireIndependentExamApproval:true});
 for(const tenantId of ['lifecycle-a','lifecycle-b'])
  store.createTenantAdmin({tenantId,tenantName:'Sentetik Kurum '+tenantId,
   email:'admin@'+tenantId+'.test',password:PASSWORD});
 const authenticate=(tenantId,email)=>
  store.requireActor(store.signIn({tenantId,email,password:PASSWORD}).token);
 const admin=authenticate('lifecycle-a','admin@lifecycle-a.test');
 store.addMember(admin,{email:'teacher@lifecycle-a.test',role:'teacher',password:PASSWORD,reauthPassword:PASSWORD});
 store.addMember(admin,{email:'reviewer@lifecycle-a.test',role:'reviewer',password:PASSWORD,reauthPassword:PASSWORD});
 store.addMember(admin,{email:'observer@lifecycle-a.test',role:'observer',password:PASSWORD,reauthPassword:PASSWORD});
 return {dir,dbPath,store,admin,
  teacher:authenticate('lifecycle-a','teacher@lifecycle-a.test'),
  reviewer:authenticate('lifecycle-a','reviewer@lifecycle-a.test'),
  observer:authenticate('lifecycle-a','observer@lifecycle-a.test'),
  otherTenant:authenticate('lifecycle-b','admin@lifecycle-b.test'),
  close(){
   store.db.close();
   rmSync(dir,{recursive:true,force:true});
  }
 };
}
function examDraft(){
 const exam=createDemo();
 exam.title='V4 yalnızca sentetik uçtan uca kabul sınavı';
 exam.profile='';
 exam.adaptations.visualCues=false;
 exam.questions=exam.questions.filter(q=>q.type!=='short')
  .map(q=>({...q,points:25,teacherNote:''}));
 assert.equal(exam.questions.length,4);
 assert.equal(reviewExam(exam).errorCount,0);
 return exam;
}
test('V4: review request -> revised approval -> pilot recovery -> anonymous submission -> teacher manual scores',()=>{
 const f=fixture();
 try{
  const exam=examDraft();
  const initial=f.store.createExam(f.teacher,{exam});
  assert.equal(initial.revision,1);
  assert.equal(initial.status,'draft');
  assert.equal(initial.lastEditedByCurrentActor,true);
  assert.throws(()=>f.store.approveExam(f.teacher,initial.id,{revision:1,confirmed:true}),
   {code:'separation_of_duties'});

  const correction=f.store.reviewFeedbackCreate(f.reviewer,initial.id,{
   revision:1,stageIds:['questions','access'],questionNumbers:[1],confirmed:true
  });
  assert.equal(correction.items.length,1);
  assert.equal(correction.items[0].current,true);
  assert.deepEqual(correction.items[0].questionNumbers,[1]);
  assert.throws(()=>f.store.approveExam(f.reviewer,initial.id,{revision:1,confirmed:true}),
   {code:'review_feedback_pending'});
  assert.equal(f.store.listExams(f.teacher).find(e=>e.id===initial.id).feedbackCurrent,true);

  const corrected=structuredClone(exam);
  corrected.questions[0].prompt+=' (sentetik yeni sürüm açıklaması)';
  assert.equal(reviewExam(corrected).errorCount,0);
  const saved=f.store.updateExam(f.teacher,initial.id,{revision:1,exam:corrected});
  assert.equal(saved.revision,2);
  assert.equal(saved.status,'draft');
  const revisionView=f.store.revisionDelta(f.reviewer,initial.id);
  assert.equal(revisionView.comparison.fromRevision,1);
  assert.equal(revisionView.comparison.toRevision,2);
  assert.ok(revisionView.comparison.changedQuestions.some(item=>item.number===1));
  const feedbackHistory=f.store.reviewFeedbackList(f.teacher,initial.id);
  assert.equal(feedbackHistory.items[0].revision,1);
  assert.equal(feedbackHistory.items[0].current,false);
  const listRow=f.store.listExams(f.reviewer).find(e=>e.id===initial.id);
  assert.equal(listRow.feedbackCurrent,false);
  assert.equal(listRow.feedbackRecheck,true);

  assert.throws(()=>f.store.approveExam(f.teacher,initial.id,{revision:2,confirmed:true}),
   {code:'separation_of_duties'});
  const approved=f.store.approveExam(f.reviewer,initial.id,{revision:2,confirmed:true});
  assert.equal(approved.status,'approved');
  assert.equal(approved.approvedBy,f.reviewer.id);
  const candidates=f.store.pilotEligibleExams(f.teacher);
  assert.equal(candidates.find(x=>x.id===initial.id)?.eligible,true);
  const issued=f.store.pilotIssue(f.teacher,initial.id);
  assert.equal(issued.revision,2);
  assert.equal(f.store.pilotList(f.teacher).find(x=>x.id===issued.id).code,undefined);
  assert.equal(f.store.pilotView(f.teacher,issued.id).answers,null);

  const first=f.store.pilotRedeem(issued.code);
  assert.equal(first.exam.questions.length,4);
  assert.equal(JSON.stringify(first.exam).includes('"answer"'),false);
  assert.equal(JSON.stringify(first.exam).includes('teacherNote'),false);
  assert.throws(()=>f.store.pilotRedeem(issued.code),{code:'invalid_code'});
  assert.equal(f.store.pilotSave(first.token,{q1:'B',q2:'A'}).saved,true);
  assert.deepEqual(f.store.pilotProgress(first.token).answers,{q1:'B',q2:'A'});
  assert.equal(f.store.pilotView(f.teacher,issued.id).answers,null);
  assert.throws(()=>f.store.pilotReviewGet(f.teacher,issued.id),{code:'not_submitted'});

  const recovery=f.store.pilotRecoverIssue(f.teacher,issued.id);
  assert.equal(recovery.id,issued.id);
  assert.equal(recovery.expiresAt,issued.expiresAt);
  assert.throws(()=>f.store.pilotProgress(first.token),{code:'invalid_session'});
  assert.throws(()=>f.store.pilotRedeem(issued.code),{code:'invalid_code'});
  const resumed=f.store.pilotRedeem(recovery.code);
  assert.deepEqual(resumed.answers,{q1:'B',q2:'A'});
  assert.deepEqual(f.store.pilotProgress(resumed.token).answers,{q1:'B',q2:'A'});
  const responses={q1:'B',q2:'A',q3:'A',q4:{'1':'A','2':'B'}};
  assert.equal(f.store.pilotSubmit(resumed.token,responses).ok,true);
  assert.throws(()=>f.store.pilotSubmit(resumed.token,responses),{code:'invalid_session'});
  assert.equal(f.store.pilotView(f.teacher,issued.id).status,'submitted');
  assert.deepEqual(f.store.pilotView(f.teacher,issued.id).answers,responses);

  assert.throws(()=>f.store.pilotReviewGet(f.reviewer,issued.id),{code:'forbidden'});
  assert.throws(()=>f.store.pilotReviewGet(f.otherTenant,issued.id),{code:'not_found'});
  const initialReview=f.store.pilotReviewGet(f.teacher,issued.id);
  assert.equal(initialReview.reviewVersion,0);
  assert.equal(initialReview.reviewedQuestions,0);
  assert.equal(initialReview.questions.length,4);
  assert.ok(initialReview.questions.every(q=>q.score===null));

  const partial=f.store.pilotReviewSave(f.teacher,issued.id,{
   reviewVersion:0,entries:{q1:{score:0,note:'Sentetik kontrol: sıfır puan'}}
  });
  assert.equal(partial.reviewVersion,1);
  assert.equal(partial.reviewedQuestions,1);
  assert.equal(partial.complete,false);
  assert.equal(partial.questions[0].score,0);
  assert.equal(partial.questions[1].score,null);
  const entries=Object.fromEntries(partial.questions.map(q=>[q.id,{
   score:q.id==='q1'?0:q.maxPoints,note:'Sadece sentetik öğretmen gözlemi'
  }]));
  assert.throws(()=>f.store.pilotReviewSave(f.teacher,issued.id,{reviewVersion:0,entries}),
   {code:'review_conflict'});
  const finalReview=f.store.pilotReviewSave(f.teacher,issued.id,{reviewVersion:1,entries});
  assert.equal(finalReview.reviewVersion,2);
  assert.equal(finalReview.reviewedQuestions,4);
  assert.equal(finalReview.complete,true);
  assert.equal(finalReview.questions[0].score,0);
  const csv=f.store.pilotReviewCsv(f.teacher,issued.id);
  assert.match(csv,/Oturum referans/);
  assert.match(csv,/Sadece sentetik öğretmen gözlemi/);
  assert.ok(!csv.includes('teacher@lifecycle-a.test'));
  assert.ok(!csv.includes('reviewer@lifecycle-a.test'));
  assert.equal(f.store.pilotObjectiveCohort(f.teacher,initial.id).available,false);
 }finally{f.close();}
});

test('V4: stale approved revision closes old anonymous capabilities and prevents reuse of scores',()=>{
 const f=fixture();
 try{
  const exam=examDraft();
  const created=f.store.createExam(f.teacher,{exam});
  f.store.approveExam(f.reviewer,created.id,{revision:1,confirmed:true});
  const issued=f.store.pilotIssue(f.teacher,created.id);
  const learner=f.store.pilotRedeem(issued.code);
  f.store.pilotSave(learner.token,{q1:'B'});
  const newer=structuredClone(exam);
  newer.title+=' yeni sürüm';
  const changed=f.store.updateExam(f.teacher,created.id,{revision:1,exam:newer});
  assert.equal(changed.status,'draft');
  assert.equal(changed.revision,2);
  assert.throws(()=>f.store.pilotProgress(learner.token),{code:'exam_changed'});
  assert.throws(()=>f.store.pilotSave(learner.token,{q1:'A'}),{code:'exam_changed'});
  assert.throws(()=>f.store.pilotSubmit(learner.token,{q1:'A'}),{code:'exam_changed'});
  assert.throws(()=>f.store.pilotRecoverIssue(f.teacher,issued.id),{code:'exam_changed'});
  assert.throws(()=>f.store.pilotIssue(f.teacher,created.id),{code:'not_approved'});
  assert.throws(()=>f.store.approveExam(f.reviewer,created.id,{revision:1,confirmed:true}),
   {code:'revision_conflict'});
  const latest=f.store.approveExam(f.reviewer,created.id,{revision:2,confirmed:true});
  assert.equal(latest.status,'approved');
  // Approval of revision 2 must never revive the old learner's revision-1 token.
  assert.throws(()=>f.store.pilotProgress(learner.token),{code:'exam_changed'});
  const fresh=f.store.pilotIssue(f.teacher,created.id);
  assert.equal(fresh.revision,2);
  assert.notEqual(fresh.id,issued.id);
  assert.deepEqual(f.store.pilotList(f.otherTenant),[]);
  assert.throws(()=>f.store.pilotView(f.otherTenant,issued.id),{code:'not_found'});
  assert.throws(()=>f.store.pilotDelete(f.otherTenant,issued.id),{code:'not_found'});
  const newLearner=f.store.pilotRedeem(fresh.code);
  assert.equal(newLearner.exam.questions.length,4);
  assert.equal(f.store.pilotSubmit(newLearner.token,{q1:'A'}).ok,true);
 }finally{f.close();}
});
