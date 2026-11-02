import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openStore} from '../server-foundation/institutional-store.mjs';
import {createEncryptedBackup,verifyEncryptedBackup,restoreEncryptedBackup,rotateEncryptedBackup} from './secure-backup.mjs';

const pass='Gizli-Parola-deneme-2026-BEP!';
const otherPass='Kesinlikle-Farkli-Parola-2026!';
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'bep-encrypted-test-'));const source=join(dir,'real.sqlite');
 const store=openStore(source);
 store.createTenantAdmin({tenantId:'test-institution',tenantName:'Örnek Kurum',email:'staff@example.test',password:'AdminGuv3nliParola-2026!'});
 store.db.prepare("INSERT INTO audit(tenant_id,actor_id,event,created_at) VALUES ('test-institution','anonymous-test','test.event',?)").run(Date.now());
 return {dir,source,store,close(){store.db.close();rmSync(dir,{recursive:true,force:true});}};
}
test('encrypted SQLite backup → verify → new restore preserves schemas and records, not plaintext',async()=>{
 const f=fixture();try{
  const file=join(f.dir,'secure','backup.bepbak'),dest=join(f.dir,'safe-new','restored.sqlite');
  const sourceLogin=f.store.signIn({tenantId:'test-institution',email:'staff@example.test',password:'AdminGuv3nliParola-2026!'});
  const sourceAuditCount=f.store.db.prepare('SELECT COUNT(*) AS n FROM audit').get().n;
  assert.ok(f.store.actorFrom(sourceLogin.token));
  const result=await createEncryptedBackup({source:f.source,destination:file,passphrase:pass});
  assert.equal(result.encrypted,true);assert.ok(result.bytes>200);
  const raw=readFileSync(file);
  assert.equal(raw.subarray(0,8).toString(),'BEPBAK01');
  assert.equal(raw.includes(Buffer.from('staff@example.test')),false,'encryption must protect account data');
  assert.equal(raw.includes(Buffer.from('AdminGuv3nliParola')),false);
  const verified=await verifyEncryptedBackup({source:file,passphrase:pass});assert.equal(verified.valid,true);
  const restored=await restoreEncryptedBackup({source:file,destination:dest,passphrase:pass});assert.equal(restored.verified,true);
  const again=openStore(dest);try{assert.equal(again.db.prepare('SELECT COUNT(*) AS n FROM tenants').get().n,1);assert.equal(again.db.prepare('SELECT COUNT(*) AS n FROM audit').get().n,sourceAuditCount);assert.equal(again.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n,0);assert.equal(again.actorFrom(sourceLogin.token),null);}finally{again.db.close();}
  await assert.rejects(()=>restoreEncryptedBackup({source:file,destination:dest,passphrase:pass}),/zaten var/);
  await assert.rejects(()=>createEncryptedBackup({source:f.source,destination:file,passphrase:pass}),/zaten var/);
 }finally{f.close();}
});
test('wrong secret or corrupted authenticated ciphertext cannot be verified or restored',async()=>{
 const f=fixture();try{
  const file=join(f.dir,'backup.bepbak');await createEncryptedBackup({source:f.source,destination:file,passphrase:pass});
  const dest=join(f.dir,'new.sqlite');
  await assert.rejects(()=>verifyEncryptedBackup({source:file,passphrase:otherPass}),/doğrulanamadı/);
  await assert.rejects(()=>restoreEncryptedBackup({source:file,destination:dest,passphrase:otherPass}),/doğrulanamadı/);
  assert.equal(existsSync(dest),false);
  const raw=readFileSync(file);raw[raw.length-20]^=0x20;
  const tampered=join(f.dir,'tampered.bepbak');writeFileSync(tampered,raw);
  await assert.rejects(()=>verifyEncryptedBackup({source:tampered,passphrase:pass}),/doğrulanamadı/);
  await assert.rejects(()=>restoreEncryptedBackup({source:tampered,destination:dest,passphrase:pass}),/doğrulanamadı/);
  assert.equal(existsSync(dest),false);
  assert.equal(readdirSync(f.dir).filter(x=>x.startsWith('.bep-restore-')).length,0,'failure cleans temp plaintext');
 }finally{f.close();}
});
test('header tampering/truncation and invalid passphrases fail before restoration',async()=>{
 const f=fixture();try{
  const file=join(f.dir,'backup.bepbak');await createEncryptedBackup({source:f.source,destination:file,passphrase:pass});
  const raw=readFileSync(file);
  for(const [name,bytes] of [['trunc',raw.subarray(0,16)],['magic',Buffer.from(raw)],['kdf',Buffer.from(raw)]]){
   if(name==='magic')bytes[0]^=1;
   if(name==='kdf')bytes[20]^=1;
   const altered=join(f.dir,`${name}.bepbak`);writeFileSync(altered,bytes);
   await assert.rejects(()=>restoreEncryptedBackup({source:altered,destination:join(f.dir,`${name}.sqlite`),passphrase:pass}));
   assert.equal(existsSync(join(f.dir,`${name}.sqlite`)),false);
  }
  await assert.rejects(()=>verifyEncryptedBackup({source:file,passphrase:'short'}),/en az 16/);
 }finally{f.close();}
});
test('restore rejects existing destination and SQLite sidecar paths without changing files',async()=>{
 const f=fixture();try{
  const file=join(f.dir,'backup.bepbak');await createEncryptedBackup({source:f.source,destination:file,passphrase:pass});
  await assert.rejects(()=>restoreEncryptedBackup({source:file,destination:f.source,passphrase:pass}),/zaten var/);
  const dst=join(f.dir,'sidecar.sqlite');writeFileSync(dst+'-wal','do-not-touch');
  await assert.rejects(()=>restoreEncryptedBackup({source:file,destination:dst,passphrase:pass}),/zaten var/);
  assert.equal(readFileSync(dst+'-wal','utf8'),'do-not-touch');
 }finally{f.close();}
});
test('source must contain real app schema; backup rejects unrelated SQLite databases',async()=>{
 const f=fixture();try{
  const {DatabaseSync}=await import('node:sqlite');
  const unrelated=join(f.dir,'other.sqlite');const db=new DatabaseSync(unrelated);db.exec('CREATE TABLE random_test (id INT);');db.close();
  await assert.rejects(()=>createEncryptedBackup({source:unrelated,destination:join(f.dir,'invalid.bepbak'),passphrase:pass}),/şemasını içermiyor/);
  assert.equal(existsSync(join(f.dir,'invalid.bepbak')),false);
 }finally{f.close();}
});

