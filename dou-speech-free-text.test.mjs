import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {planLocalFreeText,synthesizeLocalFreeText,FREE_TEXT_MAX_CHARACTERS} from './dou-speech-free-text.mjs';
import {synthesizeTurkishArticulationPreview,synthesizeFixedStressExceptionArm} from './dou-speech-waveform.mjs';
import {synthesizeFixedContinuityPreview} from './dou-speech-continuity.mjs';
const hash=data=>createHash('sha256').update(data).digest('hex');
const riff=w=>new DataView(w.buffer,w.byteOffset,w.byteLength);
test('Serbest Türkçe metin ayrı WAV üretiyor, 22.05 kHz mono PCM16',()=>{
 const x=synthesizeLocalFreeText('Merhaba dünya! Bugün hava güzel.');const v=riff(x.wav);
 assert.equal(new TextDecoder().decode(x.wav.subarray(0,4)),'RIFF');
 assert.equal(v.getUint32(24,true),22050);assert.equal(v.getUint16(22,true),1);
 assert.equal(v.getUint16(34,true),16);assert.equal(v.getUint32(40,true),x.wav.length-44);
 assert.ok(x.durationSeconds>0);assert.ok(x.durationSeconds<=60);
 assert.equal(x.freeText,true);assert.equal(x.validatedIntelligibility,false);
});
test('Sözcük sınırında bölünmüş metin, eski 100 karakter sınırını aşabiliyor',()=>{
 const input=('Merhaba dünya. ').repeat(11);
 const plan=planLocalFreeText(input);assert.ok(plan.chunks.length>1);
 assert.ok(plan.chunks.every(x=>x.length<=45));assert.equal(plan.chunks.join(' '),input.trim());
 const result=synthesizeLocalFreeText(input);assert.ok(result.chunkCount>1);
});
test('Türkçe büyük harfler, satır başları, kesme işaretleri ve rakamlar kabul edilir',()=>{
 const p=planLocalFreeText("İZMİR'de 2026.\nYağmur ve güneş!");
 assert.ok(p.chunks.length>0);
 const result=synthesizeLocalFreeText("İZMİR'de 2026.\nYağmur ve güneş!");assert.ok(result.durationSeconds>0);
});
test('Yinelenen çağrı tamamen deterministik ve eski WAV API çıktısını değiştirmiyor',()=>{
 const before=hash(synthesizeTurkishArticulationPreview('Merhaba dünya').wav);
 const old=hash(synthesizeFixedStressExceptionArm('EX13','baseline').wav);
 const oldD=hash(synthesizeFixedContinuityPreview('EX13').wav);
 const a=synthesizeLocalFreeText('Bugün deneysel ses.');const b=synthesizeLocalFreeText('Bugün deneysel ses.');
 assert.equal(hash(a.wav),hash(b.wav));
 assert.equal(hash(synthesizeTurkishArticulationPreview('Merhaba dünya').wav),before);
 assert.equal(hash(synthesizeFixedStressExceptionArm('EX13','baseline').wav),old);
 assert.equal(hash(synthesizeFixedContinuityPreview('EX13').wav),oldD);
});
test('Metin doğrulama: boş, fazla uzun, HTML, emoji ve özel işaret reddedilir',()=>{
 for(const value of ['', '  ', 'x'.repeat(361), '<script>', 'abc😀', 'x²', 'a/b'])assert.throws(()=>planLocalFreeText(value));
 assert.equal(FREE_TEXT_MAX_CHARACTERS,360);
});
test('Bitişik çok uzun sözcük ve rakam açılımı taşması önlenir',()=>{
 assert.throws(()=>planLocalFreeText('a'.repeat(46)));
 assert.throws(()=>planLocalFreeText('9 '.repeat(165)));
});
test('Perde ve hız sınırları doğrulanır; farklı değerler WAV üretir',()=>{
 for(const options of [{rate:0.7},{rate:1.9},{pitchHz:221},{pitchHz:90/0},{pitchHz:'125'}])
  assert.throws(()=>synthesizeLocalFreeText('Merhaba',options));
 const a=synthesizeLocalFreeText('Merhaba',{pitchHz:110,rate:1});
 const b=synthesizeLocalFreeText('Merhaba',{pitchHz:150,rate:1.25});
 assert.notEqual(hash(a.wav),hash(b.wav));
});
test('Uzun rakam dizisi veri depolamadan kontrollü reddedilir',()=>{
 assert.throws(()=>synthesizeLocalFreeText('2026'.repeat(15)));
});
test('WAV başlığı örnek uzunluklarını doğru bildirir, veri içinde yazılı metin taşımaz',()=>{
 const s=synthesizeLocalFreeText('Özgür Türkçe 123');const v=riff(s.wav);
 assert.equal(v.getUint32(4,true),s.wav.length-8);
 assert.equal(new TextDecoder().decode(s.wav).includes('Özgür'),false);
});
