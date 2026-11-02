import test from 'node:test';import assert from 'node:assert/strict';
import {createDemo,normalizeExam,formatPrompt,paperBody} from './core.mjs';
import {inspectQuestionVariant,variantComparison,inspectExamVariants} from './presentation-variants.mjs';
import {reviewExam} from './quality.mjs';import {createStudentPayload} from './accessible-player.mjs';
function demo(){const x=createDemo();return x;}
test('default inherited presentation unchanged',()=>{const e=normalizeExam(demo());assert.equal(e.questions[0].presentationMode,'inherit');assert.equal(formatPrompt(e.questions[0],e),e.questions[0].prompt);});
test('question overrides exam global simplified setting',()=>{const e=demo();e.adaptations.simpleInstructions=true;e.questions[0].presentationMode='standard';assert.equal(formatPrompt(e.questions[0],e),e.questions[0].prompt);e.questions[0].presentationMode='simplified';assert.equal(formatPrompt(e.questions[0],e),e.questions[0].simplifiedPrompt);});
test('normalizes unrecognized presentation mode',()=>{const e=demo();e.questions[0].presentationMode='danger';assert.equal(normalizeExam(e).questions[0].presentationMode,'inherit');});
test('missing specifically chosen alternative blocks review',()=>{const e=demo();e.questions[0].presentationMode='simplified';e.questions[0].simplifiedPrompt='';assert.equal(inspectQuestionVariant(e.questions[0],e,0)[0].level,'error');});
test('changed arithmetic operands are blocked',()=>{const e=demo();e.questions[0].presentationMode='simplified';e.questions[0].simplifiedPrompt='5 + 4 = ?';assert.ok(reviewExam(e).errorCount>0);});
test('arithmetic sign change blocked',()=>{const e=demo();e.questions[0].presentationMode='simplified';e.questions[0].simplifiedPrompt='5 - 3 = ?';assert.ok(inspectExamVariants(e).some(v=>v.level==='error'));});
test('unrelated textual simplifications remain human review responsibility',()=>{const e=demo();e.questions[4].presentationMode='simplified';const m=variantComparison(e.questions[4],e);assert.equal(m.answersUnchanged,true);assert.equal(inspectQuestionVariant(e.questions[4],e,4).filter(i=>i.level==='error').length,0);});
test('document and student payload use same question text',()=>{const e=demo();e.questions[0].presentationMode='simplified';const txt=formatPrompt(e.questions[0],e);assert.ok(paperBody(e).includes(txt));assert.equal(createStudentPayload(e).questions[0].prompt,txt);});
test('student payload does not include key, variant source or teacher note',()=>{const e=demo();e.questions[0].presentationMode='simplified';const payload=createStudentPayload(e);assert.ok(!JSON.stringify(payload).includes('teacherNote'));assert.ok(!JSON.stringify(payload).includes('presentationMode'));assert.ok(!Object.hasOwn(payload.questions[0],'answer'));});
test('explicit original text suppresses global fallback missing-simplification warning',()=>{
 const e=demo();e.adaptations.simpleInstructions=true;e.questions[1].simplifiedPrompt='';e.questions[1].presentationMode='standard';
 const report=reviewExam(e);
 assert.equal(report.issues.filter(i=>i.text.includes('2. soru')&&i.text.includes('Sade yönerge')).length,0);
});
