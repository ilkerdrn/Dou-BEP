#!/usr/bin/env node
/** Fixed-only v2.61 signal report. No arguments, text, DB, microphone, I/O files. */
import {auditFixedJoinCorpus} from '../dou-speech-corpus.mjs';
if(process.argv.length!==2){console.error('Kullanım: npm run speech:join-audit (argüman yok)');process.exit(2);}
console.log(JSON.stringify(auditFixedJoinCorpus(),null,2));
