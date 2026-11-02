import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TRIAL_COUNT,PAIRS,createPhonemeSession,markPhonemePlayback,submitPhonemeChoice,summarizePhonemeSession} from './dou-speech-phoneme-study.mjs';
import {synthesizeTurkishArticulationPreview} from './dou-speech-waveform.mjs';
import {inspectSpeechWaveform} from './dou-speech-quality.mjs';
const seeded=()=>createPhonemeSession(new Uint8Array(16).fill(0));
test('v2.49 all eight fixed stimuli are balanced with two target words per pair',()=>{
 const s=seeded();assert.equal(TRIAL_COUNT,8);assert.equal(PAIRS.length,4);
 assert.equal(new Set(s.trials.map(t=>t.id)).size,8);
 for(const p of PAIRS){
  const trials=s.trials.filter(t=>t.pairId===p.id);
  assert.equal(trials.length,2);assert.deepEqual(new Set(trials.map(t=>t.word)),new Set(p.words));
  assert.ok(trials.every(t=>t.options.includes(t.word)&&t.choice===null&&!t.played));
 }
});
test('v2.49 explicit random bytes permute both trial positions and label order',()=>{
 const a=seeded(),b=createPhonemeSession(Uint8Array.from({length:16},(_,i)=>i+1));
 assert.notDeepEqual(a.trials.map(t=>t.id),b.trials.map(t=>t.id));
 assert.ok(b.trials.some(t=>t.options[0]!==PAIRS.find(p=>p.id===t.pairId).words[0]));
 for(const input of [[],new Uint8Array(15),new Uint8Array(17),null])assert.throws(()=>createPhonemeSession(input),TypeError);
});
test('v2.49 playback completion gates answer; answers immutable and invalid word refused',()=>{
 const s=seeded(),t=s.trials[0];
 assert.throws(()=>submitPhonemeChoice(s,t.id,t.word),RangeError);
 assert.throws(()=>markPhonemePlayback(s,'unknown'),RangeError);
 markPhonemePlayback(s,t.id);assert.throws(()=>submitPhonemeChoice(s,t.id,'other'),RangeError);
 submitPhonemeChoice(s,t.id,t.word);
 assert.throws(()=>submitPhonemeChoice(s,t.id,t.word),RangeError);
 assert.throws(()=>markPhonemePlayback(s,t.id),RangeError);
});
test('v2.49 aggregate-only report counts correct and wrong without raw stimulus or response',()=>{
 const s=seeded();
 for(let i=0;i<8;i++){
  const t=s.trials[i];markPhonemePlayback(s,t.id);
  submitPhonemeChoice(s,t.id,i%2?t.options.find(w=>w!==t.word):t.word);
 }
 const summary=summarizePhonemeSession(s);
 assert.equal(summary.answered,8);assert.equal(summary.correct,4);assert.equal(summary.incorrect,4);
 assert.equal(Object.values(summary.pairCounts).reduce((sum,v)=>sum+v.correct,0),4);
 assert.ok(Object.values(summary.pairCounts).every(v=>v.answered===2));
 assert.equal(summary.unvalidatedToyExercise,true);
 const text=JSON.stringify(summary);
 for(const forbidden of ['Sasa','Şaşa','Mama','Nana','Papa','Kaka','Vava','Zaza','timestamp','student','ipAddress','device','participant','trialOrder','target','"choice":'])
  assert.ok(!text.includes(forbidden),`Leaked ${forbidden}`);
});
test('v2.49 incomplete report is explicitly partial and export UI must gate eight answers',()=>{
 const s=seeded(),t=s.trials[0];markPhonemePlayback(s,t.id);submitPhonemeChoice(s,t.id,t.options[0]);
 const summary=summarizePhonemeSession(s);
 assert.equal(summary.answered,1);assert.equal(summary.correct+summary.incorrect,1);
 assert.ok(summary.answered<summary.totalTrials);
 const ui=readFileSync('dou-speech-phoneme-ui.mjs','utf8');
 assert.match(ui,/aggregate\.answered!==TRIAL_COUNT/);
});
test('v2.49 rejects duplicate, injected or malformed trial state',()=>{
 const a=seeded();a.trials[1].id=a.trials[0].id;assert.throws(()=>summarizePhonemeSession(a),RangeError);
 const b=seeded();b.trials[0].word='identity';assert.throws(()=>markPhonemePlayback(b,b.trials[0].id),RangeError);
 const c=seeded();c.trials[0].options=['Merhaba','dünya'];assert.throws(()=>summarizePhonemeSession(c),RangeError);
 assert.throws(()=>summarizePhonemeSession({trials:[]}),RangeError);
});
test('v2.49 fixed sound stimuli synthesize bounded offline waveform without clipping',()=>{
 for(const p of PAIRS)for(const word of p.words){
  const result=synthesizeTurkishArticulationPreview(word),m=inspectSpeechWaveform(result.wav);
  assert.ok(m.rms>0.002&&m.durationSeconds<5);
  assert.equal(m.sampleRate,22050);assert.equal(m.clippedSamples,0);
 }
});
test('v2.49 study UI does not collect, store or send data; private tests not published',()=>{
 const files=['dou-speech-phoneme-study.mjs','dou-speech-phoneme-ui.mjs','dou-speech-phoneme.html'];
 for(const name of files){
  const code=readFileSync(name,'utf8');
  for(const banned of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'localStorage', 'sessionStorage', 'getUserMedia', 'http://', 'https://'])
   assert.ok(!code.includes(banned),`${name} contains ${banned}`);
 }
 const ui=readFileSync('dou-speech-phoneme-ui.mjs','utf8'),server=readFileSync('server.mjs','utf8');
 assert.match(ui,/crypto\.getRandomValues/);assert.match(ui,/URL\.revokeObjectURL/);
 assert.match(ui,/addEventListener\('ended'/);assert.match(ui,/markPhonemePlayback/);
 assert.match(server,/\/dou-speech-phoneme-study\.mjs/);
 assert.ok(!server.includes("'/dou-speech-phoneme-study.test.mjs'"));
});
