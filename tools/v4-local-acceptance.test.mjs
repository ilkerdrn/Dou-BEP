import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const src=readFileSync(new URL('./v4-local-acceptance.mjs',import.meta.url),'utf8');
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
test('single command v4 gate lists real existing test files and phases',()=>{
 const expected=['server-foundation/synthetic-permit-report-csv.test.mjs',
 'server-foundation/synthetic-session-permits.test.mjs',
 'server-foundation/accommodation-decisions.test.mjs','accommodation-time-plan.test.mjs',
 'server-foundation/operation-readiness.test.mjs',
 'server-foundation/accessibility-acceptance.test.mjs'];
 for(const p of expected){
  assert.match(src,new RegExp(p.replaceAll('.','\\.')));
  assert.ok(readFileSync(new URL('../'+p,import.meta.url),'utf8').length>0);
 }
 for(const key of ['node_tests','release_static','offline_assets','v4_design_tests',
  'v4_css_inventory','exam_closure','anonymous_pilot','browser_edge']){
  assert.ok(src.includes(`id:'${key}'`));
 }
});
test('gate launches via local node, writes unique temp report and stops on failures',()=>{
 assert.match(src,/spawnSync\(process\.execPath,step\.argv/);
 assert.match(src,/shell:false/);
 assert.match(src,/mkdtempSync\(join\(tmpdir\(\)/);
 assert.match(src,/writeFileSync\(reportFile,JSON\.stringify\(report,null,2\)/);
 assert.match(src,/if\(status==='FAIL'\)break/);
 assert.match(src,/productionReady:false/);
 assert.doesNotMatch(src,/git push|github actions|pilot_sessions.*UPDATE/);
});
test('quick, full and optional browser are explicit npm commands',()=>{
 assert.equal(pkg.scripts['acceptance:v4'],'node tools/v4-local-acceptance.mjs --full');
 assert.equal(pkg.scripts['acceptance:v4:quick'],'node tools/v4-local-acceptance.mjs --quick');
 assert.equal(pkg.scripts['acceptance:v4:browser'],'node tools/v4-local-acceptance.mjs --full --browser');
});
