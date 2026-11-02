/** v2.73: balanced fixture-only 24-trial report, no inference or PII. */
import {WORD_PAIRS,ARMS} from './dou-speech-intelligibility.mjs';
import {BALANCED_TRIALS,summarizeBalancedRecognition} from './dou-speech-balanced-protocol.mjs';
const PAIR_LABELS=['s/ş','c/ç','b/d','k/g','t/s','t/b'];
const HEAD='pair,contrast,arm,target,answered,correct,wrong,confused_as_other';
export function createBalancedRecognitionReport(session){
 const summary=summarizeBalancedRecognition(session);
 if(!session.finished||session.position!==BALANCED_TRIALS-1||summary.answered!==BALANCED_TRIALS ||
  ARMS.some(a=>summary.arms[a].answered!==BALANCED_TRIALS/2))
  throw new RangeError('Dengeli protokol tamamlanmadı.');
 const pairs=WORD_PAIRS.map((pair,pairIndex)=>({
  pair:pair.join('/'),contrast:PAIR_LABELS[pairIndex],arms:Object.fromEntries(ARMS.map(arm=>{
   const trials=session.trials.filter(t=>t.pairIndex===pairIndex&&t.arm===arm);
   if(trials.length!==2||trials.some(t=>!pair.includes(t.choice)||!t.heard))throw new RangeError('Eksik deneme.');
   return [arm,{
    answered:2,correct:trials.filter(t=>t.choice===t.target).length,
    wrong:trials.filter(t=>t.choice!==t.target).length,
    targets:pair.map(word=>({word,correct:Number(trials.find(t=>t.target===word)?.choice===word),
     confusedAsOther:Number(trials.find(t=>t.target===word)?.choice!==word)}))
   }];
  }))}));
 return {schema:'dou-bep-balanced-recognition-v3',purpose:'anonymous-engineering-rehearsal',
  protocol:'balanced24',validatedHumanIntelligibility:false,scientificSignificance:null,
  participantCount:null,totalTrials:BALANCED_TRIALS,totals:summary.arms,
  correctDifferenceCandidateMinusLegacy:summary.arms.spectral.correct-summary.arms.legacy.correct,
  pairs};
}
function validateReport(r){
 if(r?.schema!=='dou-bep-balanced-recognition-v3'||r.protocol!=='balanced24'||r.totalTrials!==BALANCED_TRIALS||
  r.pairs?.length!==WORD_PAIRS.length||r.validatedHumanIntelligibility!==false)
  throw new TypeError('Geçersiz rapor.');
 for(let i=0;i<WORD_PAIRS.length;i++){
  const row=r.pairs[i];
  if(row.pair!==WORD_PAIRS[i].join('/')||row.contrast!==PAIR_LABELS[i])throw new TypeError('Geçersiz çift.');
  for(const arm of ARMS){
   const a=row.arms?.[arm];
   if(a?.answered!==2||!Number.isInteger(a.correct)||!Number.isInteger(a.wrong)||a.correct+a.wrong!==2||
    !Array.isArray(a.targets)||a.targets.length!==2)throw new TypeError('Geçersiz ölçüm.');
   for(let j=0;j<2;j++){const t=a.targets[j];if(t?.word!==WORD_PAIRS[i][j]||
    ![0,1].includes(t.correct)||t.confusedAsOther!==1-t.correct)throw new TypeError('Geçersiz hedef.');}
  }
 }
 return r;
}
export function balancedReportJson(report){return JSON.stringify(validateReport(report),null,2)+'\n';}
export function balancedReportCsv(report){
 validateReport(report);
 const rows=[HEAD];
 for(const p of report.pairs)for(const arm of ARMS)for(const t of p.arms[arm].targets){
  rows.push([p.pair,p.contrast,arm,t.word,1,t.correct,t.confusedAsOther,t.confusedAsOther].join(','));
 }
 return '\uFEFF'+rows.join('\r\n')+'\r\n';
}
