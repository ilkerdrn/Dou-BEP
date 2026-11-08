import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('V4 uses exactly one new institutional foundation on login and exam',()=>{
 for(const page of ['institution.html','institutional-exams.html']){
  const html=read('./'+page);
  assert.match(html,/<body data-design-version="4" class="institution-page campus-layout"/);
  const css=[...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(css.at(-1),'/bep-v4.css');
  assert.equal(css.filter(path=>path==='/bep-v4.css').length,1);
 }
 const server=read('./server.mjs');
 assert.match(server,/['"]\/bep-v4\.css['"]:\[['"]bep-v4\.css['"]/);
});

test('V4 tokens, interaction states and responsive rules are source-controlled',()=>{
 const css=read('./bep-v4.css');
 for(const token of ['--v4-primary:#7a1f2b','--v4-bg:#f7f7f8','--v4-border:#e6e7eb','--v4-text:#202431','--v4-focus:#9f3149']){
  assert.ok(css.includes(token),'V4 token missing: '+token);
 }
 assert.match(css,/\[data-design-version="4"\]/);
 assert.match(css,/focus-visible/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css,/prefers-reduced-motion/);
 assert.doesNotMatch(css,/https?:\/\//,'No external CSS resources');
});

test('V4 design plan includes preservation and true visual acceptance gates',()=>{
 const blueprint=read('./docs/V4-KURUMSAL-TASARIM-BLUEPRINT.md');
 for(const phrase of ['SQLite','100 soruluk','NVDA','/eski-sinav-tasarimci','320px']){
  assert.ok(blueprint.includes(phrase),'Blueprint missing '+phrase);
 }
 assert.match(read('./index.html'),/app\.mjs/,'Legacy editor source preserved');
});


test('V4 entry and administrative routes share one final CSS contract',()=>{
 const pages=[
  'institution.html','institutional-exams.html','coordination.html',
  'batch-exams.html','accommodation-admin.html','operations.html',
  'acceptance.html','pilot-admin.html','exam-source-import.html',
  'bep-import.html','accessibility-check.html','dou-reader-demo.html',
  'dou-speech-phoneme.html','dou-speech-pool.html',
  'dou-speech-listening.html','dou-speech-intelligibility.html'
 ];
 for(const page of pages){
  const html=read('./'+page);
  assert.match(html,/<body[^>]*data-design-version="4"/,page+' must opt into V4');
  const styles=[...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+\.css)"/g)].map(m=>m[1]);
  assert.equal(styles.at(-1),'/bep-v4.css',page+' requires V4 as final stylesheet');
  assert.equal(styles.filter(x=>x==='/bep-v4.css').length,1,page+' must not duplicate V4');
  assert.match(html,/admin-navigation\.js/,page+' retains the shared accessible navigation');
 }
});
test('V4 migration CSS preserves user flows and styles standalone routes consistently',()=>{
 const css=read('./bep-v4.css');
 for(const selector of ['.dou-admin-standalone','.ops-panel','.pilot-block','.bep-speech-ux main','.bep-task-shortcuts']){
  assert.ok(css.includes(selector),'Missing shared shell rule '+selector);
 }
 assert.match(css,/@media\(max-width:720px\)/);
 assert.doesNotMatch(css,/@import\s/i,'No remote CSS import');
});


test('V4 authenticated dashboard and exam editor share a restrained task-oriented layout',()=>{
 const dashboard=read('./institution.html');
 const editor=read('./institutional-exams.html');
 const css=read('./bep-v4.css');
 for(const id of ['workspace-view','login-form','mfa-panel','member-form','audit-panel']){
  assert.ok(dashboard.includes('id="'+id+'"'),'Preserve institutional workflow '+id);
 }
 for(const id of ['exam-workspace','exam-drafts-panel','exam-editor-card','exam-focus-toggle','workflow-next','exam-autosave-state']){
  assert.ok(editor.includes('id="'+id+'"'),'Preserve exam workflow '+id);
 }
 for(const selector of ['.campus-dashboard-stage','.dashboard-welcome','.dashboard-shortcuts','.dashboard-shortcut',
  '.campus-summary-card','.workflow-steps','.workflow-step.active','.exam-autosave-panel','.exam-grid']){
  assert.ok(css.includes(selector),'Missing V4 styling for '+selector);
 }
 assert.match(css,/@media\(max-width:1120px\)/);
 assert.match(css,/@media\(max-width:670px\)/);
});


test('V4 acceptance checks real browser styling instead of old gradient contract',()=>{
 const css=read('./bep-v4.css');
 const browser=read('./tools/browser-ui-acceptance.mjs');
 const scripts=JSON.parse(read('./package.json')).scripts;
 assert.equal(scripts['design:v4:acceptance'],'npm run design:v4:check && npm run ui:browser');
 assert.match(css,/data-portal-auth="authenticated"\] \.portal-hero/);
 assert.match(css,/data-exam-auth="authenticated"\] \.exam-hero/);
 assert.match(css,/\.dashboard-more-tools/);
 assert.match(browser,/V4 institutional burgundy token is active/);
 assert.match(browser,/V4 dashboard sidebar is neutral/);
 assert.match(browser,/V4 design stylesheet is last/);
 assert.doesNotMatch(browser,/V3 CSS is last/);
});


test('V4 exam editor explicitly defines responsive desktop and mobile column behavior',()=>{
 const css=read('./bep-v4.css');
 const ui=read('./institutional-exams.html');
 const browser=read('./tools/browser-ui-acceptance.mjs');
 for(const id of ['exam-drafts-panel','exam-editor-card','exam-list-controls','exam-autosave-state','exam-recovery-choose']){
  assert.ok(ui.includes('id="'+id+'"'),'Editor control must be preserved: '+id);
 }
 assert.match(css,/@media\(min-width:1200px\)/);
 assert.match(css,/grid-template-columns:minmax\(250px,285px\) minmax\(0,1fr\)!important/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/\.exam-grid>#exam-drafts-panel/);
 assert.match(css,/\.exam-grid>#exam-editor-card/);
 assert.match(browser,/BROWSER V4 EDITOR WORKBENCH/);
 assert.match(browser,/V4 mobile exam list stacks above authoring editor/);
});
