/**
 * Synthetic, read-only final-step question audit; never a live student record.
 * Approval remains a separate server operation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {approvalWorkbenchSummary} from '../approval-workbench.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const ids=['identity','goals','questions','access','delivery'];
const targets=['exam-main-fields','exam-goal-section','exam-question-section','exam-quality','exam-output-section'];
const preflight={stages:ids.map((id,i)=>({
 id,title:'Aşama '+(i+1),detail:'Kontrol',done:false,target:targets[i]
})),approvalConflict:false};
const quality={errorCount:0,warningCount:0,issues:[]};
const draft=(count=100)=>({
 items:Array.from({length:count},(_,index)=>({
  index,number:index+1,focus:index%3===0?'answer':'prompt',
  blocking:index===96||index===99?1:0,
  warnings:index===96||index===99?0:1,
  state:index===96||index===99?'incomplete':'review',
  issues:[{level:'warning',text:'SECRET_EXAM_ANSWER_3342'}]
 })),
 incomplete:count>=100?2:0,review:count>=100?count-2:count
});
const build=(questionDraft=draft())=>approvalWorkbenchSummary({
 preflight,quality,questionDraft,saved:true,dirty:false,canEdit:true
});

test('100-item queue prioritizes last-numbered blockers and keeps every warning available',()=>{
 const initial=draft();
 const before=JSON.stringify(initial);
 const view=build(initial);
 assert.equal(JSON.stringify(initial),before);
 assert.deepEqual(view.questionItems.slice(0,2).map(x=>x.number),[97,100]);
 assert.deepEqual(view.questionItems.slice(2).map(x=>x.number),[1,2,3,4,5,6]);
 assert.equal(view.questionItems.length,8);
 assert.equal(view.remainingQuestionItems.length,92);
 assert.equal(view.hiddenQuestionCount,92);
 const all=[...view.questionItems,...view.remainingQuestionItems];
 assert.equal(new Set(all.map(x=>x.index)).size,100);
 assert.ok(all.every(x=>x.target==='exam-question-section'));
 assert.ok(all.every(x=>['prompt','answer'].includes(x.field)));
 assert.ok(!JSON.stringify(view).includes('SECRET_EXAM_ANSWER_3342'));
 assert.equal(view.canRequestApproval,false);
});

test('eight or fewer questions need no extra disclosure; zero questions do not imply approval',()=>{
 const small=draft(7);
 const first=build(small);
 assert.equal(first.hiddenQuestionCount,0);
 assert.equal(first.remainingQuestionItems.length,0);
 const empty=build({items:[],incomplete:0,review:0});
 assert.equal(empty.summary.questionCount,0);
 assert.deepEqual(empty.questionItems,[]);
 assert.deepEqual(empty.remainingQuestionItems,[]);
 assert.equal(Object.hasOwn(empty,'approved'),false);
});

test('unsupported field hints default to prompt without exposing raw question content',()=>{
 const sample=draft(10);
 sample.items[0].focus='__proto__';
 sample.items[0].issues[0].text='PRIVATE_ANSWER_Z192';
 const model=build(sample);
 const first=model.questionItems.find(x=>x.number===1);
 assert.equal(first.field,'prompt');
 assert.ok(!JSON.stringify(model).includes('PRIVATE_ANSWER_Z192'));
});

test('native keyboard disclosure and viewer-safe focus are wired without approval side effects',()=>{
 const html=readFileSync(resolve(root,'institutional-exams.html'),'utf8');
 const js=readFileSync(resolve(root,'institutional-exams.mjs'),'utf8');
 const css=readFileSync(resolve(root,'dou-unified-ui.css'),'utf8');
 const helper=readFileSync(resolve(root,'approval-workbench.mjs'),'utf8');
 const fixture=html.match(/<details id="exam-approval-workbench-more"[^>]*>[\s\S]*?<\/details>/);
 assert.ok(fixture,'Native details disclosure must exist');
 assert.match(fixture[0],/<summary id="exam-approval-workbench-more-title">/);
 assert.match(fixture[0],/id="exam-approval-workbench-more-questions"/);
 assert.match(js,/moreList\.replaceChildren\(\.\.\.model\.remainingQuestionItems\.map/);
 assert.match(js,/more\.hidden=model\.hiddenQuestionCount===0/);
 assert.match(js,/more\.open=model\.hiddenQuestionCount>0&&wasOpen/);
 assert.match(js,/visitApprovalQuestion\(Number\(btn\.dataset\.questionIndex\),btn\.dataset\.questionField\)/);
 assert.match(js,/if\(!has\('exam\.edit'\)\|\|focusTarget\.disabled\)/);
 assert.match(js,/focusTarget=card\.querySelector\('\.exam-q-head strong'\)\|\|card/);
 assert.match(css,/\.exam-approval-workbench-more summary:focus-visible/);
 assert.match(css,/\.exam-approval-workbench-more\[hidden\]/);
 assert.match(helper,/remainingQuestionItems,hiddenQuestionCount:remainingQuestionItems\.length/);
 assert.doesNotMatch(helper,/localStorage|sessionStorage|document\.|window\.|fetch\(|approveExam\(/);
 assert.match(js,/submitExamApproval\(\{/);
});
