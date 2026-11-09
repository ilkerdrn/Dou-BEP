#!/usr/bin/env node
// Offline-only experimental PCM WAV bridge for approved Reader status cues.
// Never accepts arbitrary text, student records, exam content or network input.
import {renderExperimentalCue} from '../reader-speech-research/offline-audio-contract.mjs';

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--cue') {
  process.stderr.write('Use --cue ready|stopped|help for synthetic laboratory playback only.\n');
  process.exitCode = 2;
} else {
  try {
    const result = renderExperimentalCue(args[1]);
    process.stdout.write(Buffer.from(result.wav).toString('base64'));
  } catch {
    process.stderr.write('Cue rejected or experimental WAV invalid.\n');
    process.exitCode = 2;
  }
}
