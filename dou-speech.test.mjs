import test from 'node:test';import assert from 'node:assert/strict';
import {createLocalSpeech} from './dou-speech.mjs';
const local={name:'Local Turkish',voiceURI:'local-tr',lang:'tr-TR',localService:true};
const remote={name:'Cloud Turkish',voiceURI:'remote-tr',lang:'tr-TR',localService:false};
class FakeUtterance{constructor(text){this.text=text;}}
function mock(voices){const said=[];const synth={getVoices:()=>voices,speak:u=>said.push(u),cancel:()=>{synth.cancelCount++},cancelCount:0};return {said,synth};}
test('DOU Speech never falls back to unknown/default or remote TTS',()=>{
 for(const voices of [[remote],[{...local,localService:undefined}],[]]){
  const {synth,said}=mock(voices);const messages=[];
  const engine=createLocalSpeech({synth,Utterance:FakeUtterance,onStatus:s=>messages.push(s)});
  assert.equal(engine.speak('Merhaba'),false);assert.equal(said.length,0);assert.match(messages.at(-1),/Türkçe çevrimdışı ses/);
 }
});
test('DOU Speech local Turkish voice selected by id and used in utterance',()=>{
 const {synth,said}=mock([remote,local]);const engine=createLocalSpeech({synth,Utterance:FakeUtterance});
 assert.deepEqual(engine.refresh(),[{id:'local-tr',label:'Local Turkish (tr-TR)'}]);
 assert.equal(engine.setVoice('remote-tr'),false);
 assert.equal(engine.speak('Türkçe sınav',{rate:1.25}),true);
 assert.equal(said.length,1);assert.equal(said[0].voice.voiceURI,'local-tr');assert.equal(said[0].lang,'tr-TR');assert.equal(said[0].rate,1.25);
});
test('stop invalidates queued chunks and prevents stale callback from speaking',()=>{
 const {synth,said}=mock([local]);const engine=createLocalSpeech({synth,Utterance:FakeUtterance});
 const long='Merhaba. '.repeat(300);assert.ok(engine.speak(long));assert.equal(said.length,1);
 const end=said[0].onend;engine.stop();end();assert.equal(said.length,1);
});
test('voice removal between invocations refuses speech instead of switching to default',()=>{
 const v=[local];const {synth,said}=mock(v);const engine=createLocalSpeech({synth,Utterance:FakeUtterance});
 assert.equal(engine.speak('Merhaba'),true);v.length=0;
 assert.equal(engine.speak('Güle güle'),false);assert.equal(said.length,1);
});
test('missing browser synthesis is a silent non-network fallback',()=>{
 let message='';const engine=createLocalSpeech({synth:null,Utterance:null,onStatus:x=>message=x});
 assert.equal(engine.speak('Test'),false);assert.match(message,/API/);
});

// v2.55: browser callbacks and voice inventories are asynchronous and untrusted.
test('DOU Reader cancels queued chunks if the local voice disappears after first utterance',()=>{
 const voices=[local],{synth,said}=mock(voices),messages=[];
 const engine=createLocalSpeech({synth,Utterance:FakeUtterance,onStatus:x=>messages.push(x)});
 assert.equal(engine.speak('Merhaba dünya. '.repeat(200)),true);assert.equal(said.length,1);
 const first=said[0];voices.splice(0);first.onend();
 assert.equal(said.length,1);assert.match(messages.at(-1),/ses kullanılamıyor/);assert.ok(synth.cancelCount>=2);
});
test('DOU Reader never switches an active narration to another local voice',()=>{
 const voice2={...local,name:'Different local voice',voiceURI:'other-tr'};
 const voices=[local],{synth,said}=mock(voices);
 const engine=createLocalSpeech({synth,Utterance:FakeUtterance});
 engine.speak('Merhaba dünya. '.repeat(200));voices.splice(0,1,voice2);said[0].onend();
 assert.equal(said.length,1);assert.equal(engine.selectedVoice,'other-tr');
 assert.equal(engine.speak('Yeni okuma'),true);assert.equal(said.at(-1).voice.voiceURI,'other-tr');
});
test('DOU Reader rejects a voice changing from local to remote between chunks',()=>{
 const voices=[local],{synth,said}=mock(voices),messages=[];
 const engine=createLocalSpeech({synth,Utterance:FakeUtterance,onStatus:x=>messages.push(x)});
 engine.speak('Merhaba dünya. '.repeat(200));voices[0]={...local,localService:false};said[0].onend();
 assert.equal(said.length,1);assert.match(messages.at(-1),/durduruldu/);
});
test('a repeated or late onend/onerror does not skip or abort new chunks',()=>{
 const {synth,said}=mock([local]),messages=[];
 const engine=createLocalSpeech({synth,Utterance:FakeUtterance,onStatus:x=>messages.push(x)});
 engine.speak('Merhaba dünya. '.repeat(250));assert.equal(said.length,1);
 const old=said[0];old.onend();assert.equal(said.length,2);
 old.onend();old.onerror();assert.equal(said.length,2);
 said[1].onend();assert.equal(said.length,3);assert.doesNotMatch(messages.at(-1),/oynatılamadı/);
});
test('voice inventory event during speech cancels revoked voice immediately',()=>{
 const voices=[local],{synth,said}=mock(voices),messages=[];
 const engine=createLocalSpeech({synth,Utterance:FakeUtterance,onStatus:x=>messages.push(x)});
 engine.speak('Merhaba dünya. '.repeat(200));voices.splice(0);
 assert.deepEqual(engine.refresh(),[]);assert.match(messages.at(-1),/güvenle durduruldu/);
 said[0].onend();assert.equal(said.length,1);
});
test('voice inventory failure between chunks stops playback instead of using default',()=>{
 let fail=false;const {synth,said}=mock([local]),messages=[];
 synth.getVoices=()=>{if(fail)throw Error('failed');return [local];};
 const engine=createLocalSpeech({synth,Utterance:FakeUtterance,onStatus:x=>messages.push(x)});
 engine.speak('Merhaba dünya. '.repeat(200));fail=true;said[0].onend();
 assert.equal(said.length,1);assert.match(messages.at(-1),/durduruldu/);
});
