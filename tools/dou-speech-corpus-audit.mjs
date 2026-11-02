#!/usr/bin/env node
/** Read-only, no-argument laboratory run; no filesystem reads or writes. */
import {createHash} from 'node:crypto';
import {auditFixedSyntheticCorpus} from '../dou-speech-corpus.mjs';
if(process.argv.length!==2){
 console.error('Kullanım: npm run speech:corpus-audit (metin, dosya, URL ve argüman kabul edilmez)');
 process.exit(2);
}
const report=auditFixedSyntheticCorpus();
const canonical=JSON.stringify(report);
const manifestSha256=createHash('sha256').update(canonical).digest('hex');
console.log(JSON.stringify({...report,manifestSha256},null,2));
