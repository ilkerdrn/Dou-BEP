import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {normalizeTurkishSpeechContext} from './dou-speech-context-normalization.mjs';
import {planLocalFreeText,synthesizeLocalFreeText} from './dou-speech-free-text.mjs';
const read=(s,mode='structured')=>normalizeTurkishSpeechContext(s,{mode}).text;
const hash=b=>createHash('sha256').update(b).digest('hex');
test('literal mode preserves input and invalid modes are rejected',()=>{
 const sample='29.10.2026 09:30 Dr. 007';
 assert.equal(read(sample,'literal'),sample);
 assert.throws(()=>normalizeTurkishSpeechContext(sample,{mode:'auto'}),RangeError);
 assert.throws(()=>normalizeTurkishSpeechContext(7,{mode:'structured'}),TypeError);
});
test('strictly valid Turkish dates and leap years are opened conservatively',()=>{
 assert.equal(read('29.10.2026'), 'yirmi dokuz ekim iki bin yirmi altı');
 assert.equal(read('29.02.2024'), 'yirmi dokuz şubat iki bin yirmi dört');
 assert.equal(read('01.01.2000'), 'bir ocak iki bin');
 for(const bad of ['31.04.2026','29.02.2025','00.12.2026','01.13.2026','01.01.1899','31.12.2100'])
  assert.throws(()=>read(bad),RangeError,bad);
});
test('24-hour time format checks ranges and reads leading zero minutes',()=>{
 assert.equal(read('09:30'),'saat dokuz otuz');
 assert.equal(read('saat 09:30'),'saat dokuz otuz');
 assert.equal(read('Saat 09:30'),'saat dokuz otuz');
 assert.equal(read('00:00'),'saat sıfır');
 assert.equal(read('23:59'),'saat yirmi üç elli dokuz');
 assert.equal(read('08:05'),'saat sekiz sıfır beş');
 for(const bad of ['24:01','12:60','99:99'])assert.throws(()=>read(bad),RangeError);
});
test('abbreviation allowlist is word-boundary safe and avoids free-form expansion',()=>{
 assert.equal(read('Prof. Dr. Sn. Doç. T.C.'),'profesör doktor sayın doçent te ce');
 assert.equal(read('MEB ABC TCK'),'MEB ABC TCK');
 assert.equal(read('XDr. YazDr.'),'XDr. YazDr.');
});
test('date and time stay literal unless explicitly opted in, preserve previous defaults',()=>{
 const sample='Prof. Dr. 29.10.2026 saat 09:30. 007';
 const old=planLocalFreeText(sample,{numberMode:'cardinal',delivery:'phrased'});
 const explicitOld=planLocalFreeText(sample,{numberMode:'cardinal',delivery:'phrased',contextMode:'literal'});
 assert.deepEqual(old,explicitOld);
 const newPlan=planLocalFreeText(sample,{numberMode:'cardinal',delivery:'phrased',contextMode:'structured'});
 assert.match(newPlan.expanded,/profesör doktor yirmi dokuz ekim iki bin yirmi altı/);
 assert.match(newPlan.expanded,/saat dokuz otuz/);
 assert.doesNotMatch(newPlan.expanded,/saat saat/);
 assert.match(newPlan.expanded,/sıfır sıfır yedi/);
 assert.equal(newPlan.contextMode,'structured');
 assert.equal(newPlan.contextConversions,4);
 assert.equal(newPlan.chunks.join(' '),newPlan.expanded);
});
test('new voice output is deterministic, legacy output is unchanged',()=>{
 const text='Dr. 29.10.2026 tarihinde saat 09:30.';
 const legacy=synthesizeLocalFreeText(text,{numberMode:'cardinal',delivery:'phrased'});
 const same=synthesizeLocalFreeText(text,{numberMode:'cardinal',delivery:'phrased',contextMode:'literal'});
 assert.equal(hash(legacy.wav),hash(same.wav));
 const a=synthesizeLocalFreeText(text,{numberMode:'cardinal',delivery:'phrased',contextMode:'structured'});
 const b=synthesizeLocalFreeText(text,{numberMode:'cardinal',delivery:'phrased',contextMode:'structured'});
 assert.equal(hash(a.wav),hash(b.wav));
 assert.notEqual(hash(a.wav),hash(legacy.wav));
 assert.equal(a.validatedIntelligibility,false);
 assert.equal(a.localOnly,true);
});
test('new options obey all original text, chunk and 60-second bounds',()=>{
 assert.throws(()=>planLocalFreeText('31.02.2026',{contextMode:'structured'}),RangeError);
 assert.throws(()=>planLocalFreeText('merhaba',{contextMode:'unsupported'}),RangeError);
 assert.throws(()=>planLocalFreeText('29.10.2026 '.repeat(40),{contextMode:'structured'}),RangeError);
 assert.throws(()=>planLocalFreeText('00.00.2026',{contextMode:'structured'}),RangeError);
});
