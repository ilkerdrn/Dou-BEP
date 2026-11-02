import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {auditFixedTurkishExceptions} from './dou-speech-exception-audit.mjs';
import {synthesizeFixedRehearsalArm,synthesizeFixedJoinStudy} from './dou-speech-corpus.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');

test('v2.63 closed synthetic cases reject all user input',()=>{
 for(const arg of ['öğrenci','EX01','ğ',null,{},'/tmp/file','http://example.test'])
  assert.throws(()=>auditFixedTurkishExceptions(arg),TypeError);
});
test('v2.63 eighteen independently authored orthographic case boundaries match current heuristic',()=>{
 const r=auditFixedTurkishExceptions();
 assert.equal(r.caseCount,18);assert.equal(r.illustrativeSyllableMatches,18);
 assert.equal(r.cases.length,18);
 assert.equal(r.cases.filter(c=>c.issues.includes('illustrative_syllable_mismatch')).length,0);
 assert.deepEqual(r.groupCounts.map(g=>g.count),[6,2,4,3,3]);
});
test('v2.63 flags soft g contexts and initial clusters without claiming phonetic accuracy',()=>{
 const r=auditFixedTurkishExceptions();
 assert.equal(r.softGCaseCount,6);assert.equal(r.initialClusterCaseCount,3);
 for(const c of r.cases.filter(c=>c.softGCount)){
  assert.ok(c.reviewReasons.includes('soft_g_requires_context'));
  assert.equal(c.softGCount,c.softGGlideSegments);
  assert.equal(c.requiresExpertReview,true);
 }
 assert.equal(r.validatedPhonetics,false);assert.equal(r.automatedPronunciationCorrection,false);
});
test('v2.63 exposes three baseline -yor stress mismatches; does not mark others correct',()=>{
 const r=auditFixedTurkishExceptions();
 assert.equal(r.stressComparedCount,3);assert.equal(r.stressReferenceMismatchCount,3);
 for(const c of r.cases){
  if(c.stressCompared){
   assert.equal(c.referenceStressIndex,1);assert.deepEqual(c.plannedStressIndices,[2]);
   assert.equal(c.stressMatchesReference,false);
   assert.ok(c.issues.includes('stress_reference_mismatch'));
  }else{
   assert.equal(c.referenceStressIndex,null);
   assert.equal(c.stressMatchesReference,null);
   assert.deepEqual(c.plannedStressIndices,[]);
  }
 }
});
test('v2.63 deterministic report contains only opaque IDs and no raw words',()=>{
 const first=auditFixedTurkishExceptions(),second=auditFixedTurkishExceptions();
 assert.deepEqual(first,second);
 assert.ok(first.cases.every(c=>/^EX(?:0[1-9]|1[0-8])$/.test(c.id)));
 assert.doesNotMatch(JSON.stringify(first),/ağaç|soğuk|yağmur|geliyor|bakıyor|kalıyor|merhaba|kişisel|öğrenci/i);
 assert.equal(first.intelligibilityScore,null);assert.equal(first.productionReady,false);
});
test('v2.63 preserves immutable pre-existing A/B/C sample WAVs',()=>{
 const before=[hash(synthesizeFixedRehearsalArm('TR01','A').wav),hash(synthesizeFixedRehearsalArm('TR05','B').wav),hash(synthesizeFixedJoinStudy('TR13').wav)];
 auditFixedTurkishExceptions();
 const after=[hash(synthesizeFixedRehearsalArm('TR01','A').wav),hash(synthesizeFixedRehearsalArm('TR05','B').wav),hash(synthesizeFixedJoinStudy('TR13').wav)];
 assert.deepEqual(after,before);
});
test('v2.63 local JSON CLI has stable digest and rejects arguments',()=>{
 const run=(...args)=>spawnSync(process.execPath,['tools/dou-speech-exception-audit.mjs',...args],{cwd:process.cwd(),encoding:'utf8'});
 const a=run(),b=run();assert.equal(a.status,0,a.stderr);assert.equal(a.stdout,b.stdout);
 const {reportSha256,...report}=JSON.parse(a.stdout);
 assert.equal(reportSha256,hash(Buffer.from(JSON.stringify(report))));
 assert.equal(report.caseCount,18);
 assert.notEqual(run('EX01').status,0);
});
test('v2.63 accessible fixed-only UI and explicit server public allowlist',()=>{
 const html=readFileSync(new URL('./dou-reader-demo.html',import.meta.url),'utf8');
 const ui=readFileSync(new URL('./dou-reader-demo.mjs',import.meta.url),'utf8');
 const server=readFileSync(new URL('./server.mjs',import.meta.url),'utf8');
 assert.match(html,/id="lab-exception-open"[^>]+aria-controls="lab-exception-results"/);
 assert.match(html,/id="lab-exception-status"[^>]+role="status"/);
 assert.match(html,/id="lab-exception-body"/);
 assert.match(ui,/auditFixedTurkishExceptions\(\)/);
 assert.match(server,/\/dou-speech-exception-audit\.mjs/);
 assert.doesNotMatch(server,/'\/dou-speech-exception-audit\.test\.mjs'/);
 const section=ui.split('// v2.63: closed-fixture')[1];assert.ok(section);
 for(const denied of ['fetch(','localStorage','XMLHttpRequest','mediaDevices','writeFile','getQuestion(','indexedDB'])
  assert.ok(!section.includes(denied),denied);
});
