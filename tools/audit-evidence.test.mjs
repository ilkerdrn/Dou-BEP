import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,mkdirSync,readFileSync,lstatSync,writeFileSync,existsSync,chmodSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';
import {openStore} from '../server-foundation/institutional-store.mjs';
import {generateAuditEvidenceKey,sealAuditEvidence,verifyAuditEvidence} from './audit-evidence.mjs';
import {inspectSecurityReadiness} from './security-readiness.mjs';
const pass='Example-University-StrongPass-2026!';
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'bep-audit-proof-'));
 const databasePath=join(dir,'data','institution.sqlite'),keyFile=join(dir,'private-key','audit.key'),evidenceFile=join(dir,'sealed-evidence','checkpoint.json');
 const store=openStore(databasePath);
 store.createTenantAdmin({tenantId:'anon-university',tenantName:'Anonim Üniversite',email:'private@example.test',password:pass});
 return {dir,databasePath,keyFile,evidenceFile,store,params:{databasePath,keyFile,evidenceFile},close(){try{store.db.close();}catch{}rmSync(dir,{recursive:true,force:true});}};
}
test('detached checkpoint verifies immutable prefix and permits later appended audit events',()=>{
 const f=fixture();try{
  const login=f.store.signIn({tenantId:'anon-university',email:'private@example.test',password:pass});
  const before=readFileSync(f.databasePath);
  generateAuditEvidenceKey({keyFile:f.keyFile});
  const seal=sealAuditEvidence(f.params);
  assert.ok(seal.rowCount>0);assert.equal(seal.evidenceSha256.length,64);
  assert.deepEqual(readFileSync(f.databasePath),before,'seal must not modify live database');
  assert.equal(verifyAuditEvidence(f.params).verified,true);
  assert.equal(inspectSecurityReadiness({source:f.databasePath,keyFile:f.keyFile,evidenceFile:f.evidenceFile}).checks.find(x=>x.id==='audit_independent_evidence').status,'PASS');
  f.store.signIn({tenantId:'anon-university',email:'private@example.test',password:pass});
  assert.equal(verifyAuditEvidence(f.params).protectedRows,seal.rowCount,'later rows are not in the sealed prefix');
  assert.throws(()=>sealAuditEvidence(f.params),{code:'EEXIST'});
  const serialized=JSON.stringify(JSON.parse(readFileSync(f.evidenceFile,'utf8')));
  for(const sensitive of ['private@example.test','anon-university',login.token,pass])assert.equal(serialized.includes(sensitive),false);
  if(process.platform!=='win32'){
   assert.equal(lstatSync(f.keyFile).mode&0o077,0);
   assert.equal(lstatSync(f.evidenceFile).mode&0o077,0);
  }
 }finally{f.close();}
});
test('tampering with a sealed audit row or deleting it fails verification',()=>{
 const f=fixture();try{
  f.store.signIn({tenantId:'anon-university',email:'private@example.test',password:pass});
  generateAuditEvidenceKey({keyFile:f.keyFile});sealAuditEvidence(f.params);
  const first=f.store.db.prepare('SELECT id FROM audit ORDER BY id LIMIT 1').get().id;
  f.store.db.prepare('UPDATE audit SET event=? WHERE id=?').run('falsified',first);
  assert.throws(()=>verifyAuditEvidence(f.params),{code:'audit_prefix_mismatch'});
  assert.equal(inspectSecurityReadiness({source:f.databasePath,keyFile:f.keyFile,evidenceFile:f.evidenceFile}).checks.find(x=>x.id==='audit_independent_evidence').status,'FAIL');
  f.store.db.prepare('DELETE FROM audit WHERE id=?').run(first);
  assert.throws(()=>verifyAuditEvidence(f.params),{code:'audit_prefix_mismatch'});
 }finally{f.close();}
});
test('modified evidence and wrong key cannot be used to forge a valid checkpoint',()=>{
 const f=fixture();try{
  generateAuditEvidenceKey({keyFile:f.keyFile});sealAuditEvidence(f.params);
  let data=JSON.parse(readFileSync(f.evidenceFile,'utf8'));const originalDate=data.payload.createdAt;data.payload.createdAt="2026-10-29T18:00:00.000Z";
  writeFileSync(f.evidenceFile,JSON.stringify(data));
  assert.throws(()=>verifyAuditEvidence(f.params),{code:'signature_mismatch'});
  data.payload.createdAt=originalDate;
  writeFileSync(f.evidenceFile,JSON.stringify(data));
  writeFileSync(f.keyFile,Buffer.alloc(32,7));
  assert.throws(()=>verifyAuditEvidence(f.params),{code:'signature_mismatch'});
 }finally{f.close();}
});
test('missing database, paths inside data, symlink, missing key and unsafe key modes fail closed',()=>{
 const f=fixture();try{
  assert.throws(()=>sealAuditEvidence(f.params),{code:'key_missing_or_unsafe'});
  generateAuditEvidenceKey({keyFile:f.keyFile});
  assert.throws(()=>generateAuditEvidenceKey({keyFile:f.keyFile}),{code:'EEXIST'});
  assert.throws(()=>sealAuditEvidence({...f.params,evidenceFile:join(f.dir,'data','record.json')}),{code:'external_separation_required'});
  assert.throws(()=>sealAuditEvidence({...f.params,databasePath:join(f.dir,'data','missing.sqlite')}),{code:'database_missing_or_unsafe'});
  assert.equal(existsSync(join(f.dir,'data','missing.sqlite')),false);
  if(process.platform!=='win32'){
   const alias=join(f.dir,'external-alias');symlinkSync(join(f.dir,'data'),alias,'dir');
   assert.throws(()=>sealAuditEvidence({...f.params,evidenceFile:join(alias,'evidence.json')}),{code:'external_separation_required'});
  }
  if(process.platform!=='win32'){
   chmodSync(f.keyFile,0o644);assert.throws(()=>sealAuditEvidence(f.params),{code:'key_permissions_unsafe'});
  }
 }finally{f.close();}
});
test('empty ledger can be sealed and rewritten evidence cannot escape independent path guard',()=>{
 const f=fixture();try{
  f.store.db.prepare('DELETE FROM audit').run();generateAuditEvidenceKey({keyFile:f.keyFile});
  const seal=sealAuditEvidence(f.params);assert.equal(seal.rowCount,0);
  assert.equal(verifyAuditEvidence(f.params).protectedRows,0);
 }finally{f.close();}
});

