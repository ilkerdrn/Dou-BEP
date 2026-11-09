/**
 * Human-listening evidence gate for the isolated DOU Speech lab.
 * Objective PCM checks never prove intelligibility or naturalness.
 * Nothing here authorizes production Reader/exam speech.
 */
const ARMS = new Set(['baseline', 'candidate']);
const RATINGS = new Set(['intelligible','partly-intelligible','unintelligible']);
const PREFERENCES = new Set(['baseline','candidate','same','unknown']);

export const CURRENT_LISTENING_EVIDENCE = Object.freeze({
  protocol: 'dou-fixed-cue-human-listening-v1',
  scope: 'fixed-synthetic-cues-only',
  preferredArm: 'same',
  baselineRating: 'unintelligible',
  candidateRating: 'unintelligible',
  anonymous: true,
  listenerCount: 1,
  note: 'Both arms sound robotic; words cannot be understood',
  validatedNaturalness: false,
  validatesProductionUse: false
});

export function evaluateSpeechReadiness(evidence = CURRENT_LISTENING_EVIDENCE) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence) ||
      evidence.protocol !== 'dou-fixed-cue-human-listening-v1' ||
      evidence.scope !== 'fixed-synthetic-cues-only' ||
      evidence.anonymous !== true ||
      !Number.isSafeInteger(evidence.listenerCount) ||
      evidence.listenerCount < 1 || evidence.listenerCount > 10000 ||
      !PREFERENCES.has(evidence.preferredArm) ||
      !RATINGS.has(evidence.baselineRating) ||
      !RATINGS.has(evidence.candidateRating)) {
    return Object.freeze({allowed:false,reason:'invalid-or-insufficient-evidence',productionApproved:false});
  }
  if (evidence.baselineRating === 'unintelligible' &&
      evidence.candidateRating === 'unintelligible') {
    return Object.freeze({
      allowed:false,
      reason:'both-arms-unintelligible',
      recommendedNextStep:'offline-natural-speech-model-or-consented-recording-research',
      productionApproved:false
    });
  }
  // A few fixed phrases, even if audible, cannot establish general Turkish TTS safety.
  return Object.freeze({
    allowed:false,
    reason:'fixed-cue-evidence-does-not-validate-arbitrary-speech',
    productionApproved:false
  });
}

export function mayUseForReaderProduction(_engineId, _evidence) {
  // Deliberately not overridable by an experiment, source flag or CLI option.
  return false;
}
