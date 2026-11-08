import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
const decision=read('server-foundation/accommodation-decisions.mjs');
const api=read('server-foundation/institutional-api.mjs');
const html=read('accommodation-admin.html');
const ui=read('accommodation-admin.mjs');

test('time planning preview is read-only, approval-bound and tenant-scoped',()=>{
 assert.match(decision,/function durationPreview\(actor,id\)/);
 assert.match(decision,/permit\(actor,'accommodation\.view'\)/);
 assert.match(decision,/const decision=select\(actor,id\)/);
 assert.match(decision,/decision\.approved_sha256!==decision\.content_sha256\|\|digest\(data\)!==decision\.content_sha256/);
 assert.match(decision,/WHERE tenant_id=\? AND term=\? AND course_code=\? AND exam_label=\?/);
 assert.match(decision,/ORDER BY starts_at ASC LIMIT 25/);
 assert.match(decision,/matches\.length!==1/);
 assert.match(decision,/exam\.status!=='approved'\|\|exam\.revision!==sitting\.exam_revision/);
 assert.match(decision,/totalMinutes=baseMinutes\+data\.extraMinutes/);
 assert.match(decision,/Öğrenciye otomatik süre verilmez/);
});
test('admin previews approved decisions without modifying pilot entitlement or student storage',()=>{
 assert.match(api,/duration-preview/);
 assert.match(api,/store\.accommodationDurationPreview\(actor,id\)/);
 assert.match(html,/id="decision-duration-result"[^>]*role="status"[^>]*aria-live="polite"/);
 assert.match(ui,/x\.status==='approved'/);
 assert.match(ui,/data-duration/);
 assert.match(ui,/\/duration-preview'/);
 assert.doesNotMatch(ui,/\b(?:localStorage|sessionStorage|indexedDB)\b/);
});

test('explicit exam sitting is matched by tenant/course/term/exam and never automatically assigned',()=>{
 assert.match(decision,/function durationPreview\(actor,id,coordinationId=null\)/);
 assert.match(decision,/AND id=\?/);
 assert.match(decision,/reason:coordinationId\?'session_mismatch'/);
 assert.match(decision,/choices:matches\.map\(m=>\(\{id:m\.id,startsAt:m\.starts_at,baseMinutes:m\.duration_minutes\}\)\)/);
 assert.match(api,/searchParams\.get\('coordinationId'\)/);
 assert.match(html,/id="decision-duration-sitting"/);
 assert.match(ui,/function renderDurationPreview\(result\)/);
 assert.match(ui,/encodeURIComponent\(\$\('decision-duration-sitting'\)\.value\)/);
});
