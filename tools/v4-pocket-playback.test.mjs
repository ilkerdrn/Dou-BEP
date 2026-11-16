import test from 'node:test';
import assert from 'node:assert/strict';
import {attachPocketStudentReader} from '../dou-pocket-student-reader.mjs';

function element(value=''){
 const listeners=new Map();
 return {
  value,disabled:false,options:[],textContent:'',
  addEventListener(type,fn){listeners.set(type,fn);},
  removeEventListener(type){listeners.delete(type);},
  change(value){this.value=value;listeners.get('change')?.();},
 };
}
function fixture({defer=false}={}){
 const engine=element('pocket'),voice=element('female_2'),rate=element('1'),status=element();
 engine.options=[{value:'system',disabled:false},{value:'pocket',disabled:true}];
 voice.options=[{value:'female_2',disabled:true},{value:'male_1',disabled:true}];
 const elements={'reader-engine':engine,'reader-pocket-voice':voice,
  'reader-rate':rate,'reader-status':status};
 const audios=[],revoked=[],pending=[];
 let question={id:'q1',audioAllowed:true};
 const fetcher=async (url,config)=>{
  if(url.endsWith('/speech-capability'))return {ok:true,json:async()=>({
   available:true,voices:['female_2','male_1']
  })};
  if(defer)return await new Promise(resolve=>pending.push({resolve,config}));
  return {ok:true,headers:{get:()=> 'audio/wav'},
   blob:async()=>({size:128})};
 };
 class FakeAudio{
  constructor(url){this.url=url;this.paused=true;this.playbackRate=1;this.handlers={};audios.push(this);}
  addEventListener(name,fn){this.handlers[name]=fn;}
  async play(){this.paused=false;}
  pause(){this.paused=true;}
  removeAttribute(){}
  load(){}
 }
 const win={fetch:fetcher,Audio:FakeAudio,URL:{
  createObjectURL:()=> 'blob:synthetic',
  revokeObjectURL:url=>revoked.push(url)
 }};
 const reader=attachPocketStudentReader({doc:{getElementById:id=>elements[id]},
  win,getToken:()=> 'synthetic-token',getQuestion:()=>question});
 return {reader,engine,voice,rate,status,audios,revoked,pending,
  setQuestion:q=>{question=q;}};
}

test('two permitted voices synthesize separately and a voice change cancels the old playback',async()=>{
 const lab=fixture();
 assert.equal(await lab.reader.check(),true);
 assert.equal(lab.voice.disabled,false);
 assert.equal(await lab.reader.read(),true);
 assert.equal(lab.audios.length,1);
 assert.equal(lab.audios[0].paused,false);
 lab.voice.change('male_1');
 assert.equal(lab.audios[0].paused,true);
 assert.deepEqual(lab.revoked,['blob:synthetic']);
 assert.equal(await lab.reader.read(),true);
 assert.equal(lab.audios.length,2);
 lab.reader.destroy();
 assert.equal(lab.audios[1].paused,true);
});

test('Pocket pause, resume and speed updates use the active audio element',async()=>{
 const lab=fixture();
 await lab.reader.check();
 lab.rate.change('1.25');
 assert.equal(await lab.reader.read(),true);
 assert.equal(lab.audios[0].playbackRate,1.25);
 assert.equal(lab.reader.pause(),true);
 assert.equal(lab.audios[0].paused,true);
 assert.equal(await lab.reader.resume(),true);
 assert.equal(lab.audios[0].paused,false);
 lab.rate.change('0.75');
 assert.equal(lab.audios[0].playbackRate,0.75);
 lab.rate.change('5');
 assert.equal(lab.audios[0].playbackRate,1);
 lab.reader.stop();
 assert.equal(await lab.reader.resume(),false);
 lab.reader.destroy();
});

test('question change blocks audio and invalidates an in-flight Pocket response',async()=>{
 const lab=fixture({defer:true});
 await lab.reader.check();
 const p=lab.reader.read();
 assert.equal(lab.pending.length,1);
 lab.setQuestion({id:'q2',audioAllowed:false});
 lab.reader.sync();
 lab.pending[0].resolve({ok:true,headers:{get:()=> 'audio/wav'},blob:async()=>({size:100})});
 assert.equal(await p,false);
 assert.equal(lab.audios.length,0);
 lab.reader.destroy();
});
