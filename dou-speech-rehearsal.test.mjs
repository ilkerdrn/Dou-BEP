import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {listFixedRehearsalTrials,synthesizeFixedRehearsalArm} from './dou-speech-corpus.mjs';
import {inspectSpeechWaveform} from './dou-speech-quality.mjs';
import {auditFixedSyntheticCorpus} from './dou-speech-corpus.mjs';

test('v2.60 rehearsal exposes exactly 14 opaque, fixed, paired local cases',()=>{
 const trials=listFixedRehearsalTrials();
 assert.equal(trials.length,14);
 assert.deepEqual(trials.map(t=>t.id),Array.from({length:14},(_,i)=>`TR${String(i+1).padStart(2,'0')}`));
 assert.deepEqual(trials.map(t=>t.armLabels),Array.from({length:14},()=>['A','B']));
 assert.ok(Object.isFrozen(trials[0])&&Object.isFrozen(trials[0].armLabels));
 assert.throws(()=>listFixedRehearsalTrials('student'),TypeError);
 assert.throws(()=>listFixedRehearsalTrials({source:'exam'}),TypeError);
 assert.doesNotMatch(JSON.stringify(trials),/merhaba|exam|name|record|text|timestamp|learner|answer/i);
});

test('v2.60 no arbitrary text, traversal, unsupported audio variant or URL can be synthesized',()=>{
 for(const [id,arm] of [['TR00','A'],['TR15','B'],['../data','A'],['Merhaba dünya','A'],['TR01','C'],['TR01',null],[null,'A'],['https://example.org','A'],[{},'B']]){
  assert.throws(()=>synthesizeFixedRehearsalArm(id,arm),RangeError,`${id} ${arm}`);
 }
});

test('v2.60 every technical arm produces bounded nonclipped offline 22kHz mono 16-bit WAV',()=>{
 const trials=listFixedRehearsalTrials();
 for(const trial of trials){
  for(const arm of trial.armLabels){
   const {wav,mimeType,sampleRate,syntheticOnly}=synthesizeFixedRehearsalArm(trial.id,arm);
   assert.equal(mimeType,'audio/wav');assert.equal(sampleRate,22050);assert.equal(syntheticOnly,true);
   assert.equal(Buffer.from(wav).toString('ascii',0,4),'RIFF');
   assert.equal(Buffer.from(wav).toString('ascii',8,12),'WAVE');
   assert.equal(Buffer.from(wav).readUInt16LE(22),1);assert.equal(Buffer.from(wav).readUInt16LE(34),16);
   const stats=inspectSpeechWaveform(wav);
   assert.equal(stats.clippedSamples,0);assert.ok(stats.durationSeconds>0&&stats.durationSeconds<16);
  }
 }
});

test('v2.60 deterministic A/B maps to two distinct existing models and stays stable',()=>{
 const trials=listFixedRehearsalTrials();
 const corpus=auditFixedSyntheticCorpus();
 for(let i=0;i<trials.length;i++){
  const id=trials[i].id;
  const a=synthesizeFixedRehearsalArm(id,'A').wav;
  const b=synthesizeFixedRehearsalArm(id,'B').wav;
  assert.notEqual(createHash('sha256').update(a).digest('hex'),createHash('sha256').update(b).digest('hex'),id);
  assert.deepEqual(a,synthesizeFixedRehearsalArm(id,'A').wav);
  assert.deepEqual(b,synthesizeFixedRehearsalArm(id,'B').wav);
  const oldDuration=corpus.cases[i].reference.durationSeconds, newDuration=corpus.cases[i].candidate.durationSeconds;
  const round=x=>Math.round(inspectSpeechWaveform(x).durationSeconds*10000)/10000;
  assert.deepEqual([round(a),round(b)],i%2===0?[oldDuration,newDuration]:[newDuration,oldDuration]);
 }
});

test('v2.60 browser rehearsal has no input field, response capture, storage or API calls',()=>{
 const source=readFileSync(new URL('./dou-reader-demo.mjs',import.meta.url),'utf8');
 const page=readFileSync(new URL('./dou-reader-demo.html',import.meta.url),'utf8');
 const frag=source.split('// v2.60: human-data-free technical A/B playback rehearsal.')[1];
 assert.ok(frag);
 for(const forbidden of ['fetch(','XMLHttpRequest','localStorage','sessionStorage','indexedDB','getQuestion(','navigator.mediaDevices','.download=','writeFile','recordListeningChoice']){
  assert.equal(frag.includes(forbidden),false,forbidden);
 }
 assert.match(page,/id="lab-rehearsal-results" hidden/);
 assert.match(page,/id="lab-rehearsal-status" role="status"/);
 assert.match(page,/Yanıt, kimlik, mikrofon/);
 assert.match(page,/bilimsel körleme/);
});
