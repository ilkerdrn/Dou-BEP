/** v2.76 memory-only four-arm, fixed-word engineering rehearsal. */
import {WORD_PAIRS} from './dou-speech-intelligibility.mjs';
export const QUAD_ARMS=Object.freeze(['legacy','spectral','contrast','place']);
export const QUAD_TRIALS=WORD_PAIRS.length*2*QUAD_ARMS.length;
export const QUAD_SCHEDULE='pair-interleaved8-v1';
export function createQuadRecognitionSession(random){
 if(!(random instanceof Uint8Array)||random.length!==QUAD_TRIALS)throw new TypeError('48 rastgele bayt gerekli.');
 const trials=[],pairCount=WORD_PAIRS.length,variants=2*QUAD_ARMS.length;
 for(let block=0;block<variants;block++){
  const group=[];
  for(let pairIndex=0;pairIndex<pairCount;pairIndex++){
   const fixture=(block+random[pairIndex]%variants)%variants;
   group.push({pairIndex,target:WORD_PAIRS[pairIndex][Math.floor(fixture/QUAD_ARMS.length)],
    arm:QUAD_ARMS[fixture%QUAD_ARMS.length],heard:false,choice:null});
  }
  for(let i=pairCount-1;i>0;i--){
   const j=random[pairCount+block*(pairCount-1)+(pairCount-1-i)]%(i+1);
   [group[i],group[j]]=[group[j],group[i]];
  }
  if(trials.length&&group[0].pairIndex===trials[trials.length-1].pairIndex){
   const other=group.findIndex(t=>t.pairIndex!==trials[trials.length-1].pairIndex);
   [group[0],group[other]]=[group[other],group[0]];
  }
  trials.push(...group);
 }
 return {trials,position:0,finished:false,protocol:'balanced48',schedule:QUAD_SCHEDULE};
}
export function summarizeQuadRecognition(session){
 if(session?.protocol!=='balanced48'||!Array.isArray(session.trials)||session.trials.length!==QUAD_TRIALS)
 throw new TypeError('Dört motorlu protokol geçersiz.');
 const arms=Object.fromEntries(QUAD_ARMS.map(arm=>[arm,{correct:0,answered:0}]));const seen=new Set();
 for(const t of session.trials){
  const pair=WORD_PAIRS[t.pairIndex];
  if(!pair||!QUAD_ARMS.includes(t.arm)||!pair.includes(t.target)||typeof t.heard!=='boolean'||
   (t.choice!==null&&(!t.heard||!pair.includes(t.choice))))throw new RangeError('Geçersiz dört motorlu deneme.');
  const k=`${t.pairIndex}/${t.target}/${t.arm}`;
  if(seen.has(k))throw new RangeError('Yinelenen deneme.');seen.add(k);
  if(t.choice!==null){arms[t.arm].answered++;arms[t.arm].correct+=Number(t.choice===t.target);}
 }
 if(seen.size!==QUAD_TRIALS)throw new RangeError('Eksik dört motorlu deneme.');
 return {schema:'dou-speech-balanced48-v1',trials:QUAD_TRIALS,
  answered:Object.values(arms).reduce((n,a)=>n+a.answered,0),arms,
  schedule:session.schedule??'legacy-mixed48',localMemoryOnly:true,noIdentifyingData:true,
  validatedHumanIntelligibility:false};
}
