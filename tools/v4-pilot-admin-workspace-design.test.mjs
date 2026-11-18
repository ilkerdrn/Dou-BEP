import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('modern pilot session dashboard is wired and preserves real actions',()=>{
 const html=source('pilot-admin.html'),css=source('pilot-admin-workspace.css');
 const server=source('server.mjs'),js=source('pilot-admin.mjs');
 assert.ok(html.includes('href="/pilot-admin-workspace.css"'));
 assert.ok(server.includes("'/pilot-admin-workspace.css':['pilot-admin-workspace.css','text/css; charset=utf-8']"));
 for(const id of ['dou-content','workspace','login','message','actor','pilot-session-create','pilot-session-list',
  'exams','create','refresh','new-code','code','copy','sessions','pilot-session-filter','pilot-session-count',
  'cohort-panel','cohort-heading','cohort-load','cohort-status','cohort-results','details','answers',
  'review-form','review-questions','review-save','review-draft-status','review-first-unscored']){
  assert.equal(html.split('id="'+id+'"').length,2,id);
 }
 for(const token of ['pilot-admin-hero','pilot-admin-hero-flow','pilot-admin-tabs',
  'pilot-admin-primary-grid','pilot-admin-create-card','pilot-admin-list-card','pilot-admin-cohort-card']){
  assert.ok(html.includes(token),token);
 }
 assert.ok(js.includes("const $=id=>document.getElementById(id)"));
 assert.ok(html.includes('id="workspace" class="pilot-admin-workspace" hidden'));
 assert.ok(html.includes('id="login" class="card" hidden'));
 assert.ok(css.includes('body.bep-pilot-ux.dou-admin-standalone[data-design-version="4"]'));
 assert.ok(css.includes('#workspace [hidden]'));
 assert.ok(css.includes('grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr)'));
 assert.ok(css.includes('@media(max-width:1100px)'));
 assert.ok(css.includes('@media(max-width:760px)'));
 assert.ok(css.includes('@media(forced-colors:active)'));
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
 assert.doesNotMatch(css,/https?:\/\//);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test('teacher session policy, code and review features remain intact',()=>{
 const html=source('pilot-admin.html');
 const js=source('pilot-admin.mjs');
 assert.ok(html.includes('en fazla 30 soru'));
 assert.ok(html.includes('Gerçek öğrenci kimliği, sağlık kaydı veya çocuk sesini sisteme almayın.'));
 assert.ok(html.includes('Küçük grupların puanları gizlenir; en az 3 ayrı değerlendirme gereklidir.'));
 assert.ok(html.includes('Bu anonim pilotta otomatik puan, tanı veya başarı sınıflaması yapılmaz.'));
 assert.ok(js.includes("api('/pilot/eligible-exams')"));
 assert.ok(js.includes("api('/pilot')"));
 assert.ok(html.includes('href="/pilot" target="_blank"'));
});
