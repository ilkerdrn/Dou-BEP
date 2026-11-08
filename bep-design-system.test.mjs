import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = name => readFileSync(new URL(name,import.meta.url),'utf8');

test('V3 visual contract is shared by institution and exam pages, last in cascade',()=>{
 for(const file of ['institution.html','institutional-exams.html']){
  const source=read('./'+file);
  const sheets=[...source.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(sheets.at(-1),'/bep-design-system.css',file+' V3 CSS must load last');
  assert.equal(sheets.filter(x=>x==='/bep-design-system.css').length,1);
  assert.match(source,/class="institution-page campus-layout"/);
  assert.match(source,/href="#dou-content"/);
 }
});
test('unified CSS route is explicitly allowlisted and backed by source file',()=>{
 const source=read('./server.mjs');
 assert.match(source,/['"]\/bep-design-system\.css['"]\s*:\s*\[['"]bep-design-system\.css['"]/);
 const css=read('./bep-design-system.css');
 for(const token of ['--bep-bg','--bep-surface','--bep-text','--bep-brand','--bep-border','--bep-focus']){
  assert.ok(css.includes(token),'Missing '+token);
 }
 assert.match(css,/focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/\[hidden\]/);
});
test('auth controls, MFA and separate exam module are retained',()=>{
 const login=read('./institution.html');
 const exam=read('./institutional-exams.html');
 for(const id of ['login-form','login-password','toggle-password','mfa-login-form','workspace-view']){
  assert.ok(login.includes('id="'+id+'"'),'Missing login element '+id);
 }
 assert.match(exam,/id="exam-workspace"/);
 assert.match(read('./institution.mjs'),/\/login\/mfa/);
 assert.match(read('./design-interactions.mjs'),/toggle-password/);
});


test('approved burgundy reference has consistent navigation, workflow and editor styling',()=>{
 const css=read('./bep-design-system.css');
 for(const selector of [
  '.portal-topbar','.dou-nav-sections','.dou-create','.dou-nav-link',
  '.exam-workbench-heading','.workflow-nav','.workflow-step',
  '#exam-drafts-panel','#exam-editor-card','.portal-btn.primary',
  '.exam-list-controls','.exam-overview','.portal-user'
 ]) assert.ok(css.includes(selector),'Missing design region '+selector);
 for(const token of ['#8e1428','#f8f4f5','#fff']){
  assert.ok(css.includes(token),'Missing approved reference color '+token);
 }
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 // Non-destructive structural guard for accidental truncation of source CSS.
 let depth=0;
 for(const char of css){if(char==='{')depth++;if(char==='}')depth--;assert.ok(depth>=0,'Unbalanced CSS block');}
 assert.equal(depth,0,'Unclosed CSS block');
});


const ADMIN_SCREENS = [
 'institution.html','institutional-exams.html','batch-exams.html',
 'accommodation-admin.html','coordination.html','operations.html',
 'acceptance.html','pilot-admin.html','exam-source-import.html',
 'bep-import.html','accessibility-check.html','dou-reader-demo.html',
 'dou-speech-phoneme.html','dou-speech-pool.html',
 'dou-speech-listening.html','dou-speech-intelligibility.html'
];
test('all V3 administrative pages use a single final design layer',()=>{
 for(const file of ADMIN_SCREENS){
  const source=read('./'+file);
  const styles=[...source.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(styles.at(-1),'/bep-design-system.css',file+' must load V3 last');
  assert.equal(styles.filter(x=>x==='/bep-design-system.css').length,1,file+' must not repeat CSS');
  assert.match(source,/<body[^>]*class="[^"]*(institution-page|dou-admin-standalone)/,file);
  assert.match(source,/class="portal-side dou-nav"/,file+' must retain navigation');
  assert.match(source,/src="\/admin-navigation.js"/,file+' must retain navigation script');
 }
});
test('student-facing pilot and independent audio review stay isolated',()=>{
 for(const file of ['pilot.html','review-audio.html']){
  const html=read('./'+file);
  assert.doesNotMatch(html,/bep-design-system\.css/);
 }
});
test('V3 CSS covers legacy standalone, campus and portal layout families',()=>{
 const css=read('./bep-design-system.css');
 assert.match(css,/body\.dou-admin-standalone/);
 assert.match(css,/body\.institution-page\.campus-layout/);
 assert.match(css,/body\.institution-page:not\(\.campus-layout\)/);
});


test('premium full-screen login has no external gutters or floating outer card',()=>{
 const css=read('./bep-design-system.css');
 assert.match(css,/data-portal-auth="guest"\] #login-view\.portal-login-card\{/);
 assert.match(css,/min-height:100dvh!important/);
 assert.match(css,/max-width:none!important/);
 assert.match(css,/border-radius:0!important/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
 assert.match(css,/@media\(max-width:900px\)/);
});


test('classic coordination theme retains legible sidebar and light hero',()=>{
 const css=read('./bep-design-system.css');
 const html=read('./coordination.html');
 for(const selector of [
  '.dou-nav-link.portal-menu:not(.current):not([aria-current="page"])',
  '.dou-nav-find input',
  '.portal-hero h1',
  '.coord-kpis>div',
  '.coord-table th'
 ]) assert.ok(css.includes(selector),'Missing classic theme correction: '+selector);
 assert.match(html,/class="portal-hero"/);
 assert.match(html,/class="coord-kpis"/);
 assert.match(html,/id="coord-form"/);
});


test('coordination uses three readable form groups and working anchor destinations',()=>{
 const html=read('./coordination.html');
 const css=read('./bep-design-system.css');
 assert.equal((html.match(/class="coord-form-divider coord-wide"/g)||[]).length,3);
 for(const id of ['coord-form-title','coord-schedule-title']){
  assert.ok(html.includes('id="'+id+'"'),'Missing navigation anchor '+id);
  assert.ok(html.includes('href="#'+id+'"'),'Missing shortcut to '+id);
 }
 for(const field of ['term','department','program','courseCode','courseName',
  'examLabel','startsAt','durationMinutes','instructorCode','roomCode','examId']){
  assert.ok(html.includes('name="'+field+'"'),'Lost form field '+field);
 }
 assert.match(css,/\.coord-quick-nav a:focus-visible/);
 assert.match(css,/\.coord-form-divider/);
});


test('batch and accommodation screens have accessible shortcuts and preserved workflows',()=>{
 const screens=[
  ['batch-exams.html',['step-exam','step-list','step-review','step-export']],
  ['accommodation-admin.html',['decision-form-title','decision-records-title']]
 ];
 for(const [file,ids] of screens){
  const html=read('./'+file);
  assert.match(html,/<body class="institution-page bep-task-page">/);
  assert.match(html,/class="bep-task-shortcuts"/);
  for(const id of ids){
   assert.ok(html.includes('id="'+id+'"'),file+' missing destination '+id);
   assert.ok(html.includes('href="#'+id+'"'),file+' missing shortcut '+id);
  }
 }
 const batch=read('./batch-exams.html');
 const decisions=read('./accommodation-admin.html');
 for(const id of ['batch-workspace','batch-mappings-section','batch-refresh','batch-message']){
  assert.ok(batch.includes('id="'+id+'"'),'Lost batch workflow element '+id);
 }
 for(const id of ['decision-workspace','decision-form','decision-adjustments','decision-save','decision-history']){
  assert.ok(decisions.includes('id="'+id+'"'),'Lost decision workflow element '+id);
 }
 const css=read('./bep-design-system.css');
 assert.match(css,/\.bep-task-shortcuts a:focus-visible/);
 assert.match(css,/@media\(max-width:480px\)/);
});


test('operations and acceptance pages preserve controls and link to local sections',()=>{
 const screens=[
  ['operations.html',['ops-summary','ops-exam-readiness','ops-next-actions'],['ops-refresh','ops-rows','ops-term','ops-app']],
  ['acceptance.html',['accept-summary','exam-head'],['review-form','review-submit','exam-list','status-filter']]
 ];
 for(const [file,anchors,controls] of screens){
  const html=read('./'+file);
  assert.match(html,/class="bep-workflow-links"/,file+' must provide task navigation');
  for(const id of anchors){
   assert.ok(html.includes('href="#'+id+'"'),'Missing task shortcut '+id);
   assert.ok(html.includes('id="'+id+'"'),'Missing task destination '+id);
  }
  for(const id of controls){
   assert.ok(html.includes('id="'+id+'"'),'Missing existing control '+id);
  }
 }
 const acceptance=read('./acceptance.html');
 assert.equal((acceptance.match(/id="dou-content"/g)||[]).length,1);
 assert.doesNotMatch(acceptance,/id="dou-content" id=/);
 const css=read('./bep-design-system.css');
 assert.match(css,/\.bep-ops-page/);
 assert.match(css,/\.bep-accept-page/);
 assert.match(css,/\.bep-workflow-links a:first-child/);
});


test('document import and accessibility checklist keep their functional controls and anchor targets',()=>{
 for(const [file,cssClass,anchors,controls] of [
  ['exam-source-import.html','bep-import-ux',['source-setup','source-result'],['source-file','source-preview','source-confirm','source-save']],
  ['accessibility-check.html','bep-audit-ux',['pilot-env-title','pilot-summary-title','pilot-checks-title','pilot-rule-title'],['pilot-reader','pilot-progress','checks','pilot-export-json','pilot-import-json']]
 ]){
  const html=read('./'+file);
  assert.match(html,/class="bep-task-shortcuts"/);
  assert.ok(html.includes(cssClass),file+' missing V3 page scope');
  for(const id of anchors){
   assert.ok(html.includes('id="'+id+'"'),file+' lost anchor '+id);
   assert.ok(html.includes('href="#'+id+'"'),file+' lost shortcut '+id);
  }
  for(const id of controls)assert.ok(html.includes('id="'+id+'"'),file+' lost control '+id);
 }
 const css=read('./bep-design-system.css');
 assert.match(css,/\.bep-import-ux/);
 assert.match(css,/\.bep-audit-ux/);
});


test('pilot and BEP goal import provide focused navigation without losing controls',()=>{
 const pages=[
  ['pilot-admin.html','bep-pilot-ux',['pilot-session-create','pilot-session-list','cohort-heading'],['exams','create','sessions','cohort-load','review-form']],
  ['bep-import.html','bep-goals-ux',['bep-step-source','bep-step-review'],['bep-file','bep-text','bep-preview','bep-confirm','bep-create']]
 ];
 for(const [path,scope,targets,controls] of pages){
  const html=read('./'+path);
  assert.ok(html.includes(scope),path+' missing page scope');
  assert.match(html,/class="bep-section-nav"/);
  for(const id of targets){
   assert.ok(html.includes('id="'+id+'"'),path+' missing destination '+id);
   assert.ok(html.includes('href="#'+id+'"'),path+' missing navigation for '+id);
  }
  for(const id of controls) assert.ok(html.includes('id="'+id+'"'),path+' lost control '+id);
 }
 const css=read('./bep-design-system.css');
 assert.match(css,/\.bep-pilot-ux/);
 assert.match(css,/\.bep-goals-ux/);
});


test('offline reader and speech laboratories preserve their controls and skip targets',()=>{
 const labs=[
  ['dou-reader-demo.html',['free-text-lab','reader-title','synth-title'],['free-text-input','free-text-rate']],
  ['dou-speech-phoneme.html',['ident-title','phoneme-matrix'],['phoneme-play','phoneme-choice-0']],
  ['dou-speech-pool.html',['pool-files','pool-results'],['pool-analyze','pool-download']],
  ['dou-speech-listening.html',['study-title','study-export'],['play-A','play-B']],
  ['dou-speech-intelligibility.html',['rec-protocol','rec-breakdown-area','audit-heading'],['rec-play','rec-choices']]
 ];
 for(const [file,targets,controls] of labs){
  const html=read('./'+file);
  assert.match(html,/class="dou-admin-standalone bep-speech-ux"/);
  assert.match(html,/class="bep-lab-shortcuts"/);
  for(const id of targets){
   assert.ok(html.includes('id="'+id+'"'),file+' missing destination '+id);
   assert.ok(html.includes('href="#'+id+'"'),file+' missing shortcut '+id);
  }
  for(const id of controls) assert.ok(html.includes('id="'+id+'"'),file+' missing control '+id);
  const skip=html.match(/class="dou-skip" href="#([^"]+)"/);
  assert.ok(skip&&html.includes('id="'+skip[1]+'"'),file+' skip link must resolve');
 }
 const css=read('./bep-design-system.css');
 assert.match(css,/body\.dou-admin-standalone\.bep-speech-ux/);
});


test('V3 color tokens are canonical and coordination mobile headline does not get overwritten',()=>{
 const css=read('./bep-design-system.css');
 const blocks=[...css.matchAll(/body\.institution-page\.campus-layout\{([^{}]*)\}/g)];
 assert.ok(blocks.length>=2,'Base semantics and palette blocks must exist');
 for(const token of ['--bep-bg','--bep-surface','--bep-text','--bep-muted','--bep-brand','--bep-brand-hover','--bep-border','--bep-focus','--bep-radius','--bep-shadow']){
  const declarations=blocks.filter(m=>m[1].split('\n').some(line=>line.trim().startsWith(token+':')));
  assert.equal(declarations.length,1,'Repeated V3 base token '+token);
 }
 const desktop=css.lastIndexOf('font-size:clamp(25px,2.65vw,36px)!important');
 const mobile=css.lastIndexOf('font-size:clamp(26px,7vw,33px)!important');
 assert.ok(desktop>=0&&mobile>desktop,'Mobile headline sizing must come after desktop override');
});


test('single full-width layout and offline Turkish menu search contract',()=>{
 const css=read('./bep-design-system.css');
 const nav=read('./admin-navigation.js');
 assert.doesNotMatch(css,/max-width:1440px!important/,'Old content width would conflict with V3');
 assert.doesNotMatch(css,/max-width:1120px!important/,'Guest login should not be centered');
 assert.match(css,/body\.institution-page\.campus-layout\[data-portal-auth="guest"\]:has\(#login-view:not\(\[hidden\]\)\) \.portal-content/);
 assert.match(nav,/\.normalize\('NFKD'\)/);
 assert.match(nav,/\.replace\(\/ı\/g,'i'\)/);
 assert.match(nav,/\.replace\(\/ş\/g,'s'\)/);
 assert.match(nav,/field\.dispatchEvent|field\.addEventListener\('input',filter\)/);
});
