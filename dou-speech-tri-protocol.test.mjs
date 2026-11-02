import test from 'node:test';
import assert from 'node:assert/strict';
import {WORD_PAIRS,markRecognitionHeard,answerRecognition,nextRecognition} from './dou-speech-intelligibility.mjs';
import {createTriRecognitionSession,summarizeTriRecognition,TRI_TRIALS,TRI_ARMS} from './dou-speech-tri-protocol.mjs';
import {createTriRecognitionReport,triReportCsv,triReportJson} from './dou-speech-tri-report.mjs';
import {synthesizeTurkishContrastPreview} from './dou-speech-contrast.mjs';
import {synthesizeLocalFreeText} from './dou-speech-free-text.mjs';
import {readFileSync} from 'node:fs';
function completed(wrong=''){
 const s=createTriRecognitionSession(Uint8Array.from({length:36},(_,i)=>(i*17+3)&255));
 for(const t of s.trials){markRecognitionHeard(s);answerRecognition(s,t.arm===wrong?WORD_PAIRS[t.pairIndex].find(x=>x!==t.target):t.target);nextRecognition(s);}
 return s;
}
test('36 trials are 6 pairs × 2 targets × 3 acoustic arms',()=>{
 const s=createTriRecognitionSession(new Uint8Array(36));
 assert.equal(s.trials.length,36);assert.equal(new Set(s.trials.map(t=>`${t.pairIndex}/${t.target}/${t.arm}`)).size,36);
 assert.equal(summarizeTriRecognition(s).answered,0);
 assert.deepEqual(Object.keys(summarizeTriRecognition(s).arms),TRI_ARMS);
});
test('finished 36-trial report scores all three models distinctly and excludes identities',()=>{
 const s=completed('contrast'),r=createTriRecognitionReport(s);
 assert.equal(r.totals.legacy.correct,12);assert.equal(r.totals.spectral.correct,12);assert.equal(r.totals.contrast.correct,0);
 assert.equal(r.pairs.length,6);assert.ok(r.pairs.every(p=>TRI_ARMS.every(a=>p.arms[a].answered===2)));
 assert.equal(r.validatedHumanIntelligibility,false);
 for(const key of ['participantId','userId','timestamp','sessionId','studentId'])assert.equal(key in r,false);
 const json=JSON.parse(triReportJson(r));assert.equal(json.totalTrials,36);
 const csv=triReportCsv(r);assert.equal(csv.charCodeAt(0),0xFEFF);
 assert.equal(csv.trim().replace(/^\uFEFF/,'').split('\r\n').length,37);
});
test('36-trial report requires complete and unique session',()=>{
 assert.throws(()=>createTriRecognitionSession(new Uint8Array(24)));
 const fresh=createTriRecognitionSession(new Uint8Array(36));assert.throws(()=>createTriRecognitionReport(fresh));
 const s=completed();s.trials[1].arm=s.trials[0].arm;s.trials[1].target=s.trials[0].target;s.trials[1].pairIndex=s.trials[0].pairIndex;
 assert.throws(()=>summarizeTriRecognition(s));
});
test('third acoustic arm outputs bounded valid WAV and differs from baseline',()=>{
 const old=synthesizeLocalFreeText('sal şal',{acousticModel:'spectral'});
 const next=synthesizeLocalFreeText('sal şal',{acousticModel:'contrast'});
 assert.equal(next.wav[0],82);assert.equal(next.wav[1],73);assert.equal(next.sampleRate,22050);
 assert.equal(next.wav.length,old.wav.length);assert.notDeepEqual(next.wav,old.wav);
 const v=new DataView(next.wav.buffer);assert.equal(v.getUint32(40,true),next.wav.length-44);
 assert.equal(next.validatedIntelligibility,false);assert.equal(next.localOnly,true);
});
test('third arm has bounded input validation, deterministic PCM and no I/O',()=>{
 assert.deepEqual(synthesizeTurkishContrastPreview('sal').wav,synthesizeTurkishContrastPreview('sal').wav);
 assert.throws(()=>synthesizeTurkishContrastPreview('<bad>'));
 assert.throws(()=>synthesizeLocalFreeText('sal',{acousticModel:'unknown'}));
 assert.throws(()=>synthesizeTurkishContrastPreview('a'.repeat(101)));
 for(const f of ['dou-speech-contrast.mjs','dou-speech-tri-protocol.mjs','dou-speech-tri-report.mjs']){
  const src=readFileSync(new URL(f,import.meta.url),'utf8');
  assert.doesNotMatch(src,/\bfetch\(|localStorage|sessionStorage|indexedDB|WebSocket|getUserMedia|process\.env/);
 }
});
test('24-trial UI routes to its own summarizer instead of old 12-trial summarizer',()=>{
 const src=readFileSync(new URL('dou-speech-intelligibility-ui.mjs',import.meta.url),'utf8');
 assert.match(src,/summary=summaryFor\(session\)/);
 assert.doesNotMatch(src,/summary=summarizeRecognition\(session\)/);
 assert.match(src,/createTriRecognitionSession/);
 assert.match(src,/report\.protocol==='balanced36'/);
});
