import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('institutional exam guest page is a full-width accessible login, not an empty canvas',()=>{
 const html=source('institutional-exams.html');
 const css=source('institutional-exam-premium.css');
 const server=source('server.mjs');
 assert.ok(html.includes('href="/institutional-exam-premium.css"'));
 assert.ok(server.includes("'/institutional-exam-premium.css':['institutional-exam-premium.css','text/css; charset=utf-8']"));
 assert.match(html,/id="exam-login-required" class="portal-login-card exam-auth-landing" hidden aria-labelledby="exam-auth-heading"/);
 assert.ok(html.includes('id="exam-auth-heading"'));
 assert.ok(html.includes('class="exam-auth-intro"'));
 assert.ok(html.includes('class="exam-auth-aside"'));
 assert.ok(html.includes('href="/kurum" class="portal-btn primary exam-link"'));
 assert.ok(html.includes('class="exam-auth-steps"'));
 assert.ok(css.includes('grid-template-columns:minmax(0,1.08fr) minmax(360px,.92fr)'));
 assert.ok(css.includes('min-height:clamp(560px,calc(100dvh - 188px),760px)'));
 assert.ok(css.includes('@media(max-width:1060px)'));
 assert.ok(css.includes('@media(max-width:650px)'));
 assert.ok(css.includes('@media(forced-colors:active)'));
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
 assert.doesNotMatch(css,/https?:\/\//);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test('guest screen preserves authentication boundary and existing editor behavior',()=>{
 const html=source('institutional-exams.html');
 const js=source('institutional-exams.mjs');
 const css=source('institutional-exam-premium.css');
 for(const id of ['exam-login-required','exam-loading','exam-workspace','exam-retry','exam-auth-heading',
  'exam-save','exam-approve','exam-quality','exam-delivery-profile']){
  assert.equal(html.split('id="'+id+'"').length,2,id);
 }
 assert.ok(js.includes("document.body.dataset.examAuth='guest'"));
 assert.ok(js.includes("$('exam-login-required').hidden=false"));
 assert.ok(js.includes("const prompt=$('exam-login-required').querySelector('p');"));
 assert.ok(html.includes('Sınavlar yalnızca doğrulanmış kurum oturumuyla saklanır ve paylaşılır.'));
 assert.ok(css.includes('[data-exam-auth="guest"]'));
 assert.ok(css.includes('[data-exam-auth="authenticated"]'));
 assert.ok(css.includes('#exam-login-required[hidden]'));
 assert.ok(!css.includes('display:block!important;position:fixed'));
});

test('entire authenticated exam workspace shares a responsive institutional design system',()=>{
 const html=source('institutional-exams.html');
 const css=source('institutional-exam-workspace.css');
 const server=source('server.mjs');
 const js=source('institutional-exams.mjs');
 assert.ok(html.includes('<link rel="stylesheet" href="/institutional-exam-workspace.css">'));
 assert.ok(server.includes("'/institutional-exam-workspace.css':['institutional-exam-workspace.css','text/css; charset=utf-8']"));
 assert.ok(js.includes("document.body.dataset.examAuth='authenticated'"));
 for(const section of ['#exam-workspace .exam-workbench-heading','#exam-workspace .workflow-steps',
  '#exam-workspace .exam-grid','#exam-workspace #exam-drafts-panel',
  '#exam-workspace #exam-editor-card','#exam-workspace .editor-command-main']){
  assert.ok(css.includes(section),section);
 }
 for(const selector of ['.portal-side.dou-nav','.portal-topbar','.dou-nav-link:not([hidden])',
  '#dou-nav-search','.workflow-step','.exam-list-controls','.exam-autosave-panel',
  '.editor-ribbon','.portal-btn.primary','.editor-export-panel']){
  assert.ok(css.includes(selector),selector);
 }
 for(const id of ['dou-nav-search','exam-drafts-panel','exam-editor-card','workflow-next',
  'exam-save','exam-approve','exam-search','exam-status-filter','exam-delivery-profile']){
  assert.equal(html.split('id="'+id+'"').length,2,id);
 }
 assert.ok(css.includes('data-exam-auth="authenticated"'));
 assert.ok(css.includes('@media(max-width:1380px)'));
 assert.ok(css.includes('@media(max-width:1060px)'));
 assert.ok(css.includes('@media(max-width:650px)'));
 assert.ok(css.includes('@media(forced-colors:active)'));
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
 assert.doesNotMatch(css,/https?:\/\//);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test('whole-page theme preserves focus mode, hidden navigation and guest access gate',()=>{
 const css=source('institutional-exam-workspace.css');
 const html=source('institutional-exams.html');
 assert.ok(css.includes('.dou-nav-link:not([hidden])'));
 assert.ok(css.includes('#exam-workspace.exam-focus-mode .exam-grid'));
 assert.ok(css.includes('#exam-workspace.exam-focus-mode .exam-grid>#exam-drafts-panel'));
 assert.ok(css.includes('display:none!important;'));
 assert.ok(css.includes('#exam-workspace.exam-focus-mode .exam-grid>#exam-editor-card'));
 assert.ok(html.includes('id="exam-login-required"'));
 assert.ok(html.includes('id="exam-workspace" hidden'));
 assert.ok(css.includes('[data-exam-auth="authenticated"]'));
 assert.ok(!css.includes('[data-exam-auth="guest"]'));
});
