import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {planFixedCadence,auditFixedCadence} from './dou-speech-cadence.mjs';
import {synthesizeFixedCadencePreview,synthesizeFixedStressExceptionArm,synthesizeTurkishProsodyPreview} from './dou-speech-waveform.mjs';
const digest=v=>createHash('sha256').update(v).digest('hex');
const words={EX13:'geliyor',EX14:'bakıyor',EX15:'kalıyor'};
test('v2.65 strict closed fixture contract, no open text or options',()=>{
 for(const bad of [null,undefined,'EX01','EX13;',{},'https://test.local',123])
  assert.throws(()=>planFixedCadence(bad),RangeError);
 assert.throws(()=>auditFixedCadence('anything'),TypeError);
 assert.throws(()=>synthesizeFixedCadencePreview('EX01'),RangeError);
});
test('v2.65 old baseline and candidate WAV bytes remain identical',()=>{
 for(const [id,word] of Object.entries(words)){
  assert.equal(digest(synthesizeFixedStressExceptionArm(id,'baseline').wav),digest(synthesizeTurkishProsodyPreview(word).wav));
  const cand=synthesizeFixedStressExceptionArm(id,'candidate');
  assert.notEqual(digest(cand.wav),digest(synthesizeFixedCadencePreview(id).wav));
  assert.equal(digest(cand.wav),digest(synthesizeFixedStressExceptionArm(id,'candidate').wav));
 }
});
test('v2.65 tonal neighbors share exact end/start pitch with bounded durations',()=>{
 const tonal=new Set(['vowel','voiced','glide']);
 for(const id of Object.keys(words)){
  const c=planFixedCadence(id),items=c.plan.items;
  assert.ok(c.smoothedBoundaries>0&&c.adjustedVowels>0);
  assert.ok(c.plan.durationSeconds>0&&c.plan.durationSeconds<16);
  assert.deepEqual(c.candidateStressIndices,[1]);
  for(let i=1;i<items.length;i++){
   if(tonal.has(items[i-1].kind)&&tonal.has(items[i].kind))
    assert.equal(items[i-1].pitchEndHz,items[i].pitchStartHz);
  }
  for(const s of items){assert.ok(s.length>=0);if(s.kind!=='silence')assert.ok(s.pitchStartHz>=90&&s.pitchEndHz<=220);}
 }
});
test('v2.65 deterministic bounded mono PCM output and no clipped samples',()=>{
 for(const id of Object.keys(words)){
  const a=synthesizeFixedCadencePreview(id),b=synthesizeFixedCadencePreview(id);
  assert.equal(digest(a.wav),digest(b.wav));
  const view=new DataView(a.wav.buffer,a.wav.byteOffset,a.wav.byteLength);
  assert.equal(view.getUint16(22,true),1);assert.equal(view.getUint32(24,true),22050);
  assert.equal(view.getUint32(40,true),a.wav.length-44);
  for(let i=44;i<a.wav.length;i+=2)assert.ok(Math.abs(view.getInt16(i,true))<32767);
 }
});
test('v2.65 report is metadata-only, no raw words, individual ratings or personal data',()=>{
 const report=auditFixedCadence(),s=JSON.stringify(report);
 assert.equal(report.caseCount,3);assert.equal(report.productionReady,false);
 assert.ok(report.totalSmoothedBoundaries>0&&report.totalAdjustedVowels>0);
 for(const text of Object.values(words))assert.ok(!s.includes(text));
 assert.equal(report.intelligibilityScore,null);assert.equal(report.audioQualityScore,null);
});
test('v2.65 no-argument CLI deterministic, independently hashed and side effect free',()=>{
 const go=(...a)=>spawnSync(process.execPath,['tools/dou-speech-cadence-audit.mjs',...a],{encoding:'utf8'});
 const a=go(),b=go(),invalid=go('EX13');assert.equal(a.status,0);assert.equal(b.status,0);
 assert.equal(a.stdout,b.stdout);assert.notEqual(invalid.status,0);
 const r=JSON.parse(a.stdout),hash=r.reportSha256;delete r.reportSha256;
 assert.equal(hash,digest(Buffer.from(JSON.stringify(r))));
});
test('v2.65 Reader public allowlist only module, accessible controls are wired',()=>{
 const server=readFileSync('server.mjs','utf8'),html=readFileSync('dou-reader-demo.html','utf8'),js=readFileSync('dou-reader-demo.mjs','utf8');
 assert.ok(server.includes("'/dou-speech-cadence.mjs'"));assert.ok(!server.includes("'/dou-speech-cadence.test.mjs'"));
 assert.ok(html.includes('id="lab-cadence-open"')&&html.includes('id="lab-cadence-body"'));
 assert.ok(js.includes('synthesizeFixedCadencePreview(id)'));
});
