/**
 * V4 five-step teacher/reviewer handoff on disposable local SQLite.
 * Real role and revision boundaries, synthetic exam content only.
 * Never uses a saved pilot database or grants approval via an UI projection.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openStore} from '../server-foundation/institutional-store.mjs';
import {createDemo} from '../core.mjs';
import {reviewExam} from '../quality.mjs';
import {getExamPreflight} from '../exam-preflight.mjs';
import {questionDraftGuidance} from '../question-draft-guidance.mjs';
import {approvalWorkbenchSummary} from '../approval-workbench.mjs';
import {approvalRevisionStatus} from '../approval-revision-status.mjs';
import {reviewerInbox} from '../reviewer-inbox.mjs';
import {reviewerRecheckHints} from '../reviewer-recheck-hints.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const PASSWORD='Synthetic-Handoff-2026-Secure-41!';
const targets=['exam-main-fields','exam-goal-section','exam-question-section',
 'exam-quality','exam-output-section'];
const stages=['identity','goals','questions','access','delivery'];
const sample=()=>{
 const exam=createDemo();
 exam.title='Sentetik beş adım devir sınavı';
 exam.profile='';
 exam.questions=exam.questions.map(q=>({...q,teacherNote:''}));
 assert.equal(reviewExam(exam).errorCount,0);
 return exam;
};
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'dou-bep-v4-handoff-'));
 const file=join(dir,'handoff.sqlite');
 const store=openStore(file,{requireIndependentExamApproval:true});
 for(const tenantId of ['handoff-a','handoff-b']){
  store.createTenantAdmin({tenantId,tenantName:'Synthetic Campus '+tenantId,
   email:'admin@'+tenantId+'.test',password:PASSWORD});
 }
 const signed=(tenant,email)=>store.requireActor(store.signIn({
  tenantId:tenant,email,password:PASSWORD
 }).token);
 const admin=signed('handoff-a','admin@handoff-a.test');
 store.addMember(admin,{email:'teacher@handoff-a.test',role:'teacher',password:PASSWORD,reauthPassword:PASSWORD});
 store.addMember(admin,{email:'reviewer@handoff-a.test',role:'reviewer',password:PASSWORD,reauthPassword:PASSWORD});
 store.addMember(admin,{email:'observer@handoff-a.test',role:'observer',password:PASSWORD,reauthPassword:PASSWORD});
 return {store,teacher:signed('handoff-a','teacher@handoff-a.test'),
  reviewer:signed('handoff-a','reviewer@handoff-a.test'),
  observer:signed('handoff-a','observer@handoff-a.test'),
  foreign:signed('handoff-b','admin@handoff-b.test'),
  close(){store.db.close();rmSync(dir,{recursive:true,force:true});}
 };
}
function projected(exam,{saved,approved=false,dirty=false,canEdit=false,canApprove=false,
 feedbackPending=false,feedbackLoading=false,confirmed=false}={}){
 const preflight=getExamPreflight(exam,{saved,dirty,approved});
 const model=approvalWorkbenchSummary({
  preflight,questionDraft:questionDraftGuidance(exam),
  quality:reviewExam(exam),saved,approved,dirty,
  canEdit,canApprove,feedbackPending,feedbackLoading,confirmed
 });
 return {preflight,model};
}

test('teacher -> correction -> new revision -> reviewer recheck -> independent approval, with all five UI stages',()=>{
 const f=fixture();
 try{
  const exam=sample();
  const before=structuredClone(exam);
  const draft=projected(exam,{saved:false,dirty:true,canEdit:true});
  assert.deepEqual(draft.preflight.stages.map(s=>s.id),stages);
  assert.deepEqual(draft.model.stages.map(s=>s.target),targets);
  assert.equal(draft.model.summary.questionCount,5);
  assert.equal(draft.preflight.stages.at(-1).done,false);
  assert.equal(draft.model.canRequestApproval,false);
  assert.equal(JSON.stringify(exam),JSON.stringify(before));

  const created=f.store.createExam(f.teacher,{exam});
  assert.equal(created.revision,1);
  assert.equal(created.status,'draft');
  const savedRevision=approvalRevisionStatus({saved:true,revision:created.revision});
  assert.equal(savedRevision.editor.state,'saved');
  assert.equal(savedRevision.approval.state,'not-approved');
  assert.equal(projected(exam,{saved:true,canEdit:true}).model.canRequestApproval,false);
  assert.throws(()=>f.store.approveExam(f.teacher,created.id,{revision:1,confirmed:true}),
   {code:'separation_of_duties'});

  const request=f.store.reviewFeedbackCreate(f.reviewer,created.id,{
   revision:1,stageIds:['questions','access'],questionNumbers:[1,2],confirmed:true
  });
  assert.equal(request.items.length,1);
  assert.equal(request.items[0].current,true);
  const flagged=projected(exam,{
   saved:true,canApprove:true,feedbackPending:true,confirmed:true
  });
  assert.equal(flagged.model.canRequestApproval,false);
  assert.match(flagged.model.headline,/düzeltme isteği/);
  assert.throws(()=>f.store.approveExam(f.reviewer,created.id,{revision:1,confirmed:true}),
   {code:'review_feedback_pending'});
  assert.equal(f.store.listExams(f.reviewer).find(row=>row.id===created.id).feedbackCurrent,true);

  const revised=structuredClone(exam);
  revised.questions[0].prompt+=' SYNTHETIC_PRIVATE_QUESTION_408';
  assert.equal(reviewExam(revised).errorCount,0);
  const revision2=f.store.updateExam(f.teacher,created.id,{revision:1,exam:revised});
  assert.equal(revision2.revision,2);
  assert.equal(revision2.status,'draft');
  const inbox=reviewerInbox(f.store.listExams(f.reviewer),{
   role:'reviewer',actorId:f.reviewer.id,filter:'recheck'
  });
  assert.deepEqual(inbox.items.map(x=>x.id),[created.id]);
  assert.equal(inbox.items[0].feedbackRecheck,true);
  assert.equal(inbox.items[0].status,'draft');
  assert.equal(reviewerInbox(f.store.listExams(f.teacher),{role:'teacher',filter:'recheck'}).enabled,false);

  const delta=f.store.revisionDelta(f.reviewer,created.id);
  const feedback=f.store.reviewFeedbackList(f.reviewer,created.id);
  assert.deepEqual([delta.comparison.fromRevision,delta.comparison.toRevision],[1,2]);
  assert.equal(delta.currentRevision,2);
  assert.equal(feedback.currentRevision,2);
  assert.equal(feedback.items[0].current,false);
  const hints=reviewerRecheckHints(delta,feedback);
  assert.equal(hints.status,'recheck');
  assert.deepEqual(hints.stages.map(x=>x.id),['questions','access']);
  assert.deepEqual(hints.questions.map(x=>x.number),[1,2]);
  assert.deepEqual(hints.questions.map(x=>x.canJump),[true,true]);
  assert.equal(Object.hasOwn(hints,'approved'),false);
  assert.match(hints.notice,/kanıtlamaz/);
  const report=JSON.stringify({hints,preflight:getExamPreflight(revised,{saved:true,dirty:false}),
   workbench:projected(revised,{saved:true,canApprove:true,confirmed:true}).model});
  assert.ok(!report.includes('SYNTHETIC_PRIVATE_QUESTION_408'));

  assert.throws(()=>f.store.approveExam(f.reviewer,created.id,{revision:1,confirmed:true}),
   {code:'revision_conflict'});
  assert.throws(()=>f.store.approveExam(f.teacher,created.id,{revision:2,confirmed:true}),
   {code:'separation_of_duties'});
  const approved=f.store.approveExam(f.reviewer,created.id,{revision:2,confirmed:true});
  assert.equal(approved.status,'approved');
  assert.equal(approved.approvedBy,f.reviewer.id);
  assert.equal(approvalRevisionStatus({saved:true,revision:2,approved:true}).approval.state,'approved');
  const after=projected(revised,{saved:true,approved:true,canApprove:true,confirmed:true});
  assert.equal(after.model.canRequestApproval,false);
  assert.equal(after.model.state,'approved');
  assert.equal(after.model.stages.length,5);
  assert.equal(reviewerInbox(f.store.listExams(f.reviewer),{
   role:'reviewer',filter:'recheck'
  }).items.length,0);
 }finally{f.close();}
});

test('unsaved changes cannot inherit previous approval in any five-step UI projection',()=>{
 const exam=sample();
 const preflight=getExamPreflight(exam,{saved:true,dirty:true,approved:true});
 const view=approvalWorkbenchSummary({
  preflight,questionDraft:questionDraftGuidance(exam),quality:reviewExam(exam),
  saved:true,dirty:true,approved:true,canApprove:true,confirmed:true
 });
 assert.notEqual(view.state,'approved');
 assert.equal(view.canRequestApproval,false);
 assert.match(view.headline,/henüz doğrulanmamış/);
 assert.match(view.detail,/değişiklikleri kapsamaz/);
 const status=approvalRevisionStatus({saved:true,revision:7,dirty:true,approved:true});
 assert.equal(status.server.state,'saved');
 assert.equal(status.approval.state,'not-approved');
 assert.equal(status.editor.state,'pending');
 const impossible=approvalWorkbenchSummary({
  preflight:getExamPreflight(exam,{saved:false,dirty:false,approved:true}),
  questionDraft:questionDraftGuidance(exam),quality:reviewExam(exam),
  saved:false,dirty:false,approved:true,canApprove:true,confirmed:true
 });
 assert.notEqual(impossible.state,'approved');
});

test('no observer or foreign-campus account can cross the reviewer correction boundary',()=>{
 const f=fixture();
 try{
  const exam=sample(),created=f.store.createExam(f.teacher,{exam});
  assert.throws(()=>f.store.reviewFeedbackCreate(f.observer,created.id,{
   revision:1,stageIds:['questions'],questionNumbers:[1],confirmed:true
  }),{code:'forbidden'});
  assert.throws(()=>f.store.reviewFeedbackList(f.observer,created.id),{code:'forbidden'});
  assert.throws(()=>f.store.reviewFeedbackList(f.foreign,created.id),{code:'missing'});
  assert.throws(()=>f.store.revisionDelta(f.observer,created.id),{code:'forbidden'});
  assert.throws(()=>f.store.revisionDelta(f.foreign,created.id),{code:'missing'});
  assert.equal(reviewerInbox(f.store.listExams(f.teacher),{role:'teacher'}).enabled,false);
 }finally{f.close();}
});

test('UI wiring and offline QUICK gate remain tied to real server revision/approval actions',()=>{
 const page=readFileSync(resolve(root,'institutional-exams.html'),'utf8');
 const client=readFileSync(resolve(root,'institutional-exams.mjs'),'utf8');
 const runner=readFileSync(resolve(root,'tools/v4-local-acceptance.mjs'),'utf8');
 for(const id of targets)assert.match(page,new RegExp('id="'+id+'"'));
 assert.match(client,/submitExamApproval\(\{/);
 assert.match(client,/reviewerRecheckHints\(state\.revisionDelta,state\.reviewFeedback\)/);
 assert.match(client,/Number\(button\.dataset\.recheckRevision\)!==current\.revision/);
 assert.match(client,/if\(!sameOpened&&!confirmDraftSwitch\(\)\)return/);
 assert.match(client,/renderRevisionStatus\(\)/);
 assert.match(client,/reviewFeedbackCheckPending\(\)\|\|hasCurrentReviewFeedback\(\)/);
 assert.match(runner,/'tools\/v4-five-step-handoff\.test\.mjs'/);
});
