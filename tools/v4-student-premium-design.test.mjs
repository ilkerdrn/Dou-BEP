import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=path=>readFileSync(resolve(root,path),'utf8');

test('student premium style is actually reachable from the local server',()=>{
 const html=source('pilot.html'),server=source('server.mjs'),css=source('pilot-premium.css');
 assert.match(html,/<link rel="stylesheet" href="\/pilot-premium.css">/);
 assert.match(server,/['"]\/pilot-premium.css['"]:\['pilot-premium.css','text\/css; charset=utf-8'\]/);
 assert.ok(css.length>8000);
 assert.doesNotMatch(css,/https?:\/\//);
});

test('new workspace keeps required exam and reader DOM contracts intact',()=>{
 const html=source('pilot.html');
 for(const id of ['redeem-form','entry','exam-ready','ready-start','player','reader-engine',
 'reader-pocket-voice','reader-rate','reader-read','reader-pause','reader-resume',
 'reader-stop','reader-status','question-navigation','pilot-question-map',
 'student-questions','answer-form','pilot-save','pilot-final-review','send','done']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(html,/<form id="answer-form">/);
 assert.match(html,/id="reader-status"[^>]*role="status" aria-live="polite"/);
 assert.match(html,/id="pilot-question-map"[^>]*aria-label="Soru numaraları"/);
 assert.match(html,/<details class="pilot-lab-disclosure">/);
 assert.equal((html.match(/<details\b/g)||[]).length,(html.match(/<\/details>/g)||[]).length);
});

test('desktop question navigation is beside the question form, mobile stacks naturally',()=>{
 const css=source('pilot-premium.css');
 assert.match(css,/#player\{\s*display:grid;grid-template-columns:/);
 assert.match(css,/#question-navigation\{\s*grid-column:1;grid-row:3;/);
 assert.match(css,/#answer-form\{\s*grid-column:2;grid-row:3;/);
 assert.match(css,/@media\(max-width:1023px\)/);
 assert.match(css,/#player\{\s*display:block;/);
 assert.match(css,/:not\(\.high\):not\(\.high-contrast\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(forced-colors:active\)/);
});

test('studio reader documentation remains accessible without crowding primary voice controls',()=>{
 const html=source('pilot.html'),css=source('pilot-premium.css');
 for(const id of ['reader-limits','reader-engine-help','reader-read','reader-pause',
  'reader-resume','reader-stop','reader-status'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.equal(html.split('<details ').length,html.split('</details>').length);
 assert.ok(html.includes('<details class="pilot-reader-disclosure">'));
 assert.ok(html.includes('class="pilot-question-workspace-heading"'));
 assert.ok(css.includes('#player:not([hidden])'));
 assert.ok(css.includes('#dou-reader .reader-actions'));
});

test('answer progress uses a native element and never stores additional answer data',()=>{
 const html=source('pilot.html'),js=source('pilot.mjs'),css=source('pilot-premium.css');
 assert.match(html,/<progress id="pilot-progress-bar" max="1" value="0" aria-label="Yanıtlanan soru ilerlemesi">/);
 assert.match(js,/const progress=\$\('pilot-progress-bar'\);/);
 assert.match(js,/progress\.max=Math\.max\(1,exam\.questions\.length\);/);
 assert.match(js,/progress\.value=answered;/);
 assert.match(css,/#pilot-progress-bar::-webkit-progress-value/);
 assert.match(css,/\.pilot-question-jump\[data-status="answered"\]/);
 assert.match(css,/\.pilot-question-jump\[data-status="review"\]/);
 assert.match(css,/\.pilot-question-jump\[aria-current="step"\]/);
 assert.match(css,/#pilot-toggle-review\[aria-pressed="true"\]/);
});

test('reader status is announced accessibly and visually distinguishes safe client states',()=>{
 const html=source('pilot.html'),css=source('pilot-premium.css');
 const pocket=source('dou-pocket-student-reader.mjs');
 const panel=source('dou-reader-panel.mjs');
 assert.match(html,/id="reader-status" data-reader-state="idle" role="status" aria-live="polite"/);
 for(const state of ['preparing','playing','paused','stopped','complete','error']){
  assert.ok(css.includes('[data-reader-state="'+state+'"]'),state);
 }
 assert.match(pocket,/status\.dataset\.readerState=state/);
 assert.match(panel,/area\.dataset\.readerState=state/);
 assert.match(panel,/\$\('reader-pause'\)\.disabled=!canRead/);
 assert.match(panel,/\$\('reader-resume'\)\.disabled=!canRead/);
 assert.ok(css.includes('@media(forced-colors:active)'));
});

test('readiness and submitted screens keep original JS anchors and no fabricated result',()=>{
 const html=source('pilot.html'),css=source('pilot-premium.css'),js=source('pilot.mjs');
 for(const id of ['exam-ready','ready-title','ready-exam-details','pilot-ready-time',
 'ready-understand','ready-device','ready-access-profile','ready-start',
 'done','pilot-done-title','receipt']){
  assert.equal(html.split('id="'+id+'"').length,2,id+' must occur once');
 }
 assert.ok(html.includes('class="pilot-ready-summary"'));
 assert.ok(html.includes('class="pilot-ready-checks" role="group"'));
 assert.ok(html.includes('class="pilot-receipt-panel"'));
 assert.ok(js.includes("$('ready-start').disabled=!$('ready-understand').checked"));
 assert.ok(js.includes("$('receipt').textContent='Teslim referansı: '+r.receipt"));
 assert.ok(css.includes('#exam-ready .pilot-ready-checks label:has(input:checked)'));
 assert.ok(css.includes('#done #receipt'));
 assert.ok(css.includes('@media(forced-colors:active)'));
 assert.doesNotMatch(html,/Başarı puanı|notun:|100\/100/);
});

test('premium student stylesheet keeps stable brace structure and responsive fallbacks',()=>{
 const css=source('pilot-premium.css');
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
 assert.ok(css.includes('@media(max-width:650px)'));
 assert.ok(css.includes(':not(.high):not(.high-contrast) #exam-ready'));
 assert.ok(css.includes(':not(.high):not(.high-contrast) #done.pilot-done'));
});

test('stage tracker has semantic current step and only progresses after successful transitions',()=>{
 const html=source('pilot.html'),js=source('pilot.mjs'),css=source('pilot-premium.css');
 for(const id of ['entry','ready','exam','done']){
  assert.equal(html.split('data-pilot-stage="'+id+'"').length,2);
 }
 assert.equal(html.split('aria-current="step"').length,2);
 assert.ok(html.includes('<nav class="pilot-stage-track" aria-label="Sınav aşamaları">'));
 assert.match(js,/function updatePilotStage\(stage\)/);
 assert.ok(js.includes("updatePilotStage('ready');"));
 assert.ok(js.includes("updatePilotStage('exam');"));
 assert.ok(js.includes("updatePilotStage('done');"));
 assert.ok(js.includes("item.setAttribute('aria-current','step')"));
 assert.ok(js.includes("item.removeAttribute('aria-current')"));
 assert.ok(css.includes('.pilot-stage-track li[aria-current="step"]'));
 assert.ok(css.includes('.pilot-stage-track li[data-stage-state="complete"]'));
 assert.ok(css.includes('@media(max-width:650px)'));
});

test('exam focus view retains access controls while optional explanations collapse',()=>{
 const html=source('pilot.html'),css=source('pilot-premium.css'),js=source('pilot.mjs');
 assert.equal(html.split('<details class="pilot-session-help').length,3);
 assert.ok(html.includes('<summary>Sınav süresi hakkında bilgi</summary>'));
 assert.ok(html.includes('<summary>Erişilebilirlik ve seslendirme sınırları</summary>'));
 for(const id of ['pilot-time-text','pilot-time-warning','access-profile','access-profile-note',
  'size','contrast','stop-voice','reader-auto','reader-status','student-questions','send']){
  assert.equal(html.split('id="'+id+'"').length,2,id);
 }
 assert.ok(js.includes("$('contrast').addEventListener('change'"));
 assert.ok(css.includes('#player .pilot-access-toolbar'));
 assert.ok(css.includes('#player .pilot-session-help>summary:focus-visible'));
 assert.ok(css.includes('@media(max-width:760px)'));
});

test('autosave indicator only turns confirmed after server acknowledgment',()=>{
 const html=source('pilot.html'),js=source('pilot.mjs'),css=source('pilot-premium.css');
 assert.ok(html.includes('id="pilot-save-status" data-save-state="idle" role="status"'));
 assert.ok(js.includes("function setSaveStatus(message,state='idle')"));
 for(const state of ['pending','saving','saved','error'])
  assert.ok(css.includes('#pilot-save-status[data-save-state="'+state+'"]'),state);
 assert.ok(js.includes("setSaveStatus('Değişiklik var · otomatik ara kayıt bekleniyor…','pending')"));
 assert.ok(js.includes("setSaveStatus('Yanıtlar otomatik kaydediliyor…','saving')"));
 assert.ok(js.includes("setSaveStatus('Tüm güncel yanıtlar yerel sunucuya kaydedildi. Henüz teslim edilmedi.','saved')"));
 assert.ok(js.includes("setSaveStatus('Ara kayıt başarısız: '+e.message"));
 assert.ok(js.includes("setSaveStatus('Geri yükleme başarısız: '+e.message,'error')"));
 assert.ok(js.includes("await post('/api/pilot/save',{answers},token);"));
 assert.ok(js.includes("savedRevision=revision;"));
 assert.ok(css.includes(':not(.high):not(.high-contrast) #pilot-save-status[data-save-state="error"]'));
});

test('full-width student workspace is local and preserves every exam interaction anchor',()=>{
 const html=source('pilot.html'),server=source('server.mjs'),css=source('pilot-workspace.css');
 assert.ok(html.includes('<link rel="stylesheet" href="/pilot-workspace.css">'));
 assert.ok(server.includes("'/pilot-workspace.css':['pilot-workspace.css','text/css; charset=utf-8']"));
 assert.ok(html.includes('class="pilot-workspace-shell"'));
 assert.ok(html.includes('class="pilot-workspace-sidebar"'));
 assert.ok(html.includes('class="pilot-workspace-main"'));
 assert.ok(html.includes('href="/dou-reader-demo"'));
 assert.ok(!html.includes('href="/pilot?demo=reader"'));
 for(const id of ['entry','redeem-form','code','exam-ready','ready-start','player',
  'reader-engine','reader-pocket-voice','reader-read','reader-pause','reader-resume',
  'reader-stop','question-navigation','pilot-question-map','student-questions',
  'pilot-save','pilot-restore','pilot-save-status','pilot-final-review','send','done','receipt']){
  assert.equal(html.split('id="'+id+'"').length,2,id+' must occur exactly once');
 }
 assert.ok(css.includes('grid-template-columns:minmax(260px,320px) minmax(0,1fr)'));
 assert.ok(css.includes('main#main:has(#entry[hidden]) .pilot-workspace-sidebar'));
 assert.ok(css.includes('body.bep-student-pilot:not(.high):not(.high-contrast)'));
 assert.ok(css.includes('@media(max-width:930px)'));
 assert.ok(css.includes('@media(max-width:650px)'));
 assert.ok(css.includes('@media(forced-colors:active)'));
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
 assert.doesNotMatch(css,/https?:\/\//);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test('full-screen exam remains uncluttered in high contrast and mobile reading order',()=>{
 const html=source('pilot.html'),css=source('pilot-workspace.css');
 assert.ok(html.indexOf('class="pilot-workspace-sidebar"')<html.indexOf('class="pilot-workspace-main"'));
 assert.ok(css.includes('main#main:has(#entry[hidden]) .pilot-workspace-sidebar'));
 assert.ok(css.includes('main#main:has(#entry[hidden]) .hero.card'));
 assert.ok(css.includes('display:none!important;'));
 assert.ok(css.includes('body.bep-student-pilot:is(.high,.high-contrast) main#main .pilot-stage-track li'));
 assert.ok(css.includes('outline:3px solid Highlight'));
 const mobile=css.slice(css.indexOf('@media(max-width:930px)'));
 assert.ok(mobile.includes('.pilot-workspace-sidebar'));
 assert.ok(mobile.includes('display:none;'));
 assert.ok(!mobile.includes('order:2;'));
 assert.ok(css.includes('@media(max-width:480px)'));
 assert.ok(css.includes('#entry #code'));
});

test('premium full width entry does not duplicate the top stage tracker in sidebar',()=>{
 const html=source('pilot.html'),css=source('pilot-workspace.css');
 assert.ok(html.includes('class="pilot-sidebar-features"'));
 assert.ok(!html.includes('class="pilot-sidebar-steps"'));
 assert.ok(html.includes('Erişim senin kontrolünde'));
 assert.ok(html.includes('Yanıtlarını takip et'));
 assert.ok(html.includes('Kontrol ederek teslim et'));
 assert.ok(css.includes('.pilot-sidebar-features li>span'));
 assert.ok(css.includes('.pilot-workspace-shell'));
 assert.ok(css.includes('main#main:has(#entry[hidden]) .pilot-workspace-sidebar'));
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test('question navigation stops stale speech and keeps current heading focused',()=>{
 const js=source('pilot.mjs');
 assert.ok(js.includes('let lastPresentedQuestionIndex=-1,lastPresentationSingle=null;'));
 assert.ok(js.includes('const presentationChanged=lastPresentedQuestionIndex!==activeQuestionIndex||lastPresentationSingle!==single;'));
 assert.ok(js.includes('if(presentationChanged)douReader?.stop();'));
 assert.ok(js.includes('function updateQuestionNavigation(focus=false,autoRead=true)'));
 assert.ok(js.includes("cards[activeQuestionIndex]?.querySelector('h2')?.focus();"));
 assert.ok(js.includes('if(single&&presentationChanged&&autoRead)maybeAutoReadQuestion();'));
 assert.ok(js.includes("activeQuestionIndex=exam.questions.indexOf(q);$('one-question').checked=true;updateQuestionNavigation(true,false);"));
 assert.ok(!js.includes('if(focus&&single){'));
});
