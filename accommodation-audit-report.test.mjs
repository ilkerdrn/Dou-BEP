import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeRehearsal,rehearsalMinutes,rehearsalDate} from './accommodation-audit-report.mjs';
const sample=()=>({mode:'simulation_only',studentEntitlement:false,
 item:{status:'closed',closure:{closedBy:'synthetic-member',closedAt:1000},
 summary:{integrity:'verified',mode:'simulation_only',studentEntitlement:false,
  startedAt:1000,closedAt:1200,totalDurationMinutes:85,pauseCount:2,completedPauseMs:330000,
  openPauseAtClosure:false,remainingMs:120000,reason:'operator_stopped',reviewRequired:false}},
 events:[{event:'started',actorId:'synthetic-member',createdAt:1000},
  {event:'closed:operator_stopped',actorId:'synthetic-member',createdAt:1200}]});
test('validated closure summary has labeled data and no derived entitlement',()=>{
 const result=summarizeRehearsal(sample());
 assert.equal(result.status,'verified');
 assert.equal(result.metrics.totalDuration,'85 dakika');
 assert.equal(result.metrics.pauseCount,2);
 assert.equal(result.metrics.reason,'Yetkili kararı');
 assert.equal(result.metrics.openPause,'Hayır');
 assert.equal(result.events.length,2);
 assert.equal(result.closedBy,'synthetic-member');
});
test('altered or unsafe summary hides every duration metric',()=>{
 for(const summary of [{integrity:'failed'},{integrity:'verified',mode:'simulation_only',studentEntitlement:true},
  {integrity:'verified',mode:'wrong',studentEntitlement:false}]){
  const data=sample();data.item.summary=summary;
  const result=summarizeRehearsal(data);
  assert.equal(result.status,'integrity_failed');
  assert.equal(result.metrics,null);
  assert.match(result.warning,/bütünlüğü/);
 }
});
test('old closure without summary is clearly identified',()=>{
 const data=sample();data.item.summary=null;
 const result=summarizeRehearsal(data);
 assert.equal(result.status,'legacy_summary_missing');
 assert.equal(result.metrics,null);
});
test('open rehearsal has no frozen closure metrics',()=>{
 const data=sample();data.item.status='running';
 const result=summarizeRehearsal(data);
 assert.equal(result.status,'not_closed');
 assert.equal(result.metrics,null);
});
test('invalid report envelope and invalid times are safely handled',()=>{
 assert.throws(()=>summarizeRehearsal({mode:'simulation_only',studentEntitlement:true,item:{},events:[]}));
 assert.equal(rehearsalMinutes(null),'Doğrulanamadı');
 assert.equal(rehearsalDate(-2),'Belirtilmedi');
});
