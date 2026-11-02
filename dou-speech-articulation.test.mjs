import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {synthesizeTurkishArticulationPreview,synthesizeTurkishCoarticulationPreview} from './dou-speech-waveform.mjs';
import {inspectSpeechWaveform} from './dou-speech-quality.mjs';
const wav=t=>synthesizeTurkishArticulationPreview(t);
const pcm=bytes=>{const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);const a=new Float32Array((bytes.length-44)/2);for(let i=0;i<a.length;i++)a[i]=view.getInt16(44+2*i,true)/32768;return a;};
const rms=arr=>Math.sqrt(arr.reduce((s,n)=>s+n*n,0)/arr.length);
const distance=(a,b)=>{const x=pcm(a),y=pcm(b);assert.equal(x.length,y.length);return x.reduce((s,n,i)=>s+Math.abs(n-y[i]),0)/x.length;};

test('v2.48 deterministic on-device WAV supports Turkish consonant classes without clipping',()=>{
 const a=wav('Şaşa sasa mama nana pata kata');
 assert.deepEqual(a.wav,wav('Şaşa sasa mama nana pata kata').wav);
 assert.notDeepEqual(a.wav,synthesizeTurkishCoarticulationPreview('Şaşa sasa mama nana pata kata').wav);
 assert.equal(a.articulatoryProfiles,true);assert.equal(a.experimental,true);assert.ok(a.consonantCount>10);
 const m=inspectSpeechWaveform(a.wav);
 assert.ok(m.durationSeconds>0.5&&m.durationSeconds<=16);
 assert.equal(m.sampleRate,22050);assert.equal(m.clippedSamples,0);assert.ok(m.peak<.999&&m.rms>.005);
 assert.equal(m.validatedIntelligibility,false);
});

test('v2.48 synthetic s/ş, m/n and p/k contrasts produce measurably distinct audio',()=>{
 for(const [a,b] of [['sasa','şaşa'],['mama','nana'],['papa','kaka'],['vava','zaza']]){
  const x=wav(a).wav,y=wav(b).wav;
  assert.ok(distance(x,y)>.0005,`${a}/${b} did not yield acoustic contrast`);
 }
});

test('v2.48 fricatives and nasals have nonzero controlled waveforms and letter-dependent profiles',()=>{
 const s=pcm(wav('sasa').wav),sh=pcm(wav('şaşa').wav),n=pcm(wav('nana').wav),m=pcm(wav('mama').wav);
 assert.ok(rms(s)>.002&&rms(sh)>.002&&rms(n)>.002&&rms(m)>.002);
 assert.notDeepEqual([...s.slice(80,140)],[...sh.slice(80,140)]);
});

test('v2.48 constrains arbitrary text, duration, pitch and speed',()=>{
 for(const value of ['', '   ','http://server','<script>','a'.repeat(101),null])assert.throws(()=>wav(value));
 for(const options of [{pitchHz:NaN},{pitchHz:2},{pitchHz:300},{rate:0},{rate:3},{rate:Infinity}])
  assert.throws(()=>synthesizeTurkishArticulationPreview('Merhaba',options));
 const changed=synthesizeTurkishArticulationPreview('Merhaba',{pitchHz:170,rate:1.25});
 assert.notDeepEqual(changed.wav,wav('Merhaba').wav);
});

test('v2.48 CLI exports only fixed synthetic example, refuses overwrite and arbitrary text',()=>{
 const dir=mkdtempSync(join(tmpdir(),'dou-articulation-'));
 try{
  const target=join(dir,'test.wav');
  const run=(...args)=>spawnSync(process.execPath,['tools/dou-speech-preview.mjs','--out',target,'--mode','articulation',...args],{cwd:process.cwd(),encoding:'utf8'});
  const one=run();assert.equal(one.status,0,one.stderr);const output=readFileSync(target);
  assert.ok(inspectSpeechWaveform(output).rms>.005);
  assert.notEqual(run().status,0);assert.deepEqual(readFileSync(target),output);
  assert.notEqual(run('--text','exam').status,0);assert.equal(existsSync(join(dir,'exam.wav')),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('v2.48 demo contrasts use only literal synthetic phrases without student input',()=>{
 const html=readFileSync('dou-reader-demo.html','utf8'),ui=readFileSync('dou-reader-demo.mjs','utf8');
 assert.match(html,/id="lab-contrast-s"/);assert.match(html,/id="lab-contrast-sh"/);
 assert.ok(ui.includes("synthesizeTurkishArticulationPreview('Sasa')"));
 assert.ok(ui.includes("synthesizeTurkishArticulationPreview('Şaşa')"));
 assert.ok(!ui.includes('getUserMedia')&&!ui.includes('fetch('));
});
