#!/usr/bin/env node
/** Read-only, closed-fixture signal-plan audit. No free text, no storage. */
import {createHash} from 'node:crypto';
import {auditFixedCadence} from '../dou-speech-cadence.mjs';
if(process.argv.length!==2){console.error('Argüman kabul edilmez.');process.exit(2);}
const report=auditFixedCadence();
const reportSha256=createHash('sha256').update(Buffer.from(JSON.stringify(report))).digest('hex');
process.stdout.write(JSON.stringify({...report,reportSha256},null,2)+'\n');
