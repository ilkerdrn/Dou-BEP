#!/usr/bin/env node
// V7 fixed study prompt voice recorder. Always explicit consent, never auto-start.
// Uses a separately installed vetted ffmpeg.exe on Windows, with a named local mic.
// Outputs only outside the repository. Does not collect or transmit voice to GitHub.
import {captureConsentBasedPrompt,validateRecordingRequest} from '../reader-speech-research/local-voice-capture.mjs';

const argv=process.argv.slice(2);
const flagNames=new Set(['--ffmpeg','--microphone','--prompt','--seconds','--destination']);
const input=Object.create(null);
let ok=true;
for(let i=0;i<argv.length;i++){
 const v=argv[i];
 if(flagNames.has(v)){
  if(Object.hasOwn(input,v)||i+1===argv.length||argv[i+1].startsWith('--')){ok=false;break;}
  input[v]=argv[++i];
 }else if(v==='--i-consent-to-record'||v==='--voice-rights-confirmed'||v==='--check'){
  if(Object.hasOwn(input,v)){ok=false;break;}
  input[v]=true;
 }else{ok=false;break;}
}
if(!ok||[...flagNames].some(k=>!Object.hasOwn(input,k))){
 process.stderr.write('Required: --ffmpeg PATH --microphone NAME --prompt TR001 --seconds 5 --destination ABSOLUTE_PATH. For recording, also pass --i-consent-to-record --voice-rights-confirmed. Optional --check validates only.\n');
 process.exitCode=2;
}else{
 const opts={
  ffmpeg:input['--ffmpeg'],microphone:input['--microphone'],
  promptId:input['--prompt'],seconds:Number(input['--seconds']),
  destination:input['--destination'],
  explicitConsent:input['--i-consent-to-record']===true,
  rightsConfirmed:input['--voice-rights-confirmed']===true
 };
 if(input['--check']){
  // Preflight does not request microphone permission or run an executable.
  const result=validateRecordingRequest(opts);
  process.stdout.write(JSON.stringify({
   schema:'dou-voice-capture-preflight-v1',ready:result.ok,
   reason:result.reason,recordingStarted:false,trainingStarted:false,
   productionApproved:false
  },null,2)+'\n');
  if(!result.ok)process.exitCode=1;
 }else{
  const result=captureConsentBasedPrompt(opts);
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  if(!result.ok)process.exitCode=1;
 }
}
