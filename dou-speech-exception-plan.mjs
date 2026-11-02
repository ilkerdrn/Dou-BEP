/** DOU Speech Lab v2.64 — closed-fixture, isolated stress-plan experiment.
 * No arbitrary text, exam content, student data, speech-recognition, persistence
 * or remotely sourced audio. Reference stress is illustrative, not expert-validated.
 * Soft-g and borrowed onset-cluster pronunciations are NOT guessed/corrected.
 */
import {planTurkishProsody} from './dou-speech-prosody.mjs';
import {auditFixedTurkishExceptions} from './dou-speech-exception-audit.mjs';

const SAMPLE_RATE=22050;
const FIXED_STRESS=Object.freeze({EX13:'geliyor',EX14:'bakıyor',EX15:'kalıyor'});
const STRESS_INDEX=1;
const TONAL=new Set(['vowel','voiced','glide']);
function checkedCase(id){
 if(typeof id!=='string'||!Object.hasOwn(FIXED_STRESS,id))
  throw new RangeError('Yalnız üç sabit sentetik -yor örneği seçilebilir.');
 return FIXED_STRESS[id];
}
const clamp=(n)=>Math.max(90,Math.min(220,n));
function stressIndices(plan){
 return [...new Set(plan.items.filter(s=>s.kind!=='silence'&&s.stressed).map(s=>s.syllable))];
}
/** Returns isolated plans for ONE enumerated fixture; never modifies baseline. */
export function planFixedStressException(id){
 const word=checkedCase(id),baseline=planTurkishProsody(word,{pitchHz:125,rate:1});
 if(baseline.wordCount!==1||baseline.syllableCount!==3||baseline.sampleRate!==SAMPLE_RATE||
  stressIndices(baseline).join(',')!=='2')throw new RangeError('Sabit vurgu referansı kaydı değişti.');
 const candidateItems=baseline.items.map(seg=>{
  if(seg.kind==='silence')return {...seg};
  const stressed=seg.syllable===STRESS_INDEX;
  const pitchCenter=125*(stressed?1.10:.97);
  const pitchStartHz=clamp(pitchCenter);
  const pitchEndHz=clamp(pitchCenter*(seg.syllable===2?.91:.985));
  const oldEmphasis=seg.kind==='vowel'&&seg.stressed?1.20:1;
  const newEmphasis=seg.kind==='vowel'&&stressed?1.20:1;
  // Exact per-kind 125ms vowel base; other consonants keep unchanged lengths.
  const durationMs=seg.kind==='vowel'?Math.round(125*newEmphasis):seg.durationMs;
  const length=seg.kind==='vowel'?Math.round(durationMs*SAMPLE_RATE/1000):seg.length;
  return {...seg,stressed,pitchStartHz,pitchEndHz,durationMs,length};
 });
 const frames=candidateItems.reduce((n,s)=>n+s.length,0);
 if(frames>16*SAMPLE_RATE||!candidateItems.some(s=>TONAL.has(s.kind)))
  throw new RangeError('Deneysel ses planı süre sınırını aştı.');
 const candidate={...baseline,items:candidateItems,durationSeconds:frames/SAMPLE_RATE,
  experimental:true,validatedPhonetics:false};
 const changedSegments=candidateItems.filter((s,i)=>s.length!==baseline.items[i].length||
  s.stressed!==baseline.items[i].stressed||s.pitchStartHz!==baseline.items[i].pitchStartHz||
  s.pitchEndHz!==baseline.items[i].pitchEndHz).length;
 return {id,baseline,candidate,previousStressIndices:stressIndices(baseline),
  candidateStressIndices:stressIndices(candidate),changedSegments,
  durationDeltaMs:Math.round((frames-baseline.items.reduce((n,s)=>n+s.length,0))*1000/SAMPLE_RATE),
  syntheticOnly:true,illustrativeReference:true,productionReady:false};
}
/** Only opaque case codes and numeric diagnostics in the public report. */
export function auditFixedStressPlans(...args){
 if(args.length)throw new TypeError('Yalnız sabit sentetik telaffuz örnekleri incelenebilir.');
 const original=auditFixedTurkishExceptions(),cases=original.cases.map(item=>{
  if(item.stressCompared){
   const result=planFixedStressException(item.id);
   if(result.candidateStressIndices.length!==1||
    result.candidateStressIndices[0]!==item.referenceStressIndex)
    throw new RangeError('Referans vurgusu ile deneysel plan uyuşmuyor.');
   return {id:item.id,group:item.group,status:'illustrative_stress_candidate',
    previousStressIndices:result.previousStressIndices,
    candidateStressIndices:result.candidateStressIndices,
    changedSegments:result.changedSegments,durationDeltaMs:result.durationDeltaMs,
    expertReviewStillRequired:true};
  }
  return {id:item.id,group:item.group,
   status:item.softGCount?'soft_g_requires_expert_reference':item.leadingCluster?
    'onset_cluster_requires_expert_reference':'unchanged_not_evaluated',
   previousStressIndices:[],candidateStressIndices:[],changedSegments:0,durationDeltaMs:0,
   expertReviewStillRequired:item.requiresExpertReview};
 });
 return {version:'fixed-tr-stress-plan-v1',caseCount:cases.length,
  stressVariantCount:cases.filter(c=>c.status==='illustrative_stress_candidate').length,
  unresolvedSoftGCount:cases.filter(c=>c.status==='soft_g_requires_expert_reference').length,
  unresolvedClusterCount:cases.filter(c=>c.status==='onset_cluster_requires_expert_reference').length,
  cases,syntheticOnly:true,illustrativeReferencesOnly:true,validatedPhonetics:false,
  audioQualityScore:null,intelligibilityScore:null,productionReady:false};
}
