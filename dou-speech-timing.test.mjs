import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {planTurkishProsody} from './dou-speech-prosody.mjs';
import {retimeExperimentalSpeech} from './dou-speech-timing.mjs';
import {synthesizeTurkishSpectralPreview,synthesizeTurkishTimingPreview} from './dou-speech-waveform.mjs';
import {compareSyntheticWav} from './dou-speech-comparison.mjs';
import {inspectSpeechWaveform} from './dou-speech-quality.mjs';

test('v2.57 timing changes bounded synthetic durations without mutating source',()=>{
 const original=planTurkishProsody('Merhaba dünya');
 const snapshot=structuredClone(original);
 const adjusted=retimeExperimentalSpeech(original);
 assert.deepEqual(original,snapshot);
 assert.ok(adjusted.timingAdjustments>0);
 assert.ok(adjusted.durationDeltaMs>0);
 assert.ok(adjusted.durationSeconds<16);
 assert.equal(adjusted.sampleRate,22050);
 assert.ok(adjusted.items.every(s=>Number.isSafeInteger(s.length)&&s.length>0));
 assert.equal(adjusted.syllableCount,original.syllableCount);
});
test('v2.57 adjacent tonal pitch joins match exactly and never cross pauses',()=>{
 const retimed=retimeExperimentalSpeech(planTurkishProsody('mama ma'));
 let joined=0;const tonal=new Set(['vowel','voiced','glide']);
 for(let i=1;i<retimed.items.length;i++){
  const a=retimed.items[i-1],b=retimed.items[i];
  if(tonal.has(a.kind)&&tonal.has(b.kind)){
   assert.equal(a.pitchEndHz,b.pitchStartHz);joined++;
  }
 }
 assert.equal(joined,retimed.tonalJoins);
 assert.ok(joined>0);
 assert.equal(retimed.maxPitchJumpAfterHz,0);
});
test('v2.57 timing waveform is deterministic, different and objectively bounded',()=>{
 const s=synthesizeTurkishSpectralPreview('Merhaba dünya');
 // Golden v2.56 WAV hash: v2.57 must not alter the earlier synthetic mode.
 assert.equal(createHash('sha256').update(s.wav).digest('hex'),'efdfc09b5cb967d02aa20382ce08a16ca221f0ce2b55a9ba86e355bab513b0c2');
 const a=synthesizeTurkishTimingPreview('Merhaba dünya');
 const b=synthesizeTurkishTimingPreview('Merhaba dünya');
 assert.deepEqual(a.wav,b.wav);
 assert.notDeepEqual(a.wav,s.wav);
 assert.equal(a.temporalJoinExperiment,true);
 assert.equal(a.experimental,true);
 assert.equal(a.validatedIntelligibility,false);
 assert.ok(a.tonalJoins>0);
 const m=inspectSpeechWaveform(a.wav);
 assert.equal(m.sampleRate,22050);
 assert.equal(m.clippedSamples,0);
 const comparison=compareSyntheticWav(s.wav,a.wav);
 assert.equal(comparison.objectiveOnly,true);
 assert.equal(comparison.validatedIntelligibility,false);
 assert.equal(comparison.improvedQualityClaim,false);
 assert.equal(comparison.candidate.clippedSamples,0);
 assert.ok(comparison.durationDeltaMs>0);
 assert.notEqual(comparison.rmsDelta,0);
});
test('v2.57 timing refuses invalid inputs and does not silently exceed 16s',()=>{
 assert.throws(()=>retimeExperimentalSpeech(null),TypeError);
 assert.throws(()=>retimeExperimentalSpeech({sampleRate:22050,items:[{length:0,pitchStartHz:125,pitchEndHz:125}]}),TypeError);
 const over={sampleRate:22050,items:[{kind:'vowel',stressed:true,length:22050*16,pitchStartHz:125,pitchEndHz:125}]};
 assert.throws(()=>retimeExperimentalSpeech(over),RangeError);
 for(const value of ['https://example.org','a'.repeat(101),'',null])assert.throws(()=>synthesizeTurkishTimingPreview(value));
 assert.throws(()=>synthesizeTurkishTimingPreview('Merhaba',{rate:0}),RangeError);
 assert.throws(()=>compareSyntheticWav(new Uint8Array([1]),new Uint8Array([2])),RangeError);
});
test('v2.57 CLI keeps fixed phrase and refuses replacement or arbitrary source text',()=>{
 const dir=mkdtempSync(join(tmpdir(),'dou-v257-'));
 try{
  const dst=join(dir,'temporal.wav');
  const run=args=>spawnSync(process.execPath,['tools/dou-speech-preview.mjs',...args],{cwd:process.cwd(),encoding:'utf8'});
  const first=run(['--out',dst,'--mode','timing']);
  assert.equal(first.status,0,first.stderr);
  assert.match(first.stdout,/Nesnel WAV karşılaştırması/);
  const saved=readFileSync(dst);
  assert.equal(inspectSpeechWaveform(saved).clippedSamples,0);
  assert.notEqual(run(['--out',dst,'--mode','timing']).status,0);
  assert.deepEqual(readFileSync(dst),saved);
  assert.notEqual(run(['--out',join(dir,'unauthorized.wav'),'--text','exam contents']).status,0);
  assert.equal(existsSync(join(dir,'unauthorized.wav')),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
