import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {auditFixedTurkishOrthography} from './dou-speech-orthography.mjs';
import {synthesizeFixedRehearsalArm,synthesizeFixedJoinStudy} from './dou-speech-corpus.mjs';
import {createHash} from 'node:crypto';
const digest=x=>createHash('sha256').update(x).digest('hex');

test('v2.62 strictly fixed-only, rejects private input and arguments',()=>{
 for(const input of ['student','TR01',null,{},'/etc/passwd'])
  assert.throws(()=>auditFixedTurkishOrthography(input),TypeError);
});
test('v2.62 all fourteen reference cases and syllable boundaries agree with planner',()=>{
 const report=auditFixedTurkishOrthography();
 assert.equal(report.version,'fixed-tr-orthography-v1');
 assert.equal(report.caseCount,14);assert.equal(report.consistentCases,14);
 assert.equal(report.cases.length,14);
 assert.ok(report.totalSyllables>=14);
 assert.ok(report.totalInternalSyllableBoundaries>0);
 for(const entry of report.cases){
  assert.equal(entry.issues.length,0,entry.id);assert.equal(entry.consistent,true);
  assert.equal(entry.stressedSyllableCount,entry.wordCount);
  assert.equal(entry.internalSyllableBoundaries,entry.syllableCount-entry.wordCount);
  assert.equal(entry.graphemeCategoryCounts.vowel,entry.syllableCount);
 }
});
test('v2.62 eight orthographic vowel categories each have a unique three-feature profile',()=>{
 const inventory=auditFixedTurkishOrthography().vowelInventory;
 assert.deepEqual(inventory.map(v=>v.grapheme),[...'aeıioöuü']);
 const profiles=new Set(inventory.map(x=>[x.backness,x.rounding,x.height].join('|')));
 assert.equal(profiles.size,8);
 assert.ok(inventory.every(x=>x.observedCount>0));
 assert.equal(inventory.filter(x=>x.backness==='front').length,4);
 assert.equal(inventory.filter(x=>x.rounding==='rounded').length,4);
});
test('v2.62 deterministic report contains opaque IDs only, no words or human scores',()=>{
 const a=auditFixedTurkishOrthography(),b=auditFixedTurkishOrthography();
 assert.deepEqual(a,b);assert.equal(a.validatedPhonetics,false);
 assert.equal(a.intelligibilityScore,null);assert.equal(a.productionReady,false);
 assert.ok(a.cases.every(c=>/^TR(?:0[1-9]|1[0-4])$/.test(c.id)));
 assert.doesNotMatch(JSON.stringify(a),/merhaba|dünya|sasa|ş aşa|diagnosis|student/i);
});
test('v2.62 retains immutable A, B and C WAV outputs',()=>{
 for(const [id,arm] of [['TR01','A'],['TR05','B'],['TR13','A']]){
  const before=digest(synthesizeFixedRehearsalArm(id,arm).wav);
  auditFixedTurkishOrthography();
  assert.equal(before,digest(synthesizeFixedRehearsalArm(id,arm).wav));
 }
 const before=digest(synthesizeFixedJoinStudy('TR05').wav);
 auditFixedTurkishOrthography();
 assert.equal(before,digest(synthesizeFixedJoinStudy('TR05').wav));
});
test('v2.62 CLI read-only, rejects arguments and has verifiable digest',()=>{
 const cli=()=>spawnSync(process.execPath,['tools/dou-speech-orthography-audit.mjs'],{cwd:process.cwd(),encoding:'utf8'});
 const first=cli(),second=cli();assert.equal(first.status,0,first.stderr);assert.equal(first.stdout,second.stdout);
 const result=JSON.parse(first.stdout),{reportSha256,...body}=result;
 assert.equal(reportSha256,digest(Buffer.from(JSON.stringify(body))));
 assert.equal(result.caseCount,14);assert.equal(result.consistentCases,14);
 assert.doesNotMatch(first.stdout,/Merhaba|dünya|Sasa|öğrenci|tanı|parola/i);
 assert.notEqual(spawnSync(process.execPath,['tools/dou-speech-orthography-audit.mjs','person'],{cwd:process.cwd()}).status,0);
});
test('v2.62 UI is accessible and cannot collect answers or arbitrary speech',()=>{
 const page=readFileSync(new URL('./dou-reader-demo.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('./dou-reader-demo.mjs',import.meta.url),'utf8');
 assert.match(page,/id="lab-orthography-open"[^>]*aria-controls="lab-orthography-results"/);
 assert.match(page,/id="lab-orthography-body"/);
 assert.match(page,/id="lab-orthography-status"[^>]*role="status"/);
 assert.match(js,/auditFixedTurkishOrthography\(\)/);
 const newSection=js.split('// v2.62: orthographic')[1];assert.ok(newSection);
 for(const forbidden of ['fetch(','localStorage','XMLHttpRequest','mediaDevices','getQuestion(','writeFile','indexedDB'])
  assert.ok(!newSection.includes(forbidden),forbidden);
});
