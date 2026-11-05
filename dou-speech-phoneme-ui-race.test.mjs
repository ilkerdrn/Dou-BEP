import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';

// A private fake browser: no microphone, network or actual audio devices.
// The exercise module is imported only after its DOM dependencies are prepared.
test('Blind listening: stale completion/error after Stop cannot unlock the next trial',async()=>{
 const elements=new Map();
 const makeElement=()=>({
   disabled:false,textContent:'',listeners:new Map(),
   addEventListener(name,callback){this.listeners.set(name,callback);},
   click(){return this.listeners.get('click')?.();},
   focus(){},append(){}
 });
 const documentEvents=new Map();
 globalThis.document={
   hidden:false,
   addEventListener(type,fn){documentEvents.set(type,fn);},
   getElementById(id){if(!elements.has(id))elements.set(id,makeElement());return elements.get(id);},
   createElement(){return makeElement();}
 };
 globalThis.window={addEventListener(){}};
 if(!globalThis.crypto)globalThis.crypto=webcrypto;
 const sounds=[];
 class TestAudio {
   constructor(url){this.url=url;this.events=new Map();this.stopped=false;sounds.push(this);}
   addEventListener(event,callback){this.events.set(event,callback);}
   play(){return new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});}
   pause(){this.stopped=true;}
   removeAttribute(){}
   emit(event){this.events.get(event)?.();}
 }
 globalThis.Audio=TestAudio;
 await import('./dou-speech-phoneme-ui.mjs');
 const play=()=>elements.get('phoneme-play').click();
 const stop=()=>elements.get('phoneme-stop').click();
 const c0=()=>elements.get('phoneme-choice-0');
 const c1=()=>elements.get('phoneme-choice-1');
 assert.equal(elements.get('phoneme-play').disabled,false);
 assert.equal(c0().disabled,true);
 const pending1=play();
 assert.equal(sounds.length,1);
 assert.equal(elements.get('phoneme-play').disabled,true);
 await play(); // double-click must not spawn another audio source
 assert.equal(sounds.length,1);
 stop();
 assert.equal(sounds[0].stopped,true);
 assert.equal(elements.get('phoneme-play').disabled,false);
 assert.equal(c0().disabled,true);
 assert.equal(c1().disabled,true);
 const pending2=play();
 assert.equal(sounds.length,2);
 sounds[0].emit('ended'); // stale callback from cancelled audio
 sounds[0].emit('error');
 assert.equal(c0().disabled,true);
 assert.equal(c1().disabled,true);
 sounds[0].reject(new Error('cancelled'));
 await pending1;
 assert.equal(sounds[1].stopped,false);
 assert.equal(elements.get('phoneme-play').disabled,true);
 sounds[1].resolve();
 await pending2;
 sounds[1].emit('ended');
 assert.equal(c0().disabled,false);
 assert.equal(c1().disabled,false);
 assert.equal(elements.get('phoneme-play').disabled,false);
 // Replay after a completed first listen must temporarily lock choices.
 const replay=play();
 assert.equal(sounds.length,3);
 assert.equal(c0().disabled,true);
 assert.equal(c1().disabled,true);
 // Leaving the browser tab stops the current sound and invalidates its events.
 document.hidden=true;
 documentEvents.get('visibilitychange')();
 assert.equal(sounds[2].stopped,true);
 assert.equal(elements.get('phoneme-play').disabled,false);
 sounds[2].emit('ended');
 sounds[2].reject(new Error('tab hidden'));
 await replay;
 assert.equal(c0().disabled,false);
 assert.equal(c1().disabled,false);
 document.hidden=false;
 await c0().click();
 assert.equal(c0().disabled,true);
 assert.equal(elements.get('phoneme-next').disabled,false);
 await elements.get('phoneme-next').click();
 assert.equal(c0().disabled,true);
 assert.equal(c1().disabled,true);
 assert.match(elements.get('phoneme-progress').textContent,/2 \/ 8/);
});
