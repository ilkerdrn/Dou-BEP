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
