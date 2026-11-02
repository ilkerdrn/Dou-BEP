/** DOU Speech Lab v2.57: *experimental* local phoneme timing and tonal joins.
 * Pure deterministic numeric transformation of an already bounded synthetic plan.
 * Not a real Turkish pronunciation model, phonetic transcription or TTS quality test.
 * The demo/CLI may use ONLY the fixed synthetic phrase, never exam or user text.
 */
const TONAL_KINDS=new Set(['vowel','voiced','glide']);
export function retimeExperimentalSpeech(plan){
 if(!plan||!Array.isArray(plan.items)||plan.sampleRate!==22050||!plan.items.length||
  plan.items.some(s=>!Number.isSafeInteger(s.length)||s.length<=0||!Number.isFinite(s.pitchStartHz)||!Number.isFinite(s.pitchEndHz)))
  throw new TypeError('Geçerli, sınırlı bir deneysel ses planı gereklidir.');
 const before=plan.items;
 const items=before.map((s,i)=>{
  const next=before[i+1],prev=before[i-1];
  let factor=1;
  // Roughly model emphasis and pre-pause lengthening, not phonetic truth.
  if(s.kind==='vowel'){
   if(s.stressed)factor*=1.08;
   if(!next||next.kind==='silence')factor*=1.15;
  }else if(['voiced','noise','burst'].includes(s.kind)&&next?.kind==='vowel'){
   factor=.94;
  }
  // Preserve pauses; length is integer PCM frames; never mutate the source.
  const length=Math.max(1,Math.round(s.length*factor));
  return {...s,length,durationMs:Math.round(length*1000/plan.sampleRate)};
 });
 let joins=0,maxBefore=0;
 // Match adjacent *tonal* pitch endpoints at the same average frequency.
 // No blending through fricatives, stops or silence.
 for(let i=1;i<items.length;i++){
  const a=items[i-1],b=items[i];
  if(!TONAL_KINDS.has(a.kind)||!TONAL_KINDS.has(b.kind))continue;
  const delta=Math.abs(a.pitchEndHz-b.pitchStartHz);
  maxBefore=Math.max(maxBefore,delta);
  const common=(a.pitchEndHz+b.pitchStartHz)/2;
  a.pitchEndHz=common;b.pitchStartHz=common;
  joins++;
 }
 const frames=items.reduce((sum,s)=>sum+s.length,0);
 if(frames>22050*16)throw new RangeError('Zamanlama deneyi 16 saniyelik sınırı aşıyor.');
 const initial=before.reduce((sum,s)=>sum+s.length,0);
 return {items,sampleRate:plan.sampleRate,syllableCount:plan.syllableCount,wordCount:plan.wordCount,
  durationSeconds:frames/plan.sampleRate,experimental:true,
  timingAdjustments:items.filter((s,i)=>s.length!==before[i].length).length,
  durationDeltaMs:Math.round((frames-initial)*1000/plan.sampleRate),
  tonalJoins:joins,maxPitchJumpBeforeHz:Math.round(maxBefore*100)/100,maxPitchJumpAfterHz:0};
}
