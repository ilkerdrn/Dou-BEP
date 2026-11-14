/**
 * Source invariants only; manual NVDA + actual Windows voice playback
 * and real Edge integration remain separate acceptance gates.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');

test('existing 226-check browser acceptance remains the default, student needs explicit opt-in',()=>{
 const browser=read('tools/browser-ui-acceptance.mjs');
 const scripts=JSON.parse(read('package.json')).scripts;
 assert.equal(scripts['ui:browser'],'node tools/browser-ui-acceptance.mjs');
 assert.equal(scripts['ui:browser:student'],'node tools/browser-ui-acceptance.mjs --student');
 assert.match(browser,/if\(process\.argv\.includes\('--student'\)\)/);
 assert.match(browser,/runStudentBrowserAcceptance\(\{/);
 assert.match(browser,/BROWSER UI ACCEPTANCE PASS/);
});
test('synthetic student browser walks access preferences, native keyboard answer, final review and server receipt',()=>{
 const script=read('tools/student-browser-acceptance.mjs');
 assert.match(script,/join\(temp,'fixture\.sqlite'\)/);
 assert.match(script,/requireIndependentExamApproval:true/);
 assert.match(script,/exam\.questions=exam\.questions\.filter\(q=>q\.type!=='short'\)/);
 assert.match(script,/db\.approveExam\(reviewer/);
 assert.match(script,/db\.pilotIssue\(admin/);
 assert.match(script,/await navigate\(base,'\/pilot'\)/);
 for(const id of ['entry-access-profile','ready-access-profile','ready-understand','ready-device',
  'access-profile','reader-status','pilot-answer-progress','pilot-toggle-review',
  'pilot-final-review','pilot-final-summary','receipt']){
  assert.ok(script.includes(id),id);
 }
 assert.match(script,/Input\.dispatchKeyEvent/);
 assert.match(script,/await pressEnter\(\)/);
 assert.match(script,/type==='confirm'/);
 assert.match(script,/Page\.handleJavaScriptDialog/);
 assert.match(script,/status==='submitted'/);
 assert.match(script,/console\.log\('BROWSER ANONYMOUS STUDENT ACCEPTANCE PASS/);
 assert.doesNotMatch(script,/localStorage|sessionStorage|indexedDB|production\.sqlite/);
 assert.doesNotMatch(script,/console\.log\(session\.code|console\.log\(password|console\.log\(exam\.questions/);
});


test('written hearing-access mode and matching answers are included in native keyboard acceptance',()=>{
 const script=read('tools/student-browser-acceptance.mjs');
 const page=read('pilot.html');
 const client=read('pilot.mjs');
 assert.match(script,/Written-only mode exposes question, choices and timer without using TTS/);
 assert.match(script,/Keyboard navigation reaches matching question with both labeled selects/);
 assert.match(script,/Every matching select is natively labeled and includes all alternatives/);
 assert.match(script,/key:'ArrowDown',code:'ArrowDown'/);
 assert.match(script,/rawKeyDown/);
 assert.match(script,/ArrowDown completes matching with keyboard and progress counts complete pairs/);
 assert.match(script,/document\.getElementById\('send'\)\.focus\(\)/);
 assert.match(page,/value="written">Yazılı anlatım ve uyarılar/);
 assert.match(client,/if\(q\.type==='matching'\)for\(const left of q\.left\)/);
 assert.match(client,/if\(Object\.keys\(selected\)\.length!==q\.left\.length\)empty\.push\(i\)/);
 assert.doesNotMatch(script,/speechSynthesis\.speak|localStorage|sessionStorage/);
});
