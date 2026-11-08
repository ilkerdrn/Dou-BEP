import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('./pilot.html',import.meta.url),'utf8');
const js=readFileSync(new URL('./pilot.mjs',import.meta.url),'utf8');
const api=readFileSync(new URL('./server-foundation/institutional-api.mjs',import.meta.url),'utf8');
const store=readFileSync(new URL('./server-foundation/pilot-sessions.mjs',import.meta.url),'utf8');

test('anonymous learner sees an accessible answer completion status and first-unanswered action',()=>{
 assert.match(html,/id="pilot-answer-progress"[^>]*role="status"[^>]*aria-live="polite"/);
 assert.match(html,/id="pilot-first-empty"[^>]*type="button"/);
 assert.match(js,/function collectAnswers\(\)/);
 assert.match(js,/function updateAnswerProgress\(\)/);
 assert.match(js,/updateAnswerProgress\(\)/);
 assert.match(js,/activeQuestionIndex=empty\[0\]/);
 assert.match(js,/updateQuestionNavigation\(true\)/);
});

test('missing or incomplete matching responses are never counted as complete',()=>{
 assert.match(js,/if\(Object\.keys\(selected\)\.length!==q\.left\.length\)empty\.push\(i\)/);
 assert.match(js,/if\(!value\)empty\.push\(i\)/);
 assert.match(js,/if\(!confirm\(warning\+'Anonim yanıtları tek seferlik teslim etmek istiyor musunuz\?'\)\)return/);
 assert.match(js,/empty\.length\+' soru boş veya tamamlanmamış/);
});

test('new review UI retains anonymous single-use backend and does not persist tokens in browser storage',()=>{
 assert.match(js,/let claim=null,exam=null/);
 assert.match(js,/claim=null;exam=null/);
 assert.match(js,/credentials:'omit'/);
 assert.match(js,/post\('\/api\/pilot\/submit',\{answers\},claim\)/);
 assert.doesNotMatch(js,/\b(?:localStorage|sessionStorage|indexedDB)\b/);
 assert.match(api,/store\.pilotRedeem\(body\.code\)/);
 assert.match(api,/store\.pilotSubmit\(match\[1\],body\.answers\)/);
 assert.match(store,/status='submitted',answers=\?,submitted_at=\?,claim_hash=NULL/);
});
