#!/usr/bin/env node
/** v2.58: stdout-only reproducible audit of exactly one hard-coded synthetic phrase. */
import {planTurkishProsody} from '../dou-speech-prosody.mjs';
import {retimeExperimentalSpeech} from '../dou-speech-timing.mjs';
import {synthesizeTurkishSpectralPreview,synthesizeTurkishTimingPreview} from '../dou-speech-waveform.mjs';
import {compareSyntheticBoundaryAudits} from '../dou-speech-boundary.mjs';
if(process.argv.length!==2){console.error('Kullanım: npm run speech:boundary-audit (argüman, metin veya dosya kabul edilmez)');process.exit(2);}
const fixed='Merhaba dünya';
const plan=planTurkishProsody(fixed);
const report=compareSyntheticBoundaryAudits(
 synthesizeTurkishSpectralPreview(fixed).wav,plan,
 synthesizeTurkishTimingPreview(fixed).wav,retimeExperimentalSpeech(plan));
console.log(JSON.stringify(report,null,2));
