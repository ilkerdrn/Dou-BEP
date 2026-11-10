# DOU Speech V7 - Consent-based local microphone corpus prototype

## Why
Both existing synthetic DOU Speech voices were unintelligible. Developing an
independent intelligible Turkish TTS requires lawful, high-quality recorded
speech and an actual trained acoustic model. V7 adds an **opt-in local audio
capture path**, NOT a trained voice engine.

## Scope and privacy
- A separate Windows-only research tool uses an existing **vetted, local
  ffmpeg.exe** and its DirectShow microphone input. It does NOT download or
  install ffmpeg, collect device names automatically, or contact a server.
- It only captures a **single prewritten development prompt** (TR001, TR004,
  etc.). Never use exam questions, personal data, passwords, student records,
  personal conversations, or copyrighted audio.
- There is **NO automatic capture**. Each command requires explicit
  `--i-consent-to-record --voice-rights-confirmed`; no default microphone.
  For other speakers, obtain documented, informed permission with defined
  research use, deletion and withdrawal procedures BEFORE recording.
- The destination must be an absolute path OUTSIDE the Git checkout,
  use the matching `TRnnn.wav` name, and already have a parent directory.
  Existing files are not overwritten. Partial/failed samples are deleted.
- Captures PCM16 mono at 22050 Hz with 2-12 second bounded duration. A local
  signal gate rejects malformed, silent, clipped or implausibly short files.
- The recorder never trains a model, uploads or transmits files, enables
  Reader production, or collects listener/transcript results automatically.
- A native ffmpeg binary is NOT inherently a network sandbox. Run an
  independently verified copy in a disconnected or firewall-restricted lab.
  Microphone access is under Windows OS control. The script cannot prove
  permissions, consent lawfulness, or confidentiality of the workstation.

## Prerequisites
1. A microphone, permission to capture your own (or fully consented) voice.
2. An independently verified locally installed Windows ffmpeg.exe. On a
   non-networked research workstation, determine the precise DirectShow
   device name manually using the installed ffmpeg documentation.
3. A private output directory outside the repo, for example
   `D:\DOU-Speech-Private-Recordings\`. The folder is NOT created by the
   capture tool; set appropriate Windows file permissions beforehand.
4. A prompt ID from the development split. `TR001` is
   "Arı ile iri aynı değildir.". The 12 development prompts are a tiny
   pilot, NOT an adequate model training corpus.

## Read-only command validation (does NOT open the mic)
```powershell
node tools/dou-speech-local-voice-capture.mjs `
  --ffmpeg "C:\Tools\ffmpeg\bin\ffmpeg.exe" `
  --microphone "Microphone (Your Device Name)" `
  --prompt TR001 --seconds 5 `
  --destination "D:\DOU-Speech-Private-Recordings\TR001.wav" `
  --i-consent-to-record --voice-rights-confirmed --check
```

## Record one personally consented prompt (explicit opt-in)
Remove `--check` from the command above. First verify the prompt text,
microphone name, storage ACL, consent and disconnected network setting.
You will hear no automatic playback. The output reports the prompt ID and
objective signal metrics only. Review the recording privately before keeping it.
Delete it using your local file-management tool if consent is withdrawn.
Don't commit or upload raw recordings to GitHub.

## Development status
- Consent-gated capture code committed, not yet tested with a real microphone.
- ffmpeg is NOT included or validated by this project.
- 53 V6 regressions passed in the prior user's Windows log; V7 unverified.
- Natural Turkish acoustic model: NOT TRAINED.
- DOU Reader production voice integration: OFF.
