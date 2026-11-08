#!/usr/bin/env node
// Fixed phrase acoustic diagnostics only; no free-text input or speech playback.
import {studyAllFixedLabCases} from './dou-speech-fixed-phrase-bench.mjs';
if(process.argv.length!==2){
 console.error('Kullanım: node tools/dou-speech-fixed-phrase-report.mjs');
 process.exitCode=2;
}else{
 try {
  const cases=studyAllFixedLabCases();
  if(new Set(cases.map(x=>x.sha256)).size!==cases.length)
   throw new Error('Farklı örneklerde aynı dalga biçimi oluştu.');
  console.log(JSON.stringify({
   scope:'fixed-synthetic-phrases-only',caseCount:cases.length,
   validatedIntelligibility:false,approvedForExamReading:false,cases
  },null,2));
 }catch(error){
  console.error('Deneysel ses raporu başarısız: '+error.message);
  process.exitCode=1;
 }
}
