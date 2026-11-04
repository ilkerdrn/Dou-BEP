#!/usr/bin/env node
// Opt-in Reader demo bridge: fixed synthetic phrase only, never exam or student text.
// Emits base64 encoded PCM WAV to stdout; no files, microphone, network or data logging.
import {synthesizeTurkishPreview} from '../dou-speech-waveform.mjs';
if (process.argv.length !== 2) {
  process.stderr.write('DOU Speech Reader denemesi parametre kabul etmez.\n');
  process.exit(2);
}
const {wav, experimental} = synthesizeTurkishPreview('Merhaba dünya');
if (experimental !== true || wav.length > 1024 * 1024 || wav.length < 44) {
  process.stderr.write('Deneysel WAV sinirlari asildi.\n');
  process.exit(1);
}
process.stdout.write(Buffer.from(wav).toString('base64'));
