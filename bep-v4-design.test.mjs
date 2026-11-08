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


test('V4 preserves optional CSS parity probe and removes legacy links after approval',()=>{
 const browser=read('./tools/browser-ui-acceptance.mjs');
 const scripts=JSON.parse(read('./package.json')).scripts;
 const guide=read('./docs/V4-CSS-RETIREMENT-GATE.md');
 assert.equal(scripts['design:v4:css-probe'],'node tools/browser-ui-acceptance.mjs --css-probe');
 assert.match(browser,/async function probeLegacySheet\(page,selectors\)/);
 assert.ok(browser.includes("process.argv.includes('--css-probe')||process.argv.includes('--css-parity')"),'CSS probe and parity flags must both trigger the probe');
 assert.equal(scripts['design:v4:parity'],'node tools/browser-ui-acceptance.mjs --css-parity');
 assert.match(browser,/BROWSER V4 CSS RETIREMENT PROBE/);
 assert.match(browser,/document\.querySelector\('\+JSON\.stringify\(query\)\+'\)\.disabled=false/);
 assert.match(browser,/BROWSER V4 CSS PROBE RESTORE DIAGNOSTIC/);
 assert.match(browser,/requestAnimationFrame/);
 assert.match(browser,/restoreIssues/);
 assert.match(guide,/admin-design-v3\.css/);
 for(const page of ['institution.html','institutional-exams.html']){
  assert.doesNotMatch(read('./'+page),/href="\/admin-design-v3\.css"/,'Retired V3 link must stay absent');
 }
});


test('V4 owns dashboard and exam geometry after retiring V3 links',()=>{
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
 // The isolated Edge comparison passed with zero differences; V3 links are now retired.
 for(const page of ['institution.html','institutional-exams.html'])
  assert.doesNotMatch(read('./'+page),/href="\/admin-design-v3\.css"/);
});


test('V4 retains disposable V3-off browser testing for historical and new fixtures',()=>{
 const code=read('./tools/browser-ui-acceptance.mjs');
 const scripts=JSON.parse(read('./package.json')).scripts;
 assert.equal(scripts['design:v4:without-v3'],'node tools/browser-ui-acceptance.mjs --without-v3');
 assert.match(code,/process\.argv\.includes\('--without-v3'\)/);
 assert.match(code,/BROWSER V4 WITHOUT V3/);
 assert.match(code,/el\.disabled=true/);
 assert.match(code,/requestAnimationFrame/);
 for(const page of ['institution.html','institutional-exams.html']){
  assert.doesNotMatch(read('./'+page),/href="\/admin-design-v3\.css"/);
 }
});


test('V4 guest and pending authentication never rely on V3 to hide admin navigation',()=>{
 const css=read('./bep-v4.css');
 for(const state of ['data-portal-auth="checking"','data-portal-auth="guest"',
  'data-exam-auth="checking"','data-exam-auth="guest"']){
  assert.ok(css.includes('['+state+']'),'Missing explicit V4 auth boundary: '+state);
 }
 assert.match(css,/\) :is\(\.dou-nav,\.portal-topbar\)\{\s*display:none!important/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)!important/);
 assert.match(css,/\[data-exam-auth="guest"\]\s+#exam-login-required\{\s*display:block/);
 const portal=read('./institution.html'),exam=read('./institutional-exams.html');
 assert.match(portal,/<body[^>]+data-portal-auth="checking"/);
 assert.match(exam,/<body[^>]+data-exam-auth="checking"/);
});


