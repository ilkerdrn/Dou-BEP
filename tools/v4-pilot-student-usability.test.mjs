import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const client=readFileSync(resolve(root,'pilot.mjs'),'utf8');
const page=readFileSync(resolve(root,'pilot.html'),'utf8');
const sessions=readFileSync(resolve(root,'server-foundation/pilot-sessions.mjs'),'utf8');

test('all question types have a keyboard-accessible clear action and auto-save is retained',()=>{
 assert.match(client,/for\(const \[index,q\] of exam\.questions\.entries\(\)\)/);
 assert.match(client,/el\('button','Bu sorunun yanıtını temizle'\)/);
 assert.match(client,/clear\.type='button'/);
 assert.match(client,/clear\.setAttribute\('aria-label','Soru '\+q\.number\+' yanıtını temizle'\)/);
 assert.match(client,/field\.querySelectorAll\('input\[type="radio"\]'\)/);
 assert.match(client,/field\.querySelectorAll\('select'\)/);
 assert.match(client,/input\.checked=false/);
 assert.match(client,/select\.value=''/);
 assert.match(client,/resetFinalReview\(\);updateAnswerProgress\(\);scheduleAutoSave\(\);/);
 assert.match(page,/Her sorudaki “Bu sorunun yanıtını temizle”/);
});

test('the pilot warns about flagged review items before one-time submission',()=>{
 assert.match(client,/const reviewWarning=reviewFlags\.size\?/);
 assert.match(client,/if\(!confirm\(warning\+reviewWarning\+/);
 assert.match(client,/pilotTimeState\(pilotExpiresAt\)\.phase==='expired'/);
 assert.match(client,/clearSaveTimer\(\)/);
 assert.match(client,/await post\('\/api\/pilot\/submit'/);
 assert.match(sessions,/UPDATE pilot_sessions SET status='submitted'/);
 assert.match(sessions,/claim_hash=NULL/);
});

test('flagged and unanswered questions have separate navigation without storing review flags',()=>{
 assert.match(page,/id="pilot-first-empty"/);
 assert.match(page,/id="pilot-first-review"/);
 assert.match(client,/\$\('pilot-first-review'\)\.disabled=reviewFlags\.size===0/);
 assert.match(client,/activeQuestionIndex=Math\.min\(\.\.\.reviewFlags\)/);
 assert.match(client,/resetFinalReview\(\);updateQuestionNavigation\(true\)/);
 assert.match(client,/const reviewFlags=new Set\(\)/);
 assert.doesNotMatch(client,/localStorage\.|sessionStorage\.|indexedDB\.|indexedDB\(/);
});

test('expired sessions cannot clear or send answers through the interface',()=>{
 assert.match(client,/querySelectorAll\('input\[type="radio"\],select,\.pilot-clear-answer'\)/);
 assert.match(client,/control\.disabled=true/);
 assert.match(client,/Oturum süresi dolduğu için yanıt değiştirilemez/);
 assert.match(client,/\$\('send'\)\.disabled=true/);
});
