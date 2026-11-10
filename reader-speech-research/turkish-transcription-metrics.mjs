/**
 * Offline Turkish transcription-error metrics for human evaluation.
 * No audio generation, files, accounts, network or student data.
 * WER/CER are transcription accuracy measurements, not naturalness ratings.
 */
import {TURKISH_EVALUATION_PROMPTS} from './turkish-evaluation-prompts.mjs';
const MAX_TRANSCRIPTION_CHARS = 500;

export function normalizeTurkishTranscription(s){
 if(typeof s!=='string'||s.length>MAX_TRANSCRIPTION_CHARS||
    /[\x00-\x1f\x7f]/u.test(s))throw new RangeError('Invalid bounded transcription');
 return s.normalize('NFC').toLocaleLowerCase('tr-TR')
  .replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/gu,' ');
}

export function editDistance(a,b){
 if(!Array.isArray(a)||!Array.isArray(b)||a.length>500||b.length>500){
  throw new RangeError('Edit-distance sequences must be bounded');
 }
 let prev=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){
  const curr=[i];
  for(let j=1;j<=b.length;j++){
   curr[j]=Math.min(curr[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
  }
  prev=curr;
 }
 return prev[b.length];
}

export function scoreTurkishTranscription(promptId,transcription) {
 const prompt=TURKISH_EVALUATION_PROMPTS.find(p=>p.id===promptId);
 if(!prompt)throw new RangeError('Unknown evaluation prompt ID');
 const reference=normalizeTurkishTranscription(prompt.text);
 const hypothesis=normalizeTurkishTranscription(transcription);
 const referenceWords=reference.split(' ').filter(Boolean);
 const hypothesisWords=hypothesis.split(' ').filter(Boolean);
 const refChars=Array.from(reference.replace(/ /g,''));
 const hypChars=Array.from(hypothesis.replace(/ /g,''));
 const wordErrors=editDistance(referenceWords,hypothesisWords);
 const characterErrors=editDistance(refChars,hypChars);
 return Object.freeze({
  promptId,split:prompt.split,category:prompt.category,
  wordErrors,wordReferenceCount:referenceWords.length,
  characterErrors,characterReferenceCount:refChars.length,
  wer:wordErrors/referenceWords.length,
  cer:characterErrors/refChars.length,
  objectiveTranscriptionOnly:true,
  validatesNaturalness:false,
  validatesProductionUse:false
 });
}
