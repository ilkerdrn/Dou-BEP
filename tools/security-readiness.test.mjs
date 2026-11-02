import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {openStore} from '../server-foundation/institutional-store.mjs';
import {inspectSecurityReadiness} from './security-readiness.mjs';
const pass='Example-Strong-Password-2026!';
function fixture(){const dir=mkdtempSync(join(tmpdir(),'bep-security-scan-'));const source=join(dir,'store.sqlite');const store=openStore(source);store.createTenantAdmin({tenantId:'demo-university',tenantName:'Example University',email:'admin@example.test',password:pass});return {dir,source,store,close(){this.store.db.close();rmSync(dir,{recursive:true,force:true});}};}
const status=(result,id)=>result.checks.find(c=>c.id===id)?.status;

test('read-only scan counts records but never reveals tenant identifiers, emails, hashes or credentials',()=>{
 const f=fixture();try{
  const login=f.store.signIn({tenantId:'demo-university',email:'admin@example.test',password:pass});assert.ok(login.token);
  const before=readFileSync(f.source);const scan=inspectSecurityReadiness({source:f.source});
  assert.equal(scan.productionReady,false);
  assert.equal(scan.scope,'anonymous-local-pilot');
  assert.equal(scan.failed,0);
  assert.equal(status(scan,'sqlite_integrity'),'PASS');
  assert.equal(status(scan,'schema'),'PASS');
  assert.equal(status(scan,'disk_encryption'),'WARN');
  assert.equal(status(scan,'institutional_controls'),'WARN');
  const rendered=JSON.stringify(scan);
  for(const secret of ['admin@example.test','demo-university',login.token,pass])assert.equal(rendered.includes(secret),false);
  assert.deepEqual(readFileSync(f.source),before,'read-only scan must not change the database');
 }finally{f.close();}
});

test('scan flags tampering of approved exam body and decision decision hashes',()=>{
 const f=fixture();try{
  const actor=f.store.requireActor(f.store.signIn({tenantId:'demo-university',email:'admin@example.test',password:pass}).token);
  const examId=randomUUID(),body='{"dummy":true}',digest=createHash('sha256').update(body).digest('hex');
  f.store.db.prepare("INSERT INTO exams(id,tenant_id,owner_id,title,body,revision,status,created_at,updated_at) VALUES(?,?,?,?,?,1,'approved',?,?)")
   .run(examId,actor.tenantId,actor.id,'Demo',body,Date.now(),Date.now());
  f.store.db.prepare('INSERT INTO exam_approval_history(tenant_id,exam_id,revision,body_sha256,approved_by,approved_at) VALUES(?,?,?,?,?,?)').run(actor.tenantId,examId,1,digest,actor.id,Date.now());
  assert.equal(status(inspectSecurityReadiness({source:f.source}),'approved_exam_hashes'),'PASS');
  f.store.db.prepare('UPDATE exams SET body=? WHERE id=?').run('{"changed":true}',examId);
  assert.equal(status(inspectSecurityReadiness({source:f.source}),'approved_exam_hashes'),'FAIL');
 }finally{f.close();}
});

test('missing database is never created by security inspector',()=>{
 const dir=mkdtempSync(join(tmpdir(),'bep-scan-missing-'));try{
  const source=join(dir,'missing.sqlite');const result=inspectSecurityReadiness({source});
  assert.equal(status(result,'database_present'),'FAIL');
  assert.equal(result.productionReady,false);
  assert.throws(()=>readFileSync(source),{code:'ENOENT'});
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('scan warns of missing or unverified encrypted backups without reading passphrases',()=>{
 const f=fixture();try{
  const dir=join(f.dir,'secure');
  let result=inspectSecurityReadiness({source:f.source,backupDirectory:dir});
  assert.equal(status(result,'encrypted_backups'),'WARN');
  assert.match(result.checks.find(c=>c.id==='encrypted_backups').message,/görülmedi/);
  mkdirSync(dir);writeFileSync(join(dir,'sample.bepbak'),'not an actual backup');
  result=inspectSecurityReadiness({source:f.source,backupDirectory:dir});
  assert.equal(status(result,'encrypted_backups'),'WARN');
  assert.match(result.checks.find(c=>c.id==='encrypted_backups').message,/ayrıca gereklidir/);
 }finally{f.close();}
});

test('scan rejects approved accommodation whose stored contents no longer match approval hash',()=>{
 const f=fixture();try{
  const actor=f.store.requireActor(f.store.signIn({tenantId:'demo-university',email:'admin@example.test',password:pass}).token);
  const d={term:'2026-GUZ',courseCode:'CSE101',examLabel:'VIZE',candidateCode:'TEST-001',adjustments:['large_print'],extraMinutes:10};
  const digest=createHash('sha256').update(JSON.stringify(d)).digest('hex');
  f.store.db.prepare(`INSERT INTO accommodation_decisions(id,tenant_id,creator_id,last_editor_id,term,course_code,exam_label,candidate_code,adjustments,extra_minutes,revision,status,content_sha256,approved_sha256,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,1,'approved',?,?,?,?)`)
    .run(randomUUID(),actor.tenantId,actor.id,actor.id,d.term,d.courseCode,d.examLabel,d.candidateCode,JSON.stringify(d.adjustments),d.extraMinutes,digest,digest,Date.now(),Date.now());
  assert.equal(status(inspectSecurityReadiness({source:f.source}),'approved_decision_hashes'),'PASS');
  f.store.db.prepare('UPDATE accommodation_decisions SET extra_minutes=20').run();
  const scan=inspectSecurityReadiness({source:f.source});
  assert.equal(status(scan,'approved_decision_hashes'),'FAIL');
  assert.doesNotMatch(JSON.stringify(scan),/TEST-001/);
 }finally{f.close();}
});

test('v2.40 security summary flags unprotected WAL without exposing any SQLite contents',()=>{
 if(process.platform==='win32')return;
 const f=fixture();try{
  const wal=f.source+'-journal';
  writeFileSync(wal,'ANON-SENSITIVE-FIXTURE-CONTENT',{mode:0o644});
  const scan=inspectSecurityReadiness({source:f.source});
  assert.equal(status(scan,'sqlite_storage_footprint'),'FAIL');
  assert.equal(status(scan,'temporary_volume'),'WARN');
  assert.doesNotMatch(JSON.stringify(scan),/ANON-SENSITIVE-FIXTURE-CONTENT/);
 }finally{f.close();}
});
