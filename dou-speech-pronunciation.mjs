/** DOU Speech — conservative, offline Turkish mathematical reading.
 * Text transformation ONLY, not a natural speech engine or NVDA setting.
 * Preserve student-visible question text, links, mail addresses, dates,
 * existing answer policies and single-use student tokens.
 */
const SYMBOLS=new Map([
 ['≤','küçük veya eşit'],['≥','büyük veya eşit'],['≠','eşit değil'],
 ['≈','yaklaşık eşit'],['±','artı veya eksi'],['×','çarpı'],['÷','bölü'],
 ['√','karekök'],['∞','sonsuz'],['∑','toplam'],['π','pi'],['∆','delta'],
 ['²','kare'],['³','küp'],['−','eksi'],
 ['∫','integral'],['∂','kısmi türev'],['∈','elemanıdır'],['∉','elemanı değildir'],
 ['∩','kesişim'],['∪','birleşim'],['→','yönünde ok'],['↔','çift yönlü ok'],
 ['α','alfa'],['β','beta'],['θ','teta'],
 ['<','küçüktür'],['>','büyüktür'],['=','eşittir'],['+','artı'],
 ['*','çarpı'],['°','derece'],['‰','binde'],['₺','Türk lirası']
]);
const TOKENS=/≤|≥|≠|≈|±|×|÷|√|∞|∑|π|∆|²|³|−|∫|∂|∈|∉|∩|∪|→|↔|α|β|θ|[<>=+*°‰₺]/g;
// Do not read separators in links, email addresses or calendar dates as maths.
// These remain text exactly as typed. Date interpretation is a separate topic.
const PROTECTED=/(?:https?:\/\/[^\s]+|www\.[^\s]+|[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}|(?<!\d)\d{1,2}\/\d{1,2}\/\d{4}(?!\d)|(?<!\d)\d{4}\/\d{1,2}\/\d{1,2}(?!\d)|(?<!\d)\d{4}-\d{1,2}-\d{1,2}(?!\d))/giu;
function expandMath(text){
 return text
  // Distinguish compound comparisons before single-character operators.
  .replace(/([\p{L}\p{N}])\^(2|3)(?!\d)/gu,(_,base,power)=>base+' '+(power==='2'?'kare':'küp'))
  .replace(/!=/g,' eşit değil ')
  .replace(/>=/g,' büyük veya eşit ')
  .replace(/<=/g,' küçük veya eşit ')
  .replace(/==/g,' eşittir ')
  .replace(TOKENS,symbol=>' '+SYMBOLS.get(symbol)+' ')
  // A numeric fraction is unambiguous after dates and URLs are protected.
  .replace(/(?<=\d)\s*\/\s*(?=\d)/g,' bölü ')
  // Do not turn hyphenated words, filenames, ranges or dates into subtraction.
  .replace(/(?<=[0-9)\]])\s*-\s*(?=[0-9([])/g,' eksi ')
  .replace(/(?<=\s)-(?=\s)/g,' eksi')
  // Leading negative number (e.g. -5, x + -2).
  .replace(/(^|[\s(])-(?=\d)/g,'$1 eksi ')
  // Percent as prefix or postfix; do not rewrite URL escapes.
  .replace(/(?<![\p{L}\p{N}])%\s*(\d+(?:[.,]\d+)?)/gu,'yüzde $1')
  .replace(/(\d+(?:[.,]\d+)?)\s*%/g,'yüzde $1')
  .replace(/%/g,' yüzde ');
}
export function turkishSpeechText(value){
 if(typeof value!=='string')throw new TypeError('Seslendirme metni bir dizge olmalıdır.');
 if(value.length>16000)throw new RangeError('Seslendirme sınırı aşıldı.');
 let output='',last=0;
 for(const match of value.matchAll(PROTECTED)){
  output+=expandMath(value.slice(last,match.index))+match[0];
  last=match.index+match[0].length;
 }
 output+=expandMath(value.slice(last));
 // Normalize spaces introduced by pronunciation without modifying input text.
 output=output.replace(/[ \t]{2,}/g,' ').trim();
 if(output.length>24000)throw new RangeError('Seslendirme dönüşümü sınırı aşıldı.');
 return output;
}
