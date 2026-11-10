# DOU Speech: Turkish intelligibility evaluation v1 (synthetic text only)

This research package was introduced after a human listener reported that
both A/B robotic speech outputs were equally unintelligible. We are NOT
claiming to have solved speech synthesis.

## Scope
- 24 original generic Turkish test sentences, organized into six categories
  (vowels, consonants, morphology, numbers, navigation, prosody)
- Fixed development (12), validation (6), and held-out (6) text IDs
- Bounded Turkish transcription normalization and WER/CER edit distance
- No recordings, transcripts, speaker names, university exam content, model
  weights, cloud access, telemetry, automatic recording or live Reader link

Run offline inventory: `node tools/dou-speech-evaluation-audit.mjs`.
Run tests: `node --test reader-speech-research/*.test.mjs`.

## Listening evaluation rules
Only independent test staff should use generated or expressly consented
audio. Never record a student's exam, collect identifiable speech without
informed consent or upload raw listening transcripts to source control.
For a held-out sentence, show the participant neither the expected sentence
nor its ID-to-text lookup until after transcription. Compare the written
transcription to the reference with `scoreTurkishTranscription(id, text)`.
WER and CER quantify text accuracy; they do NOT prove voice naturalness,
comprehension across users, or screen-reader accessibility.

The 24 prompts are a tiny fixed evaluation suite, not a realistic full
training corpus. If model training begins, create a separately reviewed,
licensed and consented corpus, speakers and unseen held-out evaluation
speakers/text. Prevent train/test leakage. Count independent listeners and
report confidence intervals before any quality claim.

## Release guardrails
Synthetic oscillator/formant arms remain blocked for production because
the user could not understand their words. A package SHA-256 match only
verifies file integrity, not model provenance, ONNX validity, inference,
intelligibility or rights. Do not enable arbitrary UIA text, student data,
or exam content in the experimental synthesis interfaces.

## Status
Evaluation code: committed, Windows/Node verification pending.
Natural offline Turkish TTS model: not implemented.
Audio corpus: none supplied.
Production Reader integration: not approved.
