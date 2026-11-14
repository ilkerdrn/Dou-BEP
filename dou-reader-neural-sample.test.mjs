import test from 'node:test';
import assert from 'node:assert/strict';
import {POCKET_DEMO_TEXT,inspectPocketSample,attachPocketSamplePreview} from './dou-reader-neural-sample.mjs';

function makeWav(sampleRate=24000){
 const frames=Math.floor(sampleRate*.5);
 const b=Buffer.alloc(44+frames*2);
 b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVE',8);
 b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);
 b.writeUInt16LE(1,22);b.writeUInt32LE(sampleRate,24);
 b.writeUInt32LE(sampleRate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);
 b.write('data',36);b.writeUInt32LE(frames*2,40);
 for(let i=0;i<frames;i++)b.writeInt16LE(Math.floor(12000*Math.sin(2*Math.PI*440*i/sampleRate)),44+2*i);
 return b;
}
function element(){
 const handlers=new Map();
 return {disabled:false,value:'',files:[],textContent:'',handlers,
  addEventListener:(type,fn)=>handlers.set(type,fn),
  removeEventListener:(type,fn)=>{if(handlers.get(type)===fn)handlers.delete(type);},
  click(){handlers.get('click')?.();},
  change(){handlers.get('change')?.();}
 };
}
function harness(){
 const ids=['reader-neural-file','reader-neural-play','reader-neural-stop','reader-neural-status'];
 const nodes=Object.fromEntries(ids.map(id=>[id,element()]));
 let created=0,revoked=0,played=0,paused=0;
 class BlobFake{constructor(parts,opts){this.parts=parts;this.type=opts.type;}}
 class AudioFake{
  constructor(url){this.url=url;}
  play(){played++;return Promise.resolve();}
  pause(){paused++;}
 }
 const win={Blob:BlobFake,Audio:AudioFake,URL:{
  createObjectURL(){created++;return 'blob:demo-'+created;},
  revokeObjectURL(){revoked++;}
 }};
 return {nodes,win,doc:{getElementById:id=>nodes[id]},
  metrics:()=>({created,revoked,played,paused})};
}
async function importFile(h,bytes,name='DOU-PocketTTS-TR001-female_2.wav'){
 const file=h.nodes['reader-neural-file'];
 file.files=[{name,size:bytes.length,
  arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}];
 file.change();
 await new Promise(resolve=>setImmediate(resolve));
}
test('Pocket example text is anonymous, fixed and not an exam question',()=>{
 assert.match(POCKET_DEMO_TEXT,/Doğuş Üniversitesi/);
 assert.match(POCKET_DEMO_TEXT,/ileri düğmesine/);
 assert.doesNotMatch(POCKET_DEMO_TEXT,/öğrenci yanıtı|soru 1|password|token/i);
});
test('strict 24 kHz WAV allowed but old 22.05 kHz cue and spoofed MP3 rejected',()=>{
 assert.equal(inspectPocketSample(makeWav(24000),'a.wav').valid,true);
 assert.equal(inspectPocketSample(makeWav(22050),'a.wav').valid,false);
 assert.equal(inspectPocketSample(makeWav(24000),'a.mp3').valid,false);
 const fake=makeWav(24000);fake.writeUInt16LE(3,20);
 assert.equal(inspectPocketSample(fake,'a.wav').valid,false);
 assert.equal(inspectPocketSample(Buffer.alloc(2000),'a.wav').valid,false);
});
test('local neural sample never auto-plays and only user click can start',async()=>{
 const h=harness(),p=attachPocketSamplePreview({doc:h.doc,win:h.win});
 assert.equal(h.nodes['reader-neural-play'].disabled,true);
 assert.equal(p.play(),false);
 await importFile(h,makeWav());
 assert.equal(h.nodes['reader-neural-play'].disabled,false);
 assert.equal(h.metrics().played,0);
 h.nodes['reader-neural-play'].click();
 assert.equal(h.metrics().played,1);
 assert.equal(h.nodes['reader-neural-stop'].disabled,false);
 h.nodes['reader-neural-stop'].click();
 assert.equal(h.nodes['reader-neural-stop'].disabled,true);
 assert.equal(h.metrics().created,h.metrics().revoked);
 p.destroy();
});
test('stale file import cannot reenable playback after reset or destroy',async()=>{
 const h=harness(),p=attachPocketSamplePreview({doc:h.doc,win:h.win});
 let resolveRead;
 const file=h.nodes['reader-neural-file'];
 file.files=[{name:'a.wav',size:24044,
  arrayBuffer:()=>new Promise(resolve=>{resolveRead=resolve;})}];
 file.change();p.reset();
 const valid=makeWav(),raw=valid.buffer.slice(valid.byteOffset,valid.byteOffset+valid.byteLength);
 resolveRead(raw);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.nodes['reader-neural-play'].disabled,true);
 assert.equal(p.play(),false);
 await importFile(h,valid);p.destroy();
 assert.equal(h.nodes['reader-neural-play'].disabled,true);
 assert.equal(h.metrics().created,h.metrics().revoked);
 for(const id of ['reader-neural-file','reader-neural-play','reader-neural-stop'])
  assert.equal(h.nodes[id].handlers.size,0,id);
});
test('invalid local format remains non-playing and informative',async()=>{
 const h=harness(),p=attachPocketSamplePreview({doc:h.doc,win:h.win});
 await importFile(h,makeWav(22050));
 assert.equal(h.nodes['reader-neural-play'].disabled,true);
 assert.match(h.nodes['reader-neural-status'].textContent,/24 kHz/);
 assert.equal(h.metrics().played,0);
 p.destroy();
});
