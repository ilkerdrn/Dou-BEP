/**
 * Synthetic revision-bound correction navigation and safe feedback retry.
 * No exam answers, student records, production database or approval operations.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewFeedbackNavigation} from '../review-feedback-navigation.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

test('all five feedback stages and twenty flagged questions remain navigable',()=>{
 const record={revision:4,stageIds:['identity','goals','questions','access','delivery'],
  questionNumbers:Array.from({length:20},(_,i)=>i+1)};
 const before=JSON.stringify(record);
 const guide=reviewFeedbackNavigation(record,{revision:4,questionCount:100});
 assert.equal(JSON.stringify(record),before);
 assert.equal(guide.stages.length,5);
 assert.equal(guide.questions.length,20);
 assert.equal(guide.count,25);
 assert.deepEqual(guide.questions.map(q=>q.number),record.questionNumbers);
 assert.equal(guide.questions[19].index,19);
 assert.deepEqual(guide.stages.map(s=>s.target),[
  'exam-main-fields','exam-goal-section','exam-question-section','exam-quality','exam-output-section'
 ]);
});

test('old revisions and invalid question indices cannot be used for current shortcuts',()=>{
 const record={revision:3,stageIds:['questions'],questionNumbers:[1,5,99]};
 assert.equal(reviewFeedbackNavigation(record,{revision:4,questionCount:100}).count,0);
 assert.equal(reviewFeedbackNavigation(record,{revision:3,questionCount:0}).questions.length,0);
 assert.deepEqual(reviewFeedbackNavigation(record,{revision:3,questionCount:5}).questions.map(q=>q.number),[1,5]);
 for(const invalid of [-1,101,1.25,'20'])
  assert.equal(reviewFeedbackNavigation(record,{revision:3,questionCount:invalid}).count,0);
 assert.equal(reviewFeedbackNavigation(null,{revision:3,questionCount:20}).count,0);
});

test('duplicate and malformed correction references never become navigation links',()=>{
 const record={revision:2,
  stageIds:['questions','questions','toString','__proto__','access','unknown'],
  questionNumbers:[2,2,0,-1,101,'3',3,1.5,NaN,100]};
 const guide=reviewFeedbackNavigation(record,{revision:2,questionCount:100});
 assert.deepEqual(guide.stages.map(s=>s.id),['questions','access']);
 assert.deepEqual(guide.questions.map(q=>q.number),[2,3,100]);
 assert.equal(guide.count,5);
});

test('fixed labels never reflect raw reviewer notes or answer keys',()=>{
 const secret='SECRET_STUDENT_DATA_OR_ANSWER_483';
 const guide=reviewFeedbackNavigation({
  revision:5,stageIds:['goals'],questionNumbers:[4],
  title:secret,notes:secret,answer:secret,stageText:secret
 },{revision:5,questionCount:10});
 assert.equal(JSON.stringify(guide).includes(secret),false);
 assert.ok(guide.questions[0].label.includes('Soru 4'));
 assert.equal(Object.hasOwn(guide,'approved'),false);
});

test('UI permits all requested links and explicit revision-safe retry without changing approval',()=>{
 const html=readFileSync(resolve(root,'institutional-exams.html'),'utf8');
 const js=readFileSync(resolve(root,'institutional-exams.mjs'),'utf8');
 const css=readFileSync(resolve(root,'dou-unified-ui.css'),'utf8');
 const server=readFileSync(resolve(root,'server.mjs'),'utf8');
 const helper=readFileSync(resolve(root,'review-feedback-navigation.mjs'),'utf8');
 const quick=readFileSync(resolve(root,'tools/v4-local-acceptance.mjs'),'utf8');
 assert.match(html,/id="exam-review-feedback-retry"[^>]*hidden/);
 assert.match(js,/reviewFeedbackNavigation\(record,\{/);
 assert.match(js,/remaining\.map\(item=>actionFor\(item\)\)/);
 assert.match(js,/more\.addEventListener\('toggle',updateSummary\)/);
 assert.match(js,/if\(!state\.current\|\|!has\('exam\.view'\)\|\|state\.busy\|\|autosave\.isSaving\(\)\)return/);
 assert.match(js,/reviewFeedbackLoadFailure=\{id,revision\}/);
 assert.match(js,/state\.current\?\.revision===revision/);
 assert.match(js,/retry\.hidden=!failed/);
 assert.match(js,/visitApprovalQuestion\(Number\(button\.dataset\.feedbackQuestion\)-1,'prompt'\)/);
 assert.match(js,/Number\(button\.dataset\.feedbackRevision\)!==state\.current\.revision/);
 assert.match(js,/submitExamApproval\(\{/);
 assert.match(css,/\.exam-review-feedback-more>summary:focus-visible/);
 assert.match(css,/#exam-review-feedback-retry\[hidden\]\{display:none;\}/);
 assert.match(server,/'\/review-feedback-navigation\.mjs':\['review-feedback-navigation\.mjs'/);
 assert.match(quick,/'tools\/v4-review-feedback-navigation\.test\.mjs'/);
 assert.doesNotMatch(helper,/fetch\(|localStorage|sessionStorage|document\.|window\.|approveExam\(/);
});
