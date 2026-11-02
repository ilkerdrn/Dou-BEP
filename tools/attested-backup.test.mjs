import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from '../server-foundation/institutional-store.mjs';
import {generateAuditEvidenceKey,sealAuditEvidence,rotateAuditEvidence} from './audit-evidence.mjs';
import {createAttestedBackup,restoreAttestedBackup} from './attested-backup.mjs';
import {createEncryptedBackup} from './secure-backup.mjs';
const pass='Sadece-Anonim-Test-Yedegi-2026!';
function fixture(){
 const root=mkdtempSync(join(tmpdir(),'bep-attested-'));
 const dbPath=join(root,'data','live.sqlite');
 const store=openStore(dbPath);
 store.createTenantAdmin({tenantId:'anon-school',tenantName:'Anonim Üniversite',email:'example@invalid.test',password:'Valid-Passphrase-2026-14chars!'});
 store.db.prepare('INSERT INTO audit(tenant_id,actor_id,event,created_at) VALUES(?,?,?,?)').run('anon-school','anonymous-test','initial',Date.now());
 const audit={mode:'single',keyFile:join(root,'keys','key.bin'),evidenceFile:join(root,'proof','checkpoint.json')};
 generateAuditEvidenceKey({keyFile:audit.keyFile});sealAuditEvidence({databasePath:dbPath,...audit});
 const backup=join(root,'backup','encrypted.bepbak'),target=join(root,'restored','new.sqlite');
 return {root,dbPath,store,audit,backup,target,close(){store.db.close();rmSync(root,{recursive:true,force:true});}};
}
test('v2.38: checkpoint-verified snapshot creates an encrypted backup and restores without sessions',async()=>{
 const f=fixture();try{
  const login=f.store.signIn({tenantId:'anon-school',email:'example@invalid.test',password:'Valid-Passphrase-2026-14chars!'});
  assert.ok(f.store.actorFrom(login.token));
  const created=await createAttestedBackup({source:f.dbPath,destination:f.backup,passphrase:pass,audit:f.audit});
  assert.equal(created.attested,true);assert.equal(created.checkpointMode,'single');assert.ok(created.protectedRows>0);
  assert.equal(readFileSync(f.backup).includes(Buffer.from('example@invalid.test')),false);
  const restored=await restoreAttestedBackup({source:f.backup,destination:f.target,passphrase:pass,audit:f.audit});
  assert.equal(restored.verified,true);assert.equal(restored.sessionsRevoked,true);
  const db=openStore(f.target);try{
   assert.ok(db.db.prepare('SELECT COUNT(*) AS n FROM audit').get().n>=created.protectedRows);
   assert.equal(db.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n,0);
  }finally{db.db.close();}
  assert.ok(f.store.actorFrom(login.token),'live database unchanged');
 }finally{f.close();}
});
test('v2.38: tampered historical audit row prevents output and does not modify existing database',async()=>{
 const f=fixture();try{
  f.store.db.prepare("UPDATE audit SET event='edited' WHERE id=(SELECT MIN(id) FROM audit)").run();
  await assert.rejects(()=>createAttestedBackup({source:f.dbPath,destination:f.backup,passphrase:pass,audit:f.audit}),/audit_prefix_mismatch/);
  assert.equal(existsSync(f.backup),false);
 }finally{f.close();}
});
test('v2.38: changing evidence or key blocks restoration with no published plaintext destination',async()=>{
 const f=fixture();try{
  await createAttestedBackup({source:f.dbPath,destination:f.backup,passphrase:pass,audit:f.audit});
  const before=readFileSync(f.backup);
  const evidence=readFileSync(f.audit.evidenceFile,'utf8');
  writeFileSync(f.audit.evidenceFile,evidence.replace('HMAC-SHA256','HMAC-SHA512'));
  await assert.rejects(()=>restoreAttestedBackup({source:f.backup,destination:f.target,passphrase:pass,audit:f.audit}));
  assert.equal(existsSync(f.target),false);
  assert.deepEqual(readFileSync(f.backup),before);
  writeFileSync(f.audit.evidenceFile,evidence);
  await assert.rejects(()=>restoreAttestedBackup({source:f.backup,destination:f.target,passphrase:'wrong password of sufficient length',audit:f.audit}),/doğrulanamadı/);
  assert.equal(existsSync(f.target),false);
 }finally{f.close();}
});
test('v2.38: backup older than latest checkpoint cannot be restored as current state',async()=>{
 const f=fixture();try{
  const plainOld=join(f.root,'old-backup.bepbak');
  await createEncryptedBackup({source:f.dbPath,destination:plainOld,passphrase:pass});
  // New independent checkpoint covers a later audit event. The old backup cannot meet it.
  f.store.db.prepare('INSERT INTO audit(tenant_id,actor_id,event,created_at) VALUES(?,?,?,?)').run('anon-school','synthetic','new-event',Date.now());
  const latest={mode:'single',keyFile:join(f.root,'key2','latest.key'),evidenceFile:join(f.root,'proof2','latest.json')};
  generateAuditEvidenceKey({keyFile:latest.keyFile});sealAuditEvidence({databasePath:f.dbPath,...latest});
  await assert.rejects(()=>restoreAttestedBackup({source:plainOld,destination:f.target,passphrase:pass,audit:latest}),/audit_prefix_mismatch/);
  assert.equal(existsSync(f.target),false);
 }finally{f.close();}
});
test('v2.38: two-generation audit key rotation works for backup and restore',async()=>{
 const f=fixture();try{
  const old={keyFile:f.audit.keyFile,evidenceFile:f.audit.evidenceFile};
  const next={newKeyFile:join(f.root,'newkey','new.bin'),newEvidenceFile:join(f.root,'newproof','new.json')};
  f.store.db.prepare('INSERT INTO audit(tenant_id,actor_id,event,created_at) VALUES(?,?,?,?)').run('anon-school','synthetic','later',Date.now());
  generateAuditEvidenceKey({keyFile:next.newKeyFile});
  const rotated={mode:'rotation',oldKeyFile:old.keyFile,oldEvidenceFile:old.evidenceFile,...next};
  rotateAuditEvidence({databasePath:f.dbPath,...rotated});
  const result=await createAttestedBackup({source:f.dbPath,destination:f.backup,passphrase:pass,audit:rotated});
  assert.equal(result.checkpointMode,'rotation');
  const restored=await restoreAttestedBackup({source:f.backup,destination:f.target,passphrase:pass,audit:rotated});
  assert.equal(restored.checkpointMode,'rotation');
 }finally{f.close();}
});
test('v2.38: no evidence configuration, missing destination and reused destination fail closed',async()=>{
 const f=fixture();try{
  await assert.rejects(()=>createAttestedBackup({source:f.dbPath,destination:f.backup,passphrase:pass}),/yapılandırılmadı/);
  await assert.rejects(()=>createAttestedBackup({source:f.dbPath,passphrase:pass,audit:f.audit}),/zorunludur/);
  await createAttestedBackup({source:f.dbPath,destination:f.backup,passphrase:pass,audit:f.audit});
  await assert.rejects(()=>createAttestedBackup({source:f.dbPath,destination:f.backup,passphrase:pass,audit:f.audit}),/zaten var/);
  await restoreAttestedBackup({source:f.backup,destination:f.target,passphrase:pass,audit:f.audit});
  await assert.rejects(()=>restoreAttestedBackup({source:f.backup,destination:f.target,passphrase:pass,audit:f.audit}),/zaten var/);
 }finally{f.close();}
});
