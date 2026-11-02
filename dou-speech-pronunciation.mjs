/** DOU Speech v2.44 — conservative, local-only Turkish maths pronunciation.
 * Text transformation, NOT speech synthesis or general formula parsing.
 * Leaves ambiguous '/' patterns (dates, URLs, paths) intact.
 * Only invoked after the exam's audioAllowed policy is checked.
 */
const SYMBOLS = new Map([
 ['≤','küçük veya eşit'],['≥','büyük veya eşit'],['≠','eşit değil'],
 ['≈','yaklaşık eşit'],['±','artı veya eksi'],['×','çarpı'],['÷','bölü'],
 ['√','karekök'],['∞','sonsuz'],['∑','toplam'],['π','pi'],['∆','delta'],
 ['²','kare'],['³','küp'],['−','eksi'],
 ['∫','integral'],['∂','kısmi türev'],['∈','elemanıdır'],['∉','elemanı değildir'],
 ['∩','kesişim'],['∪','birleşim'],['→','yönünde ok'],['↔','çift yönlü ok'],
 ['α','alfa'],['β','beta'],['θ','teta']
]);
const TOKENS = /≤|≥|≠|≈|±|×|÷|√|∞|∑|π|∆|²|³|−|∫|∂|∈|∉|∩|∪|→|↔|α|β|θ/g;
export function turkishSpeechText(value) {
 if(typeof value!=='string')throw new TypeError('Seslendirme metni bir dizge olmalıdır.');
 if(value.length>16000)throw new RangeError('Seslendirme sınırı aşıldı.');
 // Treat only simple explicit exponent notation. No claims of parsing arbitrary maths.
 let text=value.replace(/([\p{L}\p{N}])\^(2|3)(?!\d)/gu,(_,base,power)=>`${base} ${power==='2'?'kare':'küp'}`)
  .replace(/!=/g,' eşit değil ').replace(/>=/g,' büyük veya eşit ').replace(/<=/g,' küçük veya eşit ')
  .replace(TOKENS,symbol=>` ${SYMBOLS.get(symbol)} `);
 // Collapse spacing introduced by replacements, retain original punctuation and accents.
 text=text.replace(/[ \t]{2,}/g,' ').trim();
 if(text.length>24000)throw new RangeError('Seslendirme dönüşümü sınırı aşıldı.');
 return text;
}
