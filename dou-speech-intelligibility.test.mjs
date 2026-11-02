import test from 'node:test';import assert from 'node:assert/strict';
import {createRecognitionSession,markRecognitionHeard,answerRecognition,nextRecognition,summarizeRecognition,WORD_PAIRS} from './dou-speech-intelligibility.mjs';
import {synthesizeLocalFreeText,planLocalFreeText} from './dou-speech-free-text.mjs';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
test('Recognition trials use fixed anonymous words and both acoustic arms',()=>{
 const s=createRecognitionSession(new Uint8Array(12));assert.equal(s.trials.length,12);
 for(let i=0;i<6;i++)assert.deepEqual(s.trials.slice(i*2,i*2+2).map(t=>t.arm),['legacy','spectral']);
 assert.equal(summarizeRecognition(s).answered,0);
});
test('Randomized arm order and target without exposing the arm in the UI',()=>{
 const s=createRecognitionSession(new Uint8Array(12).fill(1));assert.equal(s.trials[0].arm,'spectral');assert.equal(s.trials[0].target,WORD_PAIRS[0][1]);
});
test('Cannot answer before hearing; cannot answer twice; next blocked',()=>{
 const s=createRecognitionSession(new Uint8Array(12));
 assert.throws(()=>answerRecognition(s,'sal'));
 assert.throws(()=>nextRecognition(s));
 markRecognitionHeard(s);assert.deepEqual(answerRecognition(s,'sal'),{accepted:true});
 assert.throws(()=>answerRecognition(s,'sal'));nextRecognition(s);assert.equal(s.position,1);
});
test('All decisions are memory-only and per-arm recognition is computed',()=>{
 const s=createRecognitionSession(new Uint8Array(12));
 for(let i=0;i<12;i++){markRecognitionHeard(s);answerRecognition(s,s.trials[i].arm==='legacy'?s.trials[i].target:WORD_PAIRS[s.trials[i].pairIndex].find(x=>x!==s.trials[i].target));nextRecognition(s);}
 const r=summarizeRecognition(s);assert.equal(r.arms.legacy.correct,6);assert.equal(r.arms.spectral.correct,0);assert.equal(s.finished,true);assert.equal(r.localMemoryOnly,true);assert.throws(()=>markRecognitionHeard(s));
});
test('Original free text WAV output is unchanged when no acousticModel is specified',()=>{
 const a=synthesizeLocalFreeText('Merhaba dünya!');const b=synthesizeLocalFreeText('Merhaba dünya!',{acousticModel:'legacy'});
 assert.equal(sha(a.wav),sha(b.wav));assert.equal(a.acousticModel,'legacy');
});
test('Spectral candidate produces distinct bounded deterministic 16-bit WAV',()=>{
 const text='Merhaba dünya!';const b=synthesizeLocalFreeText(text,{acousticModel:'spectral'});const c=synthesizeLocalFreeText(text,{acousticModel:'spectral'});
 assert.equal(sha(b.wav),sha(c.wav));assert.notEqual(sha(b.wav),sha(synthesizeLocalFreeText(text).wav));
 assert.equal(new DataView(b.wav.buffer).getUint32(24,true),22050);assert.ok(b.durationSeconds<=60);
 assert.equal(b.validatedIntelligibility,false);assert.equal(b.localOnly,true);
});
test('Invalid acoustic models, unicode, HTML and oversized input remain rejected',()=>{
 assert.throws(()=>planLocalFreeText('Merhaba',{acousticModel:'cloud'}));assert.throws(()=>synthesizeLocalFreeText('Merhaba',{acousticModel:'neural'}));
 assert.throws(()=>synthesizeLocalFreeText('<private>'));
 assert.throws(()=>synthesizeLocalFreeText('x'.repeat(361),{acousticModel:'spectral'}));
});
test('Audio experiments use no microphone, network or durable storage',async()=>{
 const src=await import('node:fs/promises');
 for(const file of ['dou-speech-intelligibility.mjs','dou-speech-intelligibility-ui.mjs']){
  const t=await src.readFile(new URL(file,import.meta.url),'utf8');
  assert.doesNotMatch(t,/\bfetch\(|localStorage|sessionStorage|indexedDB|getUserMedia|WebSocket|sendBeacon/);
 }
});
