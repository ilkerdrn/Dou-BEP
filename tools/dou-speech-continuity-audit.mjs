#!/usr/bin/env node
/** Deterministic, read-only three-fixture PCM continuity report. */
import {createHash} from 'node:crypto';
import {auditFixedContinuity} from '../dou-speech-continuity.mjs';
if(process.argv.length!==2){console.error('Bu komut argüman kabul etmez.');process.exit(2);}
const report=auditFixedContinuity();
const reportSha256=createHash('sha256').update(Buffer.from(JSON.stringify(report))).digest('hex');
process.stdout.write(JSON.stringify({...report,reportSha256},null,2)+'\n');
