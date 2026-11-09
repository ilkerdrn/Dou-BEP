/**
 * DOU Speech -> Reader experimental offline audio contract.
 *
 * Fixed, synthetic UI cue vocabulary only. No arbitrary text, exam content,
 * personal data, cloud, SAPI, filesystem, microphone, or recording.
 * Not a natural/validated Turkish voice and not a production screen reader.
 */
import {synthesizeTurkishArticulationPreview} from '../dou-speech-waveform.mjs';
import {inspectSpeechWaveform} from '../dou-speech-quality.mjs';

const CUES = Object.freeze({
  ready: 'Merhaba dünya',
  stopped: 'Ses durdu',
  help: 'Yardım'
});
const MAX_WAV_BYTES = 1024 * 1024;

export function listExperimentalCues() {
  return Object.keys(CUES);
}

export function renderExperimentalCue(id) {
  if (typeof id !== 'string' || !Object.hasOwn(CUES, id)) {
    throw new RangeError('Only approved synthetic cue IDs are allowed.');
  }
  const result = synthesizeTurkishArticulationPreview(CUES[id]);
  if (result.experimental !== true || !(result.wav instanceof Uint8Array) ||
      result.wav.byteLength > MAX_WAV_BYTES) {
    throw new RangeError('Invalid experimental audio result.');
  }
  const quality = inspectSpeechWaveform(result.wav);
  if (quality.clippedSamples !== 0 || quality.rms <= 0 ||
      quality.durationSeconds > 16 || quality.activeRatio <= 0) {
    throw new RangeError('Experimental audio quality guard failed.');
  }
  return {
    cueId: id,
    wav: result.wav,
    sampleRate: quality.sampleRate,
    durationSeconds: quality.durationSeconds,
    syntheticOnly: true,
    productionApproved: false,
    validatedIntelligibility: false,
    outputMode: 'offline-pcm-wav'
  };
}