test('fail-closed startup guard blocks tampered checkpoints before opening/migrating SQLite',()=>{
 const f=fixture();try{
  f.store.signIn({tenantId:'anon-university',email:'private@example.test',password:pass});
  generateAuditEvidenceKey({keyFile:f.keyFile});sealAuditEvidence(f.params);
  const env={...process.env,BEP_NO_LISTEN:'1',BEP_DB_PATH:f.databasePath,BEP_REQUIRE_AUDIT_EVIDENCE:'1',BEP_AUDIT_KEY_FILE:f.keyFile,BEP_AUDIT_EVIDENCE_FILE:f.evidenceFile,BEP_REQUIRE_PROTECTED_VOLUME:'0'};
  const cmd=()=>spawnSync(process.execPath,['server.mjs'],{cwd:dirname(dirname(fileURLToPath(import.meta.url))),env,encoding:'utf8',timeout:15000});
  const passed=cmd();assert.equal(passed.status,0,passed.stderr);
  f.store.db.prepare('UPDATE audit SET event=? WHERE id=(SELECT MIN(id) FROM audit)').run('modified');
  const before=readFileSync(f.databasePath);
  const refused=cmd();assert.notEqual(refused.status,0,refused.stdout);
  assert.match(refused.stderr,/audit_prefix_mismatch/);
  assert.deepEqual(readFileSync(f.databasePath),before);
 }finally{f.close();}
});
