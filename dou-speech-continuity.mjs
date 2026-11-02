/** DOU Speech Lab v2.66 — fixed-only PCM seam experiment.
 * Not natural Turkish TTS or a speech-quality estimator. Older WAV arms are immutable.
 * A local deterministic candidate is accepted only when the maximum nearby sample
 * step does not rise, the peak remains valid and the number of frames is unchanged.
 * The accepted edits may still sound worse; listening validation is separate.
 */
import {planFixedCadence} from './dou-speech-cadence.mjs';
import {synthesizeFixedCadencePreview} from './dou-speech-waveform.mjs';
import {inspectSpeechWaveform} from './dou-speech-quality.mjs';
const IDS=Object.freeze(['EX13','EX14','EX15']);
const TONAL=new Set(['vowel','voiced','glide']);
const WINDOW=44; // approximately 2ms at 22,050Hz
const MIN_JUMP=256; // integer PCM, reject inaudibly small seam changes
const r=n=>Math.round(n*10000)/10000;
function assertId(id){if(typeof id!=='string'||!IDS.includes(id))throw new RangeError('Yalnız sabit EX13–EX15 örnekleri denetlenebilir.');}
function steps(samples,start,end){let largest=0;for(let i=start;i<end;i++)largest=Math.max(largest,Math.abs(samples[i]-samples[i-1]));return largest;}
function build(id){
 assertId(id);
 const source=synthesizeFixedCadencePreview(id),plan=planFixedCadence(id).plan;
 inspectSpeechWaveform(source.wav); // strict 22,050Hz PCM header/size validation
 const inputView=new DataView(source.wav.buffer,source.wav.byteOffset,source.wav.byteLength);
 const frames=(source.wav.byteLength-44)/2;
 const pcm=new Int16Array(frames);
 for(let i=0;i<frames;i++)pcm[i]=inputView.getInt16(44+i*2,true);
 const original=Int16Array.from(pcm);
 let offset=0;
 const seams=[];
 for(let i=0;i<plan.items.length-1;i++){
  const left=plan.items[i],right=plan.items[i+1];offset+=left.length;
  if(!TONAL.has(left.kind)||!TONAL.has(right.kind))continue;
  const span=Math.min(WINDOW,right.length-1,frames-offset-1);
  const oldJump=Math.abs(pcm[offset]-pcm[offset-1]);
  const beforeMax=steps(pcm,offset,offset+span+1);
  const record={index:i+1,oldEdgeJump:r(oldJump/32768),newEdgeJump:r(oldJump/32768),
   oldWindowMaxStep:r(beforeMax/32768),newWindowMaxStep:r(beforeMax/32768),
   accepted:false,reason:'unchanged'};
  if(span<4){record.reason='short-segment';}
  else if(oldJump<MIN_JUMP){record.reason='small-edge';}
  else{
   const shift=pcm[offset-1]-pcm[offset];
   const proposal=[];
   let ok=true;
   for(let k=0;k<span;k++){
    const value=Math.round(pcm[offset+k]+shift*(1-k/(span-1)));
    if(value>32766||value< -32766){ok=false;break;}
    proposal.push(value);
   }
   if(ok){
    const local=Int16Array.from(pcm.subarray(offset-1,offset+span+1));
    for(let k=0;k<span;k++)local[k+1]=proposal[k];
    const afterMax=steps(local,1,local.length);
    // A numerical stability guard, NOT a perceptual quality criterion.
    if(afterMax<=beforeMax){
     for(let k=0;k<span;k++)pcm[offset+k]=proposal[k];
     record.accepted=true;record.reason='bounded-edit';
     record.newEdgeJump=r(Math.abs(pcm[offset]-pcm[offset-1])/32768);
     record.newWindowMaxStep=r(afterMax/32768);
    }else{record.reason='local-step-would-grow';}
   }else{record.reason='peak-guard';}
  }
  seams.push(record);
 }
 const wav=Uint8Array.from(source.wav);const output=new DataView(wav.buffer);
 for(let i=0;i<frames;i++)output.setInt16(44+i*2,pcm[i],true);
 const before=inspectSpeechWaveform(source.wav),after=inspectSpeechWaveform(wav);
 const changedSamples=pcm.reduce((n,v,i)=>n+(v!==original[i]?1:0),0);
 const acceptedSeams=seams.filter(s=>s.accepted).length;
 return {id,wav,sampleRate:22050,durationSeconds:after.durationSeconds,
  continuityArm:'guarded-seam',changedSamples,acceptedSeams,rejectedSeams:seams.length-acceptedSeams,
  seams,before:{rms:before.rms,peak:before.peak,maxStep:before.maxStep,clippedSamples:before.clippedSamples},
  after:{rms:after.rms,peak:after.peak,maxStep:after.maxStep,clippedSamples:after.clippedSamples},
  objectiveOnly:true,validatedIntelligibility:false,improvedQualityClaim:false,
  syntheticOnly:true,productionReady:false};
}
export function synthesizeFixedContinuityPreview(id){return build(id);}
export function auditFixedContinuity(...args){
 if(args.length)throw new TypeError('Bu rapor yalnız üç sabit sentetik örneği kabul eder.');
 const cases=IDS.map(id=>{
  const {wav,...item}=build(id);return item;
 });
 return {version:'fixed-tr-continuity-v1',caseCount:cases.length,
  totalSeams:cases.reduce((n,c)=>n+c.seams.length,0),
  acceptedSeams:cases.reduce((n,c)=>n+c.acceptedSeams,0),
  rejectedSeams:cases.reduce((n,c)=>n+c.rejectedSeams,0),
  cases,objectiveOnly:true,validatedIntelligibility:false,improvedQualityClaim:false,
  syntheticOnly:true,productionReady:false};
}
