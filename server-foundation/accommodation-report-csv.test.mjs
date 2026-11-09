import test from 'node:test';
import assert from 'node:assert/strict';
import {rehearsalReportCsv} from './accommodation-report-csv.mjs';
const report=()=>({mode:'simulation_only',studentEntitlement:false,
 item:{status:'closed',summary:{integrity:'verified',mode:'simulation_only',
  studentEntitlement:false,closedAt:1000,totalDurationMinutes:85,pauseCount:2,
  completedPauseMs:330000,reason:'operator_stopped'}},
 events:[{event:'started',actorId:'private-staff-id',createdAt:100},
         {event:'closed:operator_stopped',actorId:'private-staff-id',createdAt:1000}]});
test('CSV exports only safe synthetic status and frozen summary, not actor identifiers',()=>{
 const out=rehearsalReportCsv(report());
 assert.equal(out.startsWith('\uFEFF'),true);
 assert.match(out,/85/);assert.match(out,/330000/);
 assert.match(out,/operator_stopped/);
 assert.doesNotMatch(out,/private-staff-id/);
 assert.doesNotMatch(out,/candidateCode|decisionId|planId|tenantId/);
 assert.equal(out.trim().split('\r\n').length,4);
});
test('tampered or missing summaries never leak unverified duration',()=>{
 for(const summary of [null,{integrity:'failed',totalDurationMinutes:9999},
   {integrity:'verified',mode:'simulation_only',studentEntitlement:true,totalDurationMinutes:9999}]){
  const input=report();input.item.summary=summary;
  const out=rehearsalReportCsv(input);
  assert.doesNotMatch(out,/9999/);
  assert.match(out,summary===null?/missing/:/failed/);
 }
});
test('unexpected event text is not directly exported into spreadsheet formulas',()=>{
 const input=report();input.events=[{event:'=HYPERLINK("evil")',actorId:'name',createdAt:200}];
 const out=rehearsalReportCsv(input);
 assert.doesNotMatch(out,/HYPERLINK/);
 assert.match(out,/unknown/);
});
test('CSV rejects non-simulation or entitled envelopes',()=>{
 const x=report();x.studentEntitlement=true;
 assert.throws(()=>rehearsalReportCsv(x));
});
