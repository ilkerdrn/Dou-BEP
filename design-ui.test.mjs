import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const text=name=>readFileSync(new URL(`./${name}`,import.meta.url),'utf8');
test('institutional pages include the local shared design stylesheet',()=>{
 for(const name of ['institution.html','institutional-exams.html','bep-import.html','index.html'])
  assert.match(text(name),/href="\/ui-refresh\.css"/);
});
test('anonymous pilot pages include the independent pilot stylesheet',()=>{
 for(const name of ['pilot.html','pilot-admin.html','accessibility-check.html','review-audio.html'])
  assert.match(text(name),/href="\/pilot-refresh\.css"/);
});
test('password toggle stays client-only and preserves input field identity',()=>{
 const html=text('institution.html'),js=text('design-interactions.mjs');
 assert.match(html,/id="login-password" name="password" type="password"/);
 assert.match(html,/id="toggle-password" type="button"/);
 assert.match(js,/aria-pressed/);
 assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|localStorage|sessionStorage/);
});
test('form still posts through existing login handler',()=>{
 const html=text('institution.html'),js=text('institution.mjs');
 assert.match(html,/id="login-form"/);
 assert.match(js,/login-form/);
 assert.match(html,/name="tenantId"/);
 assert.match(html,/name="email"/);
 assert.match(html,/name="password"/);
});
test('design keeps explicit prototype and reduced motion notices',()=>{
 assert.match(text('institution.html'),/resmî olarak onaylanmış/);
 assert.match(text('ui-refresh.css'),/prefers-reduced-motion/);
 assert.match(text('pilot-refresh.css'),/\.high/);
});
