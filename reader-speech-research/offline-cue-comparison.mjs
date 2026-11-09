/**
 * Isolated A/B acoustic comparison for three fixed synthetic Reader cues.
 * A is the existing articulation baseline. B uses experimental two-sided
 * spectral transitions plus timing. This is NOT validated natural Turkish TTS.
 * Never accepts student/exam/UIA text or any user-provided speech content.
 */
import {synthesizeTurkishArticulationPreview,synthesizeTurkishTimingPreview} from '../dou-speech-waveform.mjs';
import {inspectSpeechWaveform} from '../dou-speech-quality.mjs';

const PHRASES=Object.freeze({
  ready:'Merhaba dünya',
  stopped:'Ses durdu',
  help:'Yardım'
});
const MAX_WAV=1024*1024;

export function synthesizeFixedComparison(cue,arm){
  if(typeof cue!=='string'||!Object.hasOwn(PHRASES,cue)||
     (arm!=='baseline'&&arm!=='candidate')){
    throw new RangeError('Only fixed comparison cues and arms are allowed.');
  }
  const result=arm==='baseline'
    ?synthesizeTurkishArticulationPreview(PHRASES[cue])
    :synthesizeTurkishTimingPreview(PHRASES[cue]);
  if(result.experimental!==true||!(result.wav instanceof Uint8Array)||
     result.wav.length<46||result.wav.length>MAX_WAV){
    throw new RangeError('Invalid experimental PCM WAV.');
  }
  const metrics=inspectSpeechWaveform(result.wav);
  if(metrics.clippedSamples!==0||metrics.rms<=0||metrics.activeRatio<=0||
     metrics.durationSeconds<=0||metrics.durationSeconds>16){
    throw new RangeError('Unsafe experimental waveform.');
  }
  return Object.freeze({
    cueId:cue, arm, wav:result.wav,
    sampleRate:metrics.sampleRate,
    durationSeconds:metrics.durationSeconds,
    rms:metrics.rms,
    clippedSamples:metrics.clippedSamples,
    researchOnly:true,validatedIntelligibility:false,
    validatedNaturalness:false,offline:true
  });
}
