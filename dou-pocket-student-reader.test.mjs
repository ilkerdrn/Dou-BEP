import test from 'node:test';
import assert from 'node:assert/strict';
import {attachPocketStudentReader} from './dou-pocket-student-reader.mjs';

function fixture({enabled=true,question={id:'q3',prompt:'Anonim konu sorusu',audioAllowed:true}}={}){
 const events=new Map(),options=[{value:'system',disabled:false},{value:'pocket',disabled:true}];
 const picker={value:'system',disabled:true,options,addEventListener:(name,fn)=>events.set(name,fn),
  removeEventListener:(name,fn)=>{if(events.get(name)===fn)events.delete(name);}};
 const status={textContent:''};
 const calls=[],blobs=[],urlRevoked=[],players=[];
 let currentQuestion=question,token='synthetic-memory-only-bearer',nextUrl=0;
 class Player{
  constructor(url){this.url=url;this.events=new Map();players.push(this);}
  addEventListener(name,fn){this.events.set(name,fn);}
  play(){return Promise.resolve();}
  pause(){this.paused=true;}
  removeAttribute(){}
  load(){}
 }
 const win={
  fetch:async(path,config)=>{
   calls.push({path,config});
   if(path==='/api/pilot/speech-capability')return {ok:true,json:async()=>({available:enabled})};
   if(path==='/api/pilot/speech')return {ok:true,headers:{get:()=> 'audio/wav'},
    blob:async()=>new Blob([new Uint8Array(64)],{type:'audio/wav'})};
   throw Error('Unexpected URL');
  },
  URL:{createObjectURL:blob=>{blobs.push(blob);return 'blob:synthetic-pocket-'+(++nextUrl);},
   revokeObjectURL:u=>urlRevoked.push(u)},
  Audio:Player
 };
 const doc={getElementById:id=>id==='reader-engine'?picker:id==='reader-status'?status:null};
 const reader=attachPocketStudentReader({doc,win,getToken:()=>token,getQuestion:()=>currentQuestion});
 return {reader,picker,status,calls,blobs,players,urlRevoked,
  setQuestion:q=>currentQuestion=q,setToken:t=>token=t,events};
}

test('Pocket option stays disabled in ordinary student exams and never attempts voice POST',async()=>{
 const f=fixture({enabled:false});
 assert.equal(await f.reader.check(),false);
 assert.equal(f.picker.options[1].disabled,true);
 f.picker.value='pocket';
 assert.equal(await f.reader.read(),false);
 assert.equal(f.calls.filter(x=>x.path==='/api/pilot/speech').length,0);
 f.reader.destroy();
});

test('active female_2 player uses only question ID and an in-memory bearer and cleans blob',async()=>{
 const f=fixture();
 assert.equal(await f.reader.check(),true);
 assert.equal(f.picker.options[1].disabled,false);
 f.picker.value='pocket';
 assert.equal(await f.reader.read(),true);
 const request=f.calls.find(x=>x.path==='/api/pilot/speech');
 assert.equal(request.config.method,'POST');
 assert.deepEqual(JSON.parse(request.config.body),{questionId:'q3'});
 assert.equal(request.config.headers.Authorization,'Bearer synthetic-memory-only-bearer');
 assert.equal(request.config.credentials,'omit');
 assert.equal(JSON.stringify(request.config).includes('Anonim konu sorusu'),false);
 assert.equal(f.players.length,1);
 assert.equal(f.blobs.length,1);
 f.reader.stop();
 assert.equal(f.players[0].paused,true);
 assert.equal(f.urlRevoked.length,1);
 f.reader.destroy();
});

test('changing to an audio-forbidden question cancels playback; short or missing bearer fails closed',async()=>{
 const f=fixture();
 await f.reader.check();
 f.picker.value='pocket';
 assert.equal(await f.reader.read(),true);
 f.setQuestion({id:'q4',audioAllowed:false,prompt:'Restricted'});
 f.reader.sync();
 assert.equal(f.players[0].paused,true);
 assert.equal(f.urlRevoked.length,1);
 assert.equal(await f.reader.read(),false);
 f.setQuestion({id:'q4',audioAllowed:true,prompt:'Other'});
 f.setToken(null);
 assert.equal(await f.reader.read(),false);
 assert.equal(f.calls.filter(x=>x.path==='/api/pilot/speech').length,1);
 f.reader.destroy();
});

test('destroy revokes any active memory URL and removes only own listeners',async()=>{
 const f=fixture();
 await f.reader.check();
 f.picker.value='pocket';
 await f.reader.read();
 assert.equal(f.events.has('change'),true);
 f.reader.destroy();
 assert.equal(f.events.has('change'),false);
 assert.equal(f.urlRevoked.length,1);
 assert.equal(await f.reader.read(),false);
});
