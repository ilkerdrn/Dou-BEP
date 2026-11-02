/** DOU Speech Lab v2.65 — isolated, fixed-only cadence prototype.
 * Uses illustrative v2.64 stress candidates; no arbitrary input, records, persistence,
 * cloud speech, clinical validation or claims of natural Turkish pronunciation.
 */
import {planFixedStressException} from './dou-speech-exception-plan.mjs';
const RATE=22050;
const TONAL=new Set(['vowel','voiced','glide']);
const ids=Object.freeze(['EX13','EX14','EX15']);
const boundedPitch=n=>Math.min(220,Math.max(90,n));
const msToSamples=ms=>Math.round(ms*RATE/1000);
function cadenceFor(id){
 if(typeof id!=='string'||!ids.includes(id))throw new RangeError('Yalnız sabit EX13–EX15 sesleri kullanılabilir.');
 const original=planFixedStressException(id);
 const prior=original.candidate.items;
 const items=prior.map(seg=>({...seg}));
 let smoothedBoundaries=0,adjustedVowels=0;
 for(let i=0;i<items.length;i++){
  const seg=items[i];
  if(seg.kind==='vowel'){
   const factor=seg.stressed?1.035:.985;
   seg.durationMs=Math.round(seg.durationMs*factor);
   seg.length=msToSamples(seg.durationMs);
   seg.cadenceGain=seg.stressed?1.07:.96;
   if(seg.length!==prior[i].length)adjustedVowels++;
  }else{seg.cadenceGain=1;}
 }
 for(let i=1;i<items.length;i++){
  const a=items[i-1],b=items[i];
  if(TONAL.has(a.kind)&&TONAL.has(b.kind)&&a.length>0&&b.length>0){
   const meeting=boundedPitch((a.pitchEndHz+b.pitchStartHz)/2);
   a.pitchEndHz=meeting;b.pitchStartHz=meeting;
   smoothedBoundaries++;
  }
 }
 const samples=items.reduce((sum,s)=>sum+s.length,0);
 if(samples>RATE*16||!Number.isSafeInteger(samples)||samples<=0)
  throw new RangeError('Birleşik deneyin ses süresi güvenli sınırı aştı.');
 const plan={...original.candidate,items,durationSeconds:samples/RATE,
  cadenceExperiment:true,validatedPhonetics:false};
 const oldSamples=prior.reduce((sum,s)=>sum+s.length,0);
 return {id,plan,smoothedBoundaries,adjustedVowels,
  durationDeltaMs:Math.round(1000*(samples-oldSamples)/RATE),
  previousStressIndices:original.previousStressIndices,
  candidateStressIndices:original.candidateStressIndices,
  syntheticOnly:true,validatedPhonetics:false,productionReady:false};
}
export function planFixedCadence(id){return cadenceFor(id);}
export function auditFixedCadence(...args){
 if(args.length)throw new TypeError('Bu denetim yalnız üç sabit sentetik örnek üzerinde çalışır.');
 const cases=ids.map(id=>{
  const c=cadenceFor(id);
  return {id,smoothedBoundaries:c.smoothedBoundaries,adjustedVowels:c.adjustedVowels,
   durationDeltaMs:c.durationDeltaMs,stressSyllables:c.candidateStressIndices};
 });
 return {version:'fixed-tr-cadence-v1',caseCount:cases.length,
  totalSmoothedBoundaries:cases.reduce((n,c)=>n+c.smoothedBoundaries,0),
  totalAdjustedVowels:cases.reduce((n,c)=>n+c.adjustedVowels,0),
  cases,syntheticOnly:true,validatedPhonetics:false,
  intelligibilityScore:null,audioQualityScore:null,productionReady:false};
}
