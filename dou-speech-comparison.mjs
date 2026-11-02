/** v2.57 fixed synthetic WAV comparison: objective signal differences only.
 * Nothing is uploaded, saved or interpreted as speech quality or intelligibility.
 */
import {inspectSpeechWaveform} from './dou-speech-quality.mjs';
function round(value){return Math.round(value*10000)/10000;}
export function compareSyntheticWav(reference,candidate){
 const a=inspectSpeechWaveform(reference),b=inspectSpeechWaveform(candidate);
 return {reference:{durationSeconds:round(a.durationSeconds),rms:a.rms,peak:a.peak,maxStep:a.maxStep,clippedSamples:a.clippedSamples},
  candidate:{durationSeconds:round(b.durationSeconds),rms:b.rms,peak:b.peak,maxStep:b.maxStep,clippedSamples:b.clippedSamples},
  durationDeltaMs:Math.round((b.durationSeconds-a.durationSeconds)*1000),
  rmsDelta:round(b.rms-a.rms),maxStepDelta:round(b.maxStep-a.maxStep),
  objectiveOnly:true,validatedIntelligibility:false,improvedQualityClaim:false};
}
