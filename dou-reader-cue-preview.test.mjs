import test from 'node:test';
import assert from 'node:assert/strict';
import {FIXED_READER_CUES,attachFixedReaderCuePreview} from './dou-reader-cue-preview.mjs';

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
 injectFile(h,makeWav(),'cue.mp3');await flush();
 assert.equal(h.nodes['reader-cue-play'].disabled,true);
 ui.destroy();
 assert.equal(h.nodes['reader-cue-play'].disabled,true);
 assert.equal(h.metrics().played,0);
});
