import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
const store=read('server-foundation/pilot-sessions.mjs');
const api=read('server-foundation/institutional-api.mjs');
const teacher=read('pilot-admin.mjs');
const student=read('pilot.mjs');

test('recovery is an authenticated teacher endpoint, not public redeem/save/submit',()=>{
 assert.match(api,/\(revoke\|recover\|review\|review.csv\)/);
 assert.match(api,/pilotId\[2\]==='recover'&&req\.method==='POST'/);
 assert.match(api,/store\.pilotRecoverIssue\(actor,pilotId\[1\]\)/);
 assert.match(store,/function recoverIssue\(actor,id\)\{/);
 assert.match(store,/const row=rowFor\(actor,id\)/);
 assert.match(store,/row\.status!=='started'\|\|row\.expires_at<=now\(\)/);
 assert.match(store,/pilotRecoverIssue:recoverIssue/);
});
test('recovery does not extend expiry, preserves anonymous drafts and invalidates old capabilities',()=>{
 assert.match(store,/SET code_hash=\?,claim_hash=NULL,status='issued'/);
 assert.match(store,/\.run\(sha\(raw\),id,actor\.tenantId,now\(\)\)/);
 assert.match(store,/expiresAt:row\.expires_at,status:'issued'/);
 assert.match(store,/return \{token,expiresAt:row\.expires_at,exam:payload,\.\.\.\(row\.answers\?\{answers:JSON\.parse\(row\.answers\)\}:\{\}\)\}/);
 assert.match(store,/log\(actor,'pilot\.recovery\.issued',id\)/);
});
test('teacher controls and learner restore are explicit and preserve existing pilot submission',()=>{
 assert.match(teacher,/item\.status==='started'/);
 assert.match(teacher,/Kurtarma kodu oluştur/);
 assert.match(teacher,/\/recover','POST',\{\}/);
 assert.match(teacher,/new Date\(result\.item\.expiresAt\)/);
 assert.match(student,/function applySavedAnswers\(saved\)/);
 assert.match(student,/if\(r\.answers\)\{applySavedAnswers\(r\.answers\)/);
 assert.match(student,/post\('\/api\/pilot\/submit',\{answers\},claim\)/);
 assert.doesNotMatch(student,/\b(?:localStorage|sessionStorage|indexedDB)\b/);
});
