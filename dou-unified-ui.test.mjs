import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const css=read('./dou-unified-ui.css');
const server=read('./server.mjs');
const screens=[
 'institution.html','institutional-exams.html','pilot-admin.html','pilot.html',
 'coordination.html','operations.html','batch-exams.html','accommodation-admin.html',
 'acceptance.html','exam-source-import.html','bep-import.html',
 'accessibility-check.html','dou-reader-demo.html'
];

test('every primary campus page loads one shared local design contract last',()=>{
 for(const page of screens){
  const html=read('./'+page);
  assert.equal((html.match(/href="\/dou-unified-ui\.css"/g)||[]).length,1,page);
  assert.ok(html.indexOf('/dou-unified-ui.css')>html.indexOf('/bep-v4.css')||!html.includes('/bep-v4.css'),page);
  assert.ok(html.indexOf('/dou-unified-ui.css')<html.indexOf('</head>'),page);
 }
 assert.match(server,/ '\/dou-unified-ui\.css':\['dou-unified-ui\.css','text\/css; charset=utf-8'\]/);
});

test('shared colors are derived from DOU DersAktif and loaded without network resources',()=>{
 for(const hex of ['#d70926','#1d1d1b','#f5f5f2','#e6e5e1'])assert.ok(css.includes(hex),hex);
 assert.doesNotMatch(css,/@import|url\(\s*['"]?https?:|@font-face/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test('high contrast overrides stay untouched on anonymous student screen',()=>{
 assert.match(read('./pilot.html'),/<body class="bep-student-pilot">/);
 assert.match(css,/body:not\(\.high\):not\(\.high-contrast\)/);
 assert.match(css,/body\.bep-student-pilot:not\(\.high\):not\(\.high-contrast\)/);
 assert.match(read('./pilot.css'),/\.high\{/);
});
