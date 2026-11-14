import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const page=readFileSync(resolve(root,'institutional-exams.html'),'utf8');
const client=readFileSync(resolve(root,'institutional-exams.mjs'),'utf8');
const styles=readFileSync(resolve(root,'dou-unified-ui.css'),'utf8');

test('the primary approval checklist remains visible, secondary panels use native accessible details',()=>{
 assert.match(page,/<section id="exam-approval-workbench"/);
 assert.match(page,/<details class="exam-revision-compare" id="exam-revision-compare"/);
 assert.match(page,/<summary id="exam-revision-compare-title"/);
 assert.match(page,/<details class="exam-review-feedback" id="exam-review-feedback"/);
 assert.match(page,/<summary id="exam-review-feedback-title"/);
 assert.match(page,/id="exam-revision-compare-summary"/);
 assert.match(page,/id="exam-review-feedback-summary"/);
 assert.match(page,/id="exam-revision-compare-status" role="status" aria-live="polite"/);
 assert.match(page,/id="exam-review-feedback-status" role="status" aria-live="polite"/);
 assert.equal((page.match(/<details class="exam-revision-compare"/g)||[]).length,1);
 assert.equal((page.match(/<details class="exam-review-feedback"/g)||[]).length,1);
 assert.match(styles,/V4 compact reviewer details/);
 assert.match(styles,/>summary:focus-visible/);
});

test('revision status remains accessible in closed header and explicit list navigation opens it',()=>{
 assert.match(client,/\$\('exam-revision-compare-summary'\)/);
 assert.match(client,/compact\.textContent='Sürüm '\+delta\.fromRevision/);
 assert.match(client,/compact\.textContent='Karşılaştırma kaydı yok'/);
 assert.match(client,/compact\.textContent='Kontrol ediliyor'/);
 assert.match(client,/\$\('exam-revision-compare'\)\.open=true/);
 assert.match(client,/\$\('exam-revision-compare-title'\)/);
 assert.match(client,/heading\.focus\(\{preventScroll:true\}\)/);
 assert.match(client,/revisionDeltaGeneration/);
});

test('current correction request opens once, allowing user to collapse it afterwards',()=>{
 assert.match(client,/let reviewFeedbackGeneration=0,reviewFeedbackFormKey='',reviewFeedbackSending=false,feedbackAutoOpenKey=''/);
 assert.match(client,/const activeKey=current\.id\+'\|'\+current\.revision/);
 assert.match(client,/if\(active\.length&&feedbackAutoOpenKey!==activeKey\)/);
 assert.match(client,/feedbackAutoOpenKey=activeKey/);
 assert.match(client,/section\.open=true/);
 assert.match(client,/compact\.textContent=active\.length\?'Güncel düzeltme isteği: '/);
 assert.match(client,/compact\.textContent='Kontrol edilemedi'/);
});

test('unsent reviewer selections cannot be lost silently on new, other or page exit',()=>{
 assert.match(client,/function hasUnsentReviewRequest\(\)/);
 assert.match(client,/form\.querySelector\('\[data-feedback-stage\]:checked'\)/);
 assert.match(client,/\$\('exam-review-feedback-questions'\)\.value\.trim\(\)/);
 assert.match(client,/function confirmLeavingReviewRequest\(\)/);
 assert.match(client,/if\(reviewFeedbackSending\)/);
 assert.match(client,/if\(id!==state\.current\?\.id&&!confirmLeavingReviewRequest\(\)\)return/);
 assert.match(client,/if\(\(btn\.dataset\.duplicate\|\|btn\.dataset\.open!==state\.current\?\.id\)&&!confirmLeavingReviewRequest\(\)\)return/);
 assert.match(client,/if\(!confirmLeavingReviewRequest\(\)\)return;draft\(\)/);
 assert.match(client,/autosave\.isSaving\(\)\|\|reviewFeedbackSending\|\|hasUnsentReviewRequest\(\)/);
});

test('compact UI neither changes server-side approval gates nor stores learner data',()=>{
 const repo=readFileSync(resolve(root,'server-foundation/exam-repository.mjs'),'utf8');
 assert.match(repo,/review_feedback_pending/);
 assert.match(repo,/requireIndependentExamApproval/);
 assert.match(client,/\$\('exam-approve'\)\.disabled=/);
 assert.doesNotMatch(page,/type="button" id="exam-approval-workbench-auto-approve"/);
 assert.doesNotMatch(client,/localStorage\.setItem\(.*review|sessionStorage\.setItem\(.*review/);
});
