/** v2.76 opt-in export; no user ID, audio recordings or automatic persistence. */
import {WORD_PAIRS} from './dou-speech-intelligibility.mjs';
import {QUAD_ARMS,QUAD_TRIALS,summarizeQuadRecognition} from './dou-speech-quad-protocol.mjs';
const LABELS=['s/ş','c/ç','b/d','k/g','t/s','t/b'];
export function createQuadRecognitionReport(session){
 const summary=summarizeQuadRecognition(session);
 if(!session.finished||session.position!==QUAD_TRIALS-1||summary.answered!==QUAD_TRIALS||
 QUAD_ARMS.some(arm=>summary.arms[arm].answered!==12))throw new RangeError('48 deneme tamamlanmadı.');
 const pairs=WORD_PAIRS.map((pair,pairIndex)=>({pair:pair.join('/'),contrast:LABELS[pairIndex],
  arms:Object.fromEntries(QUAD_ARMS.map(arm=>{
   const trials=session.trials.filter(t=>t.pairIndex===pairIndex&&t.arm===arm);
   if(trials.length!==2||trials.some(t=>!t.heard||!pair.includes(t.choice)))throw new RangeError('Eksik çift.');
   return [arm,{answered:2,correct:trials.filter(t=>t.choice===t.target).length,
    wrong:trials.filter(t=>t.choice!==t.target).length,
    targets:pair.map(word=>({word,correct:Number(trials.find(t=>t.target===word)?.choice===word),
     confusedAsOther:Number(trials.find(t=>t.target===word)?.choice!==word)}))}];
  }))}));
 return {schema:'dou-bep-balanced48-report-v1',protocol:'balanced48',purpose:'anonymous-engineering-rehearsal',
  validatedHumanIntelligibility:false,scientificSignificance:null,participantCount:null,
  totalTrials:QUAD_TRIALS,totals:summary.arms,pairs};
}
function validate(r){
 if(r?.schema!=='dou-bep-balanced48-report-v1'||r.protocol!=='balanced48'||r.totalTrials!==48||
  r.validatedHumanIntelligibility!==false||r.pairs?.length!==WORD_PAIRS.length||
  Object.keys(r.totals??{}).join(',')!==QUAD_ARMS.join(','))throw new TypeError('Geçersiz rapor.');
 for(let i=0;i<WORD_PAIRS.length;i++){
  const p=r.pairs[i];if(p.pair!==WORD_PAIRS[i].join('/')||p.contrast!==LABELS[i])throw new TypeError('Çift geçersiz.');
  for(const arm of QUAD_ARMS){const a=p.arms?.[arm];
   if(a?.answered!==2||!Number.isInteger(a.correct)||!Number.isInteger(a.wrong)||a.correct+a.wrong!==2||a.targets?.length!==2)
    throw new TypeError('Puan geçersiz.');
   for(let j=0;j<2;j++){
    const t=a.targets[j];if(t?.word!==WORD_PAIRS[i][j]||![0,1].includes(t.correct)||t.confusedAsOther!==1-t.correct)
     throw new TypeError('Hedef geçersiz.');
   }
  }
 }
 return r;
}
export function quadReportJson(report){return JSON.stringify(validate(report),null,2)+'\n';}
export function quadReportCsv(report){
 validate(report);
 const rows=['pair,contrast,arm,target,answered,correct,wrong,confused_as_other'];
 for(const p of report.pairs)for(const arm of QUAD_ARMS)for(const t of p.arms[arm].targets)
  rows.push([p.pair,p.contrast,arm,t.word,1,t.correct,t.confusedAsOther,t.confusedAsOther].join(','));
 return '\ufeff'+rows.join('\r\n')+'\r\n';
}
