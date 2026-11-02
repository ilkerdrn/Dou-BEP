import test from 'node:test';
import assert from 'node:assert/strict';
import {numberToTurkishWords,expandTurkishNumbers} from './dou-speech-number-words.mjs';
import {planLocalFreeText,synthesizeLocalFreeText} from './dou-speech-free-text.mjs';
import {createHash} from 'node:crypto';
const hash=v=>createHash('sha256').update(v).digest('hex');
test('Türkçe tam sayıların sınırları ve sıfır içeren örnekler doğru açılır',()=>{
 const fixtures=new Map([[0,'sıfır'],[1,'bir'],[10,'on'],[19,'on dokuz'],[20,'yirmi'],
  [90,'doksan'],[100,'yüz'],[101,'yüz bir'],[110,'yüz on'],[999,'dokuz yüz doksan dokuz'],
  [1000,'bin'],[1001,'bin bir'],[1010,'bin on'],[1100,'bin yüz'],[1111,'bin yüz on bir'],
  [2026,'iki bin yirmi altı'],[9999,'dokuz bin dokuz yüz doksan dokuz']]);
 for(const [number,expected] of fixtures)assert.equal(numberToTurkishWords(number),expected,number);
 for(const number of [-1,10000,Infinity,NaN,1.3,'123'])assert.throws(()=>numberToTurkishWords(number));
});
test('Önceden belirlenmiş basamak okunuşu ve yeni kardinal okunuş birbirinden ayrıdır',()=>{
 const input='2026 ve 007 numarası.';
 assert.equal(expandTurkishNumbers(input), 'iki sıfır iki altı ve sıfır sıfır yedi numarası.');
 assert.equal(expandTurkishNumbers(input,{mode:'cardinal'}),'iki bin yirmi altı ve sıfır sıfır yedi numarası.');
 assert.equal(expandTurkishNumbers('10000 12345',{mode:'cardinal'}), 'bir sıfır sıfır sıfır sıfır bir iki üç dört beş');
 for(const mode of ['empty',null,'Cardinal'])assert.throws(()=>expandTurkishNumbers('2',{mode}));
});
test('Yeni cümle gruplama metni yutmadan ve 45 karakteri aşmadan çalışır',()=>{
 const plan=planLocalFreeText('Merhaba dünya! Bugün 2026 yılı. İzmir güzel.',{numberMode:'cardinal',delivery:'phrased'});
 assert.equal(plan.expanded,'Merhaba dünya! Bugün iki bin yirmi altı yılı. İzmir güzel.');
 assert.equal(plan.chunks.join(' '),plan.expanded);
 assert.ok(plan.chunks.length>=3);
 assert.ok(plan.chunks.every(x=>x.length<=45));
 assert.ok(plan.pausesMs.every(x=>x===240));
 assert.equal(plan.pausesMs.length,plan.chunks.length-1);
});
test('Uzun söz ve sayı açılımları sınırları aşınca güvenle reddedilir',()=>{
 assert.throws(()=>planLocalFreeText('9 '.repeat(175),{numberMode:'cardinal',delivery:'phrased'}));
 assert.throws(()=>planLocalFreeText('12', {delivery:'unknown'}));
 assert.throws(()=>planLocalFreeText('12', {numberMode:'unknown'}));
});
test('Yeni seçenekler ayrı deterministik PCM üretir, v2.68 yolu korunur',()=>{
 const input='2026 yılında merhaba! Bugün güzel.';
 const old=synthesizeLocalFreeText(input);
 const standard=synthesizeLocalFreeText(input,{numberMode:'digits',delivery:'legacy'});
 const fresh=synthesizeLocalFreeText(input,{numberMode:'cardinal',delivery:'phrased'});
 assert.equal(hash(old.wav),hash(standard.wav));
 assert.notEqual(hash(old.wav),hash(fresh.wav));
 assert.equal(hash(fresh.wav),hash(synthesizeLocalFreeText(input,{numberMode:'cardinal',delivery:'phrased'}).wav));
 assert.ok(fresh.durationSeconds>0&&fresh.durationSeconds<=60);
 assert.equal(fresh.validatedIntelligibility,false);
});
test('Cümle durakları ses süresini artırır; uzun cümle dışı kesmeler daha kısa',()=>{
 const a=planLocalFreeText('Merhaba! Günaydın.',{delivery:'phrased'});
 const b=planLocalFreeText('Merhaba dünya bugun iyiyiz teşekkürler.',{delivery:'phrased'});
 assert.equal(a.pausesMs[0],240);
 assert.ok(b.pausesMs.every(ms=>ms===35));
});
