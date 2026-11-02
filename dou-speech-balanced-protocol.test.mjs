import test from 'node:test';import assert from 'node:assert/strict';
import {createBalancedRecognitionSession,summarizeBalancedRecognition,BALANCED_TRIALS} from './dou-speech-balanced-protocol.mjs';
import {WORD_PAIRS,markRecognitionHeard,answerRecognition,nextRecognition} from './dou-speech-intelligibility.mjs';
import {createBalancedRecognitionReport,balancedReportJson,balancedReportCsv} from './dou-speech-balanced-report.mjs';
function completed(wrongCandidate=false){
 const session=createBalancedRecognitionSession(Uint8Array.from({length:24},(_,i)=>i*7+3));
 for(const t of session.trials){markRecognitionHeard(session);
  const choice=wrongCandidate&&t.arm==='spectral'?WORD_PAIRS[t.pairIndex].find(w=>w!==t.target):t.target;
  answerRecognition(session,choice);nextRecognition(session);
 }
 return session;
}
test('24 balanced trials are exactly both targets in both arms across all pairs',()=>{
 for(const random of [new Uint8Array(24),new Uint8Array(24).fill(255),Uint8Array.from({length:24},(_,i)=>i*11)]){
  const s=createBalancedRecognitionSession(random);assert.equal(s.trials.length,BALANCED_TRIALS);
  const keys=s.trials.map(t=>`${t.pairIndex}:${t.target}:${t.arm}`);
  assert.equal(new Set(keys).size,24);
  assert.equal(summarizeBalancedRecognition(s).answered,0);
 }
});
test('correctness is never leaked before the end and both arms retain 12 trials',()=>{
 const s=completed(true),r=createBalancedRecognitionReport(s);
 assert.deepEqual(r.totals,{legacy:{correct:12,answered:12},spectral:{correct:0,answered:12}});
 assert.equal(r.correctDifferenceCandidateMinusLegacy,-12);
 assert.equal(r.pairs.length,6);
 assert.ok(r.pairs.every(p=>p.arms.legacy.answered===2&&p.arms.spectral.answered===2));
 assert.equal(r.validatedHumanIntelligibility,false);
 for(const key of ['participantId','sessionId','time','timestamp','studentId','audioRecording'])assert.equal(key in r,false);
});
test('only complete 24-trial session is exportable',()=>{
 const s=createBalancedRecognitionSession(new Uint8Array(24));assert.throws(()=>createBalancedRecognitionReport(s));
 assert.throws(()=>createBalancedRecognitionSession(new Uint8Array(12)));
});
test('tampering with protocol duplicates fails closed',()=>{
 const s=completed();s.trials[1].arm=s.trials[0].arm;s.trials[1].target=s.trials[0].target;s.trials[1].pairIndex=s.trials[0].pairIndex;
 assert.throws(()=>summarizeBalancedRecognition(s));
});
test('balanced CSV contains header + 24 deterministic rows with no spreadsheet formula entry',()=>{
 const csv=balancedReportCsv(createBalancedRecognitionReport(completed()));
 assert.equal(csv.charCodeAt(0),0xFEFF);assert.equal(csv.trim().replace(/^\uFEFF/,'').split('\r\n').length,25);
 assert.doesNotMatch(csv,/https?:|@|localhost|cookie|student/i);
 const r=JSON.parse(balancedReportJson(createBalancedRecognitionReport(completed())));
 assert.equal(r.schema,'dou-bep-balanced-recognition-v3');
 assert.throws(()=>balancedReportJson({...r,pairs:[]}));
});
test('different seeds alter trial order and no ID/timestamp/durable persistence exists',async()=>{
 const a=createBalancedRecognitionSession(new Uint8Array(24));
 const b=createBalancedRecognitionSession(Uint8Array.from({length:24},(_,i)=>i*7+3));
 assert.notDeepEqual(a.trials.map(t=>t.target+t.arm),b.trials.map(t=>t.target+t.arm));
 const {readFileSync}=await import('node:fs');
 for(const f of ['dou-speech-balanced-protocol.mjs','dou-speech-balanced-report.mjs']){
  const code=readFileSync(new URL(f,import.meta.url),'utf8');
  assert.doesNotMatch(code,/\bfetch\(|localStorage|sessionStorage|indexedDB|WebSocket|getUserMedia/);
 }
});
