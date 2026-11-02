import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {synthesizeTurkishPreview} from './dou-speech-waveform.mjs';
test('waveform laboratory generates real deterministic RIFF/WAVE mono PCM 16-bit samples',()=>{
 const a=synthesizeTurkishPreview('Merhaba dünya');const b=synthesizeTurkishPreview('Merhaba dünya');
 assert.deepEqual(a.wav,b.wav);assert.equal(a.sampleRate,22050);assert.equal(a.experimental,true);
 const data=new DataView(a.wav.buffer,a.wav.byteOffset,a.wav.byteLength);
 assert.equal(Buffer.from(a.wav.subarray(0,4)).toString(),'RIFF');
 assert.equal(Buffer.from(a.wav.subarray(8,12)).toString(),'WAVE');
 assert.equal(data.getUint32(4,true),a.wav.length-8);assert.equal(data.getUint16(20,true),1);
 assert.equal(data.getUint16(22,true),1);assert.equal(data.getUint16(34,true),16);
 assert.equal(data.getUint32(24,true),22050);assert.equal(data.getUint32(40,true),a.wav.length-44);
 assert.ok(a.durationSeconds>0.5&&a.durationSeconds<4);
 assert.ok(a.wav.subarray(44).some(x=>x!==0));
});
test('Turkish vowels, diacritics and single digits produce bounded offline waveform',()=>{
 const v=synthesizeTurkishPreview('Çığ öykü; 2 + 3'.replace(' + ',' ve '));
 assert.ok(v.phonemeCount>=10);assert.ok(v.wav.length<750000);
 assert.notDeepEqual(v.wav,synthesizeTurkishPreview('Çığ öykü; 4 ve 3').wav);
});
test('lab rejects unsupported data, oversized input, invalid pitches and empty text',()=>{
 for(const input of ['','   ','http://x','<script>', 'x'.repeat(101)])assert.throws(()=>synthesizeTurkishPreview(input));
 assert.throws(()=>synthesizeTurkishPreview('Merhaba',{pitchHz:1}),RangeError);
 assert.throws(()=>synthesizeTurkishPreview('Merhaba',{pitchHz:NaN}),RangeError);
 assert.throws(()=>synthesizeTurkishPreview(null),TypeError);
});
test('synthetic-only WAV CLI refuses overwriting existing files',()=>{
 const dir=mkdtempSync(join(tmpdir(),'dou-wave-test-'));
 try{
  const dst=join(dir,'deney.wav');let child=spawnSync(process.execPath,['tools/dou-speech-preview.mjs','--out',dst],{cwd:process.cwd(),encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);assert.equal(readFileSync(dst).subarray(0,4).toString(),'RIFF');
  const original=readFileSync(dst);child=spawnSync(process.execPath,['tools/dou-speech-preview.mjs','--out',dst],{cwd:process.cwd(),encoding:'utf8'});
  assert.notEqual(child.status,0);assert.deepEqual(readFileSync(dst),original);
  const forbidden=join(dir,'not-wav.txt');child=spawnSync(process.execPath,['tools/dou-speech-preview.mjs','--out',forbidden],{cwd:process.cwd(),encoding:'utf8'});
  assert.notEqual(child.status,0);assert.equal(existsSync(forbidden),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
