import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAcademicPrompt} from './pdf-rich-text.mjs';
import {REVIEWED_ALTERNATIVE_EXAMPLES} from './pdf-reviewed-alternatives.mjs';

test('human-authored math and visual transcript blocks preserve distinct source and description in reading order',()=>{
 const blocks=parseAcademicPrompt(`Karşılaştırın:\n${REVIEWED_ALTERNATIVE_EXAMPLES.denklem}\n${REVIEWED_ALTERNATIVE_EXAMPLES.gorsel}\nSonuç?`);
 assert.deepEqual(blocks.map(b=>b.kind||'plain'),['plain','reviewed-source','reviewed-alternative','reviewed-source','reviewed-alternative','plain']);
 assert.match(blocks[2].text,/kütle ile ışık hızının/);
 assert.match(blocks[4].text,/ikincisi 4 birim yüksektir/);
});

test('missing, modified or inconsistent human acknowledgement blocks reject PDF generation',()=>{
 const correct=REVIEWED_ALTERNATIVE_EXAMPLES.denklem;
 for(const invalid of [
  correct.replace('Kontrol: kaynakla karşılaştırıldı','Kontrol: hayır'),
  correct.replace('Açıklama:','Başka alan:'),
  correct.replace('Kaynak: E = m çarpı c kare','Kaynak: x'),
  correct.replace('Açıklama: E enerjisi, kütle ile ışık hızının karesinin çarpımına eşittir.','Açıklama: E = m çarpı c kare'),
  correct.slice(0,-3),
  ':::gorsel\nKaynak: Test görseli\nAçıklama: https://example.invalid\nKontrol: kaynakla karşılaştırıldı\n:::',
  ':::bilinmeyen\nKaynak: Test\n:::',
  ':::denklem\nKaynak: Çok uzun bir kaynak\nAçıklama: ![image](https://example.invalid)\nKontrol: kaynakla karşılaştırıldı\n:::'
 ])assert.throws(()=>parseAcademicPrompt(invalid),undefined,invalid);
});

test('alternative blocks do not bypass embedded visual and math markup safeguards',()=>{
 for(const input of ['![görsel](foo.jpg)', '<math>E=mc2</math>', '\\frac{a}{b}', ':::gorsel\nKaynak: Çubuk grafik\nAçıklama: Açıklama yeterli değil\nKontrol: inceleme bekleniyor\n:::']){
  assert.throws(()=>parseAcademicPrompt(input),undefined,input);
 }
});
