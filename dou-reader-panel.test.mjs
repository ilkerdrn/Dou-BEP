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
 const nodes=new Map();for(const id of ['reader-read','reader-stop','reader-pause','reader-resume','reader-prev','reader-next','reader-stem','reader-choices','reader-voice','reader-rate','reader-help','reader-shortcuts','reader-status','player'])nodes.set(id,fakeElement());
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

function makeInteractiveReader(){
 const ids=['reader-read','reader-stop','reader-pause','reader-resume','reader-prev',
 'reader-next','reader-stem','reader-choices','reader-voice','reader-rate','reader-help','reader-shortcuts','reader-status','player'];
 const nodes=new Map(ids.map(id=>[id,fakeElement()]));
 const handlers=new Map();
 const doc={getElementById:id=>nodes.get(id),createElement:()=>fakeElement(),
  addEventListener:(id,fn)=>handlers.set(id,fn),
  removeEventListener:(id,fn)=>{if(handlers.get(id)===fn)handlers.delete(id);}};
 const voices=[{name:'Turkish local',voiceURI:'local-tr',lang:'tr-TR',localService:true}];
 const said=[],moves=[];
 const synth={getVoices:()=>voices,speaking:false,paused:false,cancels:0,
  cancel(){this.cancels++;this.speaking=false;this.paused=false;},
  speak(utterance){said.push(utterance);this.speaking=true;this.paused=false;},
  pause(){this.paused=true;},
  resume(){this.paused=false;}};
 class Utterance{constructor(text){this.text=text;}}
 let question={number:1,prompt:'Merhaba dünya.',audioAllowed:true};
 const reader=attachPilotReader({doc,win:{speechSynthesis:synth,SpeechSynthesisUtterance:Utterance},
  getQuestion:()=>question,moveQuestion:delta=>moves.push(delta),announce:()=>{}});
 return {reader,nodes,said,voices,synth,moves,handlers,setQuestion:q=>{question=q;}};
}
test('Reader controls only enable pause, resume and stop in meaningful playback states',()=>{
 const h=makeInteractiveReader(),get=id=>h.nodes.get(id);
 assert.equal(get('reader-read').disabled,false);
 assert.equal(get('reader-pause').disabled,true);
 assert.equal(get('reader-resume').disabled,true);
 assert.equal(get('reader-stop').disabled,true);
 h.reader.read();
 assert.equal(h.said.length,1);
 assert.equal(get('reader-pause').disabled,false);
 assert.equal(get('reader-resume').disabled,true);
 assert.equal(get('reader-stop').disabled,false);
 get('reader-pause').click();
 assert.equal(h.synth.paused,true);
 assert.equal(get('reader-pause').disabled,true);
 assert.equal(get('reader-resume').disabled,false);
 get('reader-resume').click();
 assert.equal(h.synth.paused,false);
 assert.equal(get('reader-pause').disabled,false);
 h.said[0].onend();
 assert.equal(get('reader-stop').disabled,true);
 assert.equal(get('reader-pause').disabled,true);
 assert.equal(get('reader-resume').disabled,true);
 assert.match(get('reader-status').textContent,/tamamlandı/);
 h.reader.destroy();
});
test('Reader revokes speech on question switch and never enables disabled question read',()=>{
 const h=makeInteractiveReader(),get=id=>h.nodes.get(id);
 h.reader.read();
 const first=h.said[0];
 const cancels=h.synth.cancels;
 h.setQuestion({number:2,prompt:'Bu soru seslendirilmez.',audioAllowed:false});
 h.reader.syncQuestion();
 assert.ok(h.synth.cancels>cancels);
 assert.equal(get('reader-read').disabled,true);
 assert.equal(get('reader-stop').disabled,true);
 first.onend();
 assert.equal(h.said.length,1);
 h.reader.read(); // keyboard or programmatic calls must not bypass teacher rule
 assert.equal(h.said.length,1);
 assert.match(get('reader-status').textContent,/kapalıdır/);
 h.reader.destroy();
});
test('No Turkish local voice disables reading and removal cleans all button listeners',()=>{
 const h=makeInteractiveReader(),get=id=>h.nodes.get(id);
 h.voices.splice(0);
 h.reader.refreshVoices();
 assert.equal(get('reader-read').disabled,true);
 assert.equal(get('reader-pause').disabled,true);
 h.reader.read();
 assert.equal(h.said.length,0);
 h.reader.destroy();
 for(const id of ['reader-read','reader-stop','reader-pause','reader-resume','reader-prev',
   'reader-next','reader-stem','reader-choices','reader-voice','reader-help'])
  assert.equal(get(id).handlers.size,0,id);
 assert.equal(h.handlers.size,0);
});

