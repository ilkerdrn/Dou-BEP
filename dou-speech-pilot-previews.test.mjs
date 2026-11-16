import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {attachPilotSpeechPreviews,DOU_PREVIEW_MODELS} from './dou-speech-pilot-previews.mjs';

function element(value=''){
 const events=new Map();
 return {
  value,disabled:false,textContent:'',events,
  addEventListener(name,fn){events.set(name,fn);},
  removeEventListener(name,fn){if(events.get(name)===fn)events.delete(name);},
  click(){return events.get('click')?.();},
  change(){events.get('change')?.();}
 };
}
function setup(){
 const nodes=new Map([
  ['reader-lab-voice',element('legacy')],['reader-lab-play',element()],
  ['reader-lab-stop',element()],['reader-lab-status',element()]
 ]);
 let q={number:1,prompt:'PRIVATE_EXAM_QUESTION_MUST_NOT_BE_READ',audioAllowed:true};
 let revoked=0,played=0,paused=0,created=0;
 const waves=[],players=[];
 class Player{
  constructor(url){this.url=url;this.events=new Map();this.src=url;players.push(this);}
  addEventListener(type,fn){this.events.set(type,fn);}
  play(){played++;return Promise.resolve();}
  pause(){paused++;}
  removeAttribute(name){if(name==='src')this.src='';}
  load(){}
 }
 const win={
  Blob,
  URL:{
   createObjectURL(b){created++;waves.push(b);return 'blob:synthetic-test-'+created;},
   revokeObjectURL(){revoked++;}
  },
  Audio:Player
 };
 const doc={getElementById:id=>nodes.get(id)};
 let stopOsCalls=0;
 const preview=attachPilotSpeechPreviews({
  doc,win,getQuestion:()=>q,onStart:()=>{stopOsCalls++;}
 });
 return {
  nodes,preview,players,waves,
  get played(){return played;},
  get paused(){return paused;},
  get created(){return created;},
  get revoked(){return revoked;},
  get stopOsCalls(){return stopOsCalls;},
  setQuestion(value){q=value;}
 };
}

test('four named experimental audio algorithms remain separate from installed OS voices',()=>{
 assert.deepEqual(DOU_PREVIEW_MODELS,['legacy','spectral','contrast','place']);
 const html=readFileSync(new URL('./pilot.html',import.meta.url),'utf8');
 const server=readFileSync(new URL('./server.mjs',import.meta.url),'utf8');
 const panel=readFileSync(new URL('./dou-reader-panel.mjs',import.meta.url),'utf8');
 for(const model of DOU_PREVIEW_MODELS)assert.match(html,new RegExp('<option value="'+model+'">'));
 assert.match(html,/DOU Speech — deneysel ses seçenekleri/);
 assert.match(html,/Yalnız “Merhaba dünya”/);
 assert.match(html,/id="reader-lab-play"/);
 assert.match(html,/id="reader-lab-status" role="status"/);
 assert.match(panel,/attachPilotSpeechPreviews/);
 assert.match(server,/dou-speech-pilot-previews\.mjs/);
 assert.match(server,/media-src blob:/);
 assert.match(server,/path==='\/pilot'\|\|path==='\/dou-reader-demo'/);
 assert.doesNotMatch(server,/media-src https:|media-src \*/);
});

test('all four previews generate in-memory local WAV using a fixed public sample only',async()=>{
 const fixture=setup();
 for(const model of DOU_PREVIEW_MODELS){
  fixture.nodes.get('reader-lab-voice').value=model;
  assert.equal(await fixture.nodes.get('reader-lab-play').click(),true,model);
 }
 assert.equal(fixture.played,4);
 assert.equal(fixture.created,4);
 assert.equal(fixture.revoked,3);
 assert.equal(fixture.stopOsCalls,4);
 assert.ok(fixture.waves.every(blob=>blob.type==='audio/wav'&&blob.size>44));
 const sources=readFileSync(new URL('./dou-speech-pilot-previews.mjs',import.meta.url),'utf8');
 assert.match(sources,/const FIXED_SAMPLE='Merhaba dünya'/);
 assert.match(sources,/synthesizeLocalFreeText\(FIXED_SAMPLE,/);
 assert.doesNotMatch(sources,/synthesizeLocalFreeText\((?:q\.prompt|question|response|student)/);
 assert.doesNotMatch(sources,/fetch\(|localStorage|sessionStorage|indexedDB|MediaRecorder|getUserMedia/);
 fixture.preview.destroy();
 assert.equal(fixture.revoked,4);
});

test('experimental speech is disabled on teacher-blocked questions, and play cannot bypass it',async()=>{
 const fixture=setup();
 fixture.setQuestion({number:2,prompt:'NO_AUDIO',audioAllowed:false});
 fixture.preview.syncQuestion();
 assert.equal(fixture.nodes.get('reader-lab-play').disabled,true);
 assert.equal(fixture.nodes.get('reader-lab-voice').disabled,true);
 assert.equal(await fixture.nodes.get('reader-lab-play').click(),false);
 assert.equal(fixture.played,0);
 fixture.setQuestion({number:1,prompt:'PUBLIC_PROMPT',audioAllowed:true});
 fixture.preview.syncQuestion();
 assert.equal(fixture.nodes.get('reader-lab-play').disabled,false);
 fixture.preview.destroy();
});

test('stopping experimental playback revokes object URLs and removes listeners',async()=>{
 const fixture=setup();
 await fixture.nodes.get('reader-lab-play').click();
 assert.equal(fixture.played,1);
 fixture.nodes.get('reader-lab-stop').click();
 assert.equal(fixture.revoked,1);
 assert.ok(fixture.paused>=1);
 fixture.preview.destroy();
 assert.equal(fixture.nodes.get('reader-lab-play').events.has('click'),false);
 assert.equal(fixture.nodes.get('reader-lab-stop').events.has('click'),false);
});
