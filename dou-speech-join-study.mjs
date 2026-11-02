/** v2.61: fixed-corpus-only, PCM16 boundary-window experiment.
 * Smooth the local 5-point signal around a *vowel/noisy-consonant* boundary.
 * This is a short deterministic de-click/filter study, NOT a phonetic model,
 * Turkish intelligibility improvement, or production Reader audio.
 * Callers must restrict text to approved synthetic fixtures (see corpus module).
 */
import {auditSyntheticBoundaries} from './dou-speech-boundary.mjs';
import {inspectSpeechWaveform} from './dou-speech-quality.mjs';

const RATE=22050;
const eligible=(a,b)=>(a.kind==='vowel'&&b.kind==='noise')||(a.kind==='noise'&&b.kind==='vowel');

export function filterFixedCorpusJoins(wav,plan){
 // Validate exact, bounded WAV/plan alignment *before* reading PCM data.
 auditSyntheticBoundaries(wav,plan);
 const result=wav.slice(),source=new DataView(wav.buffer,wav.byteOffset,wav.byteLength),
  dest=new DataView(result.buffer,result.byteOffset,result.byteLength);
 const count=(wav.length-44)/2;
 const at=i=>source.getInt16(44+i*2,true);
 let boundary=0,processedJoins=0,modifiedSamples=0;
 for(let index=0;index<plan.items.length-1;index++){
  const left=plan.items[index],right=plan.items[index+1];
  boundary+=left.length;
  // Do not soften stop bursts, pauses, tonal-tonal joints, or segmentation edges.
  if(!eligible(left,right))continue;
  const span=Math.min(88,Math.floor(left.length/8),Math.floor(right.length/8));
  if(span<8||boundary-span<3||boundary+span+3>=count)continue;
  processedJoins++;
  for(let delta=-span;delta<span;delta++){
   const i=boundary+delta;
   // Symmetric 5-tap low pass; Hann window leaves both outer edges untouched.
   // Input samples always come from the ORIGINAL buffer (no cascading edits).
   const filtered=(at(i-2)+4*at(i-1)+6*at(i)+4*at(i+1)+at(i+2))/16;
   const window=.75*(1+Math.cos(Math.PI*(delta+.5)/span))/2;
   const output=Math.round((1-window)*at(i)+window*filtered);
   if(output!==at(i))modifiedSamples++;
   dest.setInt16(44+i*2,output,true);
  }
 }
 const stats=inspectSpeechWaveform(result);
 if(stats.clippedSamples)throw new RangeError('Sentetik deney kırpılmaya neden oldu.');
 return {wav:result,processedJoins,modifiedSamples,windowMs:Math.round(88/RATE*1000*1000)/1000,
  sampleRate:RATE,syntheticOnly:true,objectiveOnly:true,validatedIntelligibility:false};
}
