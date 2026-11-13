# DOU Reader MVP - Optional local fixed announcement preview

## Purpose and boundary
The usable Reader pilot is the priority. Independent Turkish neural speech synthesis
remains a separate research milestone. This demo feature accepts a **user-selected,
pre-rendered, licensed** Turkish MP3 or WAV for a small fixed UI announcement. It does not:
- synthesize exam questions or answers, student data, passwords, or teacher notes;
- record from microphones, contact ElevenLabs, upload audio, store voices or change
  the production Reader / native Windows screen-reader;
- imply that DOU Speech has learned to generate intelligible or natural speech.

The existing Reader exam narration continues to require a locally installed
Turkish browser voice. A pre-rendered fixed announcement cannot replace dynamic
text-to-speech. If no such installed voice exists, written content and keyboard
navigation remain available.

## Supported fixed text
- `welcome`: "Doğuş Üniversitesi erişilebilir sınav sistemine hoş geldiniz."
- `exam-start`: "Sınav hazırlama ekranı açıldı."
- `next-step`: "Devam etmek için ileri düğmesine basınız."
- `finished`: "İşleminiz tamamlandı."

Use anonymous, generic content only. Never paste examination content or personal
records into an external text-to-speech service. Verify the service's current
commercial license, output usage and no-training terms before institutional use.
Do not use generated ElevenLabs audio to train DOU Speech or another AI model
without a separate authorization explicitly allowing that use.

## Local preview workflow
1. Produce a *fixed* phrase using a provider you are authorized to use.
   No ElevenLabs account or API is connected to this code.
2. Download MP3 or WAV onto your own PC. MP3 is directly supported in the
   local browser player; no FFmpeg conversion is required for MP3.
3. If you have a WAV that is not mono 22,050 Hz PCM16, either download
   MP3 instead or convert locally using your existing FFmpeg. The example
   does not overwrite an existing destination:
   `ffmpeg -n -i "C:\\Users\\Public\\Music\\source.mp3" -ar 22050 -ac 1 -c:a pcm_s16le "C:\\Users\\Public\\Music\\DOU-Welcome.wav"`
   Replace the paths with your actual file locations; do not use protected exam data.
4. Start the local DOU BEP demo server as usual. Open `/dou-reader-demo`.
5. Find **Doğal Türkçe sabit anons önizlemesi**, choose the matching cue,
   select the local MP3 or WAV in the file picker, and click **Seçili anonsu dinle**.
6. Listen and verify that the clip speaks the selected fixed phrase. The client
   validates WAV structure, duration and basic signal activity, not spoken words.
   Changing cues clears the loaded clip. Closing the page drops the reference.

## Security and accessibility
- The browser File API reads into memory only; there are no uploads,
  background requests, analytics, cookies, recordings or storage.
- Only pre-approved cue IDs are available. No arbitrary spoken content.
- User interaction is required to select and play a file.
- MP3 or 22,050 Hz PCM16 mono WAV up to 2 MB is accepted. Strict RIFF
  checks reject silent, clipped or malformed WAV. MP3 receives bounded
  filename, ID3 and MPEG frame-header screening; that is NOT a decoder,
  signal-quality check or intelligibility guarantee. Human listening remains
  mandatory. Browser decoding failures do not affect exam Reader.
- CSP permits `media-src 'self' blob:` so local in-memory audio works while
  continuing to block remote media.
- Status messages are written as text and are accessible as a live region.
- There is no automatic fallback from question narration to externally-hosted
  synthesis.

## Verifying without cloud or actual audio files
```powershell
Set-Location 'D:\\Projects\\DOU-READER-SPEECH-INDEPENDENT'
node --test dou-reader-cue-preview.test.mjs dou-reader.http.test.mjs
node --test reader-speech-research/*.test.mjs
```
Unit fixtures are synthetic sine-wave PCM only. No provider voice or real
microphone recording has been checked in. Human review is required.
