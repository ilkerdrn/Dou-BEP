import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('./pilot.html',import.meta.url),'utf8');
const js=readFileSync(new URL('./pilot.mjs',import.meta.url),'utf8');
const api=readFileSync(new URL('./server-foundation/institutional-api.mjs',import.meta.url),'utf8');
const store=readFileSync(new URL('./server-foundation/pilot-sessions.mjs',import.meta.url),'utf8');

test('anonymous learner sees an accessible answer completion status and first-unanswered action',()=>{
 assert.match(html,/id="pilot-answer-progress"[^>]*role="status"[^>]*aria-live="polite"/);
 assert.match(html,/<button[^>]*type="button"[^>]*id="pilot-first-empty"/);
 assert.match(js,/function collectAnswers\(\)/);
 assert.match(js,/function updateAnswerProgress\(\)/);
 assert.match(js,/updateAnswerProgress\(\)/);
 assert.match(js,/activeQuestionIndex=empty\[0\]/);
 assert.match(js,/updateQuestionNavigation\(true\)/);
});

test('missing or incomplete matching responses are never counted as complete',()=>{
 assert.match(js,/if\(Object\.keys\(selected\)\.length!==q\.left\.length\)empty\.push\(i\)/);
 assert.match(js,/if\(value\)answers\[q\.id\]=value;else empty\.push\(i\)/);
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

test('anonymous learner can save and restore choices explicitly without browser storage',()=>{
 assert.match(html,/id="pilot-save-status"[^>]*role="status"/);
 assert.match(html,/id="pilot-save"/);
 assert.match(html,/id="pilot-restore"/);
 assert.match(js,/post\('\/api\/pilot\/save',\{answers\},token\)/);
 assert.match(js,/fetch\('\/api\/pilot\/progress'/);
 assert.match(js,/credentials:'omit'/);
 assert.match(js,/cache:'no-store'/);
 assert.match(js,/form\.reset\(\)/);
 assert.match(js,/if\(!confirm\('Bu sekmedeki mevcut seçimleri son sunucu ara kaydıyla değiştirmek istiyor musunuz\?'\)\)return/);
 assert.doesNotMatch(js,/\b(?:localStorage|sessionStorage|indexedDB)\b/);
 assert.match(api,/store\.pilotSave\(match\[1\],body\.answers\)/);
 assert.match(api,/store\.pilotProgress\(match\[1\]\)/);
 assert.match(store,/row\.status==='submitted'&&row\.answers/);
});

test('student question map shows answered, empty and review states without revealing answers',()=>{
 assert.match(html,/id="pilot-question-map"[^>]*aria-label="Soru numaraları"/);
 assert.match(html,/id="pilot-toggle-review"[^>]*aria-pressed="false"/);
 assert.match(html,/id="pilot-review-count"[^>]*role="status"[^>]*aria-live="polite"/);
 assert.match(js,/const reviewFlags=new Set\(\)/);
 assert.match(js,/function updateQuestionMap\(\)/);
 assert.match(js,/button\.dataset\.status=flagged\?'review':answered\?'answered':'empty'/);
 assert.match(js,/button\.setAttribute\('aria-label','Soru '\+\(i\+1\)/);
 assert.match(js,/button\.setAttribute\('aria-current','step'\)/);
 assert.match(js,/reviewFlags\.clear\(\);resetFinalReview\(\);activeQuestionIndex=0/);
 assert.doesNotMatch(js,/post\('\/api\/pilot\/save',\{answers,reviewFlags\}/);
 assert.doesNotMatch(js,/post\('\/api\/pilot\/submit',\{answers,reviewFlags\}/);
});

test('pre-exam readiness requires two explicit checks before showing questions',()=>{
 assert.match(html,/id="exam-ready"[^>]*hidden[^>]*aria-labelledby="ready-title"/);
 assert.match(html,/id="ready-understand"/);
 assert.match(html,/id="ready-device"/);
 assert.match(html,/id="ready-start"[^>]*disabled/);
 assert.match(html,/45 dakikalık pilot oturum süresi işlemeye başladı/);
 assert.match(js,/function updateReadyStart\(\)/);
 assert.match(js,/\$\('ready-start'\)\.disabled=!\$\('ready-understand'\)\.checked\|\|!\$\('ready-device'\)\.checked\|\|!claim\|\|!exam\|\|pilotTimeState\(pilotExpiresAt\)\.phase==='expired'/);
 assert.match(js,/\$\('exam-ready'\)\.hidden=true;\$\('player'\)\.hidden=false/);
 assert.match(js,/\$\('entry'\)\.hidden=true;\$\('player'\)\.hidden=true;\$\('exam-ready'\)\.hidden=false/);
 assert.match(js,/\$\('ready-title'\)\.focus\(\)/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|indexedDB/);
});

test('final submission requires a separate question status review and allows returning to unanswered questions',()=>{
 assert.match(html,/id="pilot-final-review"[^>]*aria-labelledby="pilot-final-title" hidden/);
 assert.match(html,/id="pilot-final-summary"[^>]*role="status"[^>]*aria-live="polite"/);
 assert.match(html,/id="pilot-final-questions"[^>]*aria-label="Soru durumları"/);
 assert.match(html,/id="pilot-cancel-final"[^>]*type="button"/);
 assert.match(js,/function showFinalReview\(\)/);
 assert.match(js,/if\(\$\('pilot-final-review'\)\.hidden\)\{showFinalReview\(\);return;\}/);
 assert.match(js,/button\.addEventListener\('click',\(\)=>\{\s*resetFinalReview\(\);activeQuestionIndex=i/);
 assert.match(js,/const answered=exam\.questions\.length-empty\.length/);
 assert.match(js,/const flagged=\[\.\.\.reviewFlags\]\.sort/);
 assert.match(js,/if\(!confirm\(warning\+'Anonim yanıtları tek seferlik teslim etmek istiyor musunuz\?'\)\)return/);
 assert.match(js,/post\('\/api\/pilot\/submit',\{answers\},claim\)/);
 assert.match(js,/if\(event\.target\.matches\('input\[type="radio"\],select'\)\)\{\s*resetFinalReview\(\);updateAnswerProgress\(\);scheduleAutoSave\(\);/);
 assert.doesNotMatch(js,/\b(?:localStorage|sessionStorage|indexedDB)\b/);
});

test('automatic draft saves are debounced, serialized and never expose the bearer in storage',()=>{
 assert.match(html,/class="muted pilot-autosave-help"/);
 assert.match(html,/otomatik olarak yerel sunucuya ara kaydedilir/);
 assert.match(js,/function scheduleAutoSave\(\)/);
 assert.match(js,/saveTimer=setTimeout\(\(\)=>\{saveTimer=null;void saveDraft\(\);\},1200\)/);
 assert.match(js,/if\(draftPromise\)return draftPromise/);
 assert.match(js,/while\(claim&&exam&&savedRevision<answerRevision\)/);
 assert.match(js,/await post\('\/api\/pilot\/save',\{answers\},token\)/);
 assert.match(js,/if\(draftPromise\)await draftPromise/);
 assert.match(js,/const \{answers\}=collectAnswers\(\);\s*const r=await post\('\/api\/pilot\/submit',\{answers\},claim\)/);
 assert.match(js,/window\.addEventListener\('pagehide',\(\)=>\{clearSaveTimer\(\);claim=null/);
 assert.doesNotMatch(js,/\b(?:localStorage|sessionStorage|indexedDB)\b/);
});

test('student timer displays server expiry in preparation and test without automatic submission',()=>{
 assert.match(html,/id="pilot-ready-time"[^>]*role="status"/);
 assert.match(html,/id="pilot-time-text"[^>]*role="timer"[^>]*aria-live="off"/);
 assert.match(html,/id="pilot-time-warning"[^>]*role="status"[^>]*aria-live="polite"/);
 assert.match(js,/import \{pilotTimeState\} from '\.\/pilot-time\.mjs'/);
 assert.match(js,/startPilotClock\(r\.expiresAt\)/);
 assert.match(js,/setInterval\(renderPilotClock,1000\)/);
 assert.match(js,/state\.phase==='expired'/);
 assert.match(js,/stopPilotClock\(\);douReader\?\.stop\(\)/);
 assert.doesNotMatch(js,/post\('\/api\/pilot\/submit',\{answers\},claim\);\s*setInterval/);
});
