import test from 'node:test';
import assert from 'node:assert/strict';
import {PILOT_CHECKS,buildPilotEvidence,parsePilotEvidenceJson} from './accessibility-evidence.mjs';
const record=()=>buildPilotEvidence({version:'2.81.0',screenReader:'nvda',platform:'windows',browser:'chrome',items:PILOT_CHECKS.map((x,i)=>({id:x.id,outcome:i===0?'pass':i===1?'fail':'not-tested',note:i===0?'Odak sırası uygun.':''}))});
const changed=(fn)=>{const r=record();fn(r);return JSON.stringify(r);};
test('accepts complete anonymized v2.81 report without modifying data',()=>{
 const r=record();assert.deepEqual(parsePilotEvidenceJson(JSON.stringify(r)),r);
});
test('rejects missing, reordered, duplicated and unknown controls',()=>{
 for(const manipulate of [r=>r.results.pop(),r=>r.results.reverse(),r=>r.results[1]=r.results[0],r=>r.results[0].id='unknown']){
  assert.throws(()=>parsePilotEvidenceJson(changed(manipulate)));
 }
});
test('rejects altered scores, approval status and additional identifying fields',()=>{
 for(const manipulate of [r=>r.summary.passed=99,r=>r.decision='approved',r=>r.owner='Person',r=>r.results[1].studentName='Name']){
  assert.throws(()=>parsePilotEvidenceJson(changed(manipulate)));
 }
});
test('rejects PII or invalid structured enums and invalid file types',()=>{
 assert.throws(()=>parsePilotEvidenceJson(changed(r=>r.results[0].note='test@example.com')));
 assert.throws(()=>parsePilotEvidenceJson(changed(r=>r.platform='unknown')));
 assert.throws(()=>parsePilotEvidenceJson('{bad'));
 assert.throws(()=>parsePilotEvidenceJson('x'.repeat(65537)));
});
test('works for valid all-pass reports without claiming certification',()=>{
 const r=buildPilotEvidence({version:'2.81.0',items:PILOT_CHECKS.map(c=>({id:c.id,outcome:'pass'}))});
 assert.equal(parsePilotEvidenceJson(JSON.stringify(r)).decision,'ready_for_manual_review');
});
