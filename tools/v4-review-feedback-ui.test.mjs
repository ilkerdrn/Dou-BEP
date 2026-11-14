import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseReviewQuestionNumbers,reviewerInbox} from '../reviewer-inbox.mjs';
import {approvalWorkbenchSummary} from '../approval-workbench.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

test('bounded numeric references never accept text, duplicates or out-of-range questions',()=>{
 assert.deepEqual(parseReviewQuestionNumbers('1, 3, 5',5),[1,3,5]);
 assert.deepEqual(parseReviewQuestionNumbers('',8),[]);
 for(const bad of ['1,1','0','-1','100','1;3','1, özel bilgi','1,2,','1,,3','a'.repeat(100)]){
  assert.throws(()=>parseReviewQuestionNumbers(bad,5),bad);
 }
 assert.throws(()=>parseReviewQuestionNumbers('1',101));
 assert.throws(()=>parseReviewQuestionNumbers(Array.from({length:21},(_,i)=>i+1).join(','),100));
});

test('reviewer queue highlights current feedback while never treating it as approval',()=>{
 const row={id:'11111111-1111-4111-8111-111111111111',title:'V4 Sinav',
  revision:2,status:'draft',feedbackCurrent:true,ownerId:'owner',updatedAt:1};
 const inbox=reviewerInbox([row],{role:'reviewer'});
 assert.equal(inbox.items[0].feedbackCurrent,true);
 assert.match(inbox.items[0].label,/düzeltme kaydı var/);
 assert.ok(!inbox.items[0].label.includes('onaylı'));
 const closed=reviewerInbox([{...row,status:'approved',feedbackCurrent:false}],{role:'reviewer',filter:'approved'});
 assert.equal(closed.items[0].feedbackCurrent,false);
});

test('unresolved corrections and feedback-loading prevent early on-screen approval readiness',()=>{
 const stages=['identity','goals','questions','access','delivery'].map((id,i)=>({
  id,target:['exam-main-fields','exam-goal-section','exam-question-section','exam-quality','exam-output-section'][i],
  title:id,detail:id,done:true
 }));
 const base={preflight:{stages,approvalConflict:false},
  questionDraft:{items:[],incomplete:0,review:0},
  quality:{errorCount:0,warningCount:0},saved:true,dirty:false,canApprove:true,confirmed:true};
 const ok=approvalWorkbenchSummary(base);
 assert.equal(ok.canRequestApproval,true);
 const waiting=approvalWorkbenchSummary({...base,feedbackLoading:true});
 assert.equal(waiting.canRequestApproval,false);
 assert.match(waiting.headline,/kontrol ediliyor/);
 const blocked=approvalWorkbenchSummary({...base,feedbackPending:true});
 assert.equal(blocked.canRequestApproval,false);
 assert.match(blocked.detail,/Aynı sürüm onaylanamaz/);
});

test('teacher and reviewer UI fetch feedback through server, guard old revisions and avoid raw notes',()=>{
 const html=readFileSync(resolve(root,'institutional-exams.html'),'utf8');
 const js=readFileSync(resolve(root,'institutional-exams.mjs'),'utf8');
 const repo=readFileSync(resolve(root,'server-foundation/exam-repository.mjs'),'utf8');
 const api=readFileSync(resolve(root,'server-foundation/institutional-api.mjs'),'utf8');
 const css=readFileSync(resolve(root,'dou-unified-ui.css'),'utf8');
 for(const id of [
  'exam-review-feedback','exam-review-feedback-status','exam-review-feedback-records',
  'exam-review-feedback-form','exam-review-feedback-stages','exam-review-feedback-questions',
  'exam-review-feedback-confirm','exam-review-feedback-submit'
 ])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(js,/function renderReviewFeedback\(\)/);
 assert.match(js,/async function loadReviewFeedback\(\)/);
 assert.match(js,/reviewFeedbackGeneration/);
 assert.match(js,/current\.ownerId!==state\.actor\?\.id/);
 assert.match(js,/parseReviewQuestionNumbers\(/);
 assert.match(js,/state\.reviewFeedback=result\.feedback/);
 assert.match(js,/function refreshApprovalFeedbackUi\(\)/);
 assert.match(js,/state\.reviewFeedback=feedback;refreshApprovalFeedbackUi\(\)/);
 assert.match(js,/dataset\.feedbackRevision/);
 assert.match(js,/dataset\.feedbackTarget/);
 assert.match(js,/dataset\.feedbackQuestion/);
 assert.match(js,/visitApprovalQuestion\(Number\(button\.dataset\.feedbackQuestion\)-1,'prompt'\)/);
 assert.match(js,/reviewFeedbackCheckPending\(\)/);
 assert.match(js,/hasCurrentReviewFeedback\(\)/);
 assert.match(js,/reviewFeedbackFormKey/);
 assert.match(js,/state\.exams=r\.items;drawExamList\(\);renderReviewerInbox\(\)/);
 assert.match(js,/feedbackCurrent\?'\<small class=/);
 assert.match(api,/action==='review-feedback'&&req\.method==='GET'/);
 assert.match(api,/action==='review-feedback'&&req\.method==='POST'/);
 assert.match(repo,/CREATE TABLE IF NOT EXISTS exam_review_feedback/);
 assert.match(repo,/UNIQUE\(tenant_id,exam_id,revision,reviewer_id\)/);
 assert.match(repo,/review_feedback_pending/);
 assert.match(repo,/WHERE e\.tenant_id=\?/);
 assert.match(css,/exam-review-feedback-entry/);
 assert.doesNotMatch(readFileSync(resolve(root,'reviewer-inbox.mjs'),'utf8'),
  /localStorage\.|sessionStorage\.|document\.|window\.|updateExam\(|approveExam\(/);
});
