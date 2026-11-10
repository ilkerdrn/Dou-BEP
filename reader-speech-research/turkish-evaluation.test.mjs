import test from 'node:test';
import assert from 'node:assert/strict';
import {TURKISH_EVALUATION_PROMPTS,auditTurkishEvaluationPrompts} from './turkish-evaluation-prompts.mjs';
import {normalizeTurkishTranscription,editDistance,scoreTurkishTranscription} from './turkish-transcription-metrics.mjs';

test('24 synthetic prompts cover 6 Turkish categories and 3 splits',()=>{
 const result=auditTurkishEvaluationPrompts();
 assert.deepEqual(result,{valid:true,count:24,
  splits:{development:12,validation:6,'held-out':6},
  categories:{consonants:4,morphology:4,navigation:4,numbers:4,prosody:4,vowels:4}
 });
 assert.equal(new Set(TURKISH_EVALUATION_PROMPTS.map(x=>x.id)).size,24);
 assert.equal(TURKISH_EVALUATION_PROMPTS.every(x=>x.syntheticPrompt&&!x.recordingProvided),true);
});
test('evaluation corpus rejects duplicates, personal-looking fields and missing categories',()=>{
 const duplicate=[...TURKISH_EVALUATION_PROMPTS.slice(0,-1),TURKISH_EVALUATION_PROMPTS[0]];
 assert.equal(auditTurkishEvaluationPrompts(duplicate).valid,false);
 const contaminated=TURKISH_EVALUATION_PROMPTS.map(x=>x.id==='TR001'?{...x,text:'https://example.org/private'}:x);
 assert.equal(auditTurkishEvaluationPrompts(contaminated).valid,false);
 assert.equal(auditTurkishEvaluationPrompts(TURKISH_EVALUATION_PROMPTS.slice(0,6)).valid,false);
});
test('Turkish uppercase dotted and dotless I normalize predictably',()=>{
 assert.equal(normalizeTurkishTranscription('IŞIK İÇİN.'),'ışık için');
 assert.equal(normalizeTurkishTranscription('  ÜÇ,   ÖRDEK!  '),'üç ördek');
 assert.throws(()=>normalizeTurkishTranscription('a\nstudent'),RangeError);
 assert.throws(()=>normalizeTurkishTranscription('a'.repeat(501)),RangeError);
});
test('WER and CER are zero on identical speech transcription',()=>{
 for(const p of TURKISH_EVALUATION_PROMPTS){
  const result=scoreTurkishTranscription(p.id,p.text);
  assert.equal(result.wer,0);
  assert.equal(result.cer,0);
  assert.equal(result.validatesProductionUse,false);
 }
});
test('WER counts substitutions and missing words without hiding failed transcripts',()=>{
 const exact=scoreTurkishTranscription('TR017','Sonraki düğmeye geç.');
 const missing=scoreTurkishTranscription('TR017','Sonraki geç.');
 const silent=scoreTurkishTranscription('TR017','');
 assert.equal(exact.wordReferenceCount,3);
 assert.equal(missing.wordErrors,1);
 assert.equal(missing.wer,1/3);
 assert.equal(silent.wer,1);
 assert.ok(missing.cer>0);
 assert.equal(editDistance(['a','b'],['a','c']),1);
 assert.throws(()=>scoreTurkishTranscription('__proto__','abc'),RangeError);
});
