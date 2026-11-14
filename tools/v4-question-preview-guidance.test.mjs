/**
 * Synthetic teacher preview guidance acceptance. No real student information.
 * Tests only read-only review actions and navigation, never academic approval.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createDemo,normalizeExam} from '../core.mjs';
import {prepareQuestionPreview} from '../question-preview.mjs';
import {previewReviewActions} from '../question-preview-guidance.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const fixture=()=>normalizeExam(createDemo());
const actions=(exam,index,profile='standard')=>
 previewReviewActions(exam,index,prepareQuestionPreview(exam,index,profile));

test('multiple-choice answer, duplicate/missing options get safe field links',()=>{
 const exam=fixture(),q=exam.questions[0];
 q.options=['Eşit','Eşit'];q.answer='PRIVATE_EXAM_KEY';
 const original=structuredClone(exam);
 const plan=actions(exam,0);
 assert.equal(JSON.stringify(exam),JSON.stringify(original));
 assert.ok(plan.items.some(x=>x.field==='options'&&x.level==='error'));
 assert.ok(plan.items.some(x=>x.field==='answer'&&x.level==='error'));
 assert.ok(plan.items.some(x=>/seçeneklerle eşleşmesini/.test(x.label)));
 assert.equal(JSON.stringify(plan).includes('PRIVATE_EXAM_KEY'),false);
 assert.equal(Object.hasOwn(plan,'approved'),false);
});

test('true-false and matching show distinct instructions without revealing answers',()=>{
 const exam=fixture();
 exam.questions[3].answer='';exam.questions[4].pairs=[];
 const tf=actions(exam,3);
 const match=actions(exam,4);
 assert.ok(tf.items.some(x=>x.field==='answer'&&/Doğru\/Yanlış/.test(x.label)));
 assert.ok(match.items.some(x=>x.field==='pairs'&&/Eşleştirme/.test(x.label)));
});

test('short-answer sample and alternative text guidance are non-approving hints',()=>{
 const exam=fixture();
 exam.questions[2].answer='';
 const short=actions(exam,2);
 assert.ok(short.items.some(x=>x.field==='answer'&&x.level==='warning'&&/Örnek yanıt/.test(x.label)));
 exam.questions[0].presentationMode='simplified';
 exam.questions[0].simplifiedPrompt='';
 const simplified=actions(exam,0);
 assert.ok(simplified.items.some(x=>x.field==='simplifiedPrompt'));
});

test('visual cues and alt text link to separate existing controls',()=>{
 const exam=fixture(),q=exam.questions[0];
 q.visualDots={groupA:4,groupB:2};
 exam.adaptations.visualCues=false;
 const off=actions(exam,0);
 assert.ok(off.items.some(x=>x.field==='visualCues'));
 exam.adaptations.visualCues=true;
 q.visualAltText='';
 const alt=actions(exam,0);
 assert.ok(alt.items.some(x=>x.field==='visualAltText'));
 q.visualMode='numberline';q.numberLineStart=0;q.numberLineEnd=25;
 const invalid=actions(exam,0);
 assert.ok(invalid.items.some(x=>x.field==='numberLineEnd'));
});

test('review actions contain only whitelisted labels, not raw preview findings',()=>{
 const exam=fixture(),secret='SECRET_ANSWER_Z923';
 exam.questions[0].answer=secret;
 const preview=prepareQuestionPreview(exam,0);
 preview.problems.push({level:'error',text:'Special '+secret});
 const plan=previewReviewActions(exam,0,preview);
 assert.ok(!JSON.stringify(plan).includes(secret));
 assert.equal(plan.items.every(x=>['error','warning'].includes(x.level)),true);
 assert.equal(plan.blocking+plan.warnings,plan.items.length);
 assert.ok(plan.items.length<=11);
 assert.match(plan.notice,/onay/);
});

test('invalid preview inputs rejected before a navigation command is created',()=>{
 const exam=fixture();
 for(const index of [-1,1.2,exam.questions.length,'1',NaN])
  assert.throws(()=>previewReviewActions(exam,index,{problems:[]}));
 assert.throws(()=>previewReviewActions(exam,0,null));
 assert.throws(()=>previewReviewActions(exam,0,{problems:'invalid'}));
});

test('HTML, editor and offline assets expose accessible controls without replacing preview renderer',()=>{
 const html=readFileSync(resolve(root,'institutional-exams.html'),'utf8');
 const js=readFileSync(resolve(root,'institutional-exams.mjs'),'utf8');
 const css=readFileSync(resolve(root,'dou-unified-ui.css'),'utf8');
 const server=readFileSync(resolve(root,'server.mjs'),'utf8');
 const helper=readFileSync(resolve(root,'question-preview-guidance.mjs'),'utf8');
 for(const id of ['exam-preview-previous','exam-preview-next','exam-preview-actions-summary','exam-preview-actions']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 for(const stage of ['exam-main-fields','exam-goal-section','exam-library-section','exam-question-section','exam-output-section'])
  assert.match(html,new RegExp('data-workflow-target="'+stage+'"'));
 assert.match(js,/prepareQuestionPreview\(exam,previewIndex,profile\.value\|\|'standard'\)/);
 assert.match(js,/sheet\.innerHTML=snapshot\.questionMarkup/);
 assert.match(js,/previewReviewActions\(exam,previewIndex,snapshot\)/);
 assert.match(js,/actionList\.replaceChildren/);
 assert.match(js,/button\.textContent=item\.label/);
 assert.match(js,/const allowed=new Set\(\[[^\]]*'simplifiedPrompt','numberLineEnd'/);
 assert.match(js,/visitApprovalQuestion\(index,field\)/);
 assert.match(js,/\$\('exam-preview-next'\)\.addEventListener\('click'/);
 assert.match(js,/\$\('exam-preview-previous'\)\.addEventListener\('click'/);
 assert.match(css,/teacher-preview-action:focus-visible/);
 assert.match(css,/@media\(max-width:670px\)/);
 assert.match(server,/'\/question-preview-guidance\.mjs':\['question-preview-guidance\.mjs'/);
 assert.doesNotMatch(helper,/fetch\(|localStorage|sessionStorage|indexedDB|document\.|window\.|approveExam\(/);
 assert.match(js,/submitExamApproval\(\{/);
});
