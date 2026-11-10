#!/usr/bin/env node
// Research-only inventory: never accepts real student data or transcriptions.
import {auditTurkishEvaluationPrompts,TURKISH_EVALUATION_PROMPTS} from '../reader-speech-research/turkish-evaluation-prompts.mjs';
import {evaluateSpeechReadiness} from '../reader-speech-research/speech-readiness-gate.mjs';

if(process.argv.length!==2){
 process.stderr.write('DOU Speech evaluation audit accepts no arguments.\n');
 process.exitCode=2;
}else{
 const inventory=auditTurkishEvaluationPrompts();
 const readiness=evaluateSpeechReadiness();
 const report={
  schema:'dou-turkish-intelligibility-evaluation-v1',
  inventory,
  exampleIds:TURKISH_EVALUATION_PROMPTS.map(p=>p.id),
  trainingAudioAvailable:false,
  naturalTtsModelAvailable:false,
  subjectiveListeningComplete:false,
  productionApproved:false,
  previousSyntheticSpeechResult:readiness.reason,
  nextStep:'consented-offline-speaker-recordings-and-blinded-transcription-study'
 };
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
 if(!inventory.valid)process.exitCode=1;
}
