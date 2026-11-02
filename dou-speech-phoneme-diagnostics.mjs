/** Bounded technical contrast analysis. Only eight hard-coded synthetic sounds,
 * never real speech, student data, transcripts, recordings or network services.
 * Nonzero waveform difference is NOT proof of identifiable Turkish phonemes.
 */
import {PAIRS} from './dou-speech-phoneme-study.mjs';
import {synthesizeTurkishArticulationPreview} from './dou-speech-waveform.mjs';
import {inspectSpeechWaveform} from './dou-speech-quality.mjs';
export function compareFixedPhonemePairs(){
 const contrasts=[];
 for(const pair of PAIRS){
  const [a,b]=pair.words.map(w=>synthesizeTurkishArticulationPreview(w).wav);
  const m1=inspectSpeechWaveform(a),m2=inspectSpeechWaveform(b);
  if(a.length!==b.length)throw new RangeError('Ses örnek uzunlukları farklı.');
  const av=new DataView(a.buffer,a.byteOffset,a.byteLength),bv=new DataView(b.buffer,b.byteOffset,b.byteLength);
  const samples=(a.length-44)/2;
  let difference=0,maximum=0;
  for(let i=0;i<samples;i++){
   const d=Math.abs(av.getInt16(44+i*2,true)-bv.getInt16(44+i*2,true))/32768;
   difference+=d;maximum=Math.max(maximum,d);
  }
  contrasts.push({pairId:pair.id,durationSeconds:Number(m1.durationSeconds.toFixed(4)),
   meanAbsoluteWaveformDifference:Number((difference/samples).toFixed(6)),
   maximumAbsoluteDifference:Number(maximum.toFixed(6)),
   clippedSamples:m1.clippedSamples+m2.clippedSamples});
 }
 return {schema:'dou-speech-phoneme-technical-audit-v1',syntheticOnly:true,
  pairCount:contrasts.length,contrasts,objectiveWaveformMetricsOnly:true,
  validatesHumanIdentification:false,validatesTurkishPronunciation:false};
}
