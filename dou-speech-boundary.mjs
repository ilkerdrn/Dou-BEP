/** v2.58: objective segment-boundary audit for a fixed, synthetic speech laboratory.
 * Pure, deterministic, finite PCM16 signal analysis. No source text, segment letters,
 * microphone, exam data, local storage or network. NOT a phonetic/quality assessment.
 */
import {inspectSpeechWaveform} from './dou-speech-quality.mjs';
const RATE=22050;
const KINDS=new Set(['vowel','voiced','glide','noise','burst','silence']);
const TONAL=new Set(['vowel','voiced','glide']);
const round=n=>Math.round(n*10000)/10000;
function validPlan(wav,plan){
 const stats=inspectSpeechWaveform(wav);
 if(!plan||plan.sampleRate!==RATE||!Array.isArray(plan.items)||
    plan.items.length<2||plan.items.length>128)throw new RangeError('Sınırlı sentetik segment planı bekleniyor.');
 const frames=(wav.length-44)/2;
 let total=0;
 for(const item of plan.items){
  if(!item||!KINDS.has(item.kind)||!Number.isSafeInteger(item.length)||item.length<1||item.length>RATE*16)
   throw new RangeError('Geçersiz sentetik segment.');
  total+=item.length;
 }
 if(total!==frames||total>RATE*16)throw new RangeError('WAV örnek sayısı ile segment planı uyuşmuyor.');
 return stats;
}
function category(a,b){
 if(a==='silence'||b==='silence')return 'durak-sınırı';
 if(TONAL.has(a)&&TONAL.has(b))return 'tonlu-tonlu';
 return 'diğer-sınır';
}
export function auditSyntheticBoundaries(wav,plan,{windowMs=5}={}){
 if(typeof windowMs!=='number'||!Number.isFinite(windowMs)||windowMs<1||windowMs>20)
  throw new RangeError('Ölçüm penceresi 1-20 ms olmalıdır.');
 const stats=validPlan(wav,plan), view=new DataView(wav.buffer,wav.byteOffset,wav.byteLength);
 const count=(wav.length-44)/2,windowFrames=Math.round(windowMs*RATE/1000);
 const sample=i=>view.getInt16(44+i*2,true)/32768;
 const rms=(start,end)=>{
  let sum=0;for(let i=start;i<end;i++){const x=sample(i);sum+=x*x;}
  return Math.sqrt(sum/(end-start));
 };
 let frame=0;
 const boundaries=[];
 for(let i=0;i<plan.items.length-1;i++){
  const left=plan.items[i],right=plan.items[i+1];frame+=left.length;
  const before=Math.min(windowFrames,left.length,frame),after=Math.min(windowFrames,right.length,count-frame);
  const leftRms=rms(frame-before,frame),rightRms=rms(frame,frame+after);
  boundaries.push({index:i+1,category:category(left.kind,right.kind),
   edgeJump:round(Math.abs(sample(frame)-sample(frame-1))),
   beforeRms:round(leftRms),afterRms:round(rightRms),
   rmsGap:round(Math.abs(leftRms-rightRms))});
 }
 const categories=['tonlu-tonlu','durak-sınırı','diğer-sınır'];
 const byCategory=categories.map(name=>{
  const rows=boundaries.filter(b=>b.category===name);
  return {category:name,count:rows.length,
   meanEdgeJump:rows.length?round(rows.reduce((sum,b)=>sum+b.edgeJump,0)/rows.length):0,
   maxEdgeJump:rows.length?Math.max(...rows.map(b=>b.edgeJump)):0};
 });
 return {sampleRate:RATE,windowMs,segmentCount:plan.items.length,boundaryCount:boundaries.length,
  durationSeconds:round(stats.durationSeconds),clippedSamples:stats.clippedSamples,
  byCategory,boundaries,objectiveOnly:true,phoneticValidity:false,qualityRating:false};
}
export function compareSyntheticBoundaryAudits(referenceWav,referencePlan,candidateWav,candidatePlan){
 const a=auditSyntheticBoundaries(referenceWav,referencePlan);
 const b=auditSyntheticBoundaries(candidateWav,candidatePlan);
 if(a.segmentCount!==b.segmentCount||a.boundaryCount!==b.boundaryCount||
  referencePlan.items.some((segment,i)=>segment.kind!==candidatePlan.items[i].kind)||
  a.boundaries.some((row,i)=>row.category!==b.boundaries[i].category))
  throw new RangeError('Karşılaştırma için aynı segment sınıfı sırası gerekir.');
 return {reference:a,candidate:b,alignedBoundaryCount:a.boundaryCount,
  objectiveOnly:true,phoneticValidity:false,qualityRating:false};
}
