import test from 'node:test';
import assert from 'node:assert/strict';
import {NEED_AREAS,SUPPORTS,normalizeSupportPlan,applySupportPlan,reviewSupportPlan,recommendSupports} from './support-plan.mjs';
import {createDemo,normalizeExam} from './core.mjs';
import {reviewExam} from './quality.mjs';
const demo=()=>{const x=createDemo();x.profile='';x.questions=x.questions.map(q=>({...q,teacherNote:''}));return x;};
const plan=(selected,domain='math')=>({version:1,selected,domain});
test('non-diagnostic need examples have recommended support codes',()=>{
 assert.equal(Object.keys(NEED_AREAS).length,7);
 assert.deepEqual(recommendSupports('no-such-need'),[]);
 for(const key of Object.keys(NEED_AREAS))for(const code of recommendSupports(key))assert.ok(SUPPORTS[code]);
});
test('support plan contains no need, identity, diagnosis or free text',()=>{
 const normalized=normalizeSupportPlan(plan(['large-text','one-question']));
 assert.deepEqual(Object.keys(normalized).sort(),['domain','selected','version']);
 assert.equal(JSON.stringify(normalized).includes('learning'),false);
 for(const extra of ['needArea','diagnosis','studentName','notes','condition'])assert.throws(()=>normalizeSupportPlan({...plan([]),[extra]:'personal info'}));
});
test('reject unsupported support, non-enum domain, duplicates, nonarray and excess',()=>{
 assert.throws(()=>normalizeSupportPlan(plan(['unknown'])));
 assert.throws(()=>normalizeSupportPlan(plan(['large-text'],'maths')));
 assert.throws(()=>normalizeSupportPlan(plan(['large-text','large-text'])));
 assert.throws(()=>normalizeSupportPlan({...plan([]),selected:'large-text'}));
 assert.throws(()=>normalizeSupportPlan({...plan([]),selected:Array(11).fill('large-text')}));
});
test('applying supports only changes output layout and leaves learning construct and answer keys intact',()=>{
 const initial=normalizeExam(demo());const questions=structuredClone(initial.questions);
 const applied=applySupportPlan(initial,plan(Object.keys(SUPPORTS)));
 assert.deepEqual(applied.questions,questions);
 assert.equal(applied.objective,initial.objective);
 assert.equal(applied.duration,initial.duration);
 assert.equal(applied.adaptations.fontSize,22);
 assert.equal(applied.adaptations.lineSpacing,1.9);
 for(const key of ['highContrast','simpleInstructions','onePerPage','largerAnswerArea','visualCues'])assert.equal(applied.adaptations[key],true);
 assert.equal(reviewSupportPlan(applied).filter(i=>i.level==='error').length,0);
});
test('normalizing and serializing retains only allowlisted support plan',()=>{
 const x=applySupportPlan(demo(),plan(['large-text','visual-support'],'general'));
 x.adaptations.secretMedical='sensitive';
 const y=normalizeExam(JSON.parse(JSON.stringify(x)));
 assert.deepEqual(y.supportPlan,x.supportPlan);
 assert.ok(!('secretMedical' in y.adaptations));
 assert.deepEqual(normalizeExam(demo()).supportPlan,{version:1,domain:'general',selected:[]});
});
test('tampered declared support without corresponding active layout blocks quality',()=>{
 const x=normalizeExam(demo());x.supportPlan=plan(['large-text','high-contrast']);
 assert.equal(reviewExam(x).errorCount,2);
 x.adaptations.fontSize=22;x.adaptations.highContrast=true;
 assert.equal(reviewExam(x).errorCount,0);
});
test('assessed reading and listening skill conflicts warn, never auto rewrite question',()=>{
 const a=applySupportPlan(demo(),plan(['short-directions'],'reading'));
 assert.match(reviewSupportPlan(a).map(i=>i.text).join(' '),/kazanımı değiştirebilir/);
 const b=applySupportPlan(demo(),plan(['visual-support'],'listening'));
 assert.match(reviewSupportPlan(b).map(i=>i.text).join(' '),/Dinlediğini anlamayı/);
 assert.equal(a.questions[0].prompt,demo().questions[0].prompt);
});
