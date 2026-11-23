import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {neuralSpeechText,floatToWav,createNeuralSpeech,neuralSupported,NEURAL_MAX_CHARACTERS} from './dou-speech-neural.mjs';

test('math wording is expanded only between numbers',()=>{
 assert.equal(neuralSpeechText('10 - 4'),'10 eksi 4');
 assert.equal(neuralSpeechText('3 x 4'),'3 çarpı 4');
 assert.equal(neuralSpeechText('3×4'),'3 çarpı 4');
 assert.equal(neuralSpeechText('3/4'),'3 bölü 4');
 assert.equal(neuralSpeechText('12 ÷ 4'),'12 bölü 4');
 assert.equal(neuralSpeechText('x² + 2'),'x kare + 2');
 // Dates, hyphenated words and e-mail-like text stay untouched.
 assert.equal(neuralSpeechText('12/04/2026'),'12/04/2026');
 assert.equal(neuralSpeechText('Ali-Veli ve x ekseni'),'Ali-Veli ve x ekseni');
});
test('WAV container is valid 16-bit mono PCM',()=>{
 const wav=floatToWav(new Float32Array([0,0.5,-0.5,1,-1,2]),48000);
 const v=new DataView(wav.buffer);
 assert.equal(String.fromCharCode(...wav.slice(0,4)),'RIFF');assert.equal(String.fromCharCode(...wav.slice(8,12)),'WAVE');
 assert.equal(v.getUint16(22,true),1);assert.equal(v.getUint32(24,true),48000);assert.equal(v.getUint16(34,true),16);
 assert.equal(v.getUint32(40,true),12);assert.equal(v.getInt16(44+3*2,true),32767);assert.equal(v.getInt16(44+4*2,true),-32768);
 assert.equal(v.getInt16(44+5*2,true),32767,'clipped, not wrapped');
});
test('support detection fails closed without Worker, WebAssembly or Web Audio',()=>{
 assert.equal(neuralSupported(null),false);
 assert.equal(neuralSupported({Worker(){},WebAssembly:{}}),false);
 assert.equal(neuralSupported({Worker(){},WebAssembly:{},AudioContext(){}}),true);
});
test('engine refuses empty/too long text and never touches the network itself',async()=>{
 const messages=[];const win={Worker:class{constructor(){throw Error('must not start');}},WebAssembly:{},AudioContext(){}};
 const v=createNeuralSpeech({win,onStatus:m=>messages.push(m)});
 assert.equal(await v.speak('   '),false);assert.match(messages.at(-1),/Okunacak içerik yok/);
 assert.equal(await v.speak('a'.repeat(NEURAL_MAX_CHARACTERS+1)),false);assert.match(messages.at(-1),/çok uzun/);
 const src=readFileSync(new URL('./dou-speech-neural.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(src,/\bfetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|getUserMedia|https?:\/\//);
});
test('engine streams chunks from the worker into audio and cancels on stop',async()=>{
 const posted=[];let worker;
 class FakeWorker{constructor(url,opts){worker=this;this.url=url;this.opts=opts;}
  postMessage(m){posted.push(m);
   if(m.type==='load')setTimeout(()=>this.onmessage({data:{type:'progress',loaded:1,total:2}}),0),setTimeout(()=>this.onmessage({data:{type:'ready'}}),1);
   else if(m.id){setTimeout(()=>{this.onmessage({data:{type:'chunk',id:m.id,index:0,count:1,audio:new Float32Array(480),seconds:0.01}});this.onmessage({data:{type:'done',id:m.id}});},2);}}
  terminate(){}}
 const started=[];class Ctx{constructor(){this.currentTime=0;this.destination={};}resume(){return Promise.resolve();}suspend(){}close(){}
  createBuffer(c,n,r){return {copyToChannel(){},n,r};}createBufferSource(){const s={connect(){},start(t){started.push(t);},stop(){}};return s;}}
 const messages=[];const win={Worker:FakeWorker,WebAssembly:{},AudioContext:Ctx};
 const v=createNeuralSpeech({win,onStatus:m=>messages.push(m)});
 assert.equal(await v.speak('Beş artı üç',{rate:1.25}),true);
 assert.equal(worker.url,'/okur/okur-worker.js');assert.deepEqual(worker.opts,{type:'module'});
 const req=posted.find(m=>m.id);assert.equal(req.text,'Beş artı üç');assert.equal(req.speed,1.25);
 assert.equal(started.length,1);assert.ok(messages.some(m=>/yükleniyor/.test(m)));
 v.stop();assert.ok(posted.some(m=>m.type==='cancel'));
});
test('bundled model files match the published SHA-256 list and carry license/attribution',()=>{
 const base=new URL('./okur/',import.meta.url);
 const sums=readFileSync(new URL('SHA256SUMS',base),'utf8').trim().split('\n').map(l=>l.split(/\s+/));
 assert.ok(sums.length>=8);
 for(const [hash,file] of sums){assert.ok(existsSync(new URL(file,base)),file);
  assert.equal(createHash('sha256').update(readFileSync(new URL(file,base))).digest('hex'),hash,file);}
 const notice=readFileSync(new URL('LICENSE-NOTICE.txt',base),'utf8');
 assert.match(notice,/CC BY 4\.0/);assert.match(notice,/Apache/);assert.match(notice,/taklit/);
});
test('v2.95: sinir ağı metni, işletim sistemi sesiyle aynı matematik okumasını paylaşır',()=>{
 assert.equal(neuralSpeechText('√16 = 4, ½ + ¼, 30°C, x^4, 5 > 3, 3/4, 10 - 4'),'karekök 16 = 4, bir bölü iki + bir bölü dört, 30 santigrat derece, x üssü 4, 5 büyüktür 3, 3 bölü 4, 10 eksi 4');
 assert.equal(neuralSpeechText('<b>x</b> ve 29/10/2026 ve Ali-Veli'),'<b>x</b> ve 29/10/2026 ve Ali-Veli');
});
