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
const FRACTIONS=new Map([['½','bir bölü iki'],['⅓','bir bölü üç'],['⅔','iki bölü üç'],['¼','bir bölü dört'],['¾','üç bölü dört'],['⅕','bir bölü beş'],['⅖','iki bölü beş'],['⅗','üç bölü beş'],['⅘','dört bölü beş'],['⅙','bir bölü altı'],['⅚','beş bölü altı'],['⅛','bir bölü sekiz'],['⅜','üç bölü sekiz'],['⅝','beş bölü sekiz'],['⅞','yedi bölü sekiz']]);
const SUPERSCRIPT_DIGITS=new Map([['⁰','0'],['¹','1'],['⁴','4'],['⁵','5'],['⁶','6'],['⁷','7'],['⁸','8'],['⁹','9']]);
const TOKENS = /≤|≥|≠|≈|±|×|÷|√|∞|∑|π|∆|²|³|−|∫|∂|∈|∉|∩|∪|→|↔|α|β|θ/g;
export function turkishSpeechText(value) {
 if(typeof value!=='string')throw new TypeError('Seslendirme metni bir dizge olmalıdır.');
 if(value.length>16000)throw new RangeError('Seslendirme sınırı aşıldı.');
 // v2.95: unambiguous Unicode forms only (fractions, degrees, middle dot, sub/superscript digits, simple ^n). Still no general formula parsing.
 let text=value
  .replace(/[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g,f=>` ${FRACTIONS.get(f)} `)
  .replace(/°\s?C\b/g,' santigrat derece').replace(/°\s?F\b/g,' fahrenhayt derece').replace(/°/g,' derece')
  .replace(/(?<=[\p{N}\p{L}\)])\s?[·⋅]\s?(?=[\p{N}\p{L}\(])/gu,' çarpı ')
  .replace(/(?<![\p{L}\p{N}.,])(\d[\d.,]*|\p{L}) ([<>]) (\d[\d.,]*|\p{L})(?![\p{L}\p{N}])/gu,(_,l,op,r)=>`${l} ${op==='<'?'küçüktür':'büyüktür'} ${r}`)
  .replace(/(?<=\d)\s[-–]\s(?=\d)/g,' eksi ')
  .replace(/[₀-₉]/g,d=>String(d.charCodeAt(0)-0x2080))
  .replace(/[⁰¹⁴-⁹]+/g,run=>' üssü '+[...run].map(d=>SUPERSCRIPT_DIGITS.get(d)).join(''))
  .replace(/([\p{L}\p{N}])\^-(\d)(?!\d)/gu,(_,b,n)=>`${b} üssü eksi ${n}`)
  .replace(/([\p{L}\p{N}])\^(\d{1,3}|\p{L})(?![\p{L}\p{N}])/gu,(m,b,n)=>n==='2'?`${b} kare`:n==='3'?`${b} küp`:`${b} üssü ${n}`);
 // Treat only simple explicit exponent notation. No claims of parsing arbitrary maths.
 text=text.replace(/([\p{L}\p{N}])\^(2|3)(?!\d)/gu,(_,base,power)=>`${base} ${power==='2'?'kare':'küp'}`)
  .replace(/!=/g,' eşit değil ').replace(/>=/g,' büyük veya eşit ').replace(/<=/g,' küçük veya eşit ')
  .replace(TOKENS,symbol=>` ${SYMBOLS.get(symbol)} `);
 // Collapse spacing introduced by replacements, retain original punctuation and accents.
 text=text.replace(/[ \t]{2,}/g,' ').replace(/(?<=[\p{L}\p{N}]) +(?=[,;.!?](?:\s|$))/gu,'').trim();
 if(text.length>24000)throw new RangeError('Seslendirme dönüşümü sınırı aşıldı.');
 return text;
}
