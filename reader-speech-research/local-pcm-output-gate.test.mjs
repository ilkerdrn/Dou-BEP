import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectLocalSpeechPcm} from './local-pcm-output-gate.mjs';

function fixture({sampleRate=22050,seconds=0.5,amplitude=12000}={}) {
 const count=Math.floor(sampleRate*seconds);
 const b=Buffer.alloc(44+count*2);
 b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVE',8);
 b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);
 b.writeUInt16LE(1,22);b.writeUInt32LE(sampleRate,24);
 b.writeUInt32LE(sampleRate*2,28);b.writeUInt16LE(2,32);
 b.writeUInt16LE(16,34);b.write('data',36);
 b.writeUInt32LE(count*2,40);
 for(let i=0;i<count;i++)
  b.writeInt16LE(Math.round(amplitude*Math.sin(2*Math.PI*220*i/sampleRate)),44+i*2);
 return b;
}
test('well-formed measurable PCM passes only the objective signal gate',()=>{
 const r=inspectLocalSpeechPcm(fixture(),22050);
 assert.equal(r.valid,true);
 assert.equal(r.productionApproved,false);
 assert.equal(r.validatedIntelligibility,false);
 assert.ok(r.rms>.01);
 assert.ok(r.durationSeconds>=.49);
});
test('synthetic silence, near silence and too short WAV are rejected',()=>{
 assert.equal(inspectLocalSpeechPcm(fixture({amplitude:0}),22050).valid,false);
 assert.equal(inspectLocalSpeechPcm(fixture({amplitude:2}),22050).valid,false);
 assert.equal(inspectLocalSpeechPcm(fixture({seconds:.05}),22050).reason,'invalid-duration');
});
test('strict PCM header rejects wrong rate and malformed RIFF lengths',()=>{
 const good=fixture();
 assert.equal(inspectLocalSpeechPcm(good,16000).valid,false);
 const invalid=Buffer.from(good);
 invalid.writeUInt32LE(123,4);
 assert.equal(inspectLocalSpeechPcm(invalid,22050).valid,false);
 const badAlign=Buffer.from(good);
 badAlign.writeUInt16LE(4,32);
 assert.equal(inspectLocalSpeechPcm(badAlign,22050).valid,false);
 assert.equal(inspectLocalSpeechPcm(Buffer.alloc(45),22050).valid,false);
});
test('excessive clipping fails even with a structurally valid WAV',()=>{
 const b=fixture();
 for(let offset=44;offset<b.length;offset+=2)b.writeInt16LE(32767,offset);
 const r=inspectLocalSpeechPcm(b,22050);
 assert.equal(r.valid,false);
 assert.equal(r.reason,'excessive-clipping');
});

function withRiffChunks(base, chunks) {
 const fmt=base.subarray(12,36);
 const data=base.subarray(36);
 const metadata=chunks.map(({type,payload})=>{
  const padded=Buffer.alloc(8+payload.length+(payload.length%2));
  padded.write(type,0,'ascii');
  padded.writeUInt32LE(payload.length,4);
  payload.copy(padded,8);
  return padded;
 });
 const out=Buffer.concat([base.subarray(0,12),fmt,...metadata,data]);
 out.writeUInt32LE(out.length-8,4);
 return out;
}

test('FFmpeg LIST/INFO WAV metadata is accepted without weakening PCM safety',()=>{
 const base=fixture();
 const wav=withRiffChunks(base,[{type:'LIST',payload:Buffer.from('INFOISFTffmpeg\\x00','binary')}]);
 const r=inspectLocalSpeechPcm(wav,22050);
 assert.equal(r.valid,true,JSON.stringify(r));
 assert.equal(r.productionApproved,false);
 assert.equal(r.validatedIntelligibility,false);
 assert.equal(r.durationSeconds,.5);
});
test('odd metadata chunks with RIFF padding are supported',()=>{
 const wav=withRiffChunks(fixture(),[
  {type:'JUNK',payload:Buffer.from([1,2,3])},
  {type:'LIST',payload:Buffer.from([73,78,70,79,0])}
 ]);
 assert.equal(inspectLocalSpeechPcm(wav,22050).valid,true);
});
test('RIFF parser refuses missing padding, duplicate data and corrupt chunk boundaries',()=>{
 const normal=fixture();
 const wav=withRiffChunks(normal,[{type:'LIST',payload:Buffer.from('INFO')}]);
 const sizeBroken=Buffer.from(wav);
 sizeBroken.writeUInt32LE(0xffffffff,40);
 assert.equal(inspectLocalSpeechPcm(sizeBroken,22050).valid,false);
 const dup=Buffer.concat([normal,normal.subarray(36)]);
 dup.writeUInt32LE(dup.length-8,4);
 assert.equal(inspectLocalSpeechPcm(dup,22050).valid,false);
 const unknown=withRiffChunks(normal,[{type:'XXXX',payload:Buffer.from('test')}]);
 assert.equal(inspectLocalSpeechPcm(unknown,22050).valid,false);
 const truncated=wav.subarray(0,wav.length-1);
 assert.equal(inspectLocalSpeechPcm(truncated,22050).valid,false);
});
