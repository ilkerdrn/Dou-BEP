import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {synthesizeTurkishArticulationPreview,synthesizeTurkishSpectralPreview} from './dou-speech-waveform.mjs';
import {inspectSpeechWaveform} from './dou-speech-quality.mjs';

test('v2.56 two-sided spectral experiment is deterministic, bounded and PCM-16 mono',()=>{
 const a=synthesizeTurkishSpectralPreview('Merhaba dünya');
 const b=synthesizeTurkishSpectralPreview('Merhaba dünya');
 assert.deepEqual(a.wav,b.wav);
 assert.equal(a.sampleRate,22050);
 assert.ok(a.spectralTransitions>0);
 assert.equal(a.spectralContinuityExperiment,true);
 assert.equal(a.validatedIntelligibility,false);
 assert.notDeepEqual(a.wav,synthesizeTurkishArticulationPreview('Merhaba dünya').wav);
 const m=inspectSpeechWaveform(a.wav);
 assert.equal(m.sampleRate,22050);
 assert.equal(m.clippedSamples,0);
 assert.ok(m.durationSeconds<16&&m.durationSeconds>1);
 assert.ok(m.peak>.02&&m.rms>.001);
});

test('v2.56 silent boundaries have no interpolated transition and differ from contiguous sonorants',()=>{
 const continuous=synthesizeTurkishSpectralPreview('mama');
 const split=synthesizeTurkishSpectralPreview('ma ma');
 assert.ok(continuous.spectralTransitions>split.spectralTransitions);
 assert.ok(continuous.durationSeconds<split.durationSeconds);
 assert.ok(inspectSpeechWaveform(split.wav).maxStep<1);
});

test('v2.56 rejects unbounded and invalid input without external services',()=>{
 for(const input of ['','   ','https://example.com','<script>','a'.repeat(101)])
  assert.throws(()=>synthesizeTurkishSpectralPreview(input));
 for(const options of [{pitchHz:NaN},{pitchHz:400},{rate:0},{rate:2}])
  assert.throws(()=>synthesizeTurkishSpectralPreview('Merhaba',options),RangeError);
 assert.throws(()=>synthesizeTurkishSpectralPreview(null),TypeError);
});

test('v2.56 CLI exposes fixed-text spectral export, refuses overwrite and never accepts arbitrary text',()=>{
 const dir=mkdtempSync(join(tmpdir(),'dou-spectral-test-'));
 try{
  const dst=join(dir,'spectral.wav');
  const run=(args)=>spawnSync(process.execPath,['tools/dou-speech-preview.mjs',...args],{cwd:process.cwd(),encoding:'utf8'});
  const first=run(['--out',dst,'--mode','spectral']);
  assert.equal(first.status,0,first.stderr);
  const wav=readFileSync(dst);assert.equal(wav.subarray(0,4).toString(),'RIFF');
  assert.notEqual(run(['--out',dst,'--mode','spectral']).status,0);
  assert.notEqual(run(['--out',join(dir,'forbidden.wav'),'--text','REAL STUDENT TEXT']).status,0);
  assert.deepEqual(readFileSync(dst),wav);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
