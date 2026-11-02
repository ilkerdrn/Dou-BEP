/** DOU Speech Lab v2.70 — opt-in, conservative Turkish context normalizer.
 * This is deterministic text transformation, not verified pronunciation or
 * natural speech, and never connects to a service or stores user text.
 * Literal mode must preserve previous audio output byte-for-byte.
 */
import {numberToTurkishWords} from './dou-speech-number-words.mjs';

const MONTHS=Object.freeze([
 '', 'ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran',
 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'
]);
const ABBREVIATIONS=Object.freeze({
 't.c.':'te ce', 'prof.':'profesör', 'doç.':'doçent',
 'dr.':'doktor', 'sn.':'sayın'
});
function readNumber(n){return numberToTurkishWords(Number(n));}
function safeDate(day,month,year){
 const d=Number(day),m=Number(month),y=Number(year);
 if(y<1900||y>2099||m<1||m>12||d<1||d>31)return false;
 const days=[31,(y%4===0&&(y%100!==0||y%400===0))?29:28,31,30,31,30,31,31,30,31,30,31];
 return d<=days[m-1];
}
/**
 * Only recognizes explicit day.month.year, HH:MM, and a five-item abbreviation
 * allowlist. Other numeric expressions retain the selected v2.69 behaviour.
 * Out-of-range calendar/clock values are rejected instead of misread silently.
 */
export function normalizeTurkishSpeechContext(text,{mode='literal'}={}){
 if(typeof text!=='string')throw new TypeError('Metin yazı olmalıdır.');
 if(!['literal','structured'].includes(mode))throw new RangeError('Geçersiz bağlamsal okunuş modu.');
 if(mode==='literal')return Object.freeze({text,conversions:0,mode,experimental:true});
 let conversions=0;
 const replace=(match,replacement)=>{conversions++;return replacement;};
 let result=text.replace(/(?<![0-9.])([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})(?![0-9]|\.[0-9])/gu,
  (match,day,month,year)=>{
   if(!safeDate(day,month,year))throw new RangeError(`Geçersiz takvim tarihi: ${match}.`);
   return replace(match,`${readNumber(day)} ${MONTHS[Number(month)]} ${readNumber(year)}`);
  });
 result=result.replace(/(?<![0-9:])(?:\bsaat\s+)?([0-9]{1,2}):([0-9]{2})(?![0-9:])/giu,
  (match,hours,minutes)=>{
   const h=Number(hours),m=Number(minutes);
   if(h>23||m>59)throw new RangeError(`Geçersiz saat: ${match}.`);
   const minuteWords=m===0?'':m<10?` sıfır ${readNumber(m)}`:` ${readNumber(m)}`;
   return replace(match,`saat ${readNumber(h)}${minuteWords}`);
  });
 result=result.replace(/(?<![a-zA-ZçğıöşüÇĞİÖŞÜ])(?:T\.C\.|Prof\.|Doç\.|Dr\.|Sn\.)(?![a-zA-ZçğıöşüÇĞİÖŞÜ])/giu,
  match=>replace(match,ABBREVIATIONS[match.toLocaleLowerCase('tr-TR')]));
 return Object.freeze({text:result,conversions,mode,experimental:true});
}
