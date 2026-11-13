import test from 'node:test';
import assert from 'node:assert/strict';
import {FIXED_READER_CUES,inspectFixedCueAudio,attachFixedReaderCuePreview} from './dou-reader-cue-preview.mjs';

function makeWav(){
 const n=11025;
 const b=Buffer.alloc(44+2*n);
 b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVE',8);
 b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);
 b.writeUInt16LE(1,22);b.writeUInt32LE(22050,24);b.writeUInt32LE(44100,28);
 b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);
 b.write('data',36);b.writeUInt32LE(n*2,40);
 for(let i=0;i<n;i++)b.writeInt16LE(Math.trunc(12000*Math.sin(i*440*Math.PI/22050)),44+i*2);
 return b;
}
function item(){
 const handlers=new Map();
 return {value:'',files:[],textContent:'',disabled:false,handlers,
  addEventListener(name,fn){handlers.set(name,fn);},
  removeEventListener(name,fn){if(handlers.get(name)===fn)handlers.delete(name);},
  click(){handlers.get('click')?.();},
  change(){handlers.get('change')?.();}
 };
}
function harness(){
 const ids=['reader-cue-select','reader-cue-file','reader-cue-play',
 'reader-cue-stop','reader-cue-status','reader-cue-text'];
 const nodes=Object.fromEntries(ids.map(id=>[id,item()]));
 nodes['reader-cue-select'].value='welcome';
 let created=0,revoked=0,played=0,paused=0;
 class BlobFake{constructor(parts){this.parts=parts;}}
 class AudioFake{
  constructor(url){this.url=url;}
  play(){played++;return Promise.resolve();}
  pause(){paused++;}
 }
 const win={Blob:BlobFake,Audio:AudioFake,URL:{
  createObjectURL(){created++;return 'blob:local-preview-'+created;},
  revokeObjectURL(){revoked++;}
 }};
 return {nodes,win,doc:{getElementById:id=>nodes[id]},
  metrics:()=>({created,revoked,played,paused})};
}
async function flush(){await new Promise(resolve=>setImmediate(resolve));}
function injectFile(h,buf,name='anons.wav'){
 const file=h.nodes['reader-cue-file'];
 file.files=[{name,size:buf.length,arrayBuffer:async()=>buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength)}];
 file.change();
}
test('fixed announcement inventory never contains question or personal data',()=>{
 assert.equal(FIXED_READER_CUES.length,4);
 assert.ok(FIXED_READER_CUES.every(x=>x.text&&x.id));
 assert.ok(FIXED_READER_CUES.every(x=>!x.text.includes('Soru ')));
});
test('local cue import requires user file and explicit play; no automatic playback',async()=>{
 const h=harness();const ui=attachFixedReaderCuePreview({doc:h.doc,win:h.win});
 assert.equal(h.nodes['reader-cue-play'].disabled,true);
 assert.equal(ui.play(),false);
 injectFile(h,makeWav());await flush();
 assert.equal(h.nodes['reader-cue-play'].disabled,false);
 assert.equal(h.metrics().played,0);
 assert.equal(ui.play(),true);
 assert.equal(h.metrics().played,1);
 ui.stop();
 assert.equal(h.metrics().created,h.metrics().revoked);
 ui.destroy();
});
test('invalid RIFF or wrong sample rate never enables playback',async()=>{
 const h=harness();const ui=attachFixedReaderCuePreview({doc:h.doc,win:h.win});
 const invalid=makeWav();invalid.writeUInt32LE(48000,24);
 injectFile(h,invalid);await flush();
 assert.equal(h.nodes['reader-cue-play'].disabled,true);
 assert.match(h.nodes['reader-cue-status'].textContent,/uygun değil/);
 assert.equal(h.metrics().played,0);
 ui.destroy();
});
test('switching cue clears old audio so it cannot read the wrong fixed phrase',async()=>{
 const h=harness();const ui=attachFixedReaderCuePreview({doc:h.doc,win:h.win});
 injectFile(h,makeWav());await flush();
 assert.equal(h.nodes['reader-cue-play'].disabled,false);
 h.nodes['reader-cue-select'].value='finished';h.nodes['reader-cue-select'].change();
 assert.equal(h.nodes['reader-cue-play'].disabled,true);
 assert.equal(ui.play(),false);
 assert.equal(h.nodes['reader-cue-text'].textContent,'İşleminiz tamamlandı.');
 ui.destroy();
 assert.equal(h.nodes['reader-cue-select'].handlers.has('change'),false);
});
test('oversize file, unsupported extension and destroy are safe',async()=>{
 const h=harness();const ui=attachFixedReaderCuePreview({doc:h.doc,win:h.win});
 injectFile(h,makeWav(),'cue.ogg');await flush();
 assert.equal(h.nodes['reader-cue-play'].disabled,true);
 ui.destroy();
 assert.equal(h.nodes['reader-cue-play'].disabled,true);
 assert.equal(h.metrics().played,0);
});

