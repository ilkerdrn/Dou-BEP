import test from 'node:test';
import assert from 'node:assert/strict';
import {createQuestionFrame} from './question-frames.mjs';
import {validateExam} from './core.mjs';
const objective='20 içinde toplama işlemini yapar.';
test('v2.3 teacher frames require editing and do not silently pass quality',()=>{
 for(const type of ['choice','short','truefalse','matching']){
  const q=createQuestionFrame(type,objective,'H01');
  assert.equal(q.goalId,'H01');assert.equal(q.answer,'');assert.equal(q.prompt,'');assert.equal(q.objective,objective);
  assert.equal(q.teacherNote,'');assert.equal(q.provenance,null);
  assert.ok(validateExam({title:'İskelet',questions:[q]}).some(i=>i.level==='error'));
 }
});
test('v2.3 starter rejects unsupported type and unlinked goals',()=>{
 assert.throws(()=>createQuestionFrame('essay',objective));
 assert.throws(()=>createQuestionFrame('choice','Az'));
 assert.throws(()=>createQuestionFrame('choice',objective,'tc-kimlik'));
});
