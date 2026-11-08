import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
import {openStore} from './institutional-store.mjs';
import {createDemo} from '../core.mjs';
import {createApiHandler} from './institutional-api.mjs';
const password='Sadece-Test-2026-Guv3nli!';
function exam(){const e=createDemo();e.profile='';e.questions=e.questions.filter(q=>q.type!=='short').map(q=>({...q,teacherNote:''}));return e;}
function fixture(){const dir=mkdtempSync(join(tmpdir(),'bep-pilot15-'));const s=openStore(join(dir,'db.sqlite'));for(const t of ['a-okul','b-okul'])s.createTenantAdmin({tenantId:t,tenantName:'Kurum '+t,email:'admin@'+t+'.test',password});const login=t=>s.signIn({tenantId:t,email:'admin@'+t+'.test',password});const la=login('a-okul'),lb=login('b-okul');const a=s.requireActor(la.token),b=s.requireActor(lb.token);const rec=s.createExam(a,{exam:exam()});s.approveExam(a,rec.id,{revision:1,confirmed:true});return {dir,s,a,b,rec,la,lb,close(){s.db.close();rmSync(dir,{recursive:true,force:true});}};}

test('single-use code, no answer keys, one-time submission, teacher view and deletion',()=>{const f=fixture();try{
 const item=f.s.pilotIssue(f.a,f.rec.id);assert.match(item.code,/^[0-9A-F]{5}(?:-[0-9A-F]{5}){3}$/);assert.equal(f.s.pilotList(f.a)[0].code,undefined);
 const raw=f.s.db.prepare('SELECT code_hash,claim_hash FROM pilot_sessions WHERE id=?').get(item.id);assert.notEqual(raw.code_hash,item.code);assert.equal(raw.claim_hash,null);
 const claimed=f.s.pilotRedeem(item.code);assert.equal(claimed.exam.questions.length,4);assert.equal(JSON.stringify(claimed.exam).includes('teacherNote'),false);assert.equal(JSON.stringify(claimed.exam).includes('answer'),false);
 assert.throws(()=>f.s.pilotRedeem(item.code),{code:'invalid_code'});
 const answer={q1:'B',q2:'A',q3:'A',q4:{'1':'A'}};
 const receipt=f.s.pilotSubmit(claimed.token,answer);assert.equal(receipt.ok,true);assert.equal(receipt.receipt.length,8);
 assert.throws(()=>f.s.pilotSubmit(claimed.token,answer),{code:'invalid_session'});
 const view=f.s.pilotView(f.a,item.id);assert.equal(view.status,'submitted');assert.deepEqual(view.answers,answer);
 assert.equal(f.s.pilotList(f.a)[0].answers,undefined);
 assert.ok(f.s.audit(f.a).some(x=>x.event==='pilot.issued'));
 f.s.pilotDelete(f.a,item.id);assert.equal(f.s.pilotList(f.a).length,0);
}finally{f.close();}});

test('reject malformed, invented, free-text and extraneous answers',()=>{const f=fixture();try{
 const item=f.s.pilotIssue(f.a,f.rec.id);assert.throws(()=>f.s.pilotRedeem('1234'),{code:'invalid_code'});
 const ticket=f.s.pilotRedeem(item.code);
 for(const a of [{q1:'Z'},{q2:[]},{q1:'<script>'},{q4:{unknown:'A'}},{q4:{'1':'Z'}},{qx:'A'}])assert.throws(()=>f.s.pilotSubmit(ticket.token,a),{code:'invalid_answers'});
 assert.throws(()=>f.s.pilotSubmit('invalid',{}),{code:'invalid_session'});
 assert.equal(f.s.pilotSubmit(ticket.token,{q1:'A'}).ok,true);
}finally{f.close();}});

