import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {planTurkishProsody} from './dou-speech-prosody.mjs';
import {retimeExperimentalSpeech} from './dou-speech-timing.mjs';
import {synthesizeTurkishSpectralPreview,synthesizeTurkishTimingPreview} from './dou-speech-waveform.mjs';
import {auditSyntheticBoundaries,compareSyntheticBoundaryAudits} from './dou-speech-boundary.mjs';
const phrase='Merhaba dünya';
const old=()=>synthesizeTurkishSpectralPreview(phrase).wav;
const newer=()=>synthesizeTurkishTimingPreview(phrase).wav;
const base=()=>planTurkishProsody(phrase);
const timed=()=>retimeExperimentalSpeech(base());
test('v2.58 aligned boundary measurements use only fixed-format objective categories',()=>{
 const result=compareSyntheticBoundaryAudits(old(),base(),newer(),timed());
 assert.equal(result.alignedBoundaryCount,base().items.length-1);
 assert.equal(result.reference.segmentCount,result.candidate.segmentCount);
 assert.deepEqual(result.reference.boundaries.map(x=>x.category),result.candidate.boundaries.map(x=>x.category));
 assert.ok(result.reference.byCategory.some(x=>x.category==='tonlu-tonlu'&&x.count>0));
 assert.ok(result.reference.byCategory.some(x=>x.category==='durak-sınırı'&&x.count>0));
 assert.ok(result.reference.boundaries.every(x=>x.edgeJump>=0&&x.edgeJump<=2&&x.rmsGap>=0&&x.beforeRms>=0&&x.afterRms>=0));
 assert.equal(result.qualityRating,false);assert.equal(result.phoneticValidity,false);
 assert.doesNotMatch(JSON.stringify(result),/merhaba|dünya|letter|syllable|word|learner|student/i);
});
test('v2.58 deterministic reproducibility and no mutation of WAV or source plan',()=>{
 const wav=old(),plan=base(),snapshot=structuredClone(plan),hash=createHash('sha256').update(wav).digest('hex');
 const a=auditSyntheticBoundaries(wav,plan),b=auditSyntheticBoundaries(wav,plan);
 assert.deepEqual(a,b);assert.deepEqual(plan,snapshot);
 assert.equal(createHash('sha256').update(wav).digest('hex'),hash);
 // Preserve v2.56 spectral mode byte-for-byte.
 assert.equal(hash,'efdfc09b5cb967d02aa20382ce08a16ca221f0ce2b55a9ba86e355bab513b0c2');
});
test('v2.58 rejects corrupted PCM, plan length mismatch and overlarge plans',()=>{
 const wav=old(),plan=base();
 assert.throws(()=>auditSyntheticBoundaries(new Uint8Array([1,2]),plan),RangeError);
 assert.throws(()=>auditSyntheticBoundaries(wav,{...plan,sampleRate:44100}),RangeError);
 assert.throws(()=>auditSyntheticBoundaries(wav,{...plan,items:plan.items.slice(1)}),RangeError);
 assert.throws(()=>auditSyntheticBoundaries(wav,{...plan,items:[...plan.items,{kind:'vowel',length:1}]}),RangeError);
 assert.throws(()=>auditSyntheticBoundaries(wav,{...plan,items:plan.items.map(s=>({...s,kind:'unknown'}))}),RangeError);
 assert.throws(()=>auditSyntheticBoundaries(wav,plan,{windowMs:21}),RangeError);
 assert.throws(()=>auditSyntheticBoundaries(wav,plan,{windowMs:NaN}),RangeError);
 assert.throws(()=>auditSyntheticBoundaries(wav,{...plan,items:Array(129).fill({kind:'vowel',length:1})}),RangeError);
});
test('v2.58 comparison requires same segment order, not merely same duration',()=>{
 const p=base(),bad=structuredClone(timed());
 bad.items[0].kind='silence';
 assert.throws(()=>compareSyntheticBoundaryAudits(old(),p,newer(),bad),RangeError);
 const sameCategory=structuredClone(timed());const first=sameCategory.items.find(x=>x.kind==='vowel');first.kind='voiced';
 assert.throws(()=>compareSyntheticBoundaryAudits(old(),p,newer(),sameCategory),RangeError);
});
test('v2.58 audit CLI accepts no text, file path or network URL as input',()=>{
 const run=(args=[])=>spawnSync(process.execPath,['tools/dou-speech-boundary-audit.mjs',...args],{cwd:process.cwd(),encoding:'utf8'});
 const ok=run();assert.equal(ok.status,0,ok.stderr);
 const result=JSON.parse(ok.stdout);assert.equal(result.alignedBoundaryCount,base().items.length-1);
 assert.equal(result.qualityRating,false);assert.doesNotMatch(ok.stdout,/merhaba|dünya/i);
 for(const args of [['--text','student exam'],['--file','something.wav'],['http://example.com']])
  assert.notEqual(run(args).status,0);
});
