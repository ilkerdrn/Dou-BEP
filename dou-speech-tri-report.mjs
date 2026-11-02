/** Explicit client-side export after a completed 36-trial local experiment only. */
import {WORD_PAIRS} from './dou-speech-intelligibility.mjs';
import {TRI_ARMS,TRI_TRIALS,summarizeTriRecognition} from './dou-speech-tri-protocol.mjs';
const LABELS=['s/ş','c/ç','b/d','k/g','t/s','t/b'];
export function createTriRecognitionReport(session){
 const summary=summarizeTriRecognition(session);
 if(!session.finished||session.position!==TRI_TRIALS-1||summary.answered!==TRI_TRIALS||
  TRI_ARMS.some(a=>summary.arms[a].answered!==TRI_TRIALS/3))throw new RangeError('36 deneme tamamlanmadı.');
 const pairs=WORD_PAIRS.map((pair,pairIndex)=>({pair:pair.join('/'),contrast:LABELS[pairIndex],
  arms:Object.fromEntries(TRI_ARMS.map(arm=>{
   const trials=session.trials.filter(t=>t.pairIndex===pairIndex&&t.arm===arm);
   if(trials.length!==2||trials.some(t=>!t.heard||!pair.includes(t.choice)))throw new RangeError('Eksik çift.');
   return [arm,{answered:2,correct:trials.filter(t=>t.choice===t.target).length,
    wrong:trials.filter(t=>t.choice!==t.target).length,
    targets:pair.map(word=>({word,correct:Number(trials.find(t=>t.target===word)?.choice===word),
     confusedAsOther:Number(trials.find(t=>t.target===word)?.choice!==word)}))}];
  }))}));
 return {schema:'dou-bep-balanced36-report-v1',protocol:'balanced36',purpose:'anonymous-engineering-rehearsal',
  validatedHumanIntelligibility:false,scientificSignificance:null,participantCount:null,
  totalTrials:TRI_TRIALS,totals:summary.arms,pairs};
}
function validate(report){
 if(report?.schema!=='dou-bep-balanced36-report-v1'||report.protocol!=='balanced36'||report.totalTrials!==36||
  report.validatedHumanIntelligibility!==false||report.pairs?.length!==WORD_PAIRS.length||
  Object.keys(report.totals??{}).join(',')!==TRI_ARMS.join(','))throw new TypeError('Geçersiz rapor.');
 for(let i=0;i<WORD_PAIRS.length;i++){
  const p=report.pairs[i];if(p.pair!==WORD_PAIRS[i].join('/')||p.contrast!==LABELS[i])throw new TypeError('Çift geçersiz.');
  for(const arm of TRI_ARMS){const a=p.arms?.[arm];
   if(a?.answered!==2||!Number.isInteger(a.correct)||!Number.isInteger(a.wrong)||a.correct+a.wrong!==2||a.targets?.length!==2)
    throw new TypeError('Puan geçersiz.');
   for(let j=0;j<2;j++){const t=a.targets[j];if(t?.word!==WORD_PAIRS[i][j]||![0,1].includes(t.correct)||t.confusedAsOther!==1-t.correct)
     throw new TypeError('Hedef geçersiz.');}
  }
 }
 return report;
}
export function triReportJson(r){return JSON.stringify(validate(r),null,2)+'\n';}
export function triReportCsv(r){
 validate(r);
 const lines=['pair,contrast,arm,target,answered,correct,wrong,confused_as_other'];
 for(const p of r.pairs)for(const arm of TRI_ARMS)for(const t of p.arms[arm].targets)
  lines.push([p.pair,p.contrast,arm,t.word,1,t.correct,t.confusedAsOther,t.confusedAsOther].join(','));
 return '\ufeff'+lines.join('\r\n')+'\r\n';
}