test('reject unapproved exam, unsupported short answers, stale revisions',()=>{const f=fixture();try{
 const raw=createDemo();raw.profile='';raw.questions=raw.questions.map(q=>({...q,teacherNote:''}));const x=f.s.createExam(f.a,{exam:raw});f.s.approveExam(f.a,x.id,{revision:1,confirmed:true});assert.throws(()=>f.s.pilotIssue(f.a,x.id),{code:'unsupported_questions'});
 const created=f.s.pilotIssue(f.a,f.rec.id);const a=exam();a.title='Başka sürüm';f.s.updateExam(f.a,f.rec.id,{revision:1,exam:a});assert.throws(()=>f.s.pilotRedeem(created.code),{code:'exam_changed'});
 assert.throws(()=>f.s.pilotIssue(f.a,f.rec.id),{code:'not_approved'});
 f.s.approveExam(f.a,f.rec.id,{revision:2,confirmed:true});const other=f.s.pilotIssue(f.a,f.rec.id);const ticket=f.s.pilotRedeem(other.code);
 f.s.updateExam(f.a,f.rec.id,{revision:2,exam:{...a,title:'Yeniden düzenlendi'}});
 assert.throws(()=>f.s.pilotSubmit(ticket.token,{}),{code:'exam_changed'});
}finally{f.close();}});

test('cross tenant, owner, role and revocation boundary',()=>{const f=fixture();try{
 const item=f.s.pilotIssue(f.a,f.rec.id);assert.deepEqual(f.s.pilotList(f.b),[]);assert.throws(()=>f.s.pilotView(f.b,item.id),{code:'not_found'});assert.throws(()=>f.s.pilotDelete(f.b,item.id),{code:'not_found'});
 const u=f.s.addMember(f.a,{email:'observer@a.test',role:'observer',password});const observer=f.s.requireActor(f.s.signIn({tenantId:'a-okul',email:'observer@a.test',password}).token);
 assert.throws(()=>f.s.pilotIssue(observer,f.rec.id),{code:'forbidden'});assert.throws(()=>f.s.pilotList(observer),{code:'forbidden'});
 f.s.pilotRevoke(f.a,item.id);assert.throws(()=>f.s.pilotRedeem(item.code),{code:'invalid_code'});
 const fresh=f.s.pilotIssue(f.a,f.rec.id),ticket=f.s.pilotRedeem(fresh.code);f.s.pilotRevoke(f.a,fresh.id);
 assert.throws(()=>f.s.pilotSubmit(ticket.token,{q1:'A'}),{code:'invalid_session'});
}finally{f.close();}});

test('expiry and retention purge: no new claims and temporary data removed',()=>{const f=fixture();try{
 const item=f.s.pilotIssue(f.a,f.rec.id);f.s.db.prepare('UPDATE pilot_sessions SET expires_at=? WHERE id=?').run(Date.now()-100,item.id);
 assert.throws(()=>f.s.pilotRedeem(item.code),{code:'invalid_code'});assert.equal(f.s.pilotList(f.a)[0].status,'expired');
 f.s.db.prepare('UPDATE pilot_sessions SET expires_at=? WHERE id=?').run(Date.now()-25*3600*1000,item.id);
 assert.equal(f.s.pilotList(f.a).length,0);
}finally{f.close();}});

