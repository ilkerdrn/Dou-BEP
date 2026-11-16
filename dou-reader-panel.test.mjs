import test from 'node:test';
import assert from 'node:assert/strict';
import {attachPilotReader} from './dou-reader-panel.mjs';

// Minimal browser event stubs; no microphone, network, or real system voice.
function fakeElement(){
 const handlers=new Map();
 return {
  hidden:false,disabled:false,value:'1',textContent:'',
  handlers,
  addEventListener(name,fn){handlers.set(name,fn);},
  removeEventListener(name,fn){if(handlers.get(name)===fn)handlers.delete(name);},
  replaceChildren(){},append(){},setAttribute(){},
  click(){handlers.get('click')?.();}
 };
}
test('Reader voice event revocation cancels speech, and destroy removes event listeners',()=>{
 const nodes=new Map();for(const id of ['reader-read','reader-test','reader-stop','reader-pause','reader-resume','reader-prev','reader-next','reader-voice','reader-rate','reader-help','reader-shortcuts','reader-status','player'])nodes.set(id,fakeElement());
 const docHandlers=new Map();const doc={
  getElementById(id){return nodes.get(id);},createElement(){return fakeElement();},
  addEventListener(name,fn){docHandlers.set(name,fn);},
  removeEventListener(name,fn){if(docHandlers.get(name)===fn)docHandlers.delete(name);}
 };
 const voice={name:'Yerel Türkçe',voiceURI:'local-tr',lang:'tr-TR',localService:true};
 const voices=[voice],spoken=[];let cancels=0;const voiceEvents=new Map();
 const synth={getVoices:()=>voices,speak:u=>spoken.push(u),cancel:()=>{cancels++;},
  addEventListener:nameAndFn=>{throw Error('not used');}};
 synth.addEventListener=(name,fn)=>voiceEvents.set(name,fn);
 synth.removeEventListener=(name,fn)=>{if(voiceEvents.get(name)===fn)voiceEvents.delete(name);};
 class Utterance{constructor(text){this.text=text;}}
 const win={speechSynthesis:synth,SpeechSynthesisUtterance:Utterance};
 const reader=attachPilotReader({doc,win,getQuestion:()=>({number:1,audioAllowed:true,prompt:'Merhaba dünya.'}),moveQuestion:()=>{},announce:()=>{}});
 assert.equal(docHandlers.has('keydown'),true);assert.equal(voiceEvents.has('voiceschanged'),true);
 reader.read();assert.equal(spoken.length,1);
 voices.splice(0);voiceEvents.get('voiceschanged')();
 assert.equal(nodes.get('reader-read').disabled,true);assert.ok(cancels>=2);
 const stoppedMessage=nodes.get('reader-status').textContent;
 spoken[0].onend();assert.equal(spoken.length,1);assert.match(stoppedMessage,/Yerel Türkçe ses bulunamadı/);
 reader.destroy();assert.equal(docHandlers.has('keydown'),false);assert.equal(voiceEvents.has('voiceschanged'),false);
});

test('voice refresh cannot restore speech on a teacher-disabled question',()=>{
 const ids=['reader-read','reader-test','reader-stop','reader-pause','reader-resume','reader-prev','reader-next','reader-voice','reader-rate','reader-help','reader-shortcuts','reader-status','player'];
 const nodes=new Map(ids.map(id=>[id,fakeElement()]));
 const doc={getElementById:id=>nodes.get(id),createElement:()=>fakeElement(),addEventListener(){},removeEventListener(){}};
 const voices=[{name:'Yerel Türkçe',voiceURI:'local-tr',lang:'tr-TR',localService:true}];
 const said=[];const synth={getVoices:()=>voices,speak:u=>said.push(u),cancel(){},addEventListener(){},removeEventListener(){}};
 class Utterance{constructor(text){this.text=text;}}
 let question={number:1,prompt:'Anonim soru',audioAllowed:false};
 let notices=0;
 const reader=attachPilotReader({doc,win:{speechSynthesis:synth,SpeechSynthesisUtterance:Utterance},
  getQuestion:()=>question,moveQuestion(){},announce:()=>{notices++;}});
 assert.equal(nodes.get('reader-read').disabled,true);
 reader.read();
 assert.equal(said.length,0);
 assert.ok(notices>=1);
 question={...question,audioAllowed:true};
 reader.refreshVoices();
 assert.equal(nodes.get('reader-read').disabled,false);
 reader.read();
 assert.equal(said.length,1);
 question={...question,audioAllowed:false};
 reader.refreshVoices();
 assert.equal(nodes.get('reader-read').disabled,true);
 reader.read();
 assert.equal(said.length,1);
 reader.destroy();
});


test('fixed arithmetic speaker test never sends question text or private answers to TTS',()=>{
 const ids=['reader-read','reader-test','reader-stop','reader-pause','reader-resume','reader-prev','reader-next','reader-voice','reader-rate','reader-help','reader-shortcuts','reader-status','player'];
 const nodes=new Map(ids.map(id=>[id,fakeElement()]));
 const doc={getElementById:id=>nodes.get(id),createElement:()=>fakeElement(),addEventListener(){},removeEventListener(){}};
 const utterances=[],voice={name:'Microsoft Test Turkish',voiceURI:'local-tr',lang:'tr-TR',localService:true};
 const synth={getVoices:()=>[voice],speak:u=>utterances.push(u),cancel(){},addEventListener(){},removeEventListener(){}};
 class Utterance{constructor(text){this.text=text;}}
 let q={number:1,prompt:'SENSITIVE_QUESTION_NEVER_IN_DIAGNOSTIC',audioAllowed:true,answer:'SECRET_ANSWER'};
 let errors=0;
 const reader=attachPilotReader({doc,win:{speechSynthesis:synth,SpeechSynthesisUtterance:Utterance},
  getQuestion:()=>q,moveQuestion(){},announce:()=>{errors++;}});
 assert.equal(nodes.get('reader-test').disabled,false);
 nodes.get('reader-test').click();
 assert.equal(utterances.length,1);
 assert.match(utterances[0].text,/3 artı 5 eşittir 8/);
 assert.match(utterances[0].text,/1 bölü 2/);
 assert.doesNotMatch(utterances[0].text,/SENSITIVE_QUESTION|SECRET_ANSWER/);
 q={...q,audioAllowed:false};
 reader.syncQuestion();
 assert.equal(nodes.get('reader-test').disabled,true);
 nodes.get('reader-test').click();
 assert.equal(utterances.length,1);
 assert.equal(errors,1);
 reader.destroy();
});
