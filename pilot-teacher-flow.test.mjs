import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
const html=read('pilot-admin.html');
const js=read('pilot-admin.mjs');
const css=read('dou-unified-ui.css');
const store=read('server-foundation/pilot-sessions.mjs');

test('teacher receives ordered accessible instructions and an actionable empty state',()=>{
 assert.match(html,/class="pilot-teacher-steps"/);
 assert.match(html,/id="pilot-empty-exams"[^>]*hidden/);
 assert.match(html,/href="\/kurumsal-sinav"/);
 assert.match(html,/id="pilot-exam-help"[^>]*role="status"[^>]*aria-live="polite"/);
 assert.match(js,/eligible=exams\.items\.filter\(x=>x\.status==='approved'\)/);
 assert.match(js,/menu\.disabled=!eligible\.length/);
 assert.match(js,/\$\('pilot-empty-exams'\)\.hidden=eligible\.length>0/);
});
test('only the server-issued expiry is displayed and the code remains one-use',()=>{
 assert.match(store,/stamp\+WAIT_MS/);
 assert.match(store,/code=raw\.match/);
 assert.match(html,/id="pilot-code-expiry"/);
 assert.match(js,/new Date\(result\.item\.expiresAt\)/);
 assert.match(js,/\$\('code'\)\.textContent=lastCode/);
 assert.match(js,/lastCode=result\.item\.code/);
 assert.doesNotMatch(js,/\b(?:localStorage|sessionStorage|indexedDB)\b/);
});
test('teacher instructions are responsive and stay in the same local design',()=>{
 assert.match(css,/\.pilot-teacher-steps/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(html,/href="\/pilot" target="_blank" rel="noopener noreferrer"/);
});
