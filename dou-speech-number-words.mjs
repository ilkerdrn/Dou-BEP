/** DOU Speech Lab v2.69 — deterministic, conservative integer reading.
 * Experimental text preprocessing, NOT a Turkish grammar or TTS model.
 * A leading-zero sequence or an integer above 9999 is spoken digit by digit.
 * Decimals, dates, amounts and telephone numbers are NOT interpreted semantically.
 */
const ONES=['','bir','iki','üç','dört','beş','altı','yedi','sekiz','dokuz'];
const TENS=['','on','yirmi','otuz','kırk','elli','altmış','yetmiş','seksen','doksan'];
const DIGITS=['sıfır',...ONES.slice(1)];
export function numberToTurkishWords(value){
 if(!Number.isSafeInteger(value)||value<0||value>9999)throw new RangeError('0–9999 aralığında bir tam sayı gerekli.');
 if(value===0)return DIGITS[0];
 const thousands=Math.floor(value/1000),hundreds=Math.floor(value%1000/100),tens=Math.floor(value%100/10),ones=value%10;
 return [thousands?(thousands===1?'bin':`${ONES[thousands]} bin`):'',
  hundreds?(hundreds===1?'yüz':`${ONES[hundreds]} yüz`):'',TENS[tens],ONES[ones]].filter(Boolean).join(' ');
}
export function expandTurkishNumbers(text,{mode='digits'}={}){
 if(typeof text!=='string')throw new TypeError('Metin yazı olmalıdır.');
 if(!['digits','cardinal'].includes(mode))throw new RangeError('Geçersiz sayı okuma modu.');
 return text.replace(/[0-9]+/g,token=>{
  const digitReading=()=>[...token].map(c=>DIGITS[Number(c)]).join(' ');
  if(mode==='digits'||token.length>4||(token.length>1&&token.startsWith('0')))return digitReading();
  return numberToTurkishWords(Number(token));
 });
}
