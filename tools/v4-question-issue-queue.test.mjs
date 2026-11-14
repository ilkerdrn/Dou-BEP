/**
 * Synthetic exam-question navigation acceptance. This is a read-only UI aid:
 * validation and independent approval remain authoritative.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createDemo} from '../core.mjs';
import {questionDraftGuidance,questionIssueQueue} from '../question-draft-guidance.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

test('blocking issues come before review warnings, preserving question numbers',()=>{
 const summary={items:[
  {index:0,number:1,focus:'objective',blocking:0,warnings:1,issues:[{level:'warning',text:'1. soru: Hedefi denetle'}]},
  {index:1,number:2,focus:'prompt',blocking:2,warnings:1,issues:[{level:'error',text:'2. soru: Metni boş'}]},
  {index:2,number:3,focus:'answer',blocking:0,warnings:0,issues:[]},
  {index:3,number:4,focus:'answer',blocking:1,warnings:0,issues:[{level:'error',text:'4. soru: Yanıtı kontrol et'}]}
 ]};
 const before=JSON.stringify(summary);
 const queue=questionIssueQueue(summary,{visibleLimit:2});
 assert.equal(JSON.stringify(summary),before,'reading the queue must not mutate the exam guidance');
 assert.deepEqual(queue.visible.map(item=>item.number),[2,4]);
 assert.deepEqual(queue.remaining.map(item=>item.number),[1]);
 assert.deepEqual(queue.visible.map(item=>item.field),['prompt','answer']);
 assert.equal(queue.total,3);
 assert.equal(queue.blocking,2);
 assert.equal(queue.review,1);
 assert.match(queue.notice,/onay/);
});

test('large exams keep six prominent issues and provide every remaining issue in disclosure',()=>{
 const items=Array.from({length:100},(_,index)=>({
  index,number:index+1,focus:'prompt',blocking:index%3===0?1:0,
  warnings:index%3===0?0:1,issues:[{level:index%3===0?'error':'warning',text:'Kontrol '+index}]
 }));
 const queue=questionIssueQueue({items});
 assert.equal(queue.visible.length,6);
 assert.equal(queue.remaining.length,94);
 assert.equal(queue.total,100);
 assert.deepEqual(queue.visible.map(item=>item.number),[1,4,7,10,13,16]);
 const indices=[...queue.visible,...queue.remaining].map(item=>item.index);
 assert.equal(new Set(indices).size,100);
 assert.ok(!indices.includes(100));
});

test('empty or complete question lists do not manufacture approval',()=>{
 const empty=questionIssueQueue({items:[]});
 assert.equal(empty.total,0);
 assert.deepEqual(empty.visible,[]);
 assert.deepEqual(empty.remaining,[]);
 assert.equal(Object.hasOwn(empty,'approved'),false);
 assert.equal(Object.hasOwn(empty,'saved'),false);
 assert.deepEqual(questionIssueQueue(null).visible,[]);
 assert.equal(questionIssueQueue({items:[]},{visibleLimit:999}).total,0);
});

test('canonical question validation feeds the queue without revealing correct answers',()=>{
 const exam=structuredClone(createDemo());
 exam.questions[0].prompt='';
 exam.questions[1].answer='NOT_A_VALID_CHOICE';
 const before=JSON.stringify(exam);
 const guidance=questionDraftGuidance(exam);
 const queue=questionIssueQueue(guidance);
 assert.equal(JSON.stringify(exam),before);
 assert.ok(queue.blocking>=2);
 assert.equal(queue.visible[0].number,1);
 assert.equal(queue.visible[0].field,'prompt');
 assert.ok(queue.visible.some(x=>x.number===2&&x.field==='answer'));
 assert.ok(!Object.hasOwn(queue.visible[0],'response'));
 assert.ok(!Object.hasOwn(queue.visible[0],'correctAnswer'));
});

test('read-only editor issue navigation preserves all five stages and server approval',()=>{
 const html=readFileSync(resolve(root,'institutional-exams.html'),'utf8');
 const js=readFileSync(resolve(root,'institutional-exams.mjs'),'utf8');
 const css=readFileSync(resolve(root,'dou-unified-ui.css'),'utf8');
 for(const id of ['exam-draft-issue-queue','exam-draft-issue-summary','exam-draft-issue-primary',
  'exam-draft-issue-more','exam-draft-issue-extra'])
  assert.ok(html.includes('id="'+id+'"'),id);
 for(const stage of ['exam-main-fields','exam-goal-section','exam-library-section',
  'exam-question-section','exam-output-section'])
  assert.ok(html.includes('data-workflow-target="'+stage+'"'));
 assert.match(js,/questionIssueQueue\(summary\)/);
 assert.match(js,/renderQuestionIssueQueue\(summary\)/);
 assert.match(js,/current=questionDraftGuidance\(state\.exam\)\.items\[index\]/);
 assert.match(js,/visitApprovalQuestion\(index,current\.focus\)/);
 assert.match(js,/document\.createElement\('button'\)/);
 assert.match(js,/detail\.textContent=/);
 assert.match(js,/summary\.total===0/);
 assert.match(js,/Soru ekleme alanına git/);
 assert.match(js,/state\.exam\.questions\.length===0/);
 assert.match(js,/!has\('exam\.edit'\)/);
 assert.match(css,/\.exam-draft-issue-link:focus-visible/);
 assert.match(css,/@media\(max-width:670px\)/);
 const helper=readFileSync(resolve(root,'question-draft-guidance.mjs'),'utf8');
 assert.doesNotMatch(helper,/fetch\(|localStorage|sessionStorage|indexedDB|document\.|window\.|approveExam\(/);
});
