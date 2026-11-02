import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {planFixedStressException,auditFixedStressPlans} from './dou-speech-exception-plan.mjs';
import {synthesizeFixedStressExceptionArm,synthesizeTurkishProsodyPreview} from './dou-speech-waveform.mjs';
import {auditFixedTurkishExceptions} from './dou-speech-exception-audit.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');

test('v2.64 closed IDs: no arbitrary speech input or non-stress words',()=>{
 for(const id of [undefined,null,'EX01','EX14;geliyor','-yor','/tmp','https://example.test',{},123])
  assert.throws(()=>planFixedStressException(id),RangeError);
 for(const id of [undefined,'EX01','EX99',null])
  assert.throws(()=>synthesizeFixedStressExceptionArm(id,'baseline'),RangeError);
 for(const arm of [undefined,'bad','local','/file',null])
  assert.throws(()=>synthesizeFixedStressExceptionArm('EX13',arm),RangeError);
 assert.throws(()=>auditFixedStressPlans('EX13'),TypeError);
});

test('v2.64 only three -yor fixtures move the illustrative stress to the middle syllable',()=>{
 const report=auditFixedStressPlans(),old=auditFixedTurkishExceptions();
 assert.equal(report.caseCount,18);assert.equal(report.stressVariantCount,3);
 assert.equal(report.unresolvedSoftGCount,6);assert.equal(report.unresolvedClusterCount,3);
 assert.deepEqual(report.cases.map(x=>x.id),old.cases.map(x=>x.id));
 for(const c of report.cases){
  if(['EX13','EX14','EX15'].includes(c.id)){
   assert.deepEqual(c.previousStressIndices,[2]);assert.deepEqual(c.candidateStressIndices,[1]);
   assert.ok(c.changedSegments>=3);assert.equal(c.expertReviewStillRequired,true);
  } else {assert.equal(c.changedSegments,0);assert.equal(c.status==='illustrative_stress_candidate',false);}
 }
 assert.equal(report.validatedPhonetics,false);assert.equal(report.intelligibilityScore,null);
});

test('v2.64 planned changes do not mutate old plans or alter segment letters/order',()=>{
 for(const id of ['EX13','EX14','EX15']){
  const r=planFixedStressException(id),old=r.baseline.items,newItems=r.candidate.items;
  const snap=JSON.stringify(r.baseline);
  assert.equal(newItems.map(x=>x.letter).join(''),old.map(x=>x.letter).join(''));
  assert.deepEqual(newItems.map(x=>x.kind),old.map(x=>x.kind));
  assert.deepEqual(newItems.map(x=>x.syllable),old.map(x=>x.syllable));
  assert.deepEqual(newItems.filter(x=>x.stressed).map(x=>x.syllable).filter((x,i,a)=>a.indexOf(x)===i),[1]);
  assert.ok(r.candidate.durationSeconds>0&&r.candidate.durationSeconds<16);
  assert.equal(JSON.stringify(r.baseline),snap);
 }
});

test('v2.64 old sample render remains byte-for-byte compatible with v2.46 for fixed words',()=>{
 const dict={EX13:'geliyor',EX14:'bakıyor',EX15:'kalıyor'};
 for(const [id,text] of Object.entries(dict)){
  const source=synthesizeTurkishProsodyPreview(text).wav;
  const actual=synthesizeFixedStressExceptionArm(id,'baseline').wav;
  assert.equal(digest(source),digest(actual));
  const candidate=synthesizeFixedStressExceptionArm(id,'candidate');
  assert.notEqual(digest(source),digest(candidate.wav));
  assert.equal(candidate.wav[0],82);assert.equal(candidate.wav[1],73);
 }
});

test('v2.64 report returns no raw fixture words, student identifiers, or scores',()=>{
 const report=JSON.stringify(auditFixedStressPlans());
 for(const word of ['geliyor','bakıyor','kalıyor','öğrenci','ağaç','tren'])
  assert.equal(report.includes(word),false);
 assert.equal(report.includes('productionReady":false'),true);
});

test('v2.64 audited CLI stays read-only, deterministic and rejects every arg',()=>{
 const go=(...args)=>spawnSync(process.execPath,['tools/dou-speech-exception-plan-audit.mjs',...args],{encoding:'utf8'});
 const a=go(),b=go(),bad=go('any');
 assert.equal(a.status,0);assert.equal(b.status,0);assert.equal(a.stdout,b.stdout);
 const obj=JSON.parse(a.stdout),sha=obj.reportSha256;delete obj.reportSha256;
 assert.equal(sha,digest(Buffer.from(JSON.stringify(obj))));
 assert.notEqual(bad.status,0);
});

test('v2.64 allowlist includes experiment but never its source tests',()=>{
 const server=readFileSync('server.mjs','utf8'),html=readFileSync('dou-reader-demo.html','utf8'),js=readFileSync('dou-reader-demo.mjs','utf8');
 assert.ok(server.includes("'/dou-speech-exception-plan.mjs'"));
 assert.ok(!server.includes("'/dou-speech-exception-plan.test.mjs'"));
 assert.match(html,/id="lab-plan-open"[^>]+aria-controls="lab-plan-results"/);
 assert.match(html,/id="lab-plan-choice"/);
 assert.match(html,/id="lab-plan-play-new"/);
 assert.match(js,/auditFixedStressPlans\(\)/);
 assert.match(js,/synthesizeFixedStressExceptionArm/);
});
