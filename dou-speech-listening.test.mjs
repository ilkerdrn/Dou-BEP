import test from 'node:test';import assert from 'node:assert/strict';
import {createBlindListeningSession,markListeningPlayback,recordListeningChoice,summarizeListeningSession,STUDY_PHRASES} from './dou-speech-listening.mjs';
import {readFileSync} from 'node:fs';

test('v2.47 session is blinded, randomized by supplied CSPRNG bytes and synthetic-only',()=>{
 const a=createBlindListeningSession(new Uint8Array([0,1,0]));const b=createBlindListeningSession(new Uint8Array([1,0,1]));
 assert.deepEqual(a.trials.map(t=>t.arms[0]),['prosody','coarticulation','prosody']);
 assert.notDeepEqual(a.trials.map(t=>t.arms),b.trials.map(t=>t.arms));
 assert.deepEqual(a.trials.map(t=>t.id),STUDY_PHRASES.map(t=>t.id));
 assert.ok(a.trials.every(t=>t.choice===null&&!t.heardA&&!t.heardB));
 assert.throws(()=>createBlindListeningSession([0,1,0]),TypeError);
 assert.throws(()=>createBlindListeningSession(new Uint8Array([0,1])),TypeError);
});
test('v2.47 both arms must be played and trial cannot be submitted twice',()=>{
 const s=createBlindListeningSession(new Uint8Array([0,1,0]));
 assert.throws(()=>recordListeningChoice(s,'s1','A'),RangeError);
 markListeningPlayback(s,'s1','A');assert.throws(()=>recordListeningChoice(s,'s1','A'),RangeError);
 markListeningPlayback(s,'s1','B');recordListeningChoice(s,'s1','A');
 assert.throws(()=>recordListeningChoice(s,'s1','B'),RangeError);
 assert.throws(()=>markListeningPlayback(s,'s1','A'),RangeError);
 assert.throws(()=>markListeningPlayback(s,'s4','A'),RangeError);
 assert.throws(()=>markListeningPlayback(s,'s2','C'),RangeError);
 assert.throws(()=>recordListeningChoice(s,'s2','invalid'),RangeError);
});
test('v2.47 report contains only aggregate preferences and no participant, text or session metadata',()=>{
 const s=createBlindListeningSession(new Uint8Array([0,1,0]));
 for(const id of ['s1','s2','s3']){markListeningPlayback(s,id,'A');markListeningPlayback(s,id,'B');}
 recordListeningChoice(s,'s1','A');recordListeningChoice(s,'s2','A');recordListeningChoice(s,'s3','neither');
 const summary=summarizeListeningSession(s);
 assert.equal(summary.answered,3);assert.deepEqual(summary.preferences,{prosody:1,coarticulation:1,same:0,neither:1});
 assert.equal(summary.notAnIntelligibilityScore,true);assert.equal(summary.noPersonalDataCollected,true);
 const serialized=JSON.stringify(summary);for(const bad of ['Merhaba','dünya','participant','timestamp','date','user','ip','text','sessionId','s1'])assert.ok(!serialized.includes(bad),bad);
});
test('v2.47 local-only study routes do not include endpoint submissions, identifiers or storage',()=>{
 const ui=readFileSync(new URL('./dou-speech-listening-ui.mjs',import.meta.url),'utf8');
 const page=readFileSync(new URL('./dou-speech-listening.html',import.meta.url),'utf8');
 const core=readFileSync(new URL('./dou-speech-listening.mjs',import.meta.url),'utf8');
 assert.match(ui,/crypto\.getRandomValues/);assert.match(ui,/URL\.revokeObjectURL/);assert.match(ui,/notAnIntelligibilityScore|summarizeListeningSession/);
 assert.match(page,/id="study-export"/);assert.match(page,/data-choice="neither"/);
 for(const content of [ui,page,core]){
  for(const forbidden of ['fetch(', 'XMLHttpRequest','localStorage','sessionStorage','getUserMedia','sendBeacon','http://','https://'])assert.ok(!content.includes(forbidden),forbidden);
 }
});
test('v2.47 invalid summary structure fails closed',()=>{
 const s=createBlindListeningSession(new Uint8Array([0,1,0]));s.trials[1].arms=['prosody','prosody'];
 assert.throws(()=>summarizeListeningSession(s),RangeError);
 assert.throws(()=>summarizeListeningSession({trials:[]}),RangeError);
});
