import test from 'node:test';import assert from 'node:assert/strict';
import {synthesizeTurkishCoarticulationPreview,synthesizeTurkishProsodyPreview} from './dou-speech-waveform.mjs';
import {planTurkishProsody} from './dou-speech-prosody.mjs';
import {inspectSpeechWaveform} from './dou-speech-quality.mjs';

const pcm=wav=>{const v=new DataView(wav.buffer,wav.byteOffset,wav.byteLength);return i=>v.getInt16(44+i*2,true)/32768;};
test('v2.47 coarticulation is local, deterministic, distinct from prosody, and bounded PCM',()=>{
 const a=synthesizeTurkishCoarticulationPreview('Merhaba dünya');const b=synthesizeTurkishCoarticulationPreview('Merhaba dünya');
 assert.deepEqual(a.wav,b.wav);assert.notDeepEqual(a.wav,synthesizeTurkishProsodyPreview('Merhaba dünya').wav);
 assert.equal(a.sampleRate,22050);assert.equal(a.coarticulation,true);assert.equal(a.experimental,true);
 const m=inspectSpeechWaveform(a.wav);
 assert.equal(m.clippedSamples,0);assert.ok(m.rms>.01&&m.peak<1&&m.durationSeconds<4);
 assert.equal(m.validatedIntelligibility,false);
});
test('v2.47 voiced-to-voiced transitions avoid v2.46 per-character zero-envelope dips',()=>{
 const text='Merhaba';const plan=planTurkishProsody(text);const old=synthesizeTurkishProsodyPreview(text).wav;
 const next=synthesizeTurkishCoarticulationPreview(text).wav;
 const oldPcm=pcm(old),newPcm=pcm(next);
 let offset=0,oldValue=0,newValue=0,transitions=0;
 for(let i=0;i<plan.items.length-1;i++){
  const a=plan.items[i],b=plan.items[i+1];offset+=a.length;
  if(['vowel','voiced','glide'].includes(a.kind)&&['vowel','voiced','glide'].includes(b.kind)){
   const energy=(get)=>{let n=0;for(let j=offset-75;j<offset+75;j++)n+=Math.abs(get(j));return n/150;};
   oldValue+=energy(oldPcm);newValue+=energy(newPcm);transitions++;
  }
 }
 assert.ok(transitions>3);assert.ok(newValue>oldValue*2,`old=${oldValue} new=${newValue}`);
});
test('v2.47 coarticulation changes with pitch/speed and rejects unsupported or unsafe inputs',()=>{
 const a=synthesizeTurkishCoarticulationPreview('Merhaba',{pitchHz:115});
 const b=synthesizeTurkishCoarticulationPreview('Merhaba',{pitchHz:165,rate:1.25});
 assert.notDeepEqual(a.wav,b.wav);assert.ok(b.durationSeconds<a.durationSeconds);
 for(const input of ['','  ','<script>','https://test','a'.repeat(101),null])assert.throws(()=>synthesizeTurkishCoarticulationPreview(input));
 for(const options of [{pitchHz:NaN},{pitchHz:0},{rate:2},{rate:Infinity}])assert.throws(()=>synthesizeTurkishCoarticulationPreview('Merhaba',options));
});

test('v2.47 synthetic CLI generates the third variant without overwrite or dynamic exam text',async()=>{
 const {mkdtempSync,readFileSync,rmSync,existsSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const {spawnSync}=await import('node:child_process');
 const dir=mkdtempSync(join(tmpdir(),'dou-v247-wave-'));
 try{
  const path=join(dir,'sample.wav');
  const command=(...args)=>spawnSync(process.execPath,['tools/dou-speech-preview.mjs','--out',path,'--mode','coarticulation',...args],{cwd:process.cwd(),encoding:'utf8'});
  const first=command();assert.equal(first.status,0,first.stderr);const sample=readFileSync(path);
  assert.ok(inspectSpeechWaveform(sample).rms>.01);
  assert.notEqual(command().status,0);assert.deepEqual(readFileSync(path),sample);
  assert.notEqual(command('--text','real exam').status,0);
  assert.equal(existsSync(join(dir,'other.wav')),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
