/** v2.75 three-arm, 36-fixture interleaved rehearsal; no persistent data.
 * Six blocks contain all six word pairs once per block. This avoids consecutive
 * repetition of the same pair, but is NOT a validated randomized clinical study.
 */
import {WORD_PAIRS} from './dou-speech-intelligibility.mjs';
export const TRI_ARMS=Object.freeze(['legacy','spectral','contrast']);
export const TRI_TRIALS=WORD_PAIRS.length*2*TRI_ARMS.length;
export const TRI_SCHEDULE='pair-interleaved6-v1';
export function createTriRecognitionSession(random){
 if(!(random instanceof Uint8Array)||random.length!==TRI_TRIALS)throw new TypeError('36 rastgele bayt gerekli.');
 const pairCount=WORD_PAIRS.length, trials=[];
 // Each pair has six distinct (target,arm) fixtures; start at a caller-provided
 // offset. No fixture repeats, and each of six blocks contains all six pairs.
 for(let block=0;block<2*TRI_ARMS.length;block++){
  const group=[];
  for(let pairIndex=0;pairIndex<pairCount;pairIndex++){
   const fixture=(block+random[pairIndex]%6)%6;
   const target=WORD_PAIRS[pairIndex][Math.floor(fixture/TRI_ARMS.length)];
   const arm=TRI_ARMS[fixture%TRI_ARMS.length];
   group.push({pairIndex,target,arm,heard:false,choice:null});
  }
  // Reproducible, bounded engineering shuffle; modulo reduction is biased,
  // so do not represent this as statistically uniform random assignment.
  for(let i=pairCount-1;i>0;i--){
   const j=random[pairCount+block*(pairCount-1)+(pairCount-1-i)]%(i+1);
   [group[i],group[j]]=[group[j],group[i]];
  }
  if(trials.length&&group[0].pairIndex===trials[trials.length-1].pairIndex){
   const swap=group.findIndex(t=>t.pairIndex!==trials[trials.length-1].pairIndex);
   [group[0],group[swap]]=[group[swap],group[0]];
  }
  trials.push(...group);
 }
 return {trials,position:0,finished:false,protocol:'balanced36',schedule:TRI_SCHEDULE};
}
export function summarizeTriRecognition(session){
 if(session?.protocol!=='balanced36'||!Array.isArray(session.trials)||session.trials.length!==TRI_TRIALS)
  throw new TypeError('Üç motorlu protokol geçersiz.');
 const arms=Object.fromEntries(TRI_ARMS.map(arm=>[arm,{correct:0,answered:0}]));
 const seen=new Set();
 for(const trial of session.trials){
  const pair=WORD_PAIRS[trial.pairIndex];
  if(!pair||!TRI_ARMS.includes(trial.arm)||!pair.includes(trial.target)||
   typeof trial.heard!=='boolean'||(trial.choice!==null&&(!trial.heard||!pair.includes(trial.choice))))
   throw new RangeError('Geçersiz üç motorlu deneme.');
  const key=`${trial.pairIndex}/${trial.target}/${trial.arm}`;
  if(seen.has(key))throw new RangeError('Yinelenen deneme.');seen.add(key);
  if(trial.choice!==null){arms[trial.arm].answered++;arms[trial.arm].correct+=Number(trial.choice===trial.target);}
 }
 if(seen.size!==TRI_TRIALS)throw new RangeError('Eksik deneme.');
 return {schema:'dou-speech-balanced36-v1',trials:TRI_TRIALS,
  answered:Object.values(arms).reduce((n,a)=>n+a.answered,0),arms,
  schedule:session.schedule??'legacy-mixed36',
  localMemoryOnly:true,noIdentifyingData:true,validatedHumanIntelligibility:false};
}
