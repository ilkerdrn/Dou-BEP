#!/usr/bin/env node
// Read-only, offline technical status. No speech content, student data or downloads.
import {evaluateSpeechReadiness,CURRENT_LISTENING_EVIDENCE} from '../reader-speech-research/speech-readiness-gate.mjs';

if(process.argv.length!==2){
  process.stderr.write('This audit accepts no parameters or user text.\n');
  process.exitCode=2;
}else{
  const assessment=evaluateSpeechReadiness(CURRENT_LISTENING_EVIDENCE);
  process.stdout.write(JSON.stringify({
    schema:'dou-speech-research-readiness-v1',
    localSpeechLab:'acoustic-experiment-only',
    humanListeningOutcome:'both-arms-unintelligible',
    productionReaderEnabled:false,
    nextTrack:'consented-voice-corpus-and-local-model-evaluation',
    evaluation:assessment
  },null,2)+'\n');
}
