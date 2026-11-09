#!/usr/bin/env node
// Fixed A/B research WAV: stdout base64 only, never arbitrary input or disk.
import {synthesizeFixedComparison} from '../reader-speech-research/offline-cue-comparison.mjs';
const a=process.argv.slice(2);
if(a.length!==4||a[0]!=='--cue'||a[2]!=='--arm'){
  process.stderr.write('Use --cue ready|stopped|help --arm baseline|candidate.\n');
  process.exitCode=2;
}else{
  try{
    const r=synthesizeFixedComparison(a[1],a[3]);
    process.stdout.write(Buffer.from(r.wav).toString('base64'));
  }catch{
    process.stderr.write('Fixed comparison rejected.\n');
    process.exitCode=2;
  }
}
