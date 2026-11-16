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
 assert.match(html,/id="reader-status" role="status" aria-live="polite"/);
 assert.match(html,/id="pilot-question-map"[^>]*aria-label="Soru numaraları"/);
 assert.match(html,/<details class="pilot-lab-disclosure">/);
 assert.equal((html.match(/<details\\b/g)||[]).length,(html.match(/<\/details>/g)||[]).length);
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
