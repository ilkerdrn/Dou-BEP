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
