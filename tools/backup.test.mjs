import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';import {DatabaseSync} from 'node:sqlite';
import {createBackup} from './backup.mjs';
test('online consistent local SQLite backup validates integrity, does not overwrite',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'bep-backup-v20-'));const src=join(dir,'source.sqlite'),dst=join(dir,'copies','copy.sqlite');
 try{
  const db=new DatabaseSync(src);db.exec('PRAGMA journal_mode=WAL; CREATE TABLE t (x INTEGER); INSERT INTO t VALUES (17),(29);');
  const result=await createBackup({source:src,destination:dst});assert.ok(existsSync(result.destination));assert.ok(result.bytes>0);
  const b=new DatabaseSync(dst,{readOnly:true});assert.equal(b.prepare('SELECT SUM(x) AS v FROM t').get().v,46);b.close();
  await assert.rejects(()=>createBackup({source:src,destination:dst}),/zaten var/);
  db.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});
