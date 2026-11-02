import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTriRecognitionSession,TRI_TRIALS,TRI_ARMS,TRI_SCHEDULE} from './dou-speech-tri-protocol.mjs';
import {synthesizeLocalFreeText} from './dou-speech-free-text.mjs';
import {levelRecognitionWav,LAB_TARGET_RMS} from './dou-speech-rehearsal-level.mjs';

test('six interleaved blocks contain one of each pair, with no adjacent repeated pair',()=>{
 for(const random of [new Uint8Array(36),new Uint8Array(36).fill(255),
  Uint8Array.from({length:36},(_,i)=>(i*17+43)&255)]){
  const s=createTriRecognitionSession(random);
  assert.equal(s.schedule,TRI_SCHEDULE);
  assert.equal(s.trials.length,TRI_TRIALS);
  for(let b=0;b<6;b++)
   assert.equal(new Set(s.trials.slice(b*6,b*6+6).map(t=>t.pairIndex)).size,6);
  for(let i=1;i<TRI_TRIALS;i++)
   assert.notEqual(s.trials[i].pairIndex,s.trials[i-1].pairIndex);
  const seen=new Set(s.trials.map(t=>`${t.pairIndex}/${t.target}/${t.arm}`));
  assert.equal(seen.size,36);
  for(const arm of TRI_ARMS)assert.equal(s.trials.filter(t=>t.arm===arm).length,12);
 }
});
test('independent RMS leveling returns valid bounded WAV without editing source WAV',()=>{
 for(const arm of TRI_ARMS){
  const original=synthesizeLocalFreeText('sal şal',{acousticModel:arm}).wav;
  const snapshot=original.slice();
  const x=levelRecognitionWav(original),y=levelRecognitionWav(original);
  assert.deepEqual(original,snapshot);assert.deepEqual(x.wav,y.wav);
  assert.equal(x.wav.length,original.length);
  assert.equal(new DataView(x.wav.buffer).getUint32(40,true),original.length-44);
  assert.ok(x.afterPeak<=0.901);assert.ok(x.afterRms>0);
  assert.ok(x.beforeRms>0);assert.equal(x.targetRms,LAB_TARGET_RMS);
  assert.equal(x.localOnly,true);assert.equal(x.validatedIntelligibility,false);
 }
});
test('RMS helper rejects empty, wrong header, malformed RIFF, silent and oversized files',()=>{
 const valid=synthesizeLocalFreeText('sal',{acousticModel:'legacy'}).wav;
 assert.throws(()=>levelRecognitionWav(new Uint8Array(44)));
 assert.throws(()=>levelRecognitionWav('not a wav'));
 assert.throws(()=>levelRecognitionWav(valid,{targetRms:.9}));
 const bad=valid.slice();bad[0]=77;assert.throws(()=>levelRecognitionWav(bad));
 const silent=valid.slice();silent.fill(0,44);assert.throws(()=>levelRecognitionWav(silent));
 assert.throws(()=>levelRecognitionWav(new Uint8Array(2_800_002)));
});
test('leveler is only wired into test lab and is not used by NVDA bridge',()=>{
 const ui=readFileSync(new URL('dou-speech-intelligibility-ui.mjs',import.meta.url),'utf8');
 const nvda=readFileSync(new URL('tools/dou-speech-nvda-stdio.mjs',import.meta.url),'utf8');
 const src=readFileSync(new URL('dou-speech-rehearsal-level.mjs',import.meta.url),'utf8');
 assert.match(ui,/levelRecognitionWav\(result\.wav\)/);
 assert.doesNotMatch(nvda,/levelRecognitionWav/);
 assert.doesNotMatch(src,/fetch\(|localStorage|sessionStorage|indexedDB|WebSocket|getUserMedia/);
});
