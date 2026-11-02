#!/usr/bin/env node
/** Fixed-only, read-only, no arguments, raw text or identities in JSON report. */
import {createHash} from 'node:crypto';
import {auditFixedTurkishOrthography} from '../dou-speech-orthography.mjs';
if(process.argv.length!==2){
 console.error('Kullanım: npm run speech:orthography-audit (argüman kabul edilmez)');
 process.exit(2);
}
const report=auditFixedTurkishOrthography();
const reportSha256=createHash('sha256').update(JSON.stringify(report)).digest('hex');
console.log(JSON.stringify({...report,reportSha256},null,2));
