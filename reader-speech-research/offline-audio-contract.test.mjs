import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {listExperimentalCues,renderExperimentalCue} from './offline-audio-contract.mjs';

test('cue contract is closed and contains no personal or exam content',()=>{
  assert.deepEqual(listExperimentalCues(), ['ready','stopped','help']);
  const source=readFileSync(new URL('./offline-audio-contract.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/fetch\(|https?:\/\/|SpeechSynthesizer|System\.Speech|localStorage|writeFile|createWriteStream|process\.stdin/);
});
test('only whitelisted cue IDs are accepted',()=>{
  for(const x of ['student-name','exam-text','password','',null,undefined,{},['ready'],'toString','__proto__','constructor']){
    assert.throws(()=>renderExperimentalCue(x),RangeError);
  }
});
test('each cue produces bounded, syntactically valid, offline experimental PCM WAV',()=>{
  for(const id of listExperimentalCues()){
    const x=renderExperimentalCue(id);
    assert.equal(x.cueId,id);
    assert.equal(x.syntheticOnly,true);
    assert.equal(x.productionApproved,false);
    assert.equal(x.validatedIntelligibility,false);
    assert.equal(x.outputMode,'offline-pcm-wav');
    assert.equal(x.sampleRate,22050);
    assert.ok(x.durationSeconds>0&&x.durationSeconds<=16);
    assert.ok(x.wav.byteLength>44&&x.wav.byteLength<=1048576);
    assert.equal(Buffer.from(x.wav).toString('ascii',0,4),'RIFF');
    assert.equal(Buffer.from(x.wav).toString('ascii',8,12),'WAVE');
  }
});
test('cue output is deterministic across calls',()=>{
  for(const id of listExperimentalCues()){
    assert.deepEqual(renderExperimentalCue(id).wav,renderExperimentalCue(id).wav);
  }
});
