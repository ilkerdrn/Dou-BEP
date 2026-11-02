import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {auditFixedSyntheticCorpus} from './dou-speech-corpus.mjs';
import {planTurkishProsody} from './dou-speech-prosody.mjs';
import {synthesizeTurkishSpectralPreview} from './dou-speech-waveform.mjs';
const run=(args=[])=>spawnSync(process.execPath,['tools/dou-speech-corpus-audit.mjs',...args],{cwd:process.cwd(),encoding:'utf8'});
test('v2.59 corpus is strictly fixed and covers all eight written Turkish vowel classes',()=>{
 const report=auditFixedSyntheticCorpus();
 assert.equal(report.caseCount,14);assert.equal(report.sampleRate,22050);
 assert.deepEqual(report.groupCounts.map(x=>x.count),[4,8,2]);
 assert.deepEqual(report.vowelClassCoverage.map(x=>x.orthographicVowel),['a','e','ı','i','o','ö','u','ü']);
 assert.ok(report.vowelClassCoverage.every(x=>x.present));
 assert.ok(report.totalAlignedBoundaries>30);
 assert.equal(report.productionReady,false);assert.equal(report.intelligibilityScore,null);
 assert.throws(()=>auditFixedSyntheticCorpus('sınav'),TypeError);
 assert.throws(()=>auditFixedSyntheticCorpus({file:'user.wav'}),TypeError);
});
test('v2.59 all fixed cases have bounded aligned PCM properties',()=>{
 const report=auditFixedSyntheticCorpus();
 assert.equal(new Set(report.cases.map(x=>x.id)).size,14);
 for(const item of report.cases){
  assert.match(item.id,/^TR\d\d$/);
  assert.equal(item.boundaryCount,item.segmentCount-1);
  assert.equal(item.reference.boundaryCount,item.candidate.boundaryCount);
  for(const variant of [item.reference,item.candidate]){
   assert.ok(variant.durationSeconds>0&&variant.durationSeconds<=16);
   assert.ok(variant.rms>=0&&variant.rms<=1);
   assert.equal(variant.clippedSamples,0);
   assert.ok(variant.meanEdgeJump>=0&&variant.maxEdgeJump<=2&&variant.meanRmsGap>=0);
  }
 }
});
test('v2.59 report has no phrases, exam prompts, raw answer data or ungrounded quality scores',()=>{
 const json=JSON.stringify(auditFixedSyntheticCorpus());
 assert.doesNotMatch(json,/merhaba|dünya|ş a şa|student|learner|examId|question|sourceText|utterance|subject|timestamp|recording|filename|mosScore/i);
 assert.doesNotMatch(json,/"wav"|"letter"|"phrase"|"text"/i);
 assert.equal(JSON.parse(json).validatedPhonetics,false);
});
test('v2.59 full fixed corpus is byte-for-byte reproducible and CLI publishes hash',()=>{
 const a=run(),b=run();assert.equal(a.status,0,a.stderr);assert.equal(b.status,0,b.stderr);
 assert.equal(a.stdout,b.stdout);
 const result=JSON.parse(a.stdout),{manifestSha256,...body}=result;
 assert.equal(manifestSha256,createHash('sha256').update(JSON.stringify(body)).digest('hex'));
 assert.deepEqual(body,auditFixedSyntheticCorpus());
});
test('v2.59 CLI rejects arbitrary text, file paths, URLs and flags',()=>{
 for(const args of [['--text','öğrenci'],['--file','x.wav'],['https://example.com'],['--help']]){
  const result=run(args);assert.equal(result.status,2);
  assert.equal(result.stdout,'');
 }
});
test('v2.59 public corpus report keeps synthesis isolated from institutional APIs',()=>{
 const source=readFileSync(new URL('./dou-speech-corpus.mjs',import.meta.url),'utf8');
 for(const forbidden of ['fetch(','localStorage','sessionStorage','indexedDB','readFileSync','institutional-api','getQuestion(','navigator.mediaDevices'])
  assert.equal(source.includes(forbidden),false,forbidden);
});

test('v2.59 four fixed consonant-pair contrasts hold the same written vowel pattern',()=>{
 for(const [left,right] of [['Sasa','Şaşa'],['Meme','Nene'],['Pata','Kata'],['Vava','Zaza']]){
  const a=planTurkishProsody(left),b=planTurkishProsody(right);
  const vowels=plan=>plan.items.filter(x=>x.kind==='vowel').map(x=>x.letter);
  assert.deepEqual(vowels(a),vowels(b));
  assert.deepEqual(a.items.map(x=>x.kind),b.items.map(x=>x.kind));
  assert.notEqual(createHash('sha256').update(synthesizeTurkishSpectralPreview(left).wav).digest('hex'),
    createHash('sha256').update(synthesizeTurkishSpectralPreview(right).wav).digest('hex'));
 }
});
