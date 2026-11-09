import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
import {openStore} from './institutional-store.mjs';
import {createApiHandler} from './institutional-api.mjs';
import {normalizeDecision} from './accommodation-decisions.mjs';
import {createDemo} from '../core.mjs';
const password='Strong-Local-Anon-Password-2026!';
const sample={term:'2026-GUZ',courseCode:'BLP103',examLabel:'VIZE',candidateCode:'KOD-001',adjustments:['LARGE_PRINT','HIGH_CONTRAST'],extraMinutes:15};
function make(){const dir=mkdtempSync(join(tmpdir(),'bep-decisions-')),s=openStore(join(dir,'db.sqlite'));
 s.createTenantAdmin({tenantId:'a-school',tenantName:'Anonim A',email:'admin@a.test',password});s.createTenantAdmin({tenantId:'b-school',tenantName:'Anonim B',email:'admin@b.test',password});
 const adminA=s.requireActor(s.signIn({tenantId:'a-school',email:'admin@a.test',password}).token),adminB=s.requireActor(s.signIn({tenantId:'b-school',email:'admin@b.test',password}).token);
 s.addMember(adminA,{email:'reviewer@a.test',role:'reviewer',password});s.addMember(adminA,{email:'coordinator@a.test',role:'coordinator',password});s.addMember(adminA,{email:'teacher@a.test',role:'teacher',password});
 const reviewer=s.requireActor(s.signIn({tenantId:'a-school',email:'reviewer@a.test',password}).token),coordinator=s.requireActor(s.signIn({tenantId:'a-school',email:'coordinator@a.test',password}).token),teacher=s.requireActor(s.signIn({tenantId:'a-school',email:'teacher@a.test',password}).token);
 return {s,adminA,adminB,reviewer,coordinator,teacher,dispose(){s.db.close();rmSync(dir,{recursive:true,force:true});}};
}
test('strict normalization rejects real identifiers, unsupported keys and unsafe values',()=>{
 assert.deepEqual(normalizeDecision(sample).adjustments,['HIGH_CONTRAST','LARGE_PRINT']);
 for(const changed of [
  {...sample,studentName:'Ali'}, {...sample,diagnosis:'blind'}, {...sample,candidateCode:'123456789'},
  {...sample,candidateCode:'ABC-999'}, {...sample,extraMinutes:121}, {...sample,adjustments:['LARGE_PRINT','LARGE_PRINT']},
  {...sample,adjustments:['constructor']}, {...sample,adjustments:[],extraMinutes:0},
  {...sample,term:'2026-02-01'}, {...sample,courseCode:'../SECRET'},
 ])assert.throws(()=>normalizeDecision(changed));
});
test('creator cannot approve; reviewer approves; revisioned edits invalidate and audit persists',()=>{
 const f=make();try{const {s,adminA:a,reviewer:r,coordinator:c}=f;
  const d=s.accommodationCreate(a,sample);assert.equal(d.revision,1);assert.equal(d.status,'draft');
  assert.throws(()=>s.accommodationApprove(a,d.id,1),{code:'separation_of_duties'});
  assert.throws(()=>s.accommodationApprove(r,d.id,2),{code:'revision_conflict'});
  assert.equal(s.accommodationVerifyBatch(a,[sample]).ok,false);
  const approved=s.accommodationApprove(r,d.id,1);assert.equal(approved.status,'approved');assert.equal(approved.approvedSha256,approved.contentSha256);
  assert.equal(s.accommodationVerifyBatch(a,[sample]).ok,true);
  assert.equal(s.accommodationVerifyBatch(a,[{...sample,extraMinutes:20}]).results[0].reason,'mismatch');
  assert.throws(()=>s.accommodationUpdate(c,d.id,{...sample,revision:50}),{code:'revision_conflict'});
  const edit=s.accommodationUpdate(c,d.id,{...sample,extraMinutes:20,revision:1});assert.equal(edit.status,'draft');assert.equal(edit.revision,2);assert.equal(edit.approvedSha256,null);
  assert.equal(s.accommodationVerifyBatch(a,[{...sample,extraMinutes:20}]).ok,false);
  assert.throws(()=>s.accommodationApprove(c,d.id,2),{code:'separation_of_duties'});
  assert.equal(s.accommodationApprove(r,d.id,2).status,'approved');
 }finally{f.dispose();}
});
test('approval, revocation and history require exact roles and remain tenant-isolated',()=>{
 const f=make();try{const {s,adminA:a,adminB:b,reviewer:r,coordinator:c,teacher:t}=f;
  const d=s.accommodationCreate(c,sample);
  assert.equal(s.accommodationList(b).length,0);
  assert.throws(()=>s.accommodationUpdate(b,d.id,{...sample,revision:1}),{code:'missing'});
  assert.throws(()=>s.accommodationApprove(b,d.id,1),{code:'missing'});
  assert.throws(()=>s.accommodationList(t),{code:'forbidden'});
  assert.throws(()=>s.accommodationCreate(r,sample),{code:'forbidden'});
  assert.throws(()=>s.accommodationApprove(t,d.id,1),{code:'forbidden'});
  assert.equal(s.accommodationApprove(r,d.id,1).status,'approved');
  assert.equal(s.accommodationRevoke(r,d.id,1).status,'revoked');
  assert.equal(s.accommodationVerifyBatch(t,[sample]).ok,false);
  assert.deepEqual(s.accommodationHistory(a,d.id).map(x=>x.event),['created','approved','revoked']);
  assert.throws(()=>s.accommodationCreate(c,sample),{code:'duplicate'});
 }finally{f.dispose();}
});
test('batch rejects empty, oversize and duplicate inputs without accepting client approval status',()=>{
 const f=make();try{const {s,adminA:a}=f;
  for(const rows of [[],Array(101).fill(sample),[sample,sample]])assert.throws(()=>s.accommodationVerifyBatch(a,rows));
  assert.throws(()=>s.accommodationVerifyBatch(a,[{...sample,approved:true}]));
  assert.equal(s.accommodationVerifyBatch(a,[sample]).results[0].reason,'not_registered');
 }finally{f.dispose();}
});
test('HTTP decision endpoints require auth, origin and CSRF and preserve dual-control',async()=>{
 const f=make();let port;
 const server=http.createServer((req,res)=>createApiHandler(f.s,{port})(req,res,new URL(req.url,'http://localhost').pathname));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));port=server.address().port;
 async function request(path,method='GET',body,headers={}){const r=await fetch(`http://127.0.0.1:${port}/api${path}`,{method,headers:{Host:`127.0.0.1:${port}`,...headers},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')};}
 try{
  assert.equal((await request('/accommodations')).status,401);
  const login=await request('/login','POST',{tenantId:'a-school',email:'admin@a.test',password});assert.equal(login.status,200);
  const cookie=login.cookie.split(';')[0],csrf=login.body.csrf;
  assert.equal((await request('/accommodations','POST',sample,{Cookie:cookie})).status,403);
  assert.equal((await request('/accommodations','POST',sample,{Cookie:cookie,'X-CSRF-Token':csrf,Origin:'https://evil.test'})).status,403);
  const created=await request('/accommodations','POST',sample,{Cookie:cookie,'X-CSRF-Token':csrf});assert.equal(created.status,201);
  assert.equal((await request('/accommodations/'+created.body.item.id+'/approve','POST',{revision:1},{Cookie:cookie,'X-CSRF-Token':csrf})).status,403);
  const other=await request('/login','POST',{tenantId:'a-school',email:'reviewer@a.test',password});const reviewerCookie=other.cookie.split(';')[0];
  const approved=await request('/accommodations/'+created.body.item.id+'/approve','POST',{revision:1},{Cookie:reviewerCookie,'X-CSRF-Token':other.body.csrf});assert.equal(approved.status,200);
  const verified=await request('/accommodations/verify-batch','POST',{rows:[sample]},{Cookie:cookie,'X-CSRF-Token':csrf});assert.equal(verified.status,200);assert.equal(verified.body.ok,true);
  const wrong=await request('/accommodations/verify-batch','POST',{rows:[{...sample,extraMinutes:20}]},{Cookie:cookie,'X-CSRF-Token':csrf});assert.equal(wrong.body.ok,false);
 }finally{await new Promise(resolve=>server.close(resolve));f.dispose();}
});

test('approved anonymous decision derives a read-only duration preview only from one approved coordinated sitting',()=>{
 const f=make();try{
  const {s,adminA:a,reviewer:r}=f;
  const row=s.accommodationCreate(a,sample);
  assert.equal(s.accommodationDurationPreview(a,row.id).reason,'decision_not_approved');
  s.accommodationApprove(r,row.id,row.revision);
  assert.equal(s.accommodationDurationPreview(a,row.id).reason,'session_missing');
  const source=createDemo();source.profile='';
  source.questions=source.questions.filter(q=>q.type!=='short').map(q=>({...q,teacherNote:''}));
  const exam=s.createExam(a,{exam:source});
  s.approveExam(a,exam.id,{revision:1,confirmed:true});
  const plan={term:'2026-GUZ',department:'TEKNOLOJI',program:'BILGISAYAR',
   courseCode:'BLP103',courseName:'İşletim Sistemleri',examLabel:'VIZE',
   startsAt:'2026-11-15T09:30',durationMinutes:70,instructorCode:'HOC01',
   roomCode:'LAB01',examId:exam.id,examRevision:1};
  s.coordinationCreate(a,plan);
  const result=s.accommodationDurationPreview(r,row.id);
  assert.equal(result.ready,true);
  assert.deepEqual([result.baseMinutes,result.extraMinutes,result.totalMinutes],[70,15,85]);
  assert.equal(result.candidateCode,undefined);
  assert.equal(result.message.includes('otomatik'),true);
  const second=s.coordinationCreate(a,{...plan,startsAt:'2026-11-15T13:30',roomCode:'LAB02',instructorCode:'HOC02'});
  assert.ok(second.id);
  assert.equal(s.accommodationDurationPreview(a,row.id).reason,'ambiguous_session');
  const choices=s.accommodationDurationPreview(a,row.id).choices;
  assert.equal(choices.length,2);
  assert.equal(choices.some(x=>x.id===second.id),true);
  const explicit=s.accommodationDurationPreview(a,row.id,second.id);
  assert.equal(explicit.ready,true);
  assert.equal(explicit.totalMinutes,85);
  assert.equal(explicit.coordinationId,second.id);
  assert.equal(s.accommodationDurationPreview(a,row.id,'00000000-0000-0000-0000-000000000000').reason,'session_mismatch');
  assert.throws(()=>s.accommodationDurationPreview(a,row.id,'../other'),{code:'bad_id'});
  assert.throws(()=>s.accommodationDurationPreview(f.adminB,row.id),{code:'missing'});
  s.accommodationRevoke(r,row.id,row.revision);
  assert.equal(s.accommodationDurationPreview(a,row.id).reason,'decision_not_approved');
 }finally{f.dispose();}
});

test('duration plan snapshots stay isolated, cannot grant student time, and turn stale after revocation',()=>{
 const f=make();try{
  const {s,adminA:a,reviewer:r}=f;
  const decision=s.accommodationCreate(a,sample);
  assert.throws(()=>s.accommodationTimePlanCreate(a,decision.id,'00000000-0000-0000-0000-000000000000'),{code:'not_ready'});
  s.accommodationApprove(r,decision.id,decision.revision);
  const source=createDemo();source.profile='';
  source.questions=source.questions.filter(q=>q.type!=='short').map(q=>({...q,teacherNote:''}));
  const exam=s.createExam(a,{exam:source});
  s.approveExam(a,exam.id,{revision:1,confirmed:true});
  const plan={term:'2026-GUZ',department:'TEKNOLOJI',program:'BILGISAYAR',courseCode:'BLP103',
   courseName:'İşletim Sistemleri',examLabel:'VIZE',startsAt:'2026-11-15T09:30',
   durationMinutes:70,instructorCode:'HOC01',roomCode:'LAB01',examId:exam.id,examRevision:1};
  const sitting=s.coordinationCreate(a,plan);
  assert.throws(()=>s.accommodationTimePlanCreate(f.teacher,decision.id,sitting.id),{code:'forbidden'});
  const created=s.accommodationTimePlanCreate(a,decision.id,sitting.id);
  assert.equal(created.status,'verified');
  assert.equal(created.totalMinutes,85);
  assert.equal(created.candidateCode,undefined);
  assert.equal(created.entitlement,undefined);
  assert.equal(s.accommodationTimePlanList(f.adminB).length,0);
  assert.equal(s.accommodationTimePlanList(a).length,1);
  assert.throws(()=>s.accommodationTimePlanCreate(a,decision.id,sitting.id),{code:'duplicate'});
  s.accommodationRevoke(r,decision.id,decision.revision);
  assert.equal(s.accommodationTimePlanList(a)[0].status,'recheck');
  assert.throws(()=>s.accommodationTimePlanCreate(a,decision.id,sitting.id),{code:'not_ready'});
 }finally{f.dispose();}
});

test('separate reviewer approves synthetic time plan; revocation and stale decision cannot grant entitlement',()=>{
 const f=make();try{
  const {s,adminA:a,reviewer:r}=f;
  const decision=s.accommodationCreate(a,sample);
  s.accommodationApprove(r,decision.id,decision.revision);
  const source=createDemo();source.profile='';
  source.questions=source.questions.filter(q=>q.type!=='short').map(q=>({...q,teacherNote:''}));
  const exam=s.createExam(a,{exam:source});
  s.approveExam(a,exam.id,{revision:1,confirmed:true});
  const sitting=s.coordinationCreate(a,{term:'2026-GUZ',department:'TEKNOLOJI',program:'BILGISAYAR',
   courseCode:'BLP103',courseName:'İşletim Sistemleri',examLabel:'VIZE',
   startsAt:'2026-11-15T09:30',durationMinutes:70,instructorCode:'HOC01',
   roomCode:'LAB01',examId:exam.id,examRevision:1});
  const plan=s.accommodationTimePlanCreate(a,decision.id,sitting.id);
  assert.equal(plan.approvalStatus,'pending');
  assert.equal(plan.canApprove,false);
  assert.throws(()=>s.accommodationTimePlanApprove(a,plan.id),{code:'separation_of_duties'});
  assert.throws(()=>s.accommodationTimePlanApprove(f.teacher,plan.id),{code:'forbidden'});
  assert.throws(()=>s.accommodationTimePlanApprove(f.adminB,plan.id),{code:'missing'});
  assert.equal(s.accommodationTimePlanList(r)[0].canApprove,true);
  assert.throws(()=>s.accommodationTimePlanWindowPreview(a,plan.id),{code:'not_ready'});
  const approved=s.accommodationTimePlanApprove(r,plan.id);
  assert.equal(approved.approvalStatus,'approved');
  const window=s.accommodationTimePlanWindowPreview(a,plan.id);
  assert.equal(window.mode,'simulation_only');
  assert.equal(window.window.totalMinutes,85);
  assert.equal(window.window.breaksAllowed,false);
  assert.equal(window.window.pausedMs,0);
  assert.equal(window.window.plannedEnd-window.window.startedAt,85*60000);
  assert.throws(()=>s.accommodationTimePlanWindowPreview(f.adminB,plan.id),{code:'missing'});
  assert.equal(approved.entitlement,undefined);
  assert.throws(()=>s.accommodationTimePlanApprove(r,plan.id),{code:'already_reviewed'});
  assert.deepEqual(s.db.prepare('SELECT event FROM accommodation_time_plan_events WHERE plan_id=? ORDER BY id').all(plan.id).map(x=>x.event),['approved']);
  s.accommodationRevoke(r,decision.id,decision.revision);
  assert.equal(s.accommodationTimePlanList(a)[0].approvalStatus,'stale');
  assert.throws(()=>s.accommodationTimePlanWindowPreview(a,plan.id),{code:'not_ready'});
  assert.equal(s.accommodationTimePlanList(a)[0].status,'recheck');
  assert.equal(s.accommodationTimePlanRevoke(r,plan.id).approvalStatus,'revoked');
  assert.deepEqual(s.db.prepare('SELECT event FROM accommodation_time_plan_events WHERE plan_id=? ORDER BY id').all(plan.id).map(x=>x.event),['approved','revoked']);
  assert.throws(()=>s.accommodationTimePlanApprove(r,plan.id),{code:'not_ready'});
  assert.throws(()=>s.accommodationTimePlanRevoke(r,plan.id),{code:'invalid_status'});
 }finally{f.dispose();}
});

test('authorized local time rehearsal persists pause/resume with audit, no learner access',()=>{
 const f=make();try{
  const {s,adminA:a,reviewer:r}=f;
  const approvedSample={...sample,adjustments:['BREAKS','HIGH_CONTRAST']};
  const decision=s.accommodationCreate(a,approvedSample);
  s.accommodationApprove(r,decision.id,decision.revision);
  const source=createDemo();source.profile='';
  source.questions=source.questions.filter(q=>q.type!=='short').map(q=>({...q,teacherNote:''}));
  const exam=s.createExam(a,{exam:source});
  s.approveExam(a,exam.id,{revision:1,confirmed:true});
  const sitting=s.coordinationCreate(a,{term:'2026-GUZ',department:'TEKNOLOJI',program:'BILGISAYAR',
   courseCode:'BLP103',courseName:'İşletim Sistemleri',examLabel:'VIZE',
   startsAt:'2026-11-15T09:30',durationMinutes:70,instructorCode:'HOC01',
   roomCode:'LAB01',examId:exam.id,examRevision:1});
  const plan=s.accommodationTimePlanCreate(a,decision.id,sitting.id);
  assert.throws(()=>s.accommodationSimulationStart(a,plan.id),{code:'not_ready'});
  s.accommodationTimePlanApprove(r,plan.id);
  assert.throws(()=>s.accommodationSimulationStart(f.teacher,plan.id),{code:'forbidden'});
  const sim=s.accommodationSimulationStart(a,plan.id);
  assert.equal(sim.status,'running');assert.equal(sim.breaksAllowed,true);
  assert.equal(sim.window.totalMinutes,85);assert.equal(sim.entitlement,undefined);
  assert.equal(s.accommodationSimulationList(f.adminB).length,0);
  assert.throws(()=>s.accommodationSimulationStart(a,plan.id),{code:'duplicate'});
  assert.throws(()=>s.accommodationSimulationAction(r,sim.id,'pause',sim.version),{code:'forbidden'});
  const paused=s.accommodationSimulationAction(a,sim.id,'pause',sim.version);
  assert.equal(paused.status,'paused');
  assert.throws(()=>s.accommodationSimulationAction(a,sim.id,'pause',sim.version),{code:'revision_conflict'});
  assert.throws(()=>s.accommodationSimulationAction(a,sim.id,'pause',paused.version),{code:'invalid_break'});
  const resumed=s.accommodationSimulationAction(a,sim.id,'resume',paused.version);
  assert.equal(resumed.status,'running');assert.equal(resumed.version,3);
  assert.throws(()=>s.accommodationSimulationAction(a,sim.id,'resume',resumed.version),{code:'invalid_break'});
  assert.deepEqual(s.db.prepare('SELECT event FROM accommodation_time_simulation_events WHERE simulation_id=? ORDER BY id').all(sim.id).map(x=>x.event),['started','paused','resumed']);
  // Inject only an isolated synthetic overdue pause; validate read/action fail-closed.
  const saved=s.db.prepare('SELECT started_at,pauses_json FROM accommodation_time_simulations WHERE id=?').get(sim.id);
  const now=Date.now(),overdue=now-31*60000;
  s.db.prepare('UPDATE accommodation_time_simulations SET started_at=?,pauses_json=? WHERE id=?')
   .run(now-40*60000,JSON.stringify([{startedAt:overdue,endedAt:null}]),sim.id);
  const limited=s.accommodationSimulationList(a)[0];
  assert.equal(limited.status,'break_limit_review');
  assert.equal(limited.limitReason,'single_break_over_limit');
  assert.equal(limited.window,undefined);
  assert.throws(()=>s.accommodationSimulationAction(a,sim.id,'resume',resumed.version),{code:'not_ready'});
  s.db.prepare('UPDATE accommodation_time_simulations SET started_at=?,pauses_json=? WHERE id=?').run(saved.started_at,saved.pauses_json,sim.id);
  s.accommodationRevoke(r,decision.id,decision.revision);
  assert.equal(s.accommodationSimulationList(a)[0].status,'review_required');
  assert.throws(()=>s.accommodationSimulationAction(a,sim.id,'pause',resumed.version),{code:'not_ready'});
  assert.throws(()=>s.accommodationSimulationClose(f.teacher,sim.id,resumed.version),{code:'forbidden'});
  assert.throws(()=>s.accommodationSimulationClose(f.adminB,sim.id,resumed.version),{code:'missing'});
  assert.throws(()=>s.accommodationSimulationClose(a,sim.id,resumed.version-1),{code:'revision_conflict'});
  const closed=s.accommodationSimulationClose(a,sim.id,resumed.version);
  assert.equal(closed.status,'closed');
  assert.equal(closed.closure.reason,'plan_invalid');
  assert.equal(closed.closure.finalVersion,resumed.version+1);
  const report=s.accommodationSimulationReport(r,sim.id);
  assert.equal(report.mode,'simulation_only');
  assert.equal(report.studentEntitlement,false);
  assert.equal(report.item.status,'closed');
  assert.equal(report.item.summary.integrity,'verified');
  assert.equal(report.item.summary.reason,'plan_invalid');
  assert.equal(report.item.summary.reviewRequired,true);
  assert.equal(report.item.summary.mode,'simulation_only');
  assert.equal(report.item.summary.studentEntitlement,false);
  assert.equal(report.item.summary.pauseCount,1);
  const persisted=s.db.prepare('SELECT summary_json,summary_sha256 FROM accommodation_time_simulation_summaries WHERE simulation_id=?').get(sim.id);
  assert.equal(persisted.summary_sha256.length,64);
  const frozen=report.item.summary;
  assert.deepEqual(s.accommodationSimulationReport(r,sim.id).item.summary,frozen);
  s.db.prepare('UPDATE accommodation_time_simulation_summaries SET summary_json=? WHERE simulation_id=?')
   .run(persisted.summary_json.replace('"studentEntitlement":false','"studentEntitlement":true'),sim.id);
  assert.equal(s.accommodationSimulationReport(r,sim.id).item.summary.integrity,'failed');
  s.db.prepare('UPDATE accommodation_time_simulation_summaries SET summary_json=? WHERE simulation_id=?')
   .run(persisted.summary_json,sim.id);
  assert.equal(s.accommodationSimulationReport(r,sim.id).item.summary.integrity,'verified');
  assert.deepEqual(report.events.map(x=>x.event),['started','paused','resumed','closed:plan_invalid']);
  assert.throws(()=>s.accommodationSimulationReport(f.adminB,sim.id),{code:'missing'});
  assert.throws(()=>s.accommodationSimulationClose(a,sim.id,closed.version),{code:'closed'});
  assert.throws(()=>s.accommodationSimulationAction(a,sim.id,'pause',closed.version),{code:'closed'});
 }finally{f.dispose();}
});