test('student can replay just the question or choices without leaking answers',()=>{
 const h=makeInteractiveReader(),get=id=>h.nodes.get(id);
 const question={
  number:4,prompt:'Dört artı dört kaçtır?',audioAllowed:true,
  options:[{id:'A',label:'Sekiz'},{id:'B',label:'Dokuz'}],
  answer:'GIZLI_ANAHTAR',teacherNote:'OGRETMEN_NOTU',studentResponse:'OGRENCI_YANITI'
 };
 h.setQuestion(question);h.reader.syncQuestion();
 assert.equal(get('reader-stem').disabled,false);
 assert.equal(get('reader-choices').disabled,false);
 get('reader-stem').click();
 assert.equal(h.said.length,1);
 assert.match(h.said[0].text,/Dört artı dört/);
 assert.doesNotMatch(h.said[0].text,/Seçenek A/);
 get('reader-choices').click();
 assert.equal(h.said.length,2);
 assert.match(h.said[1].text,/Seçenek A/);
 assert.match(h.said[1].text,/Seçenek B/);
 assert.doesNotMatch(h.said[1].text,/Dört artı dört/);
 assert.doesNotMatch(h.said[1].text,/GIZLI_ANAHTAR|OGRETMEN_NOTU|OGRENCI_YANITI/);
 h.reader.destroy();
});
test('options-only control is disabled when question has no choices',()=>{
 const h=makeInteractiveReader(),get=id=>h.nodes.get(id);
 assert.equal(get('reader-stem').disabled,false);
 assert.equal(get('reader-choices').disabled,true);
 get('reader-stem').click();
 assert.equal(h.said.length,1);
 get('reader-choices').click();
 assert.equal(h.said.length,1);
 assert.match(get('reader-status').textContent,/seçenek bulunamadı/);
 h.reader.destroy();
});
test('split reader controls obey teacher audio prohibition and voice inventory loss',()=>{
 const h=makeInteractiveReader(),get=id=>h.nodes.get(id);
 h.setQuestion({number:7,prompt:'Kapalı örnek',audioAllowed:false,options:[{id:'A',label:'x'}]});
 h.reader.syncQuestion();
 for(const id of ['reader-read','reader-stem','reader-choices'])
  assert.equal(get(id).disabled,true,id);
 get('reader-stem').click();get('reader-choices').click();
 assert.equal(h.said.length,0);
 h.setQuestion({number:8,prompt:'Açık örnek',options:[{id:'A',label:'y'}]});
 h.reader.syncQuestion();h.voices.splice(0);h.reader.refreshVoices();
 for(const id of ['reader-read','reader-stem','reader-choices'])
  assert.equal(get(id).disabled,true,id);
 h.reader.destroy();
});

test('J/O speech shortcuts are keyboard accessible but never activate in answer fields',()=>{
 const h=makeInteractiveReader();
 h.setQuestion({number:9,audioAllowed:true,prompt:'Dokuz kaçtır?',options:[{id:'A',label:'Dokuz'}]});
 h.reader.syncQuestion();
 const keydown=h.handlers.get('keydown');
 assert.equal(typeof keydown,'function');
 let blocked=0;
 const base={altKey:true,shiftKey:true,ctrlKey:false,metaKey:false,
   repeat:false,defaultPrevented:false,isComposing:false,target:{tagName:'DIV'},
   preventDefault(){blocked++;}};
 keydown({...base,code:'KeyJ'});
 assert.equal(h.said.length,1);
 assert.match(h.said[0].text,/Dokuz kaçtır/);
 assert.doesNotMatch(h.said[0].text,/Seçenek A/);
 keydown({...base,code:'KeyO'});
 assert.equal(h.said.length,2);
 assert.match(h.said[1].text,/Seçenek A/);
 assert.doesNotMatch(h.said[1].text,/kaçtır/);
 assert.equal(blocked,2);
 keydown({...base,code:'KeyO',target:{tagName:'INPUT'}});
 keydown({...base,code:'KeyO',isComposing:true});
 keydown({...base,code:'KeyO',defaultPrevented:true});
 assert.equal(h.said.length,2);
 assert.equal(blocked,2);
 h.reader.destroy();
});
