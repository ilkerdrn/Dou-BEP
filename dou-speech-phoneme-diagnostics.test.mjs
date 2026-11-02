import test from 'node:test';import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {compareFixedPhonemePairs} from './dou-speech-phoneme-diagnostics.mjs';
test('v2.49 objective fixed-pair waveform differences are finite, nonzero and reproducible',()=>{
 const a=compareFixedPhonemePairs(),b=compareFixedPhonemePairs();assert.deepEqual(a,b);
 assert.equal(a.pairCount,4);assert.equal(a.objectiveWaveformMetricsOnly,true);
 assert.equal(a.validatesHumanIdentification,false);assert.equal(a.validatesTurkishPronunciation,false);
 assert.ok(a.contrasts.every(x=>x.meanAbsoluteWaveformDifference>0.0001&&x.meanAbsoluteWaveformDifference<1&&x.durationSeconds>0&&x.clippedSamples===0));
});
test('v2.49 CLI reports only synthetic technical metrics and rejects free-form data arguments',()=>{
 const run=(...args)=>spawnSync(process.execPath,['tools/dou-speech-phoneme-audit.mjs',...args],{cwd:process.cwd(),encoding:'utf8'});
 const ok=run();assert.equal(ok.status,0,ok.stderr);
 const data=JSON.parse(ok.stdout);assert.equal(data.pairCount,4);
 for(const banned of ['Sasa','Şaşa','student','participant','name','transcript','audioData'])
  assert.ok(!ok.stdout.includes(banned),banned);
 assert.notEqual(run('--text','Gerçek sınav').status,0);
});
