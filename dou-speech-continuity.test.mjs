import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {planFixedCadence} from './dou-speech-cadence.mjs';
import {synthesizeFixedCadencePreview,synthesizeFixedStressExceptionArm} from './dou-speech-waveform.mjs';
import {synthesizeFixedContinuityPreview,auditFixedContinuity} from './dou-speech-continuity.mjs';
import {inspectSpeechWaveform} from './dou-speech-quality.mjs';
const ids=['EX13','EX14','EX15'];
const hash=v=>createHash('sha256').update(v).digest('hex');
const pcm=wav=>{const view=new DataView(wav.buffer,wav.byteOffset,wav.byteLength);return Array.from({length:(wav.length-44)/2},(_,i)=>view.getInt16(44+i*2,true));};
test('v2.66 closed-only no-argument report; rejects arbitrary text and options',()=>{
 for(const value of [undefined,null,123,{},'EX01','EX13 ','/api/audit'])assert.throws(()=>synthesizeFixedContinuityPreview(value),RangeError);
 assert.throws(()=>auditFixedContinuity('EX13'),TypeError);
});
test('v2.66 older baseline/candidate/cadence arms remain byte identical after new render',()=>{
 for(const id of ids){const a=synthesizeFixedStressExceptionArm(id,'baseline').wav,b=synthesizeFixedStressExceptionArm(id,'candidate').wav,c=synthesizeFixedCadencePreview(id).wav;
 synthesizeFixedContinuityPreview(id);assert.equal(hash(a),hash(synthesizeFixedStressExceptionArm(id,'baseline').wav));assert.equal(hash(b),hash(synthesizeFixedStressExceptionArm(id,'candidate').wav));assert.equal(hash(c),hash(synthesizeFixedCadencePreview(id).wav));}
});
test('v2.66 deterministic bounded PCM and no clipping or duration changes',()=>{
 for(const id of ids){const a=synthesizeFixedContinuityPreview(id),b=synthesizeFixedContinuityPreview(id),orig=synthesizeFixedCadencePreview(id);
 assert.equal(hash(a.wav),hash(b.wav));assert.equal(a.wav.length,orig.wav.length);assert.ok(a.wav.length<=22050*16*2+44);
 const stats=inspectSpeechWaveform(a.wav);assert.equal(stats.sampleRate,22050);assert.equal(stats.clippedSamples,0);
 assert.equal(stats.durationSeconds,inspectSpeechWaveform(orig.wav).durationSeconds);}
});
test('v2.66 only permitted voiced seam-local samples may change',()=>{
 for(const id of ids){const {wav,seams,changedSamples}=synthesizeFixedContinuityPreview(id),old=pcm(synthesizeFixedCadencePreview(id).wav),next=pcm(wav);
 assert.ok(changedSamples>0);const allowed=new Set();let offset=0;const items=planFixedCadence(id).plan.items;
 for(let i=0;i<items.length-1;i++){offset+=items[i].length;const seam=seams.find(s=>s.index===i+1);
 if(seam?.accepted){const span=Math.min(44,items[i+1].length-1,old.length-offset-1);for(let k=0;k<span;k++)allowed.add(offset+k);}}
 for(let i=0;i<old.length;i++)if(old[i]!==next[i])assert.ok(allowed.has(i),`${id} unexpected edited sample ${i}`);
 }
});
test('v2.66 every accepted seam has a bounded local step, rejected seams unchanged',()=>{
 const report=auditFixedContinuity();assert.equal(report.caseCount,3);assert.equal(report.totalSeams,15);
 assert.ok(report.acceptedSeams>0&&report.rejectedSeams>0);
 for(const item of report.cases){assert.equal(item.acceptedSeams+item.rejectedSeams,item.seams.length);
 for(const s of item.seams){if(s.accepted){assert.equal(s.newEdgeJump,0);assert.ok(s.newWindowMaxStep<=s.oldWindowMaxStep+1e-6);}
 else{assert.equal(s.oldEdgeJump,s.newEdgeJump);assert.equal(s.oldWindowMaxStep,s.newWindowMaxStep);}}
 }
});
test('v2.66 results are metadata-only, do not rate speech or collect student data',()=>{
 const result=auditFixedContinuity(),text=JSON.stringify(result);assert.equal(result.productionReady,false);
 assert.equal(result.improvedQualityClaim,false);for(const word of ['geliyor','bakıyor','kalıyor'])assert.ok(!text.includes(word));
 assert.ok(!text.includes('wav'));assert.ok(!text.includes('student'));
});
test('v2.66 deterministic no-args read-only CLI with valid report hash',()=>{
 const run=(...args)=>spawnSync(process.execPath,['tools/dou-speech-continuity-audit.mjs',...args],{encoding:'utf8'});
 const a=run(),b=run(),bad=run('EX13');assert.equal(a.status,0);assert.equal(a.stdout,b.stdout);assert.notEqual(bad.status,0);
 const report=JSON.parse(a.stdout),expected=report.reportSha256;delete report.reportSha256;assert.equal(expected,hash(Buffer.from(JSON.stringify(report))));
});
test('v2.66 new lab module public, source tests/private CLI blocked, user controls keyboard accessible',()=>{
 const server=readFileSync('server.mjs','utf8'),html=readFileSync('dou-reader-demo.html','utf8'),js=readFileSync('dou-reader-demo.mjs','utf8');
 assert.ok(server.includes("'/dou-speech-continuity.mjs'"));assert.ok(!server.includes("'/dou-speech-continuity.test.mjs'"));
 assert.ok(html.includes('id="lab-continuity-open"')&&html.includes('id="lab-continuity-play"'));
 assert.ok(js.includes('auditFixedContinuity()')&&js.includes('synthesizeFixedContinuityPreview(id)'));
});