test('V4 preserves a visible mobile menu toggle independently of legacy V3',()=>{
 const css=read('./bep-v4.css');
 const browser=read('./tools/browser-ui-acceptance.mjs');
 assert.match(css,/body\.institution-page\.campus-layout\[data-design-version="4"\] \.dou-nav-toggle\{/);
 assert.match(css,/color:#801b2a!important/);
 assert.match(css,/background:#fff!important/);
 assert.match(css,/\.dou-nav-toggle span\{\s*background:currentColor!important/);
 assert.match(browser,/Mobile menu has contrasting burgundy icon on white surface/);
 assert.match(browser,/let primaryError=null/);
 assert.match(browser,/BROWSER CLEANUP WARNING/);
 assert.match(browser,/if\(primaryError\)throw primaryError/);
});


test('V4 still enforces strict computed visual parity and the retired stylesheet invariant',()=>{
 const code=read('./tools/browser-ui-acceptance.mjs');
 const scripts=JSON.parse(read('./package.json')).scripts;
 assert.equal(scripts['design:v4:parity'],'node tools/browser-ui-acceptance.mjs --css-parity');
 assert.match(code,/process\.argv\.includes\('--css-parity'\)/);
 assert.match(code,/V4 CSS visual parity gate FAILED/);
 assert.match(code,/changed\.length/);
 assert.match(code,/BROWSER V4 CSS RETIREMENT PROBE/);
 for(const page of ['institution.html','institutional-exams.html'])
  assert.doesNotMatch(read('./'+page),/href="\/admin-design-v3\.css"/);
});


test('V4 dashboard owns welcome heading and progress checklist geometry without V3',()=>{
 const css=read('./bep-v4.css');
 const browser=read('./tools/browser-ui-acceptance.mjs');
 assert.match(css,/\.campus-dashboard-stage \.dashboard-welcome h2\{\s*font-size:clamp\(23px,2\.5vw,34px\)!important/);
 assert.match(css,/\.campus-progress-steps\{\s*list-style:none!important/);
 assert.match(css,/\.campus-progress-steps li\{\s*display:flex!important/);
 assert.match(css,/\.campus-progress-steps li span\{\s*color:var\(--v4-primary\)!important/);
 assert.match(browser,/BROWSER V4 CSS PARITY SUMMARY/);
 assert.match(browser,/const cssParityFailures=\[\]/);
 assert.match(browser,/if\(cssParityFailures\.length\)/);
});


test('V4 exam step navigation retains V3-independent two-row flex structure and focus mode',()=>{
 const css=read('./bep-v4.css');
 for(const required of [
  '#exam-workspace .workflow-nav .workflow-caption',
  '#exam-workspace .workflow-nav .workflow-steps',
  '#exam-workspace .exam-focus-toggle',
  '#exam-workspace.exam-focus-mode .exam-grid>section:first-child'
 ])assert.ok(css.includes(required),'Missing V4-owned layout: '+required);
 assert.match(css,/order:3!important;flex:1 0 100%!important/);
 assert.match(css,/display:flex!important;flex-wrap:wrap!important/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/\.workflow-step\{\s*flex:0 0 auto!important/);
});


test('V4 dashboard retains text measurements without copying V3 brand colors',()=>{
 const css=read('./bep-v4.css');
 assert.match(css,/\.campus-dashboard-stage \.dashboard-welcome p\{\s*max-width:62ch!important;\s*font-size:13\.5px!important;\s*line-height:1\.65!important/);
 assert.match(css,/\.campus-summary-card h3\{\s*font-size:16px!important/);
 assert.match(css,/\.campus-summary-card p\{\s*font-size:12px!important;line-height:1\.6!important/);
 assert.match(css,/\.campus-notice-card>a\{\s*color:var\(--v4-primary\)!important/);
});


test('V4 independently sizes the dashboard secondary disclosure and inspects nested exam layout',()=>{
 const css=read('./bep-v4.css');
 const browser=read('./tools/browser-ui-acceptance.mjs');
 assert.match(css,/\.dashboard-more-tools\{\s*background:#fff!important/);
 assert.match(css,/margin:0 0 21px!important/);
 assert.match(css,/\.dashboard-more-tools>summary\{\s*cursor:pointer!important/);
 for(const selector of ['.dashboard-secondary-shortcuts','.workflow-caption',
  '.workflow-steps','.exam-question','.exam-optional-tool']){
  assert.ok(browser.includes("'"+selector+"'"),'Missing deep parity probe: '+selector);
 }
 assert.match(browser,/minHeight:s\.minHeight,overflow:s\.overflow/);
});


test('V4 deep parity contracts replace V3 dashboard and exam disclosure scaffolding',()=>{
 const css=read('./bep-v4.css');
 for(const selector of [
  '.campus-dashboard-aside','.dashboard-secondary-shortcuts',
  '#exam-workspace .workflow-pager','#exam-workspace .exam-question',
  '#exam-workspace .exam-question-advanced',
  '#exam-workspace .exam-optional-tool.campus-major-module'
 ])assert.ok(css.includes(selector),'Missing independent structural rule: '+selector);
 assert.match(css,/\.campus-dashboard-aside\{\s*display:grid!important/);
 assert.match(css,/\.dashboard-secondary-shortcuts\{\s*display:grid!important/);
 assert.match(css,/\.workflow-pager\{\s*order:4!important/);
 assert.match(css,/\.exam-question-advanced\{\s*margin:16px 0 0!important/);
 assert.match(css,/\.exam-optional-tool\.campus-major-module>summary\{\s*display:flex!important/);
});


test('V4 exam nested content sizing and dashboard shortcuts are independent of V3',()=>{
 const css=read('./bep-v4.css');
 for(const selector of [
  '.dashboard-secondary-shortcuts .dashboard-shortcut strong',
  '#exam-workspace .exam-grid>#exam-editor-card',
  '#exam-workspace #exam-editor-card>.portal-card-head',
  '#exam-workspace .exam-question .exam-q-head',
  '#exam-workspace .exam-optional-tool:not(.campus-major-module)>summary'
 ])assert.ok(css.includes(selector),'Missing migrated detail rule: '+selector);
 assert.match(css,/\.exam-question\{\s*margin-block:14px!important/);
 assert.match(css,/\.exam-optional-tool:not\(\.campus-major-module\)\{\s*margin:13px 0!important/);
 assert.match(css,/\.exam-optional-tool:not\(\.campus-major-module\)>summary\{\s*display:flex!important/);
});


test('V4 owns optional exam disclosure label stack and open state independently of V3',()=>{
 const css=read('./bep-v4.css');
 const browser=read('./tools/browser-ui-acceptance.mjs');
 assert.match(css,/\.exam-optional-tool>summary\{\s*display:flex!important;\s*flex-direction:column!important/);
 assert.match(css,/\.exam-optional-tool>summary::after\{\s*content:"Göster"/);
 assert.match(css,/\.exam-optional-tool\[open\]>summary::after\{\s*content:"Gizle"/);
 assert.match(css,/\.exam-question-advanced\[open\]>summary\{\s*margin-bottom:14px!important/);
 assert.ok(browser.includes("'.exam-optional-tool>summary'"));
 assert.ok(browser.includes("'.exam-optional-tool.campus-major-module>summary'"));
});


test('V4 exam overview spacing and module header surface do not depend on V3',()=>{
 const css=read('./bep-v4.css');
 assert.match(css,/\.exam-overview\{\s*margin:0 0 15px!important/);
 assert.match(css,/#exam-workspace :is\(\.exam-main-fields,\.exam-two\)\{\s*gap:13px!important/);
 assert.match(css,/\.exam-optional-tool\.campus-major-module>summary\{\s*background:#f7f9fd!important/);
 assert.match(css,/\.exam-overview>summary span\{\s*font-size:12px!important/);
});





test('V4 visual gate reports exact nested exam drift without changing strict comparisons',()=>{
 const browser=read('./tools/browser-ui-acceptance.mjs');
 const css=read('./bep-v4.css');
 assert.match(browser,/BROWSER V4 EXAM CHILD METRIC TRACE/);
 assert.match(browser,/const traceChanges=\[\]/);
 assert.match(browser,/V4 CSS visual parity gate FAILED/);
 assert.ok(!css.includes('/* Phase 18 — edit-card heading metrics'), 'Regressing header override must remain reverted');
});


test('V4 nested exam flow includes measured layout contracts from V3 retirement trace',()=>{
 const css=read('./bep-v4.css');
 assert.match(css,/#exam-workspace \.exam-subheading\{\s*padding-bottom:8px!important;\s*border-bottom:1px solid var\(--v4-border\)!important/);
 assert.match(css,/#exam-workspace \.exam-question-jump\{\s*display:flex!important/);
 assert.match(css,/#exam-workspace \.exam-question-jump\[hidden\]\{\s*display:none!important/);
 assert.match(css,/#exam-workspace \.exam-preflight\{\s*margin-top:24px!important/);
 assert.match(css,/#exam-workspace \.exam-optional-tool\.campus-major-module>section,/);
 assert.match(css,/min-height:43px!important;\s*line-height:1\.45!important/);
 assert.match(css,/#exam-workspace \.exam-grid textarea\{\s*min-height:82px!important/);
});


test('V4 parity trace inspects the two nested blocks that accumulate height drift',()=>{
 const browser=read('./tools/browser-ui-acceptance.mjs');
 assert.match(browser,/BROWSER V4 EXAM CHILD METRIC TRACE/);
 assert.ok(browser.includes('\\\".exam-subheading\\\"'));
 assert.ok(browser.includes('\\\".exam-preflight\\\"'));
});


test('V4 exam section actions stay horizontal without restoring the regressed heading padding',()=>{
 const css=read('./bep-v4.css');
 assert.match(css,/#exam-workspace \.exam-subheading h3\{\s*color:var\(--v4-text\)!important;\s*font-size:16px!important/);
 assert.match(css,/#exam-workspace \.exam-question-add-actions\{\s*display:flex!important/);
 assert.match(css,/justify-content:flex-end!important;\s*flex-wrap:wrap!important;\s*gap:9px!important/);
 assert.match(css,/#exam-workspace \.exam-question-add-actions \.portal-btn\{\s*min-height:40px!important/);
 assert.match(css,/#exam-workspace \.exam-subheading\{\s*padding-bottom:8px!important/);
});





test('V4 isolates exam editor title style and traces all remaining nested parity sources',()=>{
 const css=read('./bep-v4.css');
 const browser=read('./tools/browser-ui-acceptance.mjs');
 assert.match(css,/#exam-workspace #exam-editor-title\{\s*font-size:clamp\(19px,2vw,25px\)!important;\s*font-weight:780!important/);
 for(const selector of [
  '#exam-editor-card>.portal-card-head','#exam-preflight-body',
  '#exam-output-section','.editor-export-panel'
 ])assert.ok(browser.includes(selector),'Nested parity source not tracked: '+selector);
 assert.match(browser,/V4 CSS visual parity gate FAILED/);
});


test('V4 preflight next-action layout and final output trace remain V3-independent',()=>{
 const css=read('./bep-v4.css');
 const browser=read('./tools/browser-ui-acceptance.mjs');
 assert.match(css,/#exam-workspace \.preflight-next-action\{\s*display:flex!important/);
 assert.match(css,/justify-content:space-between!important;\s*align-items:center!important;\s*flex-wrap:wrap!important/);
 assert.match(css,/#exam-workspace \.preflight-next-action>div\{\s*flex:1 1 220px!important/);
 assert.match(css,/#exam-workspace \.preflight-next-action strong\{\s*display:block!important/);
 assert.match(css,/#exam-workspace \.preflight-next-action p\{\s*margin:0!important/);
 assert.ok(browser.includes('#exam-editor-card>.portal-card:last-child'));
 assert.ok(browser.includes('#exam-preflight-body>.preflight-next-action'));
 assert.match(browser,/V4 CSS visual parity gate FAILED/);
});


test('V4 final output section and related imports preserve their measured disclosure geometry',()=>{
 const css=read('./bep-v4.css');
 assert.match(css,/#exam-workspace #exam-output-section\{\s*margin-top:20px!important/);
 assert.match(css,/#exam-workspace \.exam-related-imports\{\s*margin:16px 0 0!important/);
 assert.match(css,/#exam-workspace \.exam-related-imports>summary\{\s*cursor:pointer!important/);
 assert.match(css,/#exam-workspace \.exam-related-imports\[open\]\{\s*padding-bottom:12px!important/);
 assert.match(css,/#exam-workspace \.exam-related-imports>summary:focus-visible\{\s*outline:3px solid var\(--v4-focus\)!important/);
});

test('V4 retired institutional routes do not load admin V3 but keep the original CSS asset',()=>{
 const v3=read('./admin-design-v3.css');
 assert.ok(v3.length>1000,'Original V3 asset must remain available for rollback');
 for(const page of ['institution.html','institutional-exams.html']){
  const html=read('./'+page);
  assert.doesNotMatch(html,/href="\/admin-design-v3\.css"/);
  assert.match(html,/href="\/bep-v4\.css"/);
 }
 const browser=read('./tools/browser-ui-acceptance.mjs');
 assert.match(browser,/BROWSER V4 CSS RETIREMENT VERIFIED/);
 assert.match(browser,/status\.v4!==1\|\|status\.legacy!==0/);
});


test('V4 dark institutional login hero has explicit readable foregrounds',()=>{
 const css=read('./bep-v4.css');
 const prefix='body.institution-page.campus-layout[data-design-version="4"][data-portal-auth="guest"] #login-view ';
 for(const item of [
  ['.login-intro h2','color:#fff!important'],
  ['.login-intro h2 span','color:#f4b2bf!important'],
  ['.login-intro>.portal-mini-label','color:#f5aabb!important'],
  ['.login-intro>p','color:#d7dce9!important'],
  ['.login-highlights strong','color:#f8f5fa!important'],
  ['.login-highlights small','color:#d4d9e8!important'],
  ['.login-intro-footer','color:#cbd0df!important']
 ]){
  const start=css.indexOf(prefix+item[0]+'{');
  assert.ok(start>=0,'Missing dark hero override: '+item[0]);
  assert.ok(css.slice(start,css.indexOf('}',start)).includes(item[1]),'Wrong hero foreground: '+item[0]);
 }
});


test('V4 authenticated dashboard task cards use legible typography on desktop and mobile',()=>{
 const css=read('./bep-v4.css');
 const scoped='body.institution-page.campus-layout[data-design-version="4"][data-portal-auth="authenticated"] .campus-dashboard-stage ';
 assert.ok(css.includes(scoped+'.dashboard-shortcut strong{'),'Task title rule must be authenticated and scoped');
 assert.ok(css.includes(scoped+'.dashboard-shortcut small{'),'Task description rule must be authenticated and scoped');
 assert.ok(css.includes(scoped+'.campus-progress-steps li{'),'Progress steps must be readable');
 assert.ok(css.includes('font-size:15px!important;'),'Task heading must not shrink to caption size');
 assert.ok(css.includes('font-size:12.5px!important;'),'Task supporting text must remain readable');
 assert.ok(css.includes('@media(max-width:670px){'),'Mobile layout must be retained');
});
