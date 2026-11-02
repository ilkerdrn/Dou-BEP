/** v2.79 research-facing descriptive gate; NEVER a listener identity check,
 * psychometric validation, clinical finding, or NVDA/production approval.
 * Pure in-memory analysis of strict anonymous balanced48 reports.
 */
import {QUAD_ARMS} from './dou-speech-quad-protocol.mjs';
import {WORD_PAIRS} from './dou-speech-intelligibility.mjs';
import {validateQuadAuditReport,MAX_AUDIT_REPORTS} from './dou-speech-report-audit.mjs';
export const EXPLORATORY_REPORT_TARGET=12;
const CONTRASTS=Object.freeze(['s/ş','c/ç','b/d','k/g','t/s','t/b']);
const median=numbers=>{const a=[...numbers].sort((x,y)=>x-y),i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2;};
function conditionOf(r){return `${r.schedule??'unreported'}|${r.rehearsalAudio?.version??'unreported'}`;}
function summarizeGroup(group){
 const rows=QUAD_ARMS.filter(arm=>arm!=='legacy').map(arm=>{
  const differences=group.reports.map(r=>r.totals[arm].correct-r.totals.legacy.correct);
  return {arm,reportCount:differences.length,
   improved:differences.filter(v=>v>0).length,tied:differences.filter(v=>v===0).length,
   worse:differences.filter(v=>v<0).length,medianDifferenceCorrect:median(differences),
   rangeDifferenceCorrect:[Math.min(...differences),Math.max(...differences)],
   meanDifferenceCorrect:differences.reduce((a,b)=>a+b,0)/differences.length,
   unit:'correct-of-12',statisticalSignificance:null};
 });
 // Matched-target evidence: each word is scored once by each arm in the same
 // exported rehearsal. This is a *descriptive* within-report switch count,
 // never proof of independent listeners, human intelligibility or significance.
 const targetTransitions=QUAD_ARMS.filter(arm=>arm!=='legacy').map(arm=>{
  const byContrast=WORD_PAIRS.map((words,pairIndex)=>{
   const result={pair:words.join('/'),contrast:CONTRASTS[pairIndex],bothCorrect:0,
    legacyOnly:0,candidateOnly:0,bothWrong:0};
   for(const r of group.reports){
    const reference=r.pairs[pairIndex].arms.legacy.targets;
    const candidate=r.pairs[pairIndex].arms[arm].targets;
    for(let j=0;j<2;j++){
     const ref=reference[j].correct,other=candidate[j].correct;
     if(ref&&other)result.bothCorrect++;
     else if(ref)result.legacyOnly++;
     else if(other)result.candidateOnly++;
     else result.bothWrong++;
    }
   }
   return result;
  });
  const totals={bothCorrect:0,legacyOnly:0,candidateOnly:0,bothWrong:0};
  for(const contrast of byContrast)for(const field of Object.keys(totals))totals[field]+=contrast[field];
  return {arm,targetsPerArm:group.reports.length*12,totals,byContrast,
   provenHumanIntelligibility:false,significance:null};
 });
 const priorities=WORD_PAIRS.map((words,index)=>{
  const byArm=Object.fromEntries(QUAD_ARMS.map(arm=>{
   const wrong=group.reports.reduce((sum,r)=>sum+r.pairs[index].arms[arm].wrong,0);
   return [arm,{wrong,attempts:group.reports.length*2}];
  }));
  const totalWrong=Object.values(byArm).reduce((n,v)=>n+v.wrong,0);
  return {pair:words.join('/'),contrast:CONTRASTS[index],totalWrong,totalAttempts:group.reports.length*8,
   byArm,acousticCauseProven:false};
 }).sort((a,b)=>b.totalWrong-a.totalWrong||CONTRASTS.indexOf(a.contrast)-CONTRASTS.indexOf(b.contrast));
 const allLegacyPerfect=group.reports.every(r=>r.totals.legacy.correct===12);
 const allPerfect=group.reports.every(r=>QUAD_ARMS.every(a=>r.totals[a].correct===12));
 return {key:group.key,schedule:group.reports[0].schedule??'unreported',
  audioVersion:group.reports[0].rehearsalAudio?.version??'unreported',
  reportCount:group.reports.length,pairedRows:rows,targetTransitions,pairPriorities:priorities,
  ceiling:{allLegacyPerfect,allMotorsPerfect:allPerfect},
  pilotComparisonEligible:false,reason:'Bağımsız insan dinleyiciler, gerçek dinleme ve Windows/NVDA kabulü doğrulanmadı.'};
}
/** Returns an evidence inventory, NOT an authorization or readiness certificate. */
export function examineQuadResearchEvidence(reports){
 if(!Array.isArray(reports)||reports.length<1||reports.length>MAX_AUDIT_REPORTS)
  throw new TypeError('1–16 anonim rapor gerekli.');
 const valid=reports.map(validateQuadAuditReport);
 const groups=new Map();
 for(const report of valid){const key=conditionOf(report);if(!groups.has(key))groups.set(key,{key,reports:[]});groups.get(key).reports.push(report);}
 const summaries=[...groups.values()].map(summarizeGroup).sort((a,b)=>a.key.localeCompare(b.key));
 const allConditionsDocumented=summaries.every(g=>g.schedule!=='unreported'&&g.audioVersion!=='unreported');
 const noConditionMixing=summaries.length===1&&allConditionsDocumented;
 const patternStrings=valid.map(r=>r.pairs.flatMap(p=>QUAD_ARMS.flatMap(a=>p.arms[a].targets.map(t=>t.correct))).join(''));
 const patternSet=new Set(patternStrings);
 const warnings=[];
 if(valid.length<EXPLORATORY_REPORT_TARGET)warnings.push(`Ön keşif için önerilen ${EXPLORATORY_REPORT_TARGET} rapor hedefinin altında. Bu hedef istatistiksel güç hesabı değildir.`);
 if(!noConditionMixing)warnings.push('Birden fazla veya eksik bildirilmiş deney koşulu var; motor farklarını birleşik bir sonuç olarak yorumlamayın.');
 if(patternSet.size<patternStrings.length)warnings.push('Aynı yanıt deseni en az iki raporda var. Aynı kişinin katıldığını göstermez.');
 if(summaries.some(g=>g.ceiling.allMotorsPerfect))warnings.push('En az bir koşulda bütün yanıtlar doğru; tavana yığılma gerçek motor farklarını gizleyebilir.');
 if(summaries.some(g=>g.ceiling.allLegacyPerfect))warnings.push('Önceki ses motoru bazı koşullarda bütün yanıtları doğru almış; daha iyi olma payı sınırlıdır.');
 warnings.push('Dinleyici bağımsızlığı, test ortamı, gerçek dinleme ve raporun kaynağı bu JSON ile kanıtlanamaz.');
 return {schema:'dou-bep-descriptive-evidence-gate-v1',reportCount:valid.length,
  exploratoryCollectionTarget:EXPLORATORY_REPORT_TARGET,remainingReportsToTarget:Math.max(0,EXPLORATORY_REPORT_TARGET-valid.length),
  conditionsDocumented:allConditionsDocumented,conditionCount:summaries.length,
  comparableAsOneCondition:noConditionMixing,uniqueResponsePatterns:patternSet.size,
  groups:summaries,warnings,
  permission:{canAuthorizeHumanIntelligibility:false,canAuthorizeAccessibleExam:false,canAuthorizeNVDA:false,
   independentlyVerifiedListeners:false,establishedStatisticalSignificance:false},
  localOnly:true,storesNoRawReports:true};
}
