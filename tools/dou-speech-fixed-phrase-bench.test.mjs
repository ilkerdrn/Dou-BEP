import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {FIXED_LAB_CASES,studyFixedLabCase,studyAllFixedLabCases} from './dou-speech-fixed-phrase-bench.mjs';

test('fixed acoustic corpus produces bounded distinct deterministic WAV measurements',()=>{
 const records=studyAllFixedLabCases();
 assert.equal(records.length,5);
 assert.equal(new Set(records.map(x=>x.sha256)).size,records.length);
 for(const x of records){
  assert.deepEqual(x,studyFixedLabCase(x.id));
  assert.equal(x.sampleRate,22050);
  assert.equal(x.clippedSamples,0);
  assert.ok(x.rms>0&&x.peak>0&&x.durationSeconds>0&&x.durationSeconds<=16);
  assert.equal(x.objectiveOnly,true);
  assert.equal(x.validatedIntelligibility,false);
  assert.equal(x.syntheticOnly,true);
  assert.equal(x.productionApproved,false);
  assert.match(x.sha256,/^[0-9a-f]{64}$/);
 }
 assert.equal(FIXED_LAB_CASES.length,records.length);
});
test('arbitrary text and unknown IDs cannot enter the synthetic bench',()=>{
 for(const id of ['student name','exam-question','',null,{},'../secret']){
  assert.throws(()=>studyFixedLabCase(id),RangeError);
 }
});
test('CLI emits machine-readable objective metrics and rejects arguments',()=>{
 const args=['tools/dou-speech-fixed-phrase-report.mjs'];
 const first=spawnSync(process.execPath,args,{encoding:'utf8',timeout:20000});
 assert.equal(first.status,0,first.stderr);
 const report=JSON.parse(first.stdout);
 assert.equal(report.caseCount,5);
 assert.equal(report.approvedForExamReading,false);
 assert.equal(report.validatedIntelligibility,false);
 assert.equal(report.cases.length,5);
 const rejected=spawnSync(process.execPath,[...args,'secret'],{encoding:'utf8',timeout:20000});
 assert.equal(rejected.status,2);
 assert.equal(rejected.stdout,'');
});
