# DOU Speech - local neural TTS comparator (research only)

## Important current licensing facts (checked November 2026)
The **current** rhasspy/piper-voices Turkish directory contains dfki; the
fahrettin and fettah voices were withdrawn at contributors' request.
Do not distribute or attempt to restore those withdrawn voices.

The dfki medium MODEL_CARD cites the underlying dfki-ot-data corpus as
**CC BY-NC-SA 4.0**. The repository's MIT metadata does **not** automatically
give permission to use the trained voice for commercial/institutional production.
A legal and data-rights review is required before any institutional deployment.
The current Piper implementation OHF-Voice/piper1-gpl is GPL-3.0, and its
software license is distinct from a particular voice's provenance and license.

Sources:
- https://huggingface.co/rhasspy/piper-voices/tree/main/tr
- https://huggingface.co/rhasspy/piper-voices/blob/main/tr/tr_TR/dfki/medium/MODEL_CARD
- https://github.com/OHF-Voice/piper1-gpl

## Architecture
This folder now contains `piper-local-research.mjs` and a strict preflight.
It accepts locally supplied *absolute paths* to a Piper executable, .onnx,
.onnx.json, and MODEL_CARD. The config must describe Turkish espeak phonemes,
and files have bounded sizes. Only a subset of the project's original,
nonpersonal *development* sentences can be supplied internally to a future
explicit inference test. It does not request arbitrary text, exams, students,
UIA content, passwords, or microphone signals.

The adapter does not download or install binaries/models and does not change
DOU Reader, speech quality gates, existing BEP V4 code, or exam timing.
It creates temporary WAV output, checks PCM headers, then removes the temporary
folder. A WAV emitted by an external model is NOT quality validated.

Note: environment variables such as HF_HUB_OFFLINE do **not** stop a malicious
or modified native program from accessing the internet. Use a vetted binary,
operating-system firewall or offline virtual machine, and independent
security review. File existence and model cards are not legal proof.

## Windows check (only when files have been reviewed and supplied)
```powershell
node tools/dou-piper-local-preflight.mjs `
  --exe "C:\DOU-PIPER-LAB\piper.exe" `
  --model "C:\DOU-PIPER-LAB\tr_TR-dfki-medium.onnx" `
  --config "C:\DOU-PIPER-LAB\tr_TR-dfki-medium.onnx.json" `
  --card "C:\DOU-PIPER-LAB\MODEL_CARD"
```
The paths are examples, not installed components. The command is a read-only
file preflight, not actual synthesis or a license approval. Its JSON will
report `available:false` when those files do not exist.

## Release policy
- Current A/B toy synthesizers: NOT intelligible.
- Piper: external comparative baseline only, not DOU Speech's in-house model.
- Actual local inference: requires vetted model, binary and human approval.
- No real exam content or student data may enter any of these research paths.
- No trained natural Turkish TTS engine is present in this repository.

## Explicit fixed-prompt synthesis (only after model and binary review)
After independent provenance/license/security approval, in an isolated
**offline** test VM, a researcher may evaluate a single invented development
sentence, such as TR001:
```powershell
node tools/dou-piper-fixed-prompt-lab.mjs `
  --exe "C:\DOU-PIPER-LAB\piper.exe" `
  --model "C:\DOU-PIPER-LAB\tr_TR-dfki-medium.onnx" `
  --config "C:\DOU-PIPER-LAB\tr_TR-dfki-medium.onnx.json" `
  --card "C:\DOU-PIPER-LAB\MODEL_CARD" `
  --prompt "TR001" --research-only --rights-reviewed
```
This returns **base64 WAV**, not human-readable text or an auto-playing
sound. Do not run the command before the model rights and executable are
actually reviewed. The CLI uses only fixed development prompts; it rejects
held-out/validation sentences and all free text. Model inference has NOT
been run or quality-tested in the present branch.

A CLI switch is not legal permission and does not restrict what a third-party
binary could do: use a firewall-isolated machine. Do not use this experimental
comparator for student exams or as a permanent external dependency.
