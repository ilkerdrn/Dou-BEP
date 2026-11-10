#!/usr/bin/env node
// Explicit research-only local inference, a FIXED generic development prompt.
// Emits base64 PCM WAV to stdout; no free-text or student/exam input permitted.
// Native program must be independently vetted and firewall-isolated first.
import {runPiperFixedPrompt} from '../reader-speech-research/piper-local-research.mjs';

const input=process.argv.slice(2);
const keys=['--exe','--model','--config','--card','--prompt'];
const values=Object.create(null);
let valid=input.length===12;
for(let i=0;valid&&i<10;i+=2){
 if(!keys.includes(input[i])||Object.hasOwn(values,input[i])||
    typeof input[i+1]!=='string'||input[i+1].startsWith('--'))valid=false;
 else values[input[i]]=input[i+1];
}
if(input[10]!=='--research-only'||input[11]!=='--rights-reviewed')valid=false;
if(keys.some(x=>!Object.hasOwn(values,x)))valid=false;
if(!valid){
 process.stderr.write('Fixed prompt lab only; expected 5 file/id pairs and --research-only --rights-reviewed.\n');
 process.exitCode=2;
}else{
 const out=runPiperFixedPrompt({
  executable:values['--exe'],model:values['--model'],
  config:values['--config'],card:values['--card'],
  promptId:values['--prompt'],
  licenseReviewed:true,explicitConsentToRun:true
 });
 if(!out.ready){
  process.stderr.write('Offline fixed-prompt inference unavailable or rejected.\n');
  process.exitCode=1;
 }else{
  process.stdout.write(out.wavBase64);
 }
}
