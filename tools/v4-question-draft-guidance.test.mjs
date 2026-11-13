import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createDemo,starterQuestion,validateExam} from '../core.mjs';
import {questionDraftGuidance} from '../question-draft-guidance.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const demo=()=>structuredClone(createDemo());

test('draft summary is derived from canonical server-compatible validation without mutating exam data',()=>{
 const exam=demo(),before=JSON.stringify(exam);
 const result=questionDraftGuidance(exam);
 assert.equal(result.total,5);
 assert.deepEqual(result.items.map(q=>q.number),[1,2,3,4,5]);
 assert.equal(result.items.length,result.total);
 assert.equal(JSON.stringify(exam),before);
 assert.match(result.notice,/pedagojik eşdeğerlik/);
 const errors=validateExam(exam).filter(q=>q.level==='error'&&/^\d+\. soru:/.test(q.text));
 assert.equal(result.items.reduce((sum,q)=>sum+q.blocking,0),errors.length);
});

test('missing prompt, wrong answer, true-false key and matching pairs link to their real editor fields',()=>{
 const exam=demo();
 exam.questions[0].prompt='';
 exam.questions[1].answer='YOK';
 exam.questions[3].answer='';
 exam.questions[4].pairs=[];
 const result=questionDraftGuidance(exam);
 assert.equal(result.next.index,0);
 assert.equal(result.next.focus,'prompt');
 assert.equal(result.items[0].state,'incomplete');
 assert.equal(result.items[1].focus,'answer');
 assert.equal(result.items[3].focus,'answer');
 assert.equal(result.items[4].focus,'pairs');
 assert.ok(result.incomplete>=4);
});

test('blank short-answer sample and missing objective are warnings, not false approval',()=>{
 const exam=demo();
 exam.questions[2].answer='';
 exam.questions[0].objective='';
 const result=questionDraftGuidance(exam);
 assert.equal(result.items[0].warnings>0,true);
 assert.equal(result.items[0].focus,'objective');
 assert.equal(result.items[2].warnings>0,true);
 assert.equal(result.items[2].focus,'answer');
 assert.equal(result.items[2].blocking,0);
 assert.match(result.notice,/onay sertifikası değildir/);
});

test('question type-specific blank skeletons show missing fields but preserve auto-save semantics',()=>{
 for(const type of ['choice','truefalse','matching','short']){
  const exam=demo();
  exam.questions=[starterQuestion(type)];
  const current=questionDraftGuidance(exam);
  assert.equal(current.total,1);
  assert.equal(current.next.index,0);
  assert.equal(current.next.state,'incomplete');
  assert.equal(current.next.focus,'prompt');
 }
 const empty=questionDraftGuidance({...demo(),questions:[]});
 assert.equal(empty.total,0);
 assert.equal(empty.next,null);
});

test('preflight and source evidence remain authoritative and cannot be auto-approved by guidance',()=>{
 const exam=demo();
 exam.questions[0].provenance={kind:'source-import',reviewed:false};
 const summary=questionDraftGuidance(exam);
 assert.ok(summary.items[0].blocking>0);
 assert.equal(summary.items[0].focus,'source');
 assert.equal(Object.hasOwn(summary,'approved'),false);
 assert.equal(Object.hasOwn(summary,'save'),false);
});

test('page exposes compact selectors and updates guidance while typing, without changing approval APIs',()=>{
 const html=readFileSync(resolve(root,'institutional-exams.html'),'utf8');
 const js=readFileSync(resolve(root,'institutional-exams.mjs'),'utf8');
 const css=readFileSync(resolve(root,'dou-unified-ui.css'),'utf8');
 const server=readFileSync(resolve(root,'server.mjs'),'utf8');
 for(const id of ['exam-draft-guidance-go','exam-draft-guidance-count','exam-draft-guidance-detail','exam-quick-question-type'])
  assert.match(html,new RegExp('id="'+id+'"'));
 for(const type of ['choice','truefalse','matching','short'])assert.match(html,new RegExp('option value="'+type+'"'));
 assert.match(js,/questionDraftGuidance\(state\.exam\)/);
 assert.match(js,/function updateQuestionDraftGuidance\(\)/);
 assert.match(js,/renderGoalMatrix\(\);updateQuestionDraftGuidance\(\)/);
 assert.match(js,/updateQuestionDraftGuidance\(\);\s*\$\('exam-adjustments'\)/);
 assert.match(js,/chosen=count===1\?\$\('exam-quick-question-type'\)\.value:'choice'/);
 assert.match(js,/starterQuestion\(chosen\)/);
 assert.match(js,/state\.exam\.questions\.length\+count>100/);
 assert.match(js,/confirm\('10 yeni boş çoktan seçmeli/);
 assert.match(js,/target\.focus\(\{preventScroll:true\}\)/);
 assert.match(server,/'\/question-draft-guidance\.mjs':\['question-draft-guidance\.mjs'/);
 assert.match(css,/exam-draft-guidance-body/);
 const helper=readFileSync(resolve(root,'question-draft-guidance.mjs'),'utf8');
 assert.doesNotMatch(helper,/fetch\(|localStorage\.|sessionStorage\.|document\.|window\.|updateExam\(|approveExam\(/);
});
