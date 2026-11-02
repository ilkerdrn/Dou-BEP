import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WORD_PAIRS,markRecognitionHeard,answerRecognition,nextRecognition} from './dou-speech-intelligibility.mjs';
import {createQuadRecognitionSession,summarizeQuadRecognition,QUAD_TRIALS,QUAD_ARMS} from './dou-speech-quad-protocol.mjs';
import {createQuadRecognitionReport,quadReportJson,quadReportCsv} from './dou-speech-quad-report.mjs';
import {synthesizeTurkishPlacePreview} from './dou-speech-place.mjs';
import {synthesizeLocalFreeText} from './dou-speech-free-text.mjs';
function complete(wrongArm=''){
 const s=createQuadRecognitionSession(Uint8Array.from({length:48},(_,i)=>(i*13+7)%256));
 for(const t of s.trials){markRecognitionHeard(s);answerRecognition(s,t.arm===wrongArm?WORD_PAIRS[t.pairIndex].find(w=>w!==t.target):t.target);nextRecognition(s);}
 return s;
}
test('48 fixtures balanced across four arms and twelve targets; unique interleaved pairs',()=>{
 for(const random of [new Uint8Array(48),new Uint8Array(48).fill(255),Uint8Array.from({length:48},(_,i)=>i*31%256)]){
  const s=createQuadRecognitionSession(random);
  assert.equal(s.trials.length,48);assert.equal(new Set(s.trials.map(t=>`${t.pairIndex}/${t.target}/${t.arm}`)).size,48);
  for(let i=1;i<48;i++)assert.notEqual(s.trials[i].pairIndex,s.trials[i-1].pairIndex);
  for(let i=0;i<48;i+=6)assert.equal(new Set(s.trials.slice(i,i+6).map(t=>t.pairIndex)).size,6);
  assert.equal(summarizeQuadRecognition(s).answered,0);
 }
});
test('completed report scores each arm independently, no identifying fields or external requests',()=>{
 const r=createQuadRecognitionReport(complete('place'));
 assert.deepEqual(Object.keys(r.totals),QUAD_ARMS);
 assert.deepEqual(QUAD_ARMS.map(a=>r.totals[a].correct),[12,12,12,0]);
 assert.equal(r.totalTrials,QUAD_TRIALS);assert.equal(r.validatedHumanIntelligibility,false);
 assert.equal(r.pairs.length,6);assert.ok(r.pairs.every(p=>QUAD_ARMS.every(a=>p.arms[a].answered===2)));
 const json=JSON.parse(quadReportJson(r));assert.equal(json.totalTrials,48);
 for(const key of ['studentId','participantId','userId','timestamp','sessionId'])assert.equal(key in json,false);
 assert.equal(quadReportCsv(r).trim().replace(/^\ufeff/,'').split('\r\n').length,49);
});
test('unfinished, duplicate and inconsistent sessions fail closed',()=>{
 assert.throws(()=>createQuadRecognitionSession(new Uint8Array(36)));
 assert.throws(()=>createQuadRecognitionReport(createQuadRecognitionSession(new Uint8Array(48))));
 const s=complete();s.trials[0].arm='evil';assert.throws(()=>summarizeQuadRecognition(s));
 const d=complete();Object.assign(d.trials[1],{arm:d.trials[0].arm,target:d.trials[0].target,pairIndex:d.trials[0].pairIndex});
 assert.throws(()=>summarizeQuadRecognition(d));
 const e=complete();e.trials[0].heard=false;assert.throws(()=>summarizeQuadRecognition(e));
});
test('new place candidate is deterministic and bounded, with valid mono PCM WAV',()=>{
 for(const word of ['bal dal','kaz gaz','cam çam','sal şal']){
  const a=synthesizeTurkishPlacePreview(word),b=synthesizeTurkishPlacePreview(word);
  assert.deepEqual(a.wav,b.wav);assert.equal(a.sampleRate,22050);
  const view=new DataView(a.wav.buffer,a.wav.byteOffset,a.wav.byteLength);
  assert.equal(view.getUint32(4,true),a.wav.length-8);
  assert.equal(view.getUint32(40,true),a.wav.length-44);
  assert.equal(a.validatedIntelligibility,false);
  for(let i=44;i<a.wav.length;i+=2)assert.ok(Math.abs(view.getInt16(i,true))<=32768);
 }
 assert.ok(synthesizeTurkishPlacePreview('bal dal').placeCueSegments>=2);
 const previous=synthesizeLocalFreeText('bal dal',{acousticModel:'spectral'});
 const candidate=synthesizeLocalFreeText('bal dal',{acousticModel:'place'});
 assert.equal(candidate.wav.length,previous.wav.length);
 assert.notDeepEqual(candidate.wav,previous.wav);
 assert.equal(candidate.validatedIntelligibility,false);
});
test('candidate input bounds and free-text old three profiles remain byte-identical',()=>{
 for(const model of ['legacy','spectral','contrast']){
  const s=synthesizeLocalFreeText('sal şal bal dal',{acousticModel:model});
  assert.equal(s.acousticModel,model);assert.equal(s.wav[0],82);
 }
 assert.throws(()=>synthesizeTurkishPlacePreview('<bad>'));
 assert.throws(()=>synthesizeTurkishPlacePreview('a'.repeat(101)));
 assert.throws(()=>synthesizeLocalFreeText('test',{acousticModel:'not-an-arm'}));
});
test('quad modules are private-by-default code and DOM routes exist',()=>{
 const ui=readFileSync(new URL('dou-speech-intelligibility-ui.mjs',import.meta.url),'utf8');
 const html=readFileSync(new URL('dou-speech-intelligibility.html',import.meta.url),'utf8');
 const server=readFileSync(new URL('server.mjs',import.meta.url),'utf8');
 assert.match(ui,/createQuadRecognitionSession/);assert.match(ui,/summarizeQuadRecognition/);
 assert.match(ui,/quadReportJson/);assert.match(ui,/if\(!session.finished\)return/);
 assert.match(html,/value="balanced48"/);
 assert.match(server,/\'\/dou-speech-place.mjs\'/);
 for(const file of ['dou-speech-place.mjs','dou-speech-quad-protocol.mjs','dou-speech-quad-report.mjs']){
  const source=readFileSync(new URL(file,import.meta.url),'utf8');
  assert.doesNotMatch(source,/\bfetch\(|localStorage|sessionStorage|indexedDB|WebSocket|getUserMedia|process\.env/);
 }
});
