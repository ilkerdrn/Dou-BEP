import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPhonemeSession,markPhonemePlayback,submitPhonemeChoice,summarizePhonemeSession,PAIRS,TRIAL_COUNT} from './dou-speech-phoneme-study.mjs';
import {localPhonemeConfusion,validatePhonemeAggregate,poolPhonemeAggregates,wilson95} from './dou-speech-phoneme-analysis.mjs';
function complete({reverse=false}={}){
 const s=createPhonemeSession(new Uint8Array(TRIAL_COUNT*2));
 for(const t of s.trials){markPhonemePlayback(s,t.id);submitPhonemeChoice(s,t.id,reverse?t.options.find(x=>x!==t.word):t.word);}
 return s;
}
test('v2.50 local 2x2 matrices show each target and choice, never included in counts-only JSON',()=>{
 const s=complete(),m=localPhonemeConfusion(s);
 assert.equal(m.length,4);
 for(const item of m){assert.deepEqual(item.cells,[[1,0],[0,1]]);assert.equal(item.labels.length,2);}
 const summary=JSON.stringify(summarizePhonemeSession(s));
 for(const word of PAIRS.flatMap(p=>p.words))assert.ok(!summary.includes(word));
 assert.equal(summarizePhonemeSession(s).answered,TRIAL_COUNT);
});
test('v2.50 2x2 matrix swaps off diagonal when every answer is mistaken and is unavailable if incomplete',()=>{
 const s=complete({reverse:true});
 for(const item of localPhonemeConfusion(s))assert.deepEqual(item.cells,[[0,1],[1,0]]);
 assert.throws(()=>localPhonemeConfusion(createPhonemeSession(new Uint8Array(16))),RangeError);
});
test('v2.50 strict validator accepts only exact aggregate schema and reconciled counts',()=>{
 const summary=summarizePhonemeSession(complete());
 assert.equal(validatePhonemeAggregate(summary),true);
 for(const changed of [
  {...summary,name:'somebody'},
  {...summary,timestamp:'now'},
  {...summary,answered:9},
  {...summary,correct:7},
  {...summary,pairCounts:{...summary.pairCounts,'s-sh':{answered:2,correct:1,trialAnswers:['Sasa']}}},
  {...summary,pairCounts:{...summary.pairCounts,'p-k':{answered:2,correct:999}}},
  {...summary,syntheticOnly:false},
  {...summary,pairCounts:{...summary.pairCounts,'__proto__':{answered:0,correct:0}}},
  JSON.parse(JSON.stringify(summary).replace('"schema":','"participantName":"x","schema":'))
 ])assert.throws(()=>validatePhonemeAggregate(changed),RangeError);
 const partial=summarizePhonemeSession(createPhonemeSession(new Uint8Array(16)));
 assert.throws(()=>validatePhonemeAggregate(partial),RangeError);
 assert.equal(validatePhonemeAggregate(partial,{requireComplete:false}),true);
});
test('v2.50 refuses under-threshold samples, malformed input, and invalid override',()=>{
 const good=summarizePhonemeSession(complete());
 for(const reports of [[],Array(9).fill(good),Array(1001).fill(good),[...Array(9).fill(good),{...good,name:'private'}]])
  assert.throws(()=>poolPhonemeAggregates(reports),RangeError);
 for(const n of [0,1,9,1001,1.5])assert.throws(()=>poolPhonemeAggregates(Array(10).fill(good),{minimumReports:n}),RangeError);
});
test('v2.50 ten reports generate only pooled counts and uncertainty disclaimers',()=>{
 const good=summarizePhonemeSession(complete()),bad=summarizePhonemeSession(complete({reverse:true}));
 const result=poolPhonemeAggregates([good,good,good,good,good,bad,bad,bad,bad,bad]);
 assert.equal(result.reportCount,10);assert.equal(result.answered,80);assert.equal(result.correct,40);
 assert.equal(result.incorrect,40);assert.equal(result.errorRate,0.5);
 assert.equal(result.uniquenessUnverified,true);assert.equal(result.directionalConfusionUnavailable,true);
 for(const p of PAIRS){assert.equal(result.pairCounts[p.id].answered,20);assert.equal(result.pairCounts[p.id].incorrect,10);}
 assert.deepEqual(wilson95(0,0),null);
 assert.ok(wilson95(0,20).lower===0);
 assert.ok(wilson95(20,20).upper===1);
 const text=JSON.stringify(result);
 for(const word of PAIRS.flatMap(p=>p.words))assert.ok(!text.includes(word));
 for(const term of ['choice','timestamp','participant','name','student','ipAddress'])assert.ok(!text.includes(term));
});
test('v2.50 study import UI is offline-only, size-limited and does not export raw answers or filenames',()=>{
 const ui=readFileSync('dou-speech-pool-ui.mjs','utf8');
 const matrixUi=readFileSync('dou-speech-phoneme-ui.mjs','utf8');
 const page=readFileSync('dou-speech-pool.html','utf8');
 const server=readFileSync('server.mjs','utf8');
 assert.match(ui,/file.size>4096/);assert.match(ui,/files.length<10/);
 assert.match(ui,/poolPhonemeAggregates/);
 assert.match(matrixUi,/localPhonemeConfusion/);
 assert.match(page,/id="pool-files"/);
 assert.ok(server.includes("'/dou-speech-pool'"));
 for(const src of [ui,matrixUi,page])for(const prohibited of ['fetch(', 'XMLHttpRequest','sendBeacon','getUserMedia','localStorage','sessionStorage','http://','https://'])
  assert.ok(!src.includes(prohibited),`forbidden ${prohibited}`);
 assert.ok(!server.includes("'/dou-speech-phoneme-analysis.test.mjs'"));
});
