import test from 'node:test';
import assert from 'node:assert/strict';
import {turkishSpeechText} from './dou-speech-pronunciation.mjs';
import {createLocalSpeech} from './dou-speech.mjs';
test('Turkish speech expands unambiguous math symbols without a cloud service',()=>{
 const spoken=turkishSpeechText('a ≤ b, x ≥ 2; x ≠ 0. A ≈ B. 3×4÷2 ± 1; √9; π; ∞; ∑');
 for(const word of ['küçük veya eşit','büyük veya eşit','eşit değil','yaklaşık eşit','çarpı','bölü','artı veya eksi','karekök','pi','sonsuz','toplam']) assert.ok(spoken.includes(word),word);
});
test('ASCII maths and simple square/cube are spoken without changing ordinary Turkish',()=>{
 assert.equal(turkishSpeechText('x^2 + y^3 <= 10 != 12 >= 2'),'x kare + y küp küçük veya eşit 10 eşit değil 12 büyük veya eşit 2');
 assert.equal(turkishSpeechText('Sınav günü 29/10/2026; ölçüm 1/2; HTTPS://site'), 'Sınav günü 29/10/2026; ölçüm 1/2; HTTPS://site');
 assert.equal(turkishSpeechText('Öğrenci: ÇĞİÖŞÜ. 3,14'), 'Öğrenci: ÇĞİÖŞÜ. 3,14');
});
test('speech processing rejects huge input without silent truncation',()=>{
 assert.throws(()=>turkishSpeechText('x'.repeat(16001)),/sınırı/);
 assert.throws(()=>turkishSpeechText(null),TypeError);
});
test('local browser adapter pronounces before playback, preserves selected local Turkish voice',()=>{
 const utterances=[];
 class U{constructor(text){this.text=text;}}
 const voice={localService:true,lang:'tr-TR',voiceURI:'yerel',name:'Yerel ses'};
 const synth={getVoices:()=>[voice],cancel(){},speak(u){utterances.push(u)}};
 const engine=createLocalSpeech({synth,Utterance:U});
 assert.equal(engine.speak('x² ≤ 5'),true);
 assert.match(utterances[0].text,/x kare küçük veya eşit 5/);
 assert.equal(utterances[0].voice,voice);
});

test('oversized maths expansion refuses speech without throwing into the exam UI',()=>{
 const v={localService:true,lang:'tr-TR',voiceURI:'yerel',name:'yerel'};let message='',calls=0;
 const synth={getVoices:()=>[v],cancel(){},speak(){calls++}};
 const engine=createLocalSpeech({synth,Utterance:class{constructor(t){this.text=t;}},onStatus:x=>{message=x;}});
 assert.equal(engine.speak('≤'.repeat(15000)),false);
 assert.equal(calls,0);assert.match(message,/sınırını/);
});

test('v2.44 set theory, calculus and Greek symbols get conservative Turkish names',()=>{
 const pronounced=turkishSpeechText('α ∈ A ∩ B; β ∉ ∅; ∫f(x) ∂x; A ∪ B → θ ↔ γ');
 for(const expected of ['alfa','elemanıdır','kesişim','beta','elemanı değildir','integral','kısmi türev','birleşim','yönünde ok','çift yönlü ok','teta']) assert.ok(pronounced.includes(expected),expected);
 assert.equal(turkishSpeechText('https://x.org/a-b?i=1 ve 29/10/2026'),'https://x.org/a-b?i=1 ve 29/10/2026');
});
test('v2.95: kesir, derece, orta nokta, alt/üst simge, üs ve karşılaştırma yalnız belirsizlik yoksa okunur',()=>{
 const t=turkishSpeechText;
 assert.equal(t('½ + ¼ = ¾'),'bir bölü iki + bir bölü dört = üç bölü dört');
 assert.equal(t('30° açı, 25°C, 70°F'),'30 derece açı, 25 santigrat derece, 70 fahrenhayt derece');
 assert.equal(t('3 + 4 · 2'),'3 + 4 çarpı 2');assert.equal(t('H₂O ve x₁'),'H2O ve x1');
 assert.equal(t('x^4 ve a^n ve 2^-1 ve y^2'),'x üssü 4 ve a üssü n ve 2 üssü eksi 1 ve y kare');assert.equal(t('10⁴'),'10 üssü 4');
 assert.equal(t('5 > 3 ve 2 < 4'),'5 büyüktür 3 ve 2 küçüktür 4');assert.equal(t('10 - 4 = 6'),'10 eksi 4 = 6');
 // Belirsiz olanlar değişmez
 assert.equal(t('Ali-Veli, 29/10/2026, 3-4 gün, a -> b, <b>kalın</b>'),'Ali-Veli, 29/10/2026, 3-4 gün, a -> b, <b>kalın</b>');
 assert.equal(t('Cümle sonu > işareti'),'Cümle sonu > işareti');
});
