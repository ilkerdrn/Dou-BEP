#!/usr/bin/env node
/** Read-only audit of three enumerated stress candidates; NO arbitrary words. */
import {createHash} from 'node:crypto';
import {auditFixedStressPlans} from '../dou-speech-exception-plan.mjs';
if(process.argv.length!==2){
 console.error('Kullanım: npm run speech:exception-plan-audit (argüman kabul edilmez)');
 process.exit(2);
}
const report=auditFixedStressPlans();
const reportSha256=createHash('sha256').update(Buffer.from(JSON.stringify(report))).digest('hex');
process.stdout.write(JSON.stringify({...report,reportSha256},null,2)+'\n');