test('encrypted backup can be rotated with a fresh passphrase without changing the source',async()=>{
 const f=fixture();try{
  const oldFile=join(f.dir,'first.bepbak'),newFile=join(f.dir,'rotated','second.bepbak');
  await createEncryptedBackup({source:f.source,destination:oldFile,passphrase:pass});
  const before=readFileSync(oldFile);
  const result=await rotateEncryptedBackup({source:oldFile,destination:newFile,oldPassphrase:pass,newPassphrase:otherPass});
  assert.equal(result.originalPreserved,true);assert.equal(result.verified,true);
  assert.deepEqual(readFileSync(oldFile),before);
  assert.equal((await verifyEncryptedBackup({source:oldFile,passphrase:pass})).valid,true);
  assert.equal((await verifyEncryptedBackup({source:newFile,passphrase:otherPass})).valid,true);
  await assert.rejects(()=>verifyEncryptedBackup({source:newFile,passphrase:pass}),/doğrulanamadı/);
  await assert.rejects(()=>verifyEncryptedBackup({source:oldFile,passphrase:otherPass}),/doğrulanamadı/);
  assert.equal(readFileSync(newFile).includes(Buffer.from('staff@example.test')),false);
  const recovered=join(f.dir,'restored-from-rotated.sqlite');
  await restoreEncryptedBackup({source:newFile,destination:recovered,passphrase:otherPass});
  assert.ok(existsSync(recovered));
 }finally{f.close();}
});

test('rotation rejects wrong old password, same password, old filename reuse and existing destination',async()=>{
 const f=fixture();try{
  const oldFile=join(f.dir,'old.bepbak'),newFile=join(f.dir,'new.bepbak');
  await createEncryptedBackup({source:f.source,destination:oldFile,passphrase:pass});
  const old=readFileSync(oldFile);
  await assert.rejects(()=>rotateEncryptedBackup({source:oldFile,destination:newFile,oldPassphrase:otherPass,newPassphrase:pass}),/doğrulanamadı/);
  assert.equal(existsSync(newFile),false);
  await assert.rejects(()=>rotateEncryptedBackup({source:oldFile,destination:newFile,oldPassphrase:pass,newPassphrase:pass}),/farklı/);
  await assert.rejects(()=>rotateEncryptedBackup({source:oldFile,destination:oldFile,oldPassphrase:pass,newPassphrase:otherPass}),/üzerine/);
  writeFileSync(newFile,'NOT-TO-OVERWRITE');
  await assert.rejects(()=>rotateEncryptedBackup({source:oldFile,destination:newFile,oldPassphrase:pass,newPassphrase:otherPass}),/zaten var/);
  assert.equal(readFileSync(newFile,'utf8'),'NOT-TO-OVERWRITE');
  assert.deepEqual(readFileSync(oldFile),old);
  assert.equal(readdirSync(f.dir).filter(x=>x.endsWith('.part')).length,0);
 }finally{f.close();}
});
