import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openStore} from '../server-foundation/institutional-store.mjs';
import {generateAuditEvidenceKey,sealAuditEvidence,rotateAuditEvidence} from './audit-evidence.mjs';
import {privateDatabaseFingerprint,runStorageRecoveryDrill} from './storage-recovery-drill.mjs';
const passphrase='Anonymized-Local-Backup-Rehearsal-2026!';
function fixture(){
 const root=mkdtempSync(join(tmpdir(),'bep-storage-test-')),source=join(root,'data','pilot.sqlite');
 const store=openStore(source);
 store.createTenantAdmin({tenantId:'synthetic-campus',tenantName:'Örnek Kurum',email:'nobody@invalid.test',password:'Secure-Example-Pass-123!'});
 store.db.prepare('INSERT INTO audit (tenant_id,actor_id,event,created_at) VALUES(?,?,?,?)').run('synthetic-campus','fictional-actor','start',Date.now());
 const audit={mode:'single',keyFile:join(root,'private-key','key.bin'),evidenceFile:join(root,'private-evidence','evidence.json')};
 generateAuditEvidenceKey({keyFile:audit.keyFile});sealAuditEvidence({databasePath:source,...audit});
 return {root,source,store,audit,close(){store.db.close();rmSync(root,{recursive:true,force:true});}};
}

test('v2.39 recovery rehearsal verifies encrypted backup and all persisted non-session rows without exposing values',async()=>{
 const f=fixture();try{
  const login=f.store.signIn({tenantId:'synthetic-campus',email:'nobody@invalid.test',password:'Secure-Example-Pass-123!'});
  assert.ok(f.store.actorFrom(login.token));
  const before=privateDatabaseFingerprint(f.source);
  const result=await runStorageRecoveryDrill({source:f.source,passphrase,audit:f.audit});
  assert.equal(result.result,'PASS');assert.equal(result.productionReady,false);
  assert.equal(result.allNonSessionDataMatched,true);assert.equal(result.sessionsRevoked,true);
  assert.ok(result.reviewedTables>10);
  assert.equal(privateDatabaseFingerprint(f.source).fingerprint,before.fingerprint);
  assert.equal(privateDatabaseFingerprint(f.source).sessionCount,before.sessionCount);
  assert.ok(f.store.actorFrom(login.token),'source active session preserved');
  const report=JSON.stringify(result);
  for(const secret of ['nobody@invalid.test','Secure-Example-Pass','synthetic-campus','auditPrefixSha256','fingerprint'])assert.ok(!report.includes(secret));
 }finally{f.close();}
});
test('v2.39 recovery rehearsal refuses tampered audit before any successful report',async()=>{
 const f=fixture();try{
  f.store.db.prepare("UPDATE audit SET event='modified' WHERE id=(SELECT MIN(id) FROM audit)").run();
  await assert.rejects(()=>runStorageRecoveryDrill({source:f.source,passphrase,audit:f.audit}),/audit_prefix_mismatch/);
 }finally{f.close();}
});
test('v2.39 recovery rehearsal rejects absent proof and refuses weak passphrase',async()=>{
 const f=fixture();try{
  await assert.rejects(()=>runStorageRecoveryDrill({source:f.source,passphrase}),/audit_evidence_required/);
  await assert.rejects(()=>runStorageRecoveryDrill({source:f.source,passphrase:'123',audit:f.audit}),/strong_backup_passphrase_required/);
  await assert.rejects(()=>runStorageRecoveryDrill({source:f.source,passphrase,audit:{mode:'single',keyFile:join(f.root,'non-existent'),evidenceFile:f.audit.evidenceFile}}));
 }finally{f.close();}
});
test('v2.39 fingerprint detects changes outside the audit table',()=>{
 const f=fixture();try{
  const first=privateDatabaseFingerprint(f.source);
  f.store.db.prepare('UPDATE tenants SET name=? WHERE id=?').run('Değiştirilmiş Kurum','synthetic-campus');
  assert.notEqual(privateDatabaseFingerprint(f.source).fingerprint,first.fingerprint);
 }finally{f.close();}
});

test('v2.39 recovery rehearsal supports two-generation independent evidence after key rotation',async()=>{
 const f=fixture();try{
  f.store.db.prepare('INSERT INTO audit(tenant_id,actor_id,event,created_at) VALUES(?,?,?,?)').run('synthetic-campus','fictional-actor','later',Date.now());
  const audit={mode:'rotation',oldKeyFile:f.audit.keyFile,oldEvidenceFile:f.audit.evidenceFile,newKeyFile:join(f.root,'new-key','next.bin'),newEvidenceFile:join(f.root,'new-evidence','next.json')};
  generateAuditEvidenceKey({keyFile:audit.newKeyFile});rotateAuditEvidence({databasePath:f.source,...audit});
  const result=await runStorageRecoveryDrill({source:f.source,passphrase,audit});
  assert.equal(result.result,'PASS');assert.equal(result.auditMode,'rotation');
 }finally{f.close();}
});
test('v2.39 recovery rehearsal rejects symlinked source rather than following it',async()=>{
 const f=fixture();try{
  const alias=join(f.root,'alias.sqlite');symlinkSync(f.source,alias);
  await assert.rejects(()=>runStorageRecoveryDrill({source:alias,passphrase,audit:f.audit}),/unsafe_database_file/);
 }finally{f.close();}
});
