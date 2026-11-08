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
