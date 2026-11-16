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
