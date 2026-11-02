import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,mkdirSync,readFileSync,writeFileSync,existsSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {openStore} from '../server-foundation/institutional-store.mjs';
import {generateAuditEvidenceKey,sealAuditEvidence,verifyAuditEvidence,rotateAuditEvidence,verifyRotatedAuditEvidence} from './audit-evidence.mjs';
import {inspectSecurityReadiness} from './security-readiness.mjs';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'bep-rotation-'));
 const databasePath=join(dir,'data','institution.sqlite');
 const oldKeyFile=join(dir,'old-key','audit.key'),newKeyFile=join(dir,'new-key','audit.key');
 const oldEvidenceFile=join(dir,'prior-evidence','proof.json'),newEvidenceFile=join(dir,'latest-evidence','proof.json');
 const store=openStore(databasePath);
 store.createTenantAdmin({tenantId:'anon-one',tenantName:'Anonim Kurum',email:'sample@uni.test',password:'Strong-Anonymous-University-2026!'});
 store.db.prepare('INSERT INTO audit(tenant_id,actor_id,event,created_at) VALUES (?,?,?,?)').run('anon-one','synthetic','initial.audit',Date.now());
 const args={databasePath,oldKeyFile,oldEvidenceFile,newKeyFile,newEvidenceFile};
 generateAuditEvidenceKey({keyFile:oldKeyFile});sealAuditEvidence({databasePath,keyFile:oldKeyFile,evidenceFile:oldEvidenceFile});
 generateAuditEvidenceKey({keyFile:newKeyFile});
 return {dir,store,args,close(){try{store.db.close();}catch{}rmSync(dir,{recursive:true,force:true});}};
}
test('v2.37 new key rollover links immutable old proof to a new prefix and supports later events',()=>{
 const f=fixture();try{
  const oldBefore=readFileSync(f.args.oldEvidenceFile),dbBefore=readFileSync(f.args.databasePath);
  f.store.db.prepare('INSERT INTO audit(tenant_id,actor_id,event,created_at) VALUES (?,?,?,?)').run('anon-one','synthetic','test.after_first_seal',Date.now());
  const dbAfter=readFileSync(f.args.databasePath);
  const created=rotateAuditEvidence(f.args);
  assert.equal(created.rotated,true);
  assert.ok(created.rowCount>created.previousRows);
  assert.deepEqual(readFileSync(f.args.oldEvidenceFile),oldBefore,'previous proof preserved');
  assert.deepEqual(readFileSync(f.args.databasePath),dbAfter,'rollover must be read-only');
  const checked=verifyRotatedAuditEvidence(f.args);
  assert.equal(checked.protectedRows,created.rowCount);
  assert.equal(verifyAuditEvidence({databasePath:f.args.databasePath,keyFile:f.args.oldKeyFile,evidenceFile:f.args.oldEvidenceFile}).verified,true);
  f.store.db.prepare('INSERT INTO audit(tenant_id,actor_id,event,created_at) VALUES (?,?,?,?)').run('anon-one','synthetic','new.unsealed.event',Date.now());
  assert.equal(verifyRotatedAuditEvidence(f.args).protectedRows,created.rowCount);
  assert.throws(()=>rotateAuditEvidence(f.args),{code:'EEXIST'});
  assert.ok(existsSync(f.args.oldKeyFile));assert.ok(existsSync(f.args.newKeyFile));
 }finally{f.close();}
});
test('v2.37 detects changed prior proof, changed new proof and wrong new key',()=>{
 const f=fixture();try{
  rotateAuditEvidence(f.args);
  const old=readFileSync(f.args.oldEvidenceFile),next=readFileSync(f.args.newEvidenceFile),key=readFileSync(f.args.newKeyFile);
  writeFileSync(f.args.oldEvidenceFile,old.toString('utf8').replace(/\n$/, '\n '));
  assert.throws(()=>verifyRotatedAuditEvidence(f.args),{code:'rotation_link_mismatch'});
  writeFileSync(f.args.oldEvidenceFile,old);
  const parsed=JSON.parse(next);parsed.payload.createdAt='2035-01-01T00:00:00.000Z';
  writeFileSync(f.args.newEvidenceFile,JSON.stringify(parsed));
  assert.throws(()=>verifyRotatedAuditEvidence(f.args),{code:'rotation_signature_mismatch'});
  writeFileSync(f.args.newEvidenceFile,next);
  writeFileSync(f.args.newKeyFile,Buffer.alloc(32,17));
  assert.throws(()=>verifyRotatedAuditEvidence(f.args),{code:'rotation_signature_mismatch'});
  writeFileSync(f.args.newKeyFile,key);
  assert.equal(verifyRotatedAuditEvidence(f.args).verified,true);
 }finally{f.close();}
});
test('v2.37 rejects audit rollback, modified prior rows and malicious rollover destinations',()=>{
 const f=fixture();try{
  assert.throws(()=>rotateAuditEvidence({...f.args,newEvidenceFile:f.args.oldEvidenceFile}),{code:'rotation_paths_reused'});
  assert.throws(()=>rotateAuditEvidence({...f.args,newKeyFile:f.args.oldKeyFile}),{code:'rotation_paths_reused'});
  assert.throws(()=>rotateAuditEvidence({...f.args,newEvidenceFile:join(f.dir,'data','new.json')}),{code:'external_separation_required'});
  copyFileSync(f.args.oldKeyFile,f.args.newKeyFile);
  assert.throws(()=>rotateAuditEvidence(f.args),{code:'rotation_key_reuse'});
  assert.equal(existsSync(f.args.newEvidenceFile),false);
  rmSync(f.args.newKeyFile);generateAuditEvidenceKey({keyFile:f.args.newKeyFile});
  rotateAuditEvidence(f.args);
  f.store.db.prepare('DELETE FROM audit WHERE id=(SELECT MAX(id) FROM audit)').run();
  assert.throws(()=>verifyRotatedAuditEvidence(f.args),{code:'audit_prefix_mismatch'});
 }finally{f.close();}
});
test('v2.37 fail-closed startup refuses changed rotated evidence BEFORE opening SQLite',()=>{
 const f=fixture();try{
  rotateAuditEvidence(f.args);
  const env={...process.env,BEP_NO_LISTEN:'1',BEP_DB_PATH:f.args.databasePath,BEP_REQUIRE_PROTECTED_VOLUME:'0',BEP_REQUIRE_AUDIT_ROTATION:'1',
   BEP_AUDIT_OLD_KEY_FILE:f.args.oldKeyFile,BEP_AUDIT_OLD_EVIDENCE_FILE:f.args.oldEvidenceFile,
   BEP_AUDIT_NEW_KEY_FILE:f.args.newKeyFile,BEP_AUDIT_NEW_EVIDENCE_FILE:f.args.newEvidenceFile};
  const cmd=()=>spawnSync(process.execPath,['server.mjs'],{cwd:root,env,encoding:'utf8',timeout:20000});
  const passed=cmd();assert.equal(passed.status,0,passed.stderr);
  f.store.db.prepare('UPDATE audit SET event=? WHERE id=(SELECT MIN(id) FROM audit)').run('tampered');
  const before=readFileSync(f.args.databasePath);
  const refused=cmd();assert.notEqual(refused.status,0);assert.match(refused.stderr,/audit_prefix_mismatch/);
  assert.deepEqual(readFileSync(f.args.databasePath),before);
 }finally{f.close();}
});
test('v2.37 CLI performs offline rollover/verification with explicit paths and redacted output',()=>{
 const f=fixture();try{
  const args=['--db',f.args.databasePath,'--old-key-file',f.args.oldKeyFile,'--old-evidence-file',f.args.oldEvidenceFile,'--new-key-file',f.args.newKeyFile,'--new-evidence-file',f.args.newEvidenceFile];
  const cli=(command)=>spawnSync(process.execPath,['tools/audit-evidence-cli.mjs',command,...args],{cwd:root,encoding:'utf8',timeout:10000});
  assert.equal(cli('rotate').status,0);
  const result=cli('verify-rotation');assert.equal(result.status,0,result.stderr);
  const parsed=JSON.parse(result.stdout);assert.equal(parsed.verified,true);assert.equal(result.stdout.includes('sample@uni.test'),false);
 }finally{f.close();}
});

test('v2.37 institutional security report verifies both proofs or reports a failing chain',()=>{
 const f=fixture();try{
  rotateAuditEvidence(f.args);
  const config={source:f.args.databasePath,rotation:{oldKeyFile:f.args.oldKeyFile,oldEvidenceFile:f.args.oldEvidenceFile,newKeyFile:f.args.newKeyFile,newEvidenceFile:f.args.newEvidenceFile}};
  assert.equal(inspectSecurityReadiness(config).checks.find(x=>x.id==='audit_key_rotation_chain').status,'PASS');
  const newProof=JSON.parse(readFileSync(f.args.newEvidenceFile,'utf8'));
  newProof.payload.previousEvidenceSha256='f'.repeat(64);
  writeFileSync(f.args.newEvidenceFile,JSON.stringify(newProof));
  assert.equal(inspectSecurityReadiness(config).checks.find(x=>x.id==='audit_key_rotation_chain').status,'FAIL');
 }finally{f.close();}
});