function makeMp3({id3=false}={}){
 const tagSize=id3?11:0,start=id3?21:0;
 const b=Buffer.alloc(start+2048);
 if(id3){b.write('ID3',0);b[3]=4;b[4]=0;b[5]=0;b[6]=0;b[7]=0;b[8]=0;b[9]=tagSize;}
 b[start]=255;b[start+1]=0xfb;b[start+2]=0x90;b[start+3]=0x64;
 return b;
}
test('MP3 direct import permits preview without FFmpeg, never auto-plays',async()=>{
 const h=harness();const ui=attachFixedReaderCuePreview({doc:h.doc,win:h.win});
 injectFile(h,makeMp3(),'licensed-cue.mp3');await flush();
 assert.equal(h.nodes['reader-cue-play'].disabled,false);
 assert.match(h.nodes['reader-cue-status'].textContent,/MP3 başlığı/);
 assert.equal(h.metrics().played,0);
 assert.equal(ui.play(),true);
 assert.equal(h.metrics().played,1);
 ui.destroy();
 assert.equal(h.metrics().created,h.metrics().revoked);
});
test('MP3 tagged with ID3v2 metadata is supported, invalid headers are rejected',()=>{
 assert.equal(inspectFixedCueAudio(makeMp3({id3:true}),'cue.MP3').valid,true);
 const id3=makeMp3({id3:true});
 id3[6]=0x80;
 assert.equal(inspectFixedCueAudio(id3,'cue.mp3').valid,false);
 assert.equal(inspectFixedCueAudio(Buffer.alloc(2048),'cue.mp3').valid,false);
 assert.equal(inspectFixedCueAudio(makeWav(),'wav-disguised.mp3').valid,false);
 assert.equal(inspectFixedCueAudio(makeMp3(),'mp3-disguised.wav').valid,false);
});
test('queued file read cannot reactivate a cue after the user changes selection',async()=>{
 const h=harness();const ui=attachFixedReaderCuePreview({doc:h.doc,win:h.win});
 let resolveRead;
 h.nodes['reader-cue-file'].files=[{name:'test.mp3',size:2048,
  arrayBuffer:()=>new Promise(resolve=>{resolveRead=resolve;})}];
 h.nodes['reader-cue-file'].change();
 h.nodes['reader-cue-select'].value='finished';
 h.nodes['reader-cue-select'].change();
 const mp3=makeMp3();
 resolveRead(mp3.buffer.slice(mp3.byteOffset,mp3.byteOffset+mp3.byteLength));
 await flush();
 assert.equal(h.nodes['reader-cue-play'].disabled,true);
 assert.equal(ui.play(),false);
 ui.destroy();
});

test('MP3 parser rejects a valid MPEG-looking frame hidden inside another file',()=>{
 const hidden=Buffer.alloc(4096,0);
 hidden.write('RIFF',0);
 hidden.write('WAVE',8);
 hidden[120]=0xff;hidden[121]=0xfb;hidden[122]=0x90;hidden[123]=0x64;
 assert.equal(inspectFixedCueAudio(hidden,'wrong.mp3').valid,false);
 const prefixed=Buffer.concat([Buffer.alloc(32),makeMp3()]);
 assert.equal(inspectFixedCueAudio(prefixed,'prefixed.mp3').valid,false);
});
test('MP3 parser only allows a frame immediately after an explicit ID3v2 tag',()=>{
 const valid=makeMp3({id3:true});
 assert.equal(inspectFixedCueAudio(valid,'a.mp3').valid,true);
 const bad=Buffer.from(valid);
 bad[21]=0;bad[22]=0;bad[23]=0;bad[24]=0;
 bad[100]=0xff;bad[101]=0xfb;bad[102]=0x90;bad[103]=0x64;
 assert.equal(inspectFixedCueAudio(bad,'a.mp3').valid,false);
});
