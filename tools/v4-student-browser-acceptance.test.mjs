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


test('NVDA form group names are connected to the matching question heading and prompt',()=>{
 const student=read('pilot.mjs');
 const smoke=read('tools/student-browser-acceptance.mjs');
 assert.match(student,/h\.id='pilot-question-heading-'\+\(index\+1\)/);
 assert.match(student,/box\.setAttribute\('aria-labelledby',h\.id\)/);
 assert.match(student,/prompt\.id='pilot-question-prompt-'\+\(index\+1\)/);
 assert.match(student,/field\.setAttribute\('aria-labelledby',h\.id\+' '\+prompt\.id\)/);
 assert.match(smoke,/Every student answer fieldset exposes its question number and full prompt to screen readers/);
 assert.match(smoke,/prompt\.textContent\.trim\(\)\.length>0/);
 assert.doesNotMatch(student,/aria-label',String\(q\.answer\)|answerKey|studentId/);
});


test('return from hidden final review and completed submission keep NVDA focus visible',()=>{
 const student=read('pilot.mjs');
 const page=read('pilot.html');
 const browser=read('tools/student-browser-acceptance.mjs');
 assert.match(student,/\$\('pilot-cancel-final'\)\.addEventListener\('click',\(\)=>\{\s*\/\/[^]*?resetFinalReview\(\);\s*\$\('one-question'\)\.checked=true;\s*updateQuestionNavigation\(true\);/);
 assert.match(student,/updateQuestionNavigation\(true\)/);
 assert.match(page,/<section id="done"[^>]*aria-labelledby="pilot-done-title"/);
 assert.match(page,/<h2 id="pilot-done-title" tabindex="-1">Anonim yanıtlar gönderildi<\/h2>/);
 assert.match(student,/\$\('pilot-done-title'\)\.focus\(\)/);
 assert.match(browser,/Canceling final review moves focus to a visible question heading/);
 assert.match(browser,/Reopening final review focuses its accessible title without submitting/);
 assert.match(browser,/Successful one-time delivery focuses accessible receipt heading/);
 assert.doesNotMatch(student,/localStorage|sessionStorage|indexedDB/);
});


test('student and demo label Windows speech honestly and supply math self-test without exam content',()=>{
 const page=read('pilot.html'),demo=read('dou-reader-demo.html');
 const panel=read('dou-reader-panel.mjs'),accept=read('tools/student-browser-acceptance.mjs');
 for(const html of [page,demo]){
  assert.match(html,/id="reader-test"/);
  assert.match(html,/Windows\/Edge Türkçe sistem sesi/);
 }
 assert.match(page,/özgün DOU Speech sesi henüz sınava bağlı değildir/);
 assert.match(panel,/function testVoice\(\)/);
 assert.match(panel,/engine\.speak\('Bu bir yerel ses denemesidir\./);
 assert.match(panel,/if\(!q\|\|q\.audioAllowed===false\)/);
 assert.match(accept,/Reader distinguishes installed OS voice from experimental DOU Speech/);
 assert.doesNotMatch(panel,/fetch\(|localStorage|sessionStorage|indexedDB/);
});


test('four DOU synthetic preview options remain separate from OS speech and normal exam data',()=>{
 const page=read('pilot.html'),panel=read('dou-reader-panel.mjs');
 const preview=read('dou-speech-pilot-previews.mjs');
 const server=read('server.mjs'),browser=read('tools/student-browser-acceptance.mjs');
 for(const id of ['reader-lab-voice','reader-lab-play','reader-lab-stop','reader-lab-status'])assert.ok(page.includes('id="'+id+'"'),id);
 for(const model of ['legacy','spectral','contrast','place'])assert.ok(page.includes('value="'+model+'"'),model);
 assert.match(page,/DOU Speech — deneysel ses seçenekleri/);
 assert.match(page,/Yalnız “Merhaba dünya”/);
 assert.match(panel,/attachPilotSpeechPreviews/);
 assert.match(panel,/previews\.stop\(\)/);
 assert.match(preview,/const FIXED_SAMPLE='Merhaba dünya'/);
 assert.match(preview,/synthesizeLocalFreeText\(FIXED_SAMPLE/);
 assert.match(preview,/getQuestion\(\)\?\.audioAllowed===false/);
 assert.match(server,/dou-speech-pilot-previews\.mjs/);
 assert.match(server,/media-src blob:/);
 assert.match(browser,/Four DOU experimental WAV candidates are listed separately/);
 assert.doesNotMatch(preview,/fetch\(|localStorage|sessionStorage|indexedDB|getUserMedia|MediaRecorder/);
});
