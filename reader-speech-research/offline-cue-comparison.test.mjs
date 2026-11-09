import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {synthesizeFixedComparison} from './offline-cue-comparison.mjs';

test('fixed acoustic arms reject arbitrary content and unexpected prototype IDs',()=>{
 for(const cue of ['exam question','student','password','__proto__','constructor',null,undefined,{},[]])
  assert.throws(()=>synthesizeFixedComparison(cue,'candidate'),RangeError);
 for(const arm of ['natural','production','',null,undefined,{},'toString'])
  assert.throws(()=>synthesizeFixedComparison('ready',arm),RangeError);
});
test('both arms are deterministic bounded WAV and contain no validated voice claims',()=>{
 for(const cue of ['ready','stopped','help']){
  const a=synthesizeFixedComparison(cue,'baseline');
  const b=synthesizeFixedComparison(cue,'candidate');
  for(const clip of [a,b]){
   assert.equal(clip.researchOnly,true);
   assert.equal(clip.validatedIntelligibility,false);
   assert.equal(clip.validatedNaturalness,false);
   assert.equal(clip.offline,true);
   assert.equal(clip.sampleRate,22050);
   assert.equal(clip.clippedSamples,0);
   assert.ok(clip.durationSeconds>0&&clip.durationSeconds<=16);
   assert.ok(clip.wav.length>44&&clip.wav.length<=1048576);
   assert.equal(Buffer.from(clip.wav).toString('ascii',0,4),'RIFF');
  }
  assert.deepEqual(b.wav,synthesizeFixedComparison(cue,'candidate').wav);
  assert.notDeepEqual(a.wav,b.wav,'A/B comparison needs distinct waveforms');
 }
});
test('comparison CLI rejects unauthorized speech and produces strict base64 WAV',()=>{
 const cli=fileURLToPath(new URL('../tools/dou-speech-compare-cue.mjs',import.meta.url));
 for(const arm of ['baseline','candidate']){
  const r=spawnSync(process.execPath,[cli,'--cue','ready','--arm',arm],{encoding:'utf8',timeout:20000,maxBuffer:1600000});
  assert.equal(r.status,0,r.stderr);
  assert.match(r.stdout,/^[A-Za-z0-9+/]+={0,2}$/);
  const wav=Buffer.from(r.stdout,'base64');
  assert.equal(wav.toString('ascii',0,4),'RIFF');
  assert.equal(wav.readUInt32LE(40),wav.length-44);
 }
 for(const args of [['--cue','ready'],['--cue','password','--arm','candidate'],['--cue','ready','--arm','natural'],['--cue','ready','--arm','candidate','exam'],['--text','question','--arm','candidate']]){
  const r=spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:20000,maxBuffer:1600000});
  assert.equal(r.status,2);
  assert.equal(r.stdout,'');
 }
});
