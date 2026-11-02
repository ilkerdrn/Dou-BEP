import test from 'node:test';
import assert from 'node:assert/strict';
import {GUIDED_PATTERNS, guidedPattern, createGuidedQuestion} from './guided-questions.mjs';
import {validateExam} from './core.mjs';
import {buildGoalCoverage} from './goal-coverage.mjs';
import {goalFingerprint} from './pedagogy-review.mjs';

const goal={id:'H01',level:'short',text:'20 içinde toplama işlemini yapar.'};
test('v2.10: seven teacher-selectable guided patterns with distinct IDs',()=>{
 assert.equal(GUIDED_PATTERNS.length,7);
 assert.equal(new Set(GUIDED_PATTERNS.map(x=>x.id)).size,7);
 assert.equal(guidedPattern('bad-id'),null);
});
test('v2.10: all starters are incomplete and do not prefill an answer or hidden teacher approval',()=>{
 for(const p of GUIDED_PATTERNS){
  const q=createGuidedQuestion(p.id,{objective:goal.text,goalId:goal.id});
  assert.equal(q.type,p.type);
  assert.equal(q.objective,goal.text);
  assert.equal(q.goalId,'H01');
  assert.equal(q.prompt,'');
  assert.equal(q.simplifiedPrompt,'');
  assert.equal(q.answer,'');
  assert.equal(q.teacherNote,'');
  assert.equal(q.provenance,null);
  assert.equal(q.equivalenceReview?.fingerprint||'', '');
  assert.ok(validateExam({title:'Şablon taslağı',questions:[q]}).some(issue=>issue.level==='error'),
    `Question ${p.id} unexpectedly passed validation`);
 }
});
test('v2.10: shape/number line starters require manual alt text and values',()=>{
 const shapes=createGuidedQuestion('shapes',{objective:goal.text,goalId:goal.id});
 assert.deepEqual(shapes.visualDots,{groupA:0,groupB:0});
 assert.equal(shapes.visualAltText,'');
 assert.equal(shapes.options.length,3);
 const numberline=createGuidedQuestion('numberline',{objective:goal.text,goalId:goal.id});
 assert.equal(numberline.visualMode,'numberline');
 assert.equal(numberline.numberLineStart,0); assert.equal(numberline.numberLineEnd,10);
 assert.equal(numberline.visualAltText,'');
 const two=createGuidedQuestion('choice-2',{objective:goal.text,goalId:goal.id});
 assert.deepEqual(two.options,['','']);
 assert.equal(two.access.largeTargets,true);
});
test('v2.10: no auto-goal selection or students sensitive data',()=>{
 assert.throws(()=>createGuidedQuestion('choice-3',{objective:'Kısa'}),/kazanım/);
 assert.throws(()=>createGuidedQuestion('choice-3',{objective:goal.text,goalId:'H01<script>'}),/geçersiz/);
 assert.throws(()=>createGuidedQuestion('unknown',{objective:goal.text}),/Bilinmeyen/);
 const q=createGuidedQuestion('short',{objective:goal.text});
 assert.equal(q.goalId,'');
 assert.notEqual(q.id,createGuidedQuestion('short',{objective:goal.text}).id);
 assert.equal('student' in q,false); assert.equal('diagnosis' in q,false);
});
test('v2.10: linked skeleton is included in structural coverage but cannot approve a blank exam',()=>{
 const q=createGuidedQuestion('choice-3',{objective:goal.text,goalId:goal.id});
 const exam={reviewPolicy:'guided',bepGoals:[goal],goalAttestations:[{id:goal.id,fingerprint:goalFingerprint(goal)}],questions:[q]};
 const report=buildGoalCoverage(exam);
 assert.equal(report.linked,1);
 assert.equal(report.rows[0].questionCount,1);
 assert.ok(validateExam({title:'Taslak',questions:[q]}).some(e=>e.level==='error'));
});
