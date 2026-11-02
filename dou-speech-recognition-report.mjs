/** v2.72: finite, fixture-only, privacy-minimized local recognition summary.
 * No subject IDs, session IDs, timestamps, free text, network or automatic persistence.
 * An exported result is only an exploratory engineering rehearsal, NOT human validation.
 */
import {WORD_PAIRS,ARMS,summarizeRecognition} from './dou-speech-intelligibility.mjs';

const PAIR_LABELS=Object.freeze(['s/ş','c/ç','b/d','k/g','t/s','t/b']);
const CSV_HEADER='pair,contrast,arm,answered,correct,wrong,confused_first_as_second,confused_second_as_first';
export function createLocalRecognitionReport(session){
 if(!session?.finished||session.position!==WORD_PAIRS.length*2-1)
  throw new RangeError('Eksik dinleme provası raporlanamaz.');
 const overall=summarizeRecognition(session);
 if(overall.answered!==WORD_PAIRS.length*2||ARMS.some(arm=>overall.arms[arm].answered!==WORD_PAIRS.length))
  throw new RangeError('Tamamlanmamış ya da dengesiz deneme.');
 const perPair=[];
 for(let i=0;i<WORD_PAIRS.length;i++){
  const pair=WORD_PAIRS[i],rows={};
  for(const arm of ARMS){
   const matches=session.trials.filter(t=>t.pairIndex===i&&t.arm===arm);
   if(matches.length!==1)throw new RangeError('Tekrarlanan veya eksik motor eşlemesi.');
   const t=matches[0];
   if(!pair.includes(t.target)||!pair.includes(t.choice)||!t.heard)throw new RangeError('Geçersiz yanıt.');
   rows[arm]={answered:1,correct:Number(t.choice===t.target),wrong:Number(t.choice!==t.target),
    confusedFirstAsSecond:Number(t.target===pair[0]&&t.choice===pair[1]),
    confusedSecondAsFirst:Number(t.target===pair[1]&&t.choice===pair[0])};
  }
  perPair.push({pair:pair.join('/'),contrast:PAIR_LABELS[i],arms:rows});
 }
 const totals={legacy:{...overall.arms.legacy},spectral:{...overall.arms.spectral}};
 return {schema:'dou-bep-local-recognition-report-v2',purpose:'anonymous-engineering-rehearsal',
  validatedHumanIntelligibility:false,scientificSignificance:null,participantCount:null,
  totalTrials:overall.trials,totals,correctDifferenceCandidateMinusLegacy:totals.spectral.correct-totals.legacy.correct,
  pairs:perPair};
}
export function localReportJson(report){
 if(report?.schema!=='dou-bep-local-recognition-report-v2'||report.pairs?.length!==WORD_PAIRS.length)
  throw new TypeError('Geçersiz rapor.');
 return JSON.stringify(report,null,2)+'\n';
}
export function localReportCsv(report){
 localReportJson(report);
 const lines=[CSV_HEADER];
 for(const p of report.pairs){
  if(!WORD_PAIRS.some(pair=>pair.join('/')===p.pair)||!PAIR_LABELS.includes(p.contrast))throw new TypeError('Geçersiz çift.');
  for(const arm of ARMS){
   const r=p.arms?.[arm];
   if(!r||![r.answered,r.correct,r.wrong,r.confusedFirstAsSecond,r.confusedSecondAsFirst].every(x=>Number.isInteger(x)&&x>=0&&x<=1))throw new TypeError('Geçersiz ölçü.');
   lines.push([p.pair,p.contrast,arm,r.answered,r.correct,r.wrong,r.confusedFirstAsSecond,r.confusedSecondAsFirst].join(','));
  }
 }
 return '\uFEFF'+lines.join('\r\n')+'\r\n';
}
