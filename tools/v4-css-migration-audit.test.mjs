import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const script=join(root,'tools','v4-css-migration-audit.mjs');

test('V4 stylesheet inventory is read-only and finds all migrated routes',()=>{
 const run=spawnSync(process.execPath,[script,'--json','--strict'],{
  cwd:root,encoding:'utf8',timeout:15000
 });
 assert.equal(run.status,0,run.stderr||run.stdout);
 const report=JSON.parse(run.stdout);
 assert.equal(report.status,'PASS');
 assert.equal(report.checkedPages,16);
 assert.deepEqual(report.findings,[]);
 assert.ok(report.legacyPages>0,'Legacy dependencies cannot be removed without browser comparison');
 assert.ok(report.v3ExplicitPages.includes('institution.html'));
 assert.ok(report.v3ExplicitPages.includes('institutional-exams.html'));
 for(const page of report.pages){
  assert.equal(page.stylesheets.at(-1),'bep-v4.css',page.page);
  assert.equal(page.stylesheets.filter(name=>name==='bep-v4.css').length,1,page.page);
 }
 assert.ok(report.stylesheets.every(file=>file.bytes>0),'All declared stylesheets exist');
});

test('V4 migration audit is not a removal or rewrite script',()=>{
 const src=readFileSync(script,'utf8');
 assert.doesNotMatch(src,/\b(?:writeFileSync|unlinkSync|rmSync|renameSync)\b/);
});