test('HTTP: authenticated teacher-only routes and public one-use capability; no teacher cookie to learner',async()=>{
 const f=fixture(),port=41951,api=createApiHandler(f.s,{port});const server=http.createServer((req,res)=>api(req,res,new URL(req.url,'http://localhost').pathname));
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 async function request(path,method='GET',body,headers={}){const r=await fetch(`http://127.0.0.1:${port}/api${path}`,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
 try{
  assert.equal((await request('/pilot')).status,401);
  assert.equal((await request('/pilot','POST',{examId:f.rec.id},{Cookie:'bep_session='+f.la.token})).status,403);
  const t={Cookie:'bep_session='+f.la.token,'X-CSRF-Token':f.la.csrf};
  const created=await request('/pilot','POST',{examId:f.rec.id},t);assert.equal(created.status,201);
  const code=created.data.item.code,id=created.data.item.id;
  const foreign=await request('/pilot/'+id,'GET',null,{Cookie:'bep_session='+f.lb.token});assert.equal(foreign.status,404);
  assert.equal((await request('/pilot/redeem','POST',{code},{Origin:'https://bad.invalid'})).status,403);
  const begin=await request('/pilot/redeem','POST',{code});assert.equal(begin.status,200);
  assert.equal((await request('/pilot/redeem','POST',{code})).status,401);
  assert.equal((await request('/pilot/submit','POST',{answers:{q1:'A'}})).status,401);
  const receipt=await request('/pilot/submit','POST',{answers:{q1:'A'}},{Authorization:'Bearer '+begin.data.token});assert.equal(receipt.status,200);
  assert.equal((await request('/pilot/submit','POST',{answers:{q1:'A'}},{Authorization:'Bearer '+begin.data.token})).status,401);
  const view=await request('/pilot/'+id,'GET',null,{Cookie:'bep_session='+f.la.token});assert.equal(view.status,200);assert.equal(view.data.item.answers.q1,'A');
 }finally{await new Promise(resolve=>server.close(resolve));f.close();}
});

test('v2.35: anonymous-code limiter survives reopening SQLite, stores hashes only, and expires',()=>{
 const f=fixture();let reopened;
 try{
  const good=f.s.pilotIssue(f.a,f.rec.id);
  const guessed='ABABABABABABABABABAB';
  for(let i=0;i<5;i++)assert.throws(()=>f.s.pilotRedeem(guessed),{code:'invalid_code'});
  assert.throws(()=>f.s.pilotRedeem(guessed),{code:'rate_limited'});
  const rows=f.s.db.prepare('SELECT identity_hash,failure_count,locked_until FROM pilot_redeem_throttle').all();
  assert.ok(rows.length>=2);
  assert.ok(rows.every(r=>/^[a-f0-9]{64}$/.test(r.identity_hash)));
  assert.ok(rows.every(r=>r.locked_until===0||r.locked_until>Date.now()));
  reopened=openStore(join(f.dir,'db.sqlite'));
  assert.throws(()=>reopened.pilotRedeem(guessed),{code:'rate_limited'});
  const okay=reopened.pilotRedeem(good.code);
  assert.ok(okay.exam.questions.length>0);
  // The temporary lock is recoverable without removing any existing exam.
  reopened.db.prepare('UPDATE pilot_redeem_throttle SET locked_until=0,window_started_at=0 WHERE identity_hash<>?').run('x'.repeat(64));
  assert.throws(()=>reopened.pilotRedeem(guessed),{code:'invalid_code'});
 }finally{reopened?.db.close();f.close();}
});

test('v2.35: changing random codes cannot bypass the global failure budget',()=>{
 const f=fixture();try{
  const item=f.s.pilotIssue(f.a,f.rec.id);
  for(let i=0;i<12;i++)assert.throws(()=>f.s.pilotRedeem(i.toString(16).toUpperCase().padStart(20,'0')),{code:'invalid_code'});
  assert.throws(()=>f.s.pilotRedeem(item.code),{code:'rate_limited'});
  f.s.db.prepare('UPDATE pilot_redeem_throttle SET locked_until=0,window_started_at=0 WHERE locked_until>0').run();
  assert.ok(f.s.pilotRedeem(item.code).token);
 }finally{f.close();}
});

test('v2.35: tampered approved exam cannot be issued, redeemed, submitted or reviewed',()=>{
 const f=fixture();try{
  const original=f.s.db.prepare('SELECT body FROM exams WHERE id=?').get(f.rec.id).body;
  const first=f.s.pilotIssue(f.a,f.rec.id);
  const bad=JSON.stringify({...JSON.parse(original),title:'Saldırgan tarafından değiştirilmiş soru kaynağı'});
  f.s.db.prepare('UPDATE exams SET body=? WHERE id=?').run(bad,f.rec.id);
  assert.throws(()=>f.s.pilotRedeem(first.code),{code:'approval_integrity'});
  assert.throws(()=>f.s.pilotIssue(f.a,f.rec.id),{code:'approval_integrity'});
  f.s.db.prepare('UPDATE exams SET body=? WHERE id=?').run(original,f.rec.id);
  const started=f.s.pilotRedeem(first.code);
  f.s.db.prepare('UPDATE exams SET body=? WHERE id=?').run(bad,f.rec.id);
  assert.throws(()=>f.s.pilotSubmit(started.token,{}),{code:'approval_integrity'});
  f.s.db.prepare('UPDATE exams SET body=? WHERE id=?').run(original,f.rec.id);
  assert.equal(f.s.pilotSubmit(started.token,{}).ok,true);
  f.s.db.prepare('UPDATE exams SET body=? WHERE id=?').run(bad,f.rec.id);
  assert.throws(()=>f.s.pilotReviewGet(f.a,first.id),{code:'approval_integrity'});
 }finally{f.close();}
});

test('anonymous in-progress answer saves are bounded, resumable in the active session and hidden from teacher until submission',()=>{
 const f=fixture();try{
  const issued=f.s.pilotIssue(f.a,f.rec.id),ticket=f.s.pilotRedeem(issued.code);
  assert.deepEqual(f.s.pilotProgress(ticket.token).answers,{});
  assert.equal(f.s.pilotSave(ticket.token,{q1:'A',q4:{'1':'B'}}).saved,true);
  assert.deepEqual(f.s.pilotProgress(ticket.token).answers,{q1:'A',q4:{'1':'B'}});
  assert.equal(f.s.pilotView(f.a,issued.id).answers,null,'teachers must not inspect unfinished anonymous submissions');
  assert.throws(()=>f.s.pilotSave(ticket.token,{q1:'INVALID'}),{code:'invalid_answers'});
  assert.deepEqual(f.s.pilotProgress(ticket.token).answers,{q1:'A',q4:{'1':'B'}},'invalid save cannot overwrite a good draft');
  assert.equal(f.s.pilotSubmit(ticket.token,{q1:'B'}).ok,true);
  assert.throws(()=>f.s.pilotSave(ticket.token,{q1:'A'}),{code:'invalid_session'});
  assert.throws(()=>f.s.pilotProgress(ticket.token),{code:'invalid_session'});
  assert.deepEqual(f.s.pilotView(f.a,issued.id).answers,{q1:'B'},'only submitted answers are teacher-visible');
 }finally{f.close();}
});

test('draft save rejects expired or revoked anonymous pilot capabilities',()=>{
 const f=fixture();try{
  const issued=f.s.pilotIssue(f.a,f.rec.id),ticket=f.s.pilotRedeem(issued.code);
  f.s.pilotRevoke(f.a,issued.id);
  assert.throws(()=>f.s.pilotSave(ticket.token,{q1:'A'}),{code:'invalid_session'});
  const another=f.s.pilotIssue(f.a,f.rec.id),active=f.s.pilotRedeem(another.code);
  f.s.db.prepare('UPDATE pilot_sessions SET expires_at=? WHERE id=?').run(Date.now()-1,another.id);
  assert.throws(()=>f.s.pilotSave(active.token,{q1:'A'}),{code:'invalid_session'});
 }finally{f.close();}
});

test('HTTP bearer-only draft save and restore protect anonymous session across requests',async()=>{
 const f=fixture(),port=41952,api=createApiHandler(f.s,{port});
 const server=http.createServer((req,res)=>api(req,res,new URL(req.url,'http://localhost').pathname));
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 const request=async(path,method='GET',body,token)=>{
  const r=await fetch('http://127.0.0.1:'+port+'/api'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
  return {status:r.status,data:await r.json()};
 };
 try{
  const code=f.s.pilotIssue(f.a,f.rec.id).code,token=f.s.pilotRedeem(code).token;
  assert.equal((await request('/pilot/progress')).status,401);
  assert.equal((await request('/pilot/save','POST',{answers:{q1:'A'}})).status,401);
  assert.equal((await request('/pilot/save','POST',{answers:{q1:'A'}},token)).status,200);
  const restored=await request('/pilot/progress','GET',undefined,token);
  assert.equal(restored.status,200);assert.deepEqual(restored.data.answers,{q1:'A'});
  assert.equal((await request('/pilot/submit','POST',{answers:{q1:'B'}},token)).status,200);
  assert.equal((await request('/pilot/save','POST',{answers:{q1:'A'}},token)).status,401);
  assert.equal((await request('/pilot/progress','GET',undefined,token)).status,401);
 }finally{await new Promise(resolve=>server.close(resolve));f.close();}
});

test('teacher recovery rotates bearer and one-use code while preserving saved answers and original expiry',()=>{
 const f=fixture();try{
  const issued=f.s.pilotIssue(f.a,f.rec.id),claimed=f.s.pilotRedeem(issued.code);
  const answers={q1:'B',q2:'A'};
  f.s.pilotSave(claimed.token,answers);
  const recovered=f.s.pilotRecoverIssue(f.a,issued.id);
  assert.match(recovered.code,/^[0-9A-F]{5}(?:-[0-9A-F]{5}){3}$/);
  assert.equal(recovered.expiresAt,issued.expiresAt);
  assert.equal(recovered.answers,undefined);
  assert.throws(()=>f.s.pilotSave(claimed.token,answers),{code:'invalid_session'});
  assert.throws(()=>f.s.pilotSubmit(claimed.token,answers),{code:'invalid_session'});
  assert.throws(()=>f.s.pilotRedeem(issued.code),{code:'invalid_code'});
  const resumed=f.s.pilotRedeem(recovered.code);
  assert.deepEqual(resumed.answers,answers);
  assert.deepEqual(f.s.pilotProgress(resumed.token).answers,answers);
  assert.throws(()=>f.s.pilotRedeem(recovered.code),{code:'invalid_code'});
  const result=f.s.pilotSubmit(resumed.token,{...answers,q3:'A'});
  assert.equal(result.ok,true);
  assert.throws(()=>f.s.pilotRecoverIssue(f.a,issued.id),{code:'not_recoverable'});
 }finally{f.close();}
});
test('recovery refuses other tenants, observers, non-started, expired or revoked sessions',()=>{
 const f=fixture();try{
  const issued=f.s.pilotIssue(f.a,f.rec.id);
  assert.throws(()=>f.s.pilotRecoverIssue(f.a,issued.id),{code:'not_recoverable'});
  const student=f.s.pilotRedeem(issued.code);
  assert.throws(()=>f.s.pilotRecoverIssue(f.b,issued.id),{code:'not_found'});
  const observer=f.s.addMember(f.a,{email:'observer-recovery@a.test',role:'observer',password});
  const obs=f.s.requireActor(f.s.signIn({tenantId:'a-okul',email:'observer-recovery@a.test',password}).token);
  assert.throws(()=>f.s.pilotRecoverIssue(obs,issued.id),{code:'forbidden'});
  const recovered=f.s.pilotRecoverIssue(f.a,issued.id);
  f.s.db.prepare('UPDATE pilot_sessions SET expires_at=? WHERE id=?').run(Date.now()-100,issued.id);
  assert.throws(()=>f.s.pilotRedeem(recovered.code),{code:'invalid_code'});
  assert.throws(()=>f.s.pilotRecoverIssue(f.a,issued.id),{code:'not_recoverable'});
  const second=f.s.pilotIssue(f.a,f.rec.id);f.s.pilotRedeem(second.code);f.s.pilotRevoke(f.a,second.id);
  assert.throws(()=>f.s.pilotRecoverIssue(f.a,second.id),{code:'not_recoverable'});
 }finally{f.close();}
});

test('HTTP recovery requires authenticated actor and CSRF; student redeems rotated code only once',async()=>{
 const f=fixture(),server=http.createServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 const api=createApiHandler(f.s,{port});
 server.on('request',(req,res)=>api(req,res,new URL(req.url,'http://localhost').pathname));
 const request=async(path,method='GET',body,headers={})=>{
  const response=await fetch('http://127.0.0.1:'+port+'/api'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
  return {status:response.status,data:await response.json()};
 };
 try{
  const original=f.s.pilotIssue(f.a,f.rec.id);
  const claimed=f.s.pilotRedeem(original.code);
  f.s.pilotSave(claimed.token,{q1:'B'});
  const route='/pilot/'+original.id+'/recover';
  const bad=await request(route,'POST',{});
  assert.equal(bad.status,401);
  const cookie={Cookie:'bep_session='+f.la.token};
  assert.notEqual((await request(route,'POST',{},cookie)).status,201);
  const authorized={...cookie,'X-CSRF-Token':f.la.csrf};
  const recovered=await request(route,'POST',{},authorized);
  assert.equal(recovered.status,201);
  assert.equal(recovered.data.item.expiresAt,original.expiresAt);
  assert.equal(recovered.data.item.answers,undefined);
  assert.equal((await request('/pilot/progress','GET',undefined,{Authorization:'Bearer '+claimed.token})).status,401);
  const resumed=await request('/pilot/redeem','POST',{code:recovered.data.item.code});
  assert.equal(resumed.status,200);
  assert.deepEqual(resumed.data.answers,{q1:'B'});
  assert.notEqual((await request('/pilot/redeem','POST',{code:recovered.data.item.code})).status,200);
 }finally{await new Promise(resolve=>server.close(resolve));f.close();}
});
