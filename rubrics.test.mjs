import test from 'node:test';
import assert from 'node:assert/strict';
import {criteriaFor,rubricPoints,validateRubricRatings,criterionDescription} from './rubrics.mjs';
test('each rubric is weighted to 100%, with no support-based penalty',()=>{
 for(const type of ['choice','short','matching','truefalse'])assert.equal(criteriaFor(type).reduce((s,c)=>s+c.weight,0),100);
 assert.equal(criteriaFor('short').length,2);
});
test('null rubric rating remains unassessed rather than zero',()=>{
 const q={type:'short',points:20};assert.equal(rubricPoints(q,{}),null);assert.equal(rubricPoints(q,{approach:0,outcome:0}),0);
 assert.equal(rubricPoints(q,{approach:4,outcome:2}),14);assert.equal(rubricPoints(q,{approach:4,outcome:4}),20);
});
test('rubrics reject malformed/tampered values and unknown types',()=>{
 assert.throws(()=>validateRubricRatings('choice',{answer:5}));assert.throws(()=>rubricPoints({type:'choice',points:20},{answer:'4'}));
 assert.throws(()=>rubricPoints({type:'choice',points:20},{extra:0}));assert.throws(()=>criteriaFor('__proto__'));
 assert.match(criterionDescription({type:'choice'},{answer:2}),/2\/4/);
});
