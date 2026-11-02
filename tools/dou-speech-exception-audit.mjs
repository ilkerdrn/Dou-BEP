#!/usr/bin/env node
// Fixed, read-only, anonymous synthetic diagnostics; refuses all arguments.
import {createHash} from 'node:crypto';
import {auditFixedTurkishExceptions} from '../dou-speech-exception-audit.mjs';
if(process.argv.length!==2){
 console.error('Kullanım: npm run speech:exception-audit (argüman kabul edilmez)');
 process.exit(2);
}
const report=auditFixedTurkishExceptions();
const reportSha256=createHash('sha256').update(Buffer.from(JSON.stringify(report))).digest('hex');
process.stdout.write(JSON.stringify({...report,reportSha256},null,2)+'\n');
