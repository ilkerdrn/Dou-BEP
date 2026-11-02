import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectProtectedStorage,enforceProtectedStorage} from './protected-storage.mjs';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,existsSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

const fake=(status)=>inspectProtectedStorage({path:'C:\\BEP\\data\\institution.sqlite',platform:'win32',run:(exe,args)=>{
 assert.equal(exe,'powershell.exe');assert.equal(args[0],'-NoProfile');assert.equal(args[2],'-EncodedCommand');
 const program=Buffer.from(args[3],'base64').toString('utf16le');
 assert.match(program,/Get-BitLockerVolume/);
 assert.ok(program.includes("MountPoint 'C:'"));
 return JSON.stringify(status);
}});

test('Windows guard accepts only protected and fully encrypted BitLocker volumes',()=>{
 assert.equal(fake({protectionStatus:'On',volumeStatus:'FullyEncrypted',encryptionPercentage:100}).protected,true);
 assert.equal(fake({protectionStatus:'1',volumeStatus:'1',encryptionPercentage:100}).protected,true);
 for(const value of [
  {protectionStatus:'Off',volumeStatus:'FullyEncrypted',encryptionPercentage:100},
  {protectionStatus:'On',volumeStatus:'EncryptionInProgress',encryptionPercentage:90},
  {protectionStatus:'On',volumeStatus:'FullyEncrypted',encryptionPercentage:0},
  {protectionStatus:'On',volumeStatus:'FullyEncrypted'},
 ])assert.equal(fake(value).protected,false);
});

test('readiness fails closed on unsupported OS, UNC, unavailable or invalid BitLocker output',()=>{
 assert.equal(inspectProtectedStorage({platform:'linux',path:'/data/exam.sqlite'}).reason,'unsupported_platform');
 assert.equal(inspectProtectedStorage({platform:'win32',path:'\\\\server\\share\\db.sqlite'}).reason,'unsupported_volume');
 assert.equal(inspectProtectedStorage({platform:'win32',path:'C:\\data\\exam.sqlite',run:()=>{throw Error('No module');}}).reason,'verification_unavailable');
 assert.equal(inspectProtectedStorage({platform:'win32',path:'C:\\data\\exam.sqlite',run:()=>'<xml/>'}).protected,false);
});

test('startup guard does not allow unverified disk when explicitly required, skips when optional',()=>{
 let calls=0;
 assert.deepEqual(enforceProtectedStorage({path:'C:\\test\\db.sqlite',required:false,inspect:()=>{calls++;}}),{enforced:false});
 assert.equal(calls,0);
 assert.throws(()=>enforceProtectedStorage({path:'C:\\test\\db.sqlite',required:true,inspect:()=>({protected:false,message:'disabled'})}),/BEP_STORAGE_BLOCKED/);
 assert.deepEqual(enforceProtectedStorage({path:'C:\\test\\db.sqlite',required:true,inspect:()=>({protected:true})}),{enforced:true});
});

test('strict volume requirement rejects startup before creating a new SQLite file on unsupported platforms',()=>{
 if(process.platform==='win32')return; // Windows BitLocker state varies per host.
 const root=mkdtempSync(join(tmpdir(),'bep-storage-gate-'));
 try{
  const target=join(root,'never-created.sqlite');
  const server=new URL('../server.mjs',import.meta.url);
  const out=spawnSync(process.execPath,[fileURLToPath(server)],{encoding:'utf8',timeout:12000,env:{...process.env,BEP_DB_PATH:target,BEP_REQUIRE_PROTECTED_VOLUME:'1',BEP_NO_LISTEN:'1'}});
  assert.notEqual(out.status,0);
  assert.match(out.stderr,/BEP_STORAGE_BLOCKED/);
  assert.equal(existsSync(target),false);
 }finally{rmSync(root,{recursive:true,force:true});}
});
