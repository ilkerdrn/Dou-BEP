#!/usr/bin/env node
/** CLI emits technical counts only; no reads of institutional files or saving. */
import {compareFixedPhonemePairs} from '../dou-speech-phoneme-diagnostics.mjs';
if(process.argv.length!==2){console.error('Kullanım: node tools/dou-speech-phoneme-audit.mjs');process.exitCode=2;}
else console.log(JSON.stringify(compareFixedPhonemePairs(),null,2));
