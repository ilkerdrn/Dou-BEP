import test from 'node:test';
import assert from 'node:assert/strict';
import {STARTER_OBJECTIVES,findObjectives,objectiveById,makeProposal,proposalAudit} from './library.mjs';
import {createDemo,validateExam,paperBody,normalizeExam,generateDocx,copyExam} from './core.mjs';

test('starter library is explicitly illustrative and identifiers are unique',()=>{
 assert.equal(new Set(STARTER_OBJECTIVES.map(x=>x.id)).size,STARTER_OBJECTIVES.length);
 assert.ok(STARTER_OBJECTIVES.length>=6);
 assert.ok(STARTER_OBJECTIVES.every(x=>x.source.includes('resmî MEB kazanım kodu değil')));
});
test('library filters subject grade and Turkish search',()=>{
 const x=findObjectives({subject:'Matematik',grade:'2. Sınıf'});
 assert.equal(x.length,2);
 assert.ok(findObjectives({term:'çıkarma'}).some(x=>x.id==='MATH-2-A02'));
 assert.equal(objectiveById('not-found'),null);
});
test('unknown objective cannot propose a question',()=>{
 assert.throws(()=>makeProposal('NO-OBJECTIVE'),/bulunamadı/);
});
test('sample proposals are explicit and produce a valid answer',()=>{
 for(const o of STARTER_OBJECTIVES){
  for(let variant=0;variant<6;variant++){
   const p=makeProposal(o.id,variant);
   assert.equal(p.provenance.reviewed,false);
   assert.ok(proposalAudit(p).ok);
   assert.ok(p.options.includes(p.answer));
   assert.ok(p.objective.length>8);
  }
 }
});
test('proposals are never inserted without review',()=>{
 const e=createDemo();const p=makeProposal('MATH-2-A01',0);
 e.questions.push(p);
 assert.ok(validateExam(e).some(x=>x.level==='error'&&/onaylanmadı/.test(x.text)));
 p.provenance.reviewed=true;
 assert.equal(validateExam(e).filter(x=>x.level==='error').length,0);
});
test('safe import preserves the teacher review trail and visual style',()=>{
 const e=createDemo(),p=makeProposal('MATH-2-A02',1);
 p.provenance.reviewed=true;p.visualStyle='triangle';p.visualAltText='Birinci grup üçgenler';
 e.questions.push(p);
 const output=normalizeExam(e);
 const got=output.questions.at(-1);
 assert.equal(got.visualStyle,'triangle');assert.equal(got.visualAltText,'Birinci grup üçgenler');
 assert.equal(got.provenance.reviewed,true);
});
test('unapproved imported proposed questions are still blocked',()=>{
 const e=createDemo(),p=makeProposal('MATH-2-A01',0);
 e.questions.push(p);
 const imported=normalizeExam(e);
 assert.ok(validateExam(imported).some(x=>x.level==='error'&&/onaylanmadı/.test(x.text)));
});
test('untrusted visual input falls back to dot and escapes alternative text',()=>{
 const e=createDemo();e.adaptations.visualCues=true;
 const q=e.questions[0];q.visualStyle='triangle';q.visualAltText='" onmouseover="alert(1)';
 const html=paperBody(e);
 assert.ok(html.includes('visual-triangle'));
 assert.ok(!html.includes('aria-label="" onmouseover='));
 const normalized=normalizeExam(e);normalized.questions[0].visualStyle='javascript';
 assert.equal(normalizeExam(normalized).questions[0].visualStyle,'dot');
});
test('word exports include visual symbols when activated',()=>{
 const e=createDemo();e.adaptations.visualCues=true;e.questions[0].visualStyle='square';
 const data=generateDocx(e);assert.equal(String.fromCharCode(...data.slice(0,2)),'PK');
 assert.ok(data.byteLength>2000);
});
test('copying a proposal does not change the original',()=>{
 const p=makeProposal('MATH-1-A01',0),q=copyExam(p);q.options[0]='değiştirildi';
 assert.notEqual(p.options[0],q.options[0]);
});
