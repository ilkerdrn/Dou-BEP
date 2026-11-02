import test from 'node:test';import assert from 'node:assert/strict';
import {buildPilotEvidence,pilotEvidenceCsv,PILOT_CHECKS} from './accessibility-evidence.mjs';
test('all manual checks are incomplete until explicitly tested',()=>{
 const r=buildPilotEvidence();assert.equal(r.results.length,12);assert.equal(r.summary.untested,12);assert.equal(r.decision,'incomplete');
});
test('manual pilot distinguishes failures from incomplete checks; never certifies',()=>{
 const result=buildPilotEvidence({screenReader:'nvda',platform:'windows',browser:'firefox',items:PILOT_CHECKS.map(x=>({id:x.id,outcome:'pass'}))});
 assert.equal(result.decision,'ready_for_manual_review');assert.equal(result.summary.passed,12);
 const issue=buildPilotEvidence({items:[{id:'speech-math',outcome:'fail',note:'Toplama simgesi yanlış telaffuz edildi.'}]});
 assert.equal(issue.decision,'issues_found');assert.equal(issue.summary.failed,1);assert.equal(issue.summary.untested,11);
});
test('CSV quotes user text and escapes potential spreadsheet formula execution',()=>{
 const r=buildPilotEvidence({items:[{id:'keyboard-order',outcome:'fail',note:'-SUM(A1:A2)'},{id:'headings',outcome:'pass',note:'Tırnak " ve açıklama'}]});
 const csv=pilotEvidenceCsv(r);assert.ok(csv.includes("'-SUM(A1:A2)"));assert.ok(csv.includes('"Tırnak "" ve açıklama"'));assert.ok(csv.startsWith('\ufeff'));
});
test('personal learner markers in pilot notes are rejected; structured enum filters',()=>{
 assert.throws(()=>buildPilotEvidence({items:[{id:'focus-visible',note:'öğrenci adı: gizli'}]}),/Lütfen öğrenci/);
 assert.throws(()=>buildPilotEvidence({items:[{id:'focus-visible',note:'test@example.com'}]}),/Lütfen öğrenci/);
 const r=buildPilotEvidence({browser:'evil',screenReader:'foo'});assert.equal(r.browser,'other');assert.equal(r.screenReader,'other');
 assert.throws(()=>buildPilotEvidence({items:[{id:'wrong-item'}]}),/Bilinmeyen/);
});
