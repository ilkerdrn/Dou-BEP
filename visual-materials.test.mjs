import test from 'node:test';
import assert from 'node:assert/strict';
import {VISUAL_MATERIALS,findVisualMaterials,visualMaterial,materialDescription,visualMaterialMarkup,applyVisualMaterial} from './visual-materials.mjs';
import {createDemo,normalizeExam,questionHtml,validateExam} from './core.mjs';
import {confirmQuestion,questionFingerprint,snapshotFingerprint,hasAlternative} from './pedagogy-review.mjs';
import {activePrompt} from './presentation-variants.mjs';

test('v2.12 material catalogue has eleven closed, distinct and valid entries',()=>{
 assert.equal(VISUAL_MATERIALS.length,11);
 assert.equal(new Set(VISUAL_MATERIALS.map(x=>x.id)).size,11);
 for(const p of VISUAL_MATERIALS){
  assert.match(p.label,/\S/);assert.equal(visualMaterial(p.id)?.id,p.id);
  assert.equal(Object.isFrozen(p),true);
  if(p.category==='shapes'){assert.ok(p.a>=1&&p.a<=12);assert.ok(p.b>=0&&p.b<=12);}
  else{assert.ok(p.start>=0&&p.end<=30&&p.end-p.start<=12);}
  assert.match(materialDescription(p),/grup|doğrusu/);
 }
});
test('v2.12 search filters work in Turkish, without accepting unknown category',()=>{
 assert.equal(findVisualMaterials({category:'numberline'}).length,4);
 assert.equal(findVisualMaterials({category:'shapes'}).length,7);
 assert.equal(findVisualMaterials({term:'KARE'}).length,2);
 assert.equal(findVisualMaterials({term:'ZORUNLU-ESLESME-YOK'}).length,0);
 assert.throws(()=>findVisualMaterials({category:'oops'}));
});
test('all built-in materials have accessible standalone markup and no scripts/remote assets',()=>{
 for(const p of VISUAL_MATERIALS){
  const markup=visualMaterialMarkup(p.id);
  assert.match(markup,/role="img" aria-label="/);
  assert.doesNotMatch(markup,/<script|<img|https?:\/\/|onerror=|onclick=/i);
 }
 assert.throws(()=>visualMaterialMarkup('x'));
});
test('applying materials changes only visual fields and never silently edits answer or objective',()=>{
 const q=normalizeExam(createDemo()).questions[0];
 q.equivalenceReview={checks:{objective:true,answer:true,demand:true,access:true},fingerprint:'aaaaaaaaaaaaaaaa'};
 q.provenance={kind:'local-template',objectiveId:'x',source:'local',reviewed:true};
 const snapshot=structuredClone(q);
 for(const p of VISUAL_MATERIALS){
  const result=applyVisualMaterial(q,p.id);
  for(const key of ['id','type','prompt','simplifiedPrompt','objective','goalId','answer','options','points'])assert.deepEqual(result[key],q[key]);
  assert.equal(result.visualAltText,materialDescription(p));
  assert.equal(result.equivalenceReview.fingerprint,'');
  assert.equal(result.provenance.reviewed,false);
  assert.equal(result.visualMode,p.category==='shapes'?'shapes':'numberline');
 }
 assert.deepEqual(q,snapshot);
 assert.throws(()=>applyVisualMaterial(null,'one-group-dots'));
 assert.throws(()=>applyVisualMaterial(q,'bad'));
});
test('applied visuals render through the existing student exam paper renderer',()=>{
 const exam=normalizeExam(createDemo());exam.adaptations.visualCues=true;
 const a=applyVisualMaterial(exam.questions[0],'two-groups-dots');
 const b=applyVisualMaterial(exam.questions[0],'line-ten-twenty');
 assert.match(questionHtml(a,0,exam,false),/visual-dot-groups/);
 assert.match(questionHtml(b,0,exam,false),/numberline/);
 assert.doesNotMatch(questionHtml(b,0,exam,true),/numberline/);
 assert.equal(validateExam({...exam,questions:[a]}).some(i=>i.level==='error'),false);
});
test('material change invalidates alternative-text attestation AND style changes affect fingerprint',()=>{
 const exam=normalizeExam(createDemo());exam.questions[0].presentationMode='simplified';
 const question=exam.questions[0];
 assert.equal(hasAlternative(question,exam),true);
 const old=confirmQuestion(question,exam,{objective:true,answer:true,demand:true,access:true});
 const next=applyVisualMaterial(question,'stars');
 assert.notEqual(questionFingerprint(next,exam),old.fingerprint);
 const newStyle={...next,visualStyle:'square'};
 assert.notEqual(questionFingerprint(next,exam),questionFingerprint(newStyle,exam));
});

test('v2.12 keeps old v2.11 review fingerprints for unchanged default dots and number lines',()=>{
 const exam=normalizeExam(createDemo());const q=exam.questions[0];
 const previous=(x)=>snapshotFingerprint([x.id,x.type,x.goalId,x.objective,x.prompt,x.simplifiedPrompt,activePrompt(x,exam),x.presentationMode,x.options,x.answer,x.pairs,x.points,x.visualNote,x.visualAltText,x.visualDots,x.visualMode,x.numberLineStart,x.numberLineEnd,x.access,exam.adaptations?.simpleInstructions,exam.adaptations?.visualCues]);
 assert.equal(questionFingerprint(q,exam),previous(q));
 const line={...q,visualMode:'numberline',visualStyle:'star'};
 assert.equal(questionFingerprint(line,exam),previous(line));
 const changed={...q,visualStyle:'triangle'};
 assert.notEqual(questionFingerprint(changed,exam),previous(changed));
});
