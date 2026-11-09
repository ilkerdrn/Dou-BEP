import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const command=fileURLToPath(new URL('../tools/dou-speech-readiness-audit.mjs',import.meta.url));

test('speech readiness audit reports the actual failed human listening outcome',()=>{
 const r=spawnSync(process.execPath,[command],{encoding:'utf8',timeout:5000,maxBuffer:65536});
 assert.equal(r.status,0,r.stderr);
 const report=JSON.parse(r.stdout);
 assert.equal(report.humanListeningOutcome,'both-arms-unintelligible');
 assert.equal(report.productionReaderEnabled,false);
 assert.equal(report.evaluation.allowed,false);
 assert.equal(report.evaluation.productionApproved,false);
 assert.equal(report.evaluation.reason,'both-arms-unintelligible');
});
test('speech readiness audit refuses arbitrary arguments, personal text and overrides',()=>{
 for(const args of [['--approve'],['--text','student'],['--enable','production']]){
  const r=spawnSync(process.execPath,[command,...args],{encoding:'utf8',timeout:5000,maxBuffer:65536});
  assert.equal(r.status,2);
  assert.equal(r.stdout,'');
 }
});
