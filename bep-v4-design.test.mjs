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
 for(const id of ['exam-drafts-panel','exam-editor-card','exam-autosave-state','exam-recovery-choose']){
  assert.ok(ui.includes('id="'+id+'"'),'Editor control must be preserved: '+id);
 }
 assert.match(ui,/class="exam-list-controls"/,'Exam list controls retain their semantic class');
 assert.match(css,/@media\(min-width:1200px\)/);
 assert.match(css,/grid-template-columns:minmax\(250px,285px\) minmax\(0,1fr\)!important/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/\.exam-grid>#exam-drafts-panel/);
 assert.match(css,/\.exam-grid>#exam-editor-card/);
 assert.match(browser,/BROWSER V4 EDITOR WORKBENCH/);
 assert.match(browser,/V4 mobile exam list stacks above authoring editor/);
});


test('V4 campus overrides the more specific V3 gradient and legacy brand declaration',()=>{
 const css=read('./bep-v4.css');
 assert.match(css,/body\.institution-page\.campus-layout\[data-design-version="4"\]/);
 assert.match(css,/body\.institution-page\.campus-layout\[data-design-version="4"\] \.dou-nav/);
 assert.match(css,/background-image:none!important/);
 assert.match(css,/--bep-brand:var\(--v4-primary\)/);
 assert.match(css,/\.dou-nav \.dou-nav-link\[aria-current="page"\]/);
 const source=read('./bep-design-system.css');
 assert.match(source,/body\.institution-page\.campus-layout\{/);
 assert.match(source,/--bep-brand:#8e1428/);
});


test('V4 coordination removes transparent hero and checks current palette in browser',()=>{
 const css=read('./bep-v4.css');
 const browser=read('./tools/browser-ui-acceptance.mjs');
 assert.match(css,/body\.institution-page:not\(\.campus-layout\)\[data-design-version="4"\] \.portal-hero\{/);
 assert.match(css,/background:#fff!important;background-image:none!important/);
 assert.match(browser,/BROWSER COORDINATION V4 CONTRAST/);
 assert.match(browser,/coordinationVisual\.heroColor==='rgb\(255, 255, 255\)'/);
 assert.match(browser,/coordinationVisual\.headingColor==='rgb\(32, 36, 49\)'/);
 assert.doesNotMatch(browser,/BROWSER COORDINATION V3 CONTRAST/);
});


test('V4 shortcut branding excludes old V3 primary color across migrated modules',()=>{
 const css=read('./bep-v4.css');
 const browser=read('./tools/browser-ui-acceptance.mjs');
 for(const selector of ['.bep-workflow-links a:first-child','.bep-section-nav a:first-child',
   '.bep-task-shortcuts a:first-child','.bep-lab-shortcuts a:first-child']){
  assert.ok(css.includes(selector),'V4 primary shortcut missing: '+selector);
 }
 assert.match(css,/background:var\(--v4-primary\)!important/);
 assert.match(browser,/lab\.firstBg==='rgb\(122, 31, 43\)'/);
 assert.match(browser,/layout\.firstBg==='rgb\(122, 31, 43\)'/);
 assert.match(browser,/flow\.firstBg==='rgb\(122, 31, 43\)'/);
 assert.match(browser,/task\.accent==='rgb\(122, 31, 43\)'/);
 assert.doesNotMatch(browser,/\['rgb\(142, 20, 40\)','rgb\(122, 31, 43\)'\]/);
});


test('V4 provides opt-in isolated CSS retirement comparison before removing V3 links',()=>{
 const browser=read('./tools/browser-ui-acceptance.mjs');
 const scripts=JSON.parse(read('./package.json')).scripts;
 const guide=read('./docs/V4-CSS-RETIREMENT-GATE.md');
 assert.equal(scripts['design:v4:css-probe'],'node tools/browser-ui-acceptance.mjs --css-probe');
 assert.match(browser,/async function probeLegacySheet\(page,selectors\)/);
 assert.match(browser,/if\(process\.argv\.includes\('--css-probe'\)\)/);
 assert.match(browser,/BROWSER V4 CSS RETIREMENT PROBE/);
 assert.match(browser,/document\.querySelector\('\+JSON\.stringify\(query\)\+'\)\.disabled=false/);
 assert.match(browser,/BROWSER V4 CSS PROBE RESTORE DIAGNOSTIC/);
 assert.match(browser,/requestAnimationFrame/);
 assert.match(browser,/restoreIssues/);
 assert.match(guide,/admin-design-v3\.css/);
 for(const page of ['institution.html','institutional-exams.html']){
  assert.match(read('./'+page),/href="\/admin-design-v3\.css"/,'Do not remove before comparison');
 }
});


test('V4 owns dashboard and exam geometry before the V3 stylesheet can be retired',()=>{
 const css=read('./bep-v4.css');
 const browser=read('./tools/browser-ui-acceptance.mjs');
 for(const selector of [
  '.campus-dashboard-stage .dashboard-welcome',
  '.campus-dashboard-stage>.campus-dashboard-main>.dashboard-shortcuts',
  '.campus-dashboard-stage .dashboard-shortcut',
  '#exam-workspace .exam-workbench-heading',
  '#exam-workspace .workflow-nav'
 ])assert.ok(css.includes(selector),'Explicit V4 geometry rule missing: '+selector);
 assert.match(css,/body\.institution-page\.campus-layout\[data-design-version="4"\] \.portal-topbar/);
 assert.match(css,/@media\(min-width:1121px\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(265px,310px\)!important/);
 assert.match(browser,/BROWSER V4 CSS RETIREMENT PROBE/);
 // Preserve V3 in markup until the real Edge toggle has measured zero remaining differences.
 for(const page of ['institution.html','institutional-exams.html'])
  assert.match(read('./'+page),/href="\/admin-design-v3\.css"/);
});


test('V4 can exercise existing browser acceptance with V3 disabled only in the disposable test DOM',()=>{
 const code=read('./tools/browser-ui-acceptance.mjs');
 const scripts=JSON.parse(read('./package.json')).scripts;
 assert.equal(scripts['design:v4:without-v3'],'node tools/browser-ui-acceptance.mjs --without-v3');
 assert.match(code,/process\.argv\.includes\('--without-v3'\)/);
 assert.match(code,/BROWSER V4 WITHOUT V3/);
 assert.match(code,/el\.disabled=true/);
 assert.match(code,/requestAnimationFrame/);
 for(const page of ['institution.html','institutional-exams.html']){
  assert.match(read('./'+page),/href="\/admin-design-v3\.css"/);
 }
});
