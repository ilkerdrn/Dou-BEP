#!/usr/bin/env node
// Read-only preflight, or explicit isolated research inference using a vetted binary.
// Never installs/downloads Piper or voices; never accepts free-text prompts.
import {inspectPiperResearchInputs,runPiperFixedPrompt} from '../reader-speech-research/piper-local-research.mjs';

const keys=['--exe','--model','--config','--card'];
const args=process.argv.slice(2);
const opts={};
let valid=true;
for(let i=0;i<args.length;i+=2){
  if(!keys.includes(args[i])||typeof args[i+1]!=='string'||args[i+1].startsWith('--')||
     Object.hasOwn(opts,args[i])){valid=false;break;}
  opts[args[i]]=args[i+1];
}
if(!valid||args.length!==8||keys.some(k=>!Object.hasOwn(opts,k))){
 process.stderr.write('Expected --exe PATH --model PATH --config PATH --card PATH. No text or inference.\n');
 process.exitCode=2;
}else{
 const result=inspectPiperResearchInputs({
   executable:opts['--exe'],model:opts['--model'],
   config:opts['--config'],card:opts['--card'],
   // Preflight NEVER claims independent rights review.
   licenseReviewed:true
 });
 process.stdout.write(JSON.stringify({
   schema:'dou-piper-local-preflight-v1',
   available:result.ready,
   productionApproved:false,
   legalRightsIndependentlyVerified:false,
   networkIsolationVerified:false,
   modelInferenceTested:false,
   reason:result.reason,
   humanListeningValidated:false
 },null,2)+'\n');
}
