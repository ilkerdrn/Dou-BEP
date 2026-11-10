# DOU Speech V6 - first intelligible offline voice comparison

## What this release adds
- `local-pcm-output-gate.mjs` checks strict PCM16 mono WAV syntax,
  duration, signal activity and excessive clipping. This is a machine
  signal-quality check, **not Turkish intelligibility or naturalness**.
- `piper-local-research.mjs` now rejects near-silent, malformed or heavily
  clipped files even when the external executable exits successfully.
- `dou-piper-windows-listening-lab.ps1` optionally plays **one fixed generic**
  development sentence from a separately reviewed local Piper installation.
  It never reads UIA/screen content, exams or student text; default mode
  only inspects local file presence, not inference.

## Pre-requisites (not automatically installed)
An independently vetted local `piper.exe`, an authorized Turkish `.onnx`,
matching `.onnx.json`, and `MODEL_CARD` placed in a separate directory.
Verify model and training-data rights; a card containing the word 'license'
does not prove you have legal rights. The preflight does not verify that the
ONNX is well formed or the executable authentic. The model may not work.

The Windows native executable may access the network if permitted by the OS;
offline environment flags are not network isolation. Perform first native
execution only on an intentionally disconnected or firewall-isolated test
machine after executable validation.

## Windows read-only preflight (NO sound or inference)
```powershell
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass `
  -File ".\tools\dou-piper-windows-listening-lab.ps1" `
  -Executable "C:\DOU-PIPER-LAB\piper.exe" `
  -Model "C:\DOU-PIPER-LAB\tr_TR-voice-medium.onnx" `
  -Config "C:\DOU-PIPER-LAB\tr_TR-voice-medium.onnx.json" `
  -ModelCard "C:\DOU-PIPER-LAB\MODEL_CARD"
```
These paths are examples. If files are missing, you should see NOT READY.
A file-presence result is not a success for inference.

## Manual listening (ONLY after binary and license review)
Append `-Play -RightsReviewed` to the above command after arranging an
independent rights review and a network-isolated Windows session.
Only a fixed invented development sentence ID is sent to the native
executable. The window lets the listener play/stop the sample. No model,
binary, WAV or listening data is written into the project repository.

A successful playback proves only that a local model generated an audible
PCM file. Human transcription and naturalness scores are mandatory before
claiming intelligible Turkish.

## Release hold
The previously user-tested oscillator/formant A and B arms remain human-
unintelligible. DOU Reader integration stays disabled. This release adds
no trained in-house voice and no licensed model artifact.

## Tests
```powershell
node --test reader-speech-research/*.test.mjs
node tools/dou-speech-evaluation-audit.mjs
```
Any PASS from these automated commands is a **technical research gate**,
not clinical or production acceptance and not natural TTS.
