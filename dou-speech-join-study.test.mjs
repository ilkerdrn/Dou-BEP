import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {synthesizeFixedJoinStudy,auditFixedJoinCorpus,synthesizeFixedRehearsalArm,listFixedRehearsalTrials} from './dou-speech-corpus.mjs';
import {filterFixedCorpusJoins} from './dou-speech-join-study.mjs';
import {synthesizeTurkishTimingPreview} from './dou-speech-waveform.mjs';
import {retimeExperimentalSpeech} from './dou-speech-timing.mjs';
import {planTurkishProsody} from './dou-speech-prosody.mjs';
import {inspectSpeechWaveform} from './dou-speech-quality.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
test('v2.61 fixed-only C accepts exactly fourteen opaque IDs, never arbitrary exam text',()=>{
 for(const id of ['TR00','TR15','TR16','merhaba','../../data','https://example.org','',null,{},'TR01/'])
  assert.throws(()=>synthesizeFixedJoinStudy(id),RangeError);
 assert.throws(()=>synthesizeFixedJoinStudy('TR01','student'),RangeError);
 assert.throws(()=>auditFixedJoinCorpus('private'),TypeError);
 assert.equal(listFixedRehearsalTrials().length,14);
});
test('v2.61 no mutation, bounded PCM and repeatable 14-case C variants',()=>{
 const audit=auditFixedJoinCorpus();assert.equal(audit.caseCount,14);assert.equal(audit.totalProcessedJoins,15);
 assert.equal(audit.qualityRating,null);assert.equal(audit.productionReady,false);
 for(const entry of audit.cases){
  const first=synthesizeFixedJoinStudy(entry.id),second=synthesizeFixedJoinStudy(entry.id);
  assert.equal(digest(first.wav),digest(second.wav));
  assert.equal(first.syntheticOnly,true);assert.equal(first.sampleRate,22050);
  assert.equal(inspectSpeechWaveform(first.wav).clippedSamples,0);
  assert.ok(inspectSpeechWaveform(first.wav).durationSeconds>0);
  assert.equal(first.processedJoins,entry.eligibleJoins);
  if(entry.processedJoins>0)assert.ok(entry.modifiedSamples>0);
  else assert.equal(entry.modifiedSamples,0);
 }
});
test('v2.61 C affects only local vowel/noisy consonant boundary PCM, same length and no header changes',()=>{
 const phrase='Sasa',base=synthesizeTurkishTimingPreview(phrase).wav;
 const plan=retimeExperimentalSpeech(planTurkishProsody(phrase));
 const original=Uint8Array.from(base);
 const result=filterFixedCorpusJoins(base,plan);
 assert.deepEqual(base,original,'source WAV must not be mutated');
 assert.deepEqual(result.wav.subarray(0,44),base.subarray(0,44));
 assert.equal(result.wav.length,base.length);
 let offset=0;const covered=new Set();
 for(let i=0;i<plan.items.length-1;i++){
  const l=plan.items[i],r=plan.items[i+1];offset+=l.length;
  if(!((l.kind==='vowel'&&r.kind==='noise')||(r.kind==='vowel'&&l.kind==='noise')))continue;
  const span=Math.min(88,Math.floor(l.length/8),Math.floor(r.length/8));
  for(let p=offset-span;p<offset+span;p++)covered.add(p);
 }
 const count=(base.length-44)/2;let changed=0;
 for(let i=0;i<count;i++){
  if(base[44+2*i]!==result.wav[44+2*i]||base[45+2*i]!==result.wav[45+2*i]){
   changed++;assert.ok(covered.has(i),`unexpected change at PCM frame ${i}`);
  }
 }
 assert.ok(changed>0);
});
test('v2.61 fails closed on damaged PCM header or mismatched segmentation',()=>{
 const wav=synthesizeTurkishTimingPreview('Merhaba dünya').wav;
 const plan=retimeExperimentalSpeech(planTurkishProsody('Merhaba dünya'));
 const bad=wav.slice();bad[0]=0;
 assert.throws(()=>filterFixedCorpusJoins(bad,plan),RangeError);
 const wrong={...plan,items:plan.items.map((s,i)=>i===0?{...s,length:s.length+1}:s)};
 assert.throws(()=>filterFixedCorpusJoins(wav,wrong),RangeError);
});
test('v2.61 pre-existing A/B arms are unchanged by C, and C is separately labeled',()=>{
 const a=synthesizeFixedRehearsalArm('TR05','A').wav,b=synthesizeFixedRehearsalArm('TR05','B').wav;
 const C=synthesizeFixedJoinStudy('TR05').wav;
 assert.notEqual(digest(C),digest(b));
 assert.deepEqual(synthesizeFixedRehearsalArm('TR05','A').wav,a);
 assert.deepEqual(synthesizeFixedRehearsalArm('TR05','B').wav,b);
});
test('v2.61 accessible UI and report do not collect personal responses or fetch exam data',()=>{
 const page=readFileSync(new URL('./dou-reader-demo.html',import.meta.url),'utf8');
 const ui=readFileSync(new URL('./dou-reader-demo.mjs',import.meta.url),'utf8').split('// v2.61: non-human')[1];
 assert.match(page,/id="lab-join-results" hidden/);assert.match(page,/id="lab-join-status" role="status"/);
 for(const forbidden of ['fetch(','localStorage','sessionStorage','XMLHttpRequest','mediaDevices','getQuestion(','writeFile','indexedDB'])
  assert.ok(!ui.includes(forbidden),forbidden);
 const out=spawnSync(process.execPath,['tools/dou-speech-join-audit.mjs'],{cwd:process.cwd(),encoding:'utf8'});
 assert.equal(out.status,0,out.stderr);
 const report=JSON.parse(out.stdout);assert.equal(report.caseCount,14);
 assert.equal(report.totalProcessedJoins,15);
 assert.doesNotMatch(out.stdout,/merhaba|dünya|sasa|ş aşa|student|diagnosis|answer|recording/i);
 assert.notEqual(spawnSync(process.execPath,['tools/dou-speech-join-audit.mjs','person'],{cwd:process.cwd()}).status,0);
});
