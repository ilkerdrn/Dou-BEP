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
