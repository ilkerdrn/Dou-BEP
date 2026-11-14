/**
 * Offline source contract for critical pilot writes. No real sessions or data.
 * Complements multi-connection behavioral tests with lock-order assertions.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(resolve(root,'server-foundation/pilot-sessions.mjs'),'utf8');

function section(name,next){
 const start=source.indexOf(' function '+name+'(');
 const end=source.indexOf(' function '+next+'(',start+1);
 assert.ok(start>=0&&end>start,'Function boundary missing: '+name);
 return source.slice(start,end);
}

test('shared pilot writer lock commits only after mutation and rolls back failures',()=>{
 const lock=section('withWriterLock','limiterBlocked');
 const begin=lock.indexOf("db.exec('BEGIN IMMEDIATE')");
 const action=lock.indexOf('const result=action()');
 const commit=lock.indexOf("db.exec('COMMIT')");
 const rollback=lock.indexOf("db.exec('ROLLBACK')");
 assert.ok(begin>=0&&begin<action&&action<commit,'write lock must cover action');
 assert.ok(rollback>commit,'failed writes must roll back');
 assert.match(lock,/throw err/);
});

test('pilot mutations check current state and write under a single SQLite writer lock',()=>{
 for(const [name,next,read,write] of [
  ['issue','list',"SELECT * FROM exams WHERE id=? AND tenant_id=?",'INSERT INTO pilot_sessions'],
  ['revoke','remove','rowFor(actor,id)',"UPDATE pilot_sessions SET status='revoked'"],
  ['remove','recoverIssue','rowFor(actor,id)','DELETE FROM pilot_sessions WHERE id=?'],
  ['recoverIssue','redeem','rowFor(actor,id)',"UPDATE pilot_sessions SET code_hash=?"],
  ['save','submit','startedSession(token)',"UPDATE pilot_sessions SET answers=?"],
  ['submit','reviewContext','SELECT * FROM pilot_sessions WHERE claim_hash=?',"UPDATE pilot_sessions SET status='submitted'"],
  ['reviewSave','reviewCsv','reviewContext(actor,id)','UPDATE pilot_reviews SET version=?']
 ]){
  const code=section(name,next);
  const lock=code.indexOf('return withWriterLock(()=>{');
  const readAt=code.indexOf(read),writeAt=code.indexOf(write);
  assert.ok(lock>=0&&readAt>lock&&writeAt>readAt,name+' must read, validate and write under lock');
  assert.ok(code.lastIndexOf('});')>writeAt,name+' must return inside the locked scope');
  assert.doesNotMatch(code,/db\.exec\('BEGIN IMMEDIATE'\)/,name+' must not nest SQLite transactions');
 }
});

test('offline QUICK acceptance includes the pilot writer-lock contract',()=>{
 const quick=readFileSync(resolve(root,'tools/v4-local-acceptance.mjs'),'utf8');
 assert.ok(quick.includes("'tools/v4-pilot-writer-atomicity.test.mjs'"));
 assert.ok(quick.includes("'tools/v4-pilot-two-connection.test.mjs'"));
});
