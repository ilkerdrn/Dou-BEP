import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateBepRelease,LIVE_RELEASE_CONTROLS} from './live-release-readiness.mjs';

test('approved and verified synthetic plan never authorizes a real learner clock',()=>{
 const report=evaluateBepRelease({planStatus:'verified',approvalStatus:'approved',coordinationVerified:true});
 assert.equal(report.scope,'simulation_only');
 assert.equal(report.liveApplicationEnabled,false);
 assert.equal(report.reviewReady,true);
 assert.equal(report.blockers.length,6);
 assert.equal(report.missingCount,6);
});
test('unapproved, stale or incorrectly mapped plan is blocked independently of identity readiness',()=>{
 const report=evaluateBepRelease({planStatus:'recheck',approvalStatus:'stale',coordinationVerified:false});
 assert.equal(report.liveApplicationEnabled,false);
 assert.equal(report.reviewReady,false);
 for(const id of ['plan_not_verified','independent_review_missing','exam_binding_missing'])
  assert.ok(report.blockers.some(x=>x.id===id));
});
test('all prerequisites are enumerated, including SSO MFA and signed entitlement',()=>{
 assert.equal(new Set(LIVE_RELEASE_CONTROLS.map(x=>x.id)).size,6);
 for(const id of ['institutional_identity','privacy_authorization','candidate_binding',
  'signed_entitlement','session_clock','acceptance_testing'])
  assert.ok(LIVE_RELEASE_CONTROLS.some(x=>x.id===id));
});
test('even claimed ready flags cannot switch on real exam entitlement',()=>{
 const flags=Object.fromEntries(LIVE_RELEASE_CONTROLS.map(x=>[x.id,true]));
 const report=evaluateBepRelease({planStatus:'verified',approvalStatus:'approved',coordinationVerified:true,controls:flags});
 assert.equal(report.liveApplicationEnabled,false);
 assert.equal(report.scope,'simulation_only');
});
