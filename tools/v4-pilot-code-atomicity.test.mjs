import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(resolve(root,'server-foundation/pilot-sessions.mjs'),'utf8');
const start=source.indexOf(' function redeem(code){');
const end=source.indexOf(' function validate(payload,answers)',start);
const redeem=source.slice(start,end);
const before=(a,b)=>{
 const i=redeem.indexOf(a),j=redeem.indexOf(b);
 assert.ok(i>=0&&j>i,'Expected '+a+' before '+b);
};

test('redeem holds writer lock before reading both one-time code and approved exam',()=>{
 assert.ok(start>=0&&end>start);
 before("if(!CODE.test(raw))","db.exec('BEGIN IMMEDIATE')");
 before("db.exec('BEGIN IMMEDIATE')","SELECT * FROM pilot_sessions WHERE code_hash=?");
 before('SELECT * FROM pilot_sessions WHERE code_hash=?','SELECT * FROM exams WHERE id=? AND tenant_id=?');
 before('SELECT * FROM exams WHERE id=? AND tenant_id=?','approvedExam(exam)');
 before('approvedExam(exam)','createStudentPayload(JSON.parse(exam.body))');
 before('createStudentPayload(JSON.parse(exam.body))',"UPDATE pilot_sessions SET status='started'");
 before("UPDATE pilot_sessions SET status='started'","db.exec('COMMIT')");
 assert.match(redeem,/if\(!claimed\.changes\)error\('invalid_code'/);
 assert.match(redeem,/inTransaction=false;\s*return result/);
});

test('failed claims release SQLite lock BEFORE writing persistent rate-limit counters',()=>{
 assert.match(redeem,/limiterBlocked\(GLOBAL_KEY,time\)/);
 assert.match(redeem,/limiterBlocked\(key,time\)/);
 assert.match(redeem,/if\(inTransaction\)\{try\{db\.exec\('ROLLBACK'\);\}catch\{\}\}/);
 before("if(inTransaction){try{db.exec('ROLLBACK');}catch{}}","recordFailure(key,time,REDEEM_CODE_LIMIT");
 before('recordFailure(key,time,REDEEM_CODE_LIMIT','recordFailure(GLOBAL_KEY,time,REDEEM_GLOBAL_LIMIT');
 assert.match(redeem,/DELETE FROM pilot_redeem_throttle WHERE identity_hash=\?/);
 assert.doesNotMatch(redeem,/console\.log|localStorage|sessionStorage/);
});

test('multi-instance regression cases remain registered in offline QUICK tests',()=>{
 const quick=readFileSync(resolve(root,'tools/v4-local-acceptance.mjs'),'utf8');
 const multi=readFileSync(resolve(root,'tools/v4-pilot-two-connection.test.mjs'),'utf8');
 for(const path of ['tools/v4-pilot-two-connection.test.mjs','tools/v4-pilot-code-atomicity.test.mjs'])
  assert.ok(quick.includes("'"+path+"'"),path+' not registered');
 assert.match(multi,/cannot redeem the same code/);
 assert.match(multi,/or resurrect the replaced bearer/);
 assert.match(multi,/rejects a stale review version/);
 assert.match(multi,/invalid_session/);
 assert.match(multi,/exam_changed/);
 assert.match(multi,/review_conflict/);
});
