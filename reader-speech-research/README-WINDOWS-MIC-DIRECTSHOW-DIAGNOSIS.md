# DOU Speech V7.1 - DirectShow microphone opening failure on Windows

Observed environment:
- Windows NT 10.0.26300.0
- FFmpeg 9.0.2 Gyan build
- Device enumerated: Microphone Array (Realtek(R) Audio)
- Recording failed with: "Could not find output pin from audio only capture device",
  "Could not find audio only device ... among source devices of type video",
  and "Error opening input: I/O error".
- Prior direct ffmpeg diagnostic returned exit code -5.
- A negative exit code is NOT a validated Windows device permission diagnosis.

The error confirms an **input-open failure**, not a working microphone and not
a successful capture. The second line may arise while DirectShow is searching
device categories; do not assume the microphone is actually a video input.

## Read-only checks before another recording attempt
1. In Windows Settings > Privacy & security > Microphone:
   check microphone access, app access, and desktop-app microphone access.
2. In Windows Settings > System > Sound > Input:
   select Realtek Microphone Array; check that its *test your microphone*
   level moves when speaking. If not, diagnose Windows/driver first.
3. Close applications that might exclusively hold the microphone.
4. Confirm the exact DirectShow *alternative name* from
   `ffmpeg -hide_banner -list_devices true -f dshow -i dummy`.
   Device listing often returns a nonzero exit code by design.
   The alternative name may be tested with `audio=<alternative name>`
   in a separately approved capture, not in the diagnostic command.

## Privacy and retry rules
- Do NOT automatically retry microphone access or record without new consent.
- Do NOT upload raw recording files, device logs, MAC/device identifiers or
  student/teacher data to GitHub.
- Leave the feature branch, Reader and BEP V4 untouched except this independent
  research error classification.
- Current node CLI returns only a coarse local error reason; never sends
  raw FFmpeg stderr into the output.
- Run the project test suite before asking for further audio capture.

## State
No valid voice recording has been reported from V7.
The new error category is `dshow-audio-device-open-failed`.
A microphone being listed in DirectShow is not proof it can be opened.
