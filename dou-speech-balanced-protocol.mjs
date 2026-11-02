/** v2.73: optional counterbalanced, local-only synthetic word-recognition rehearsal.
 * All 6 pairs x both targets x both acoustic arms = 24 trials. No identifier,
 * network, audio recording, timestamps or automatic persistence. Not human validation.
 */
import {WORD_PAIRS,ARMS} from './dou-speech-intelligibility.mjs';
export const BALANCED_TRIALS=WORD_PAIRS.length*2*ARMS.length;
export function createBalancedRecognitionSession(random){
 if(!(random instanceof Uint8Array)||random.length!==BALANCED_TRIALS)
  throw new TypeError('24 rastgele bayt gerekli.');
 const trials=[];
 for(let pairIndex=0;pairIndex<WORD_PAIRS.length;pairIndex++){
  for(const target of WORD_PAIRS[pairIndex])for(const arm of ARMS){
   trials.push({pairIndex,target,arm,heard:false,choice:null});
  }
 }
 // Fisher-Yates; the caller must supply fresh cryptographic randomness.
 for(let i=trials.length-1;i>0;i--){
  const j=random[i]% (i+1);
  [trials[i],trials[j]]=[trials[j],trials[i]];
 }
 return {trials,position:0,finished:false,protocol:'balanced24'};
}
export function summarizeBalancedRecognition(session){
 if(!session||session.protocol!=='balanced24'||!Array.isArray(session.trials)||session.trials.length!==BALANCED_TRIALS)
  throw new TypeError('Dengeli protokol geçersiz.');
 const arms={legacy:{correct:0,answered:0},spectral:{correct:0,answered:0}};
 const seen=new Set();
 for(const t of session.trials){
  const pair=WORD_PAIRS[t.pairIndex];
  if(!pair||!ARMS.includes(t.arm)||!pair.includes(t.target)||
   (t.choice!==null&&(!t.heard||!pair.includes(t.choice))))throw new RangeError('Geçersiz deneme.');
  const key=`${t.pairIndex}/${t.target}/${t.arm}`;
  if(seen.has(key))throw new RangeError('Dengeli protokolde tekrarlanan öğe.');
  seen.add(key);
  if(t.choice!==null){arms[t.arm].answered++;arms[t.arm].correct+=Number(t.choice===t.target);}
 }
 if(seen.size!==BALANCED_TRIALS)throw new RangeError('Eksik veya yinelenen protokol öğesi.');
 return {schema:'dou-speech-local-balanced24-v1',trials:BALANCED_TRIALS,
  answered:arms.legacy.answered+arms.spectral.answered,arms,
  localMemoryOnly:true,noIdentifyingData:true,validatedHumanIntelligibility:false};
}
