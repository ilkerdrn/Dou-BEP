/**
 * Fixed public/synthetic phrase acoustic bench.
 * Never accepts arbitrary source text, student content, exam questions or paths.
 * No microphone, network, file writes or auto-play. Not a speech-quality score.
 */
import {synthesizeTurkishArticulationPreview} from '../dou-speech-waveform.mjs';
import {inspectSpeechWaveform} from '../dou-speech-quality.mjs';
import {createHash} from 'node:crypto';

export const FIXED_LAB_CASES=Object.freeze([
 Object.freeze({id:'greeting',text:'Merhaba dünya'}),
 Object.freeze({id:'sibilants',text:'Sasa Şaşa'}),
 Object.freeze({id:'nasals',text:'Mama Nana'}),
 Object.freeze({id:'stops',text:'Pata Kata'}),
 Object.freeze({id:'vowels',text:'İyi günler'})
]);

export function studyFixedLabCase(id){
 const entry=FIXED_LAB_CASES.find(item=>item.id===id);
 if(!entry)throw new RangeError('Bilinmeyen sabit deney kimliği.');
 const result=synthesizeTurkishArticulationPreview(entry.text);
 if(result.experimental!==true)throw new Error('Deneysel ses bayrağı eksik.');
 const metrics=inspectSpeechWaveform(result.wav);
 if(metrics.clippedSamples>0 || metrics.peak===0 || metrics.rms===0){
  throw new Error('Sentetik WAV güvenlik kontrolü başarısız.');
 }
 return Object.freeze({
  id:entry.id,sha256:createHash('sha256').update(result.wav).digest('hex'),
  ...metrics,syntheticOnly:true,productionApproved:false
 });
}
export function studyAllFixedLabCases(){
 return FIXED_LAB_CASES.map(({id})=>studyFixedLabCase(id));
}
