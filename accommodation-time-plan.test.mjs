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

test('independent decision and time-plan approvals are distinct with audit and live staleness',()=>{
 assert.match(store,/CREATE TABLE IF NOT EXISTS accommodation_time_plan_approvals/);
 assert.match(store,/CREATE TABLE IF NOT EXISTS accommodation_time_plan_events/);
 assert.match(store,/function planApprove\(actor,id\)/);
 assert.match(store,/permit\(actor,'accommodation\.approve'\)/);
 assert.match(store,/row\.created_by===actor\.id/);
 assert.match(store,/function planRevoke\(actor,id\)/);
 assert.match(store,/approvalStatus=!approval\?'pending':approval\.status==='revoked'\?'revoked':valid\?'approved':'stale'/);
 assert.match(store,/accommodationTimePlanApprove:planApprove/);
 assert.match(store,/accommodationTimePlanRevoke:planRevoke/);
 assert.match(api,/store\.accommodationTimePlanApprove\(actor,planId\)/);
 assert.match(api,/store\.accommodationTimePlanRevoke\(actor,planId\)/);
 assert.match(ui,/item\.canApprove\?'Planı bağımsız onayla':'Plan onayını iptal et'/);
 assert.match(ui,/\/accommodations\/time-plans\/'\+item\.id\+'\/'\+action/);
 assert.doesNotMatch(ui,/\b(?:localStorage|sessionStorage|indexedDB)\b/);
});

test('approved-only hypothetical exam clock cannot issue or modify student pilot',()=>{
 assert.match(store,/function planWindowPreview\(actor,id\)/);
 assert.match(store,/state\.approvalStatus!=='approved'\|\|state\.status!=='verified'/);
 assert.match(store,/mode:'simulation_only'/);
 assert.match(store,/breaksAllowed:false,now:startedAt/);
 assert.match(api,/store\.accommodationTimePlanWindowPreview\(actor,timeWindowPath\[1\]\)/);
 assert.match(ui,/\/window-preview'/);
 assert.doesNotMatch(store,/UPDATE pilot_sessions SET expires_at/);
});

test('simulation routes and controls stay isolated from pilot and require explicit authorization',()=>{
 assert.match(store,/CREATE TABLE IF NOT EXISTS accommodation_time_simulations/);
 assert.match(store,/CREATE TABLE IF NOT EXISTS accommodation_time_simulation_events/);
 assert.match(store,/function simulationStart\(actor,planId\)/);
 assert.match(store,/planView\(actor,plan\)\.approvalStatus!=='approved'/);
 assert.match(store,/rowData\(decision\)\.adjustments\.includes\('BREAKS'\)/);
 assert.match(store,/function simulationAction\(actor,id,action,version\)/);
 assert.match(store,/row\.version!==version/);
 assert.match(store,/beginExamBreak\(input,now\):endExamBreak\(input,now\)/);
 assert.match(store,/function simulationList\(actor\)/);
 assert.match(api,/path==='\/api\/accommodations\/simulations'&&req\.method==='POST'/);
 assert.match(api,/path==='\/api\/accommodations\/simulations'&&req\.method==='GET'/);
 assert.match(api,/store\.accommodationSimulationAction\(actor,simulationAction\[1\],simulationAction\[2\],body\.version\)/);
 assert.match(ui,/Yerel süre simülasyonu başlat/);
 assert.match(ui,/Simülasyonda mola başlat/);
 assert.match(ui,/Simülasyonda molayı bitir/);
 assert.doesNotMatch(ui,/\b(?:localStorage|sessionStorage|indexedDB)\b/);
 assert.doesNotMatch(store,/UPDATE pilot_sessions SET expires_at/);
});

test('break-limit review fails closed and never extends student pilot time',()=>{
 assert.match(store,/inspectExamBreakLimits\(/);
 assert.match(store,/status:'break_limit_review'/);
 assert.match(store,/current\.status==='review_required'\|\|current\.status==='break_limit_review'/);
 assert.match(ui,/Mola limiti aşıldı — yetkili incelemesi gerekli/);
 assert.doesNotMatch(store,/UPDATE pilot_sessions SET expires_at/);
});

test('simulation closure is immutable, tenant-scoped and leaves pilot entitlement untouched',()=>{
 assert.match(store,/CREATE TABLE IF NOT EXISTS accommodation_time_simulation_closures/);
 assert.match(store,/function simulationClose\(actor,id,version\)/);
 assert.match(store,/permit\(actor,'accommodation\.manage'\)/);
 assert.match(store,/if\(simulationClosure\(actor,id\)\)error\('closed'/);
 assert.match(store,/WHERE tenant_id=\? AND id=\? AND version=\?/);
 assert.match(store,/function simulationReport\(actor,id\)/);
 assert.match(store,/studentEntitlement:false/);
 assert.match(api,/store\.accommodationSimulationClose\(actor,simulationClosure\[1\],body\.version\)/);
 assert.match(api,/store\.accommodationSimulationReport\(actor,simulationReport\[1\]\)/);
 assert.match(ui,/Simülasyonu denetimli kapat/);
 assert.match(ui,/Denetim raporunu göster/);
 assert.doesNotMatch(store,/UPDATE pilot_sessions SET expires_at/);
});

test('closure snapshot freezes break totals and detects tampering with no pilot entitlement',()=>{
 assert.match(store,/CREATE TABLE IF NOT EXISTS accommodation_time_simulation_summaries/);
 assert.match(store,/function buildClosingSummary\(row,at,reason\)/);
 assert.match(store,/function simulationSummary\(actor,id\)/);
 assert.match(store,/digestString\(row\.summary_json\)===row\.summary_sha256/);
 assert.match(store,/JSON\.stringify\(buildClosingSummary\(row,at,reason\)\)/);
 assert.match(store,/status:'closed',closure,summary:simulationSummary\(actor,row\.id\)/);
 assert.match(ui,/summarizeRehearsal\(report\)/);
 assert.match(ui,/setAttribute\('aria-label','Simülasyon kapanış denetimi'\)/);
 assert.match(ui,/display\.metrics\.pauseCount/);
 assert.doesNotMatch(store,/UPDATE pilot_sessions SET expires_at/);
});

test('CSV route respects authenticated report access and UI filter stays local',()=>{
 assert.match(api,/rehearsalReportCsv\(report\)/);
 assert.match(api,/store\.accommodationSimulationReport\(actor,simulationCsv\[1\]\)/);
 assert.match(api,/Content-Type':'text\/csv; charset=utf-8'/);
 assert.match(ui,/decision-simulations-filter/);
 assert.match(ui,/rows\.filter\(item=>item\.status===filter\)/);
 assert.match(ui,/Anonim CSV indir/);
 assert.match(ui,/\/report\.csv'/);
 assert.doesNotMatch(ui,/\b(?:localStorage|sessionStorage|indexedDB)\b/);
});

test('real-exam preflight is read-only, tenant-scoped and never enables learner time',()=>{
 assert.match(store,/function planReleaseReadiness\(actor,id\)/);
 assert.match(store,/permit\(actor,'accommodation\.view'\)/);
 assert.match(store,/accommodationTimePlanReleaseReadiness:planReleaseReadiness/);
 assert.match(api,/store\.accommodationTimePlanReleaseReadiness\(actor,releaseReadiness\[1\]\)/);
 assert.match(ui,/Gerçek sınav hazırlık denetimi/);
 assert.match(ui,/Gerçek sınav süresi uygulaması: KAPALI/);
 assert.doesNotMatch(store,/UPDATE pilot_sessions SET expires_at/);
});

test('synthetic-only linkage has independent review and never grants learner time',()=>{
 assert.match(store,/createSyntheticBindingRepository\(/);
 assert.match(store,/accommodationTimePlanReleaseReadiness:planReleaseReadiness/);
 assert.match(api,/store\.syntheticBindingCreate\(actor,body\.planId,body\.coordinationId\)/);
 assert.match(api,/store\.syntheticBindingDecide\(actor,bindingAction\[1\],bindingAction\[2\]\)/);
 assert.match(api,/store\.syntheticBindingHistory\(actor,bindingHistory\[1\]\)/);
 assert.match(ui,/Yapay oturum eşleştirmesi hazırla/);
 assert.match(ui,/Yapay bağlantıyı bağımsız onayla/);
 assert.doesNotMatch(store,/UPDATE pilot_sessions SET expires_at/);
 assert.doesNotMatch(api,/pilotSessions\\.grantEntitlement/);
});

test('synthetic binding pins explicit sitting and revision, and admin loads records on entry',()=>{
 assert.match(store,/createSyntheticBindingRepository\(/);
 assert.match(api,/store\.syntheticBindingCreate\(actor,body\.planId,body\.coordinationId\)/);
 assert.match(ui,/planId:item\.id,coordinationId:item\.coordinationId/);
 assert.match(ui,/item\.startsAt\|\|'Tarih doğrulanamadı'/);
 assert.match(ui,/Promise\.all\(\[refreshTimePlans\(\),refreshSimulations\(\),refreshSyntheticBindings\(\)\]\)/);
 assert.doesNotMatch(api,/pilotSessions\.grantEntitlement/);
});

test('single-use synthetic permits never issue learner entitlement, use server expiry and independent reviewer',()=>{
 assert.match(store,/createSyntheticPermitRepository\(/);
 assert.match(api,/store\.syntheticPermitIssue\(actor,body\.bindingId\)/);
 assert.match(api,/store\.syntheticPermitConsume\(actor,permitAction\[1\],body\.oneTimeSecret\)/);
 assert.match(api,/store\.syntheticPermitRevoke\(actor,permitAction\[1\]\)/);
 assert.match(ui,/5 dakikalık yapay izin üret/);
 assert.match(ui,/Yapay izni tek seferlik doğrula/);
 assert.match(ui,/Bir kez gösterilen yapay izin kodu/);
 assert.match(ui,/refreshSyntheticPermits\(\)/);
 assert.doesNotMatch(api,/pilotSessions\.grantEntitlement/);
 assert.doesNotMatch(store,/UPDATE pilot_sessions SET expires_at/);
});

test('synthetic permit expiration is checked on consume and revoke atomically',()=>{
 assert.match(api,/store\.syntheticPermitRevoke\(actor,permitAction\[1\]\)/);
 assert.match(api,/store\.syntheticPermitConsume\(actor,permitAction\[1\],body\.oneTimeSecret\)/);
 assert.doesNotMatch(api,/pilotSessions\.grantEntitlement/);
 assert.doesNotMatch(store,/UPDATE pilot_sessions SET expires_at/);
});

test('synthetic permit failed-code lock and masked one-time display are explicit',()=>{
 assert.match(api,/store\.syntheticPermitHistory\(actor,permitHistory\[1\]\)/);
 assert.match(ui,/5 hatalı deneme nedeniyle kilitlendi/);
 assert.match(ui,/Başarısız kod denemesi:/);
 assert.match(ui,/Hatalı kod denemesi/);
 assert.match(ui,/output\.type='password'/);
 assert.match(ui,/Kodu kapat/);
 assert.doesNotMatch(store,/UPDATE pilot_sessions SET expires_at/);
});
