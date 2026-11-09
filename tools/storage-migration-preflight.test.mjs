import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,chmodSync,symlinkSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {inspectStorageMigration,enforcePrivateSqliteFiles} from './storage-migration-preflight.mjs';
const setup=()=>{const root=mkdtempSync(join(tmpdir(),'bep-storage-preflight-'));const dir=join(root,'private');mkdirSync(dir,{mode:0o700});const db=join(dir,'pilot.sqlite');writeFileSync(db,'dummy');chmodSync(dir,0o700);chmodSync(db,0o600);return {root,dir,db};};
const noBitlocker=()=>({protected:false});

test('v2.40 reports SQLite, WAL and SHM footprint without reading or leaking source content',()=>{
 const t=setup();try{
  writeFileSync(t.db+'-wal','SENSITIVE PRIVATE TEST DATA');writeFileSync(t.db+'-shm','SENSITIVE SHM DATA');
  if(process.platform!=='win32'){chmodSync(t.db+'-wal',0o600);chmodSync(t.db+'-shm',0o600);}
  const report=inspectStorageMigration({source:t.db,platform:process.platform,volumeInspector:noBitlocker});
  assert.equal(report.sqliteSidecarsPresent,2);
  if(process.platform!=='win32')assert.equal(report.failed,0);
  else assert.equal(report.productionReady,false,'Windows ACL must remain unverified');
  assert.equal(report.productionReady,false);assert.equal(report.readOnly,true);
  assert.equal(report.checks.find(x=>x.id==='application_sqlite_encryption').status,'WARN');
  assert.equal(report.checks.find(x=>x.id==='sqlite_wal').status,
   process.platform==='win32'?'WARN':'PASS');
  assert.equal(report.checks.find(x=>x.id==='sqlite_shm').status,
   process.platform==='win32'?'WARN':'PASS');
  assert.doesNotMatch(JSON.stringify(report),/SENSITIVE|bep-storage-preflight-|pilot\.sqlite/);
  if(process.platform!=='win32')
   assert.equal(enforcePrivateSqliteFiles({source:t.db,required:true,platform:'linux',inspect:()=>report}).enforced,true);
  else assert.throws(()=>enforcePrivateSqliteFiles({source:t.db,required:true,platform:'win32',inspect:()=>report}),
   /BEP_STORAGE_PRIVACY_BLOCKED/);
 }finally{rmSync(t.root,{recursive:true,force:true});}
});

test('v2.40 detects exposed POSIX SQLite main, sidecar and directory permissions',()=>{
 if(process.platform==='win32')return;
 const t=setup();try{
  chmodSync(t.db,0o644);let r=inspectStorageMigration({source:t.db,volumeInspector:noBitlocker});
  assert.equal(r.checks.find(c=>c.id==='sqlite_main_file').status,'FAIL');
  assert.throws(()=>enforcePrivateSqliteFiles({source:t.db,required:true}),/BEP_STORAGE_PRIVACY_BLOCKED.*sqlite_main_file/);
  chmodSync(t.db,0o600);chmodSync(t.dir,0o755);
  r=inspectStorageMigration({source:t.db,volumeInspector:noBitlocker});
  assert.equal(r.checks.find(c=>c.id==='private_directory').status,'FAIL');
  chmodSync(t.dir,0o700);writeFileSync(t.db+'-wal','plain');chmodSync(t.db+'-wal',0o644);
  r=inspectStorageMigration({source:t.db,volumeInspector:noBitlocker});
  assert.equal(r.checks.find(c=>c.id==='sqlite_wal').status,'FAIL');
  assert.throws(()=>enforcePrivateSqliteFiles({source:t.db,required:true}),/sqlite_wal/);
 }finally{rmSync(t.root,{recursive:true,force:true});}
});

test('v2.40 rejects symlinked SQLite directory, main, WAL, and dangling journal',context=>{
 if(process.platform==='win32'){context.skip('Windows symlink privilege required; no production ACL claim.');return;}
 const t=setup();try{
  const external=join(t.root,'external.sqlite');writeFileSync(external,'not relevant');
  const dirLink=join(t.root,'alias');symlinkSync(t.dir,dirLink,'dir');
  assert.equal(inspectStorageMigration({source:join(dirLink,'pilot.sqlite'),volumeInspector:noBitlocker}).checks.find(c=>c.id==='path_integrity').status,'FAIL');
  rmSync(t.db);symlinkSync(external,t.db);
  assert.equal(inspectStorageMigration({source:t.db,volumeInspector:noBitlocker}).checks.find(c=>c.id==='path_integrity').status,'FAIL');
  rmSync(t.db);writeFileSync(t.db,'okay');
  symlinkSync(external,t.db+'-wal');symlinkSync(join(t.root,'missing'),t.db+'-journal');
  const report=inspectStorageMigration({source:t.db,volumeInspector:noBitlocker});
  assert.equal(report.checks.find(c=>c.id==='sqlite_wal').status,'FAIL');
  assert.equal(report.checks.find(c=>c.id==='sqlite_rollback_journal').status,'FAIL');
 }finally{rmSync(t.root,{recursive:true,force:true});}
});

test('v2.40 strict startup gate is opt-in, blocks unverified Windows ACL, does not create SQLite',()=>{
 const t=setup();try{
  assert.deepEqual(enforcePrivateSqliteFiles({source:t.db,required:false}),{enforced:false});
  assert.throws(()=>enforcePrivateSqliteFiles({source:t.db,required:true,platform:'win32'}),/BEP_STORAGE_PRIVACY_BLOCKED/);
  const wrong=join(t.dir,'not-created.sqlite');
  if(process.platform!=='win32'){
   chmodSync(t.dir,0o755);
   const result=spawnSync(process.execPath,[fileURLToPath(new URL('../server.mjs',import.meta.url))],{env:{...process.env,BEP_DB_PATH:wrong,BEP_NO_LISTEN:'1',BEP_REQUIRE_PRIVATE_SQLITE_FILES:'1'},encoding:'utf8',timeout:10000});
   assert.notEqual(result.status,0);assert.match(result.stderr,/BEP_STORAGE_PRIVACY_BLOCKED/);
   assert.equal(existsSync(wrong),false);
  }
 }finally{rmSync(t.root,{recursive:true,force:true});}
});

test('v2.40 preflight recognizes verified volume but never calls it application-level SQLite encryption',()=>{
 const t=setup();try{
  const report=inspectStorageMigration({source:t.db,platform:'win32',volumeInspector:()=>({protected:true}),scratch:t.dir});
  assert.equal(report.checks.find(c=>c.id==='volume_encryption').status,'PASS');
  assert.equal(report.checks.find(c=>c.id==='scratch_volume_encryption').status,'PASS');
  assert.equal(report.checks.find(c=>c.id==='application_sqlite_encryption').status,'WARN');
  assert.equal(report.productionReady,false);
 }finally{rmSync(t.root,{recursive:true,force:true});}
});
