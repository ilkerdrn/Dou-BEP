# DOU Speech: transition away from unintelligible synthetic PCM (research only)

## Recorded human finding
A listener tried the fixed cue "Merhaba dünya" with the legacy articulation baseline
and the spectral/timing candidate. Both sounded similarly robotic; words were not
understandable. This is negative human-listening evidence, not a controlled clinical
accessibility study. It blocks promotion of either arm to Reader production.

Run: `node tools/dou-speech-readiness-audit.mjs`
Expected: `both-arms-unintelligible`, `productionReaderEnabled:false`.

## Why further waveform polish is insufficient
The oscillator/formant toy synthesizers are useful for DSP regression research, but
do not use a validated Turkish phoneme-to-acoustic model, recorded voice database,
or an evaluated neural vocoder. Their objective WAV scores measure signal
format/safety, not word intelligibility. We must not call these outputs natural TTS.

## Next independent offline engineering track
1. **Corpus policy and provenance**. Record only with explicit informed consent
   from speakers, clearly documented training/reuse rights and a deletion process.
   Use invented Turkish study prompts, never exam questions, student records,
   passwords, personal recordings, or UIA content.
2. **Phonetic coverage**. Prepare quality-controlled Turkish prompts that cover
   29 letters, vowels (including ı/ö/ü), consonant contrasts, morphology, stress,
   number/date reading and screen-reader navigation phrases. Maintain train,
   validation and held-out speakers/text splits.
3. **Local engine candidates**. Evaluate an internally hosted, on-device inference
   engine (e.g. a licensed local neural acoustic model and vocoder) with no cloud,
   runtime downloads or telemetry. A future deployment may use a local ONNX
   model, but this repository does not yet include trained model weights or a
   runtime adapter. Licensing claims must be independently audited.
4. **Artifact integrity**. A local candidate bundle is checked with
   `inspectLocalModelBundle`. SHA-256 match checks package integrity only;
   it does not validate ONNX structure, model quality, consent evidence, inference,
   or production suitability.
5. **Listening gate**. Before even considering integration, collect blinded
   transcription accuracy on unseen Turkish prompts, participant feedback on
   comprehension and naturalness, and timed latency/memory checks on target
   offline Windows hardware. Track Turkish morphology and confusing phoneme
   pairs separately; make thresholds explicit in a reviewed protocol.
6. **Reader release isolation**. Existing explicit opt-in SAPI Reader remains
   unchanged. Do not connect experimental/free-text model inputs to real
   exams, system UIA focus events, password fields, or students before
   independent privacy, accessibility and human acceptance.

## Status
- Windows fixed-cue WAV playback: manually audible, but unintelligible
- A/B synthetic acoustic research: **blocked for production**
- Local model bundle preflight: implemented, no candidate artifact supplied
- Natural offline Turkish TTS: **not implemented / not validated**
- Real student use: **not authorized**

No GitHub Actions, production deployment, remote TTS or BEP V4 data changes.
