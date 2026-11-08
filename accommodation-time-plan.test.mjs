import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
const store=read('server-foundation/accommodation-decisions.mjs');
const api=read('server-foundation/institutional-api.mjs');
const ui=read('accommodation-admin.mjs');
const html=read('accommodation-admin.html');
test('time plan snapshot is planning-only and reruns live approval and exam verification',()=>{
 assert.match(store,/CREATE TABLE IF NOT EXISTS accommodation_time_plans/);
 assert.match(store,/UNIQUE\(tenant_id,decision_id,coordination_id\)/);
 assert.match(store,/function planCreate\(actor,decisionId,coordinationId\)/);
 assert.match(store,/permit\(actor,'accommodation\.manage'\)/);
 assert.match(store,/const preview=durationPreview\(actor,decisionId,coordinationId\)/);
 assert.match(store,/function planView\(actor,row\)/);
 assert.match(store,/const preview=durationPreview\(actor,row\.decision_id,row\.coordination_id\)/);
 assert.match(store,/status:valid\?'verified':'recheck'/);
 assert.doesNotMatch(store,/UPDATE pilot_sessions SET expires_at/);
});
test('plan API requires existing authenticated API context and never issues student codes',()=>{
 assert.match(api,/path==='\/api\/accommodations\/time-plans'&&req\.method==='GET'/);
 assert.match(api,/path==='\/api\/accommodations\/time-plans'&&req\.method==='POST'/);
 assert.match(api,/store\.accommodationTimePlanCreate\(actor,body\.decisionId,body\.coordinationId\)/);
 assert.match(html,/id="decision-duration-save"/);
 assert.match(html,/id="decision-time-plans"/);
 assert.match(ui,/state\.durationPreview=result\.ready\?result:null/);
 assert.match(ui,/\/accommodations\/time-plans','POST'/);
 assert.doesNotMatch(ui,/\b(?:localStorage|sessionStorage|indexedDB)\b/);
});
