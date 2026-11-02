/** DOU BEP v2.78 — offline-only, descriptive audit of independently saved v2.76+ balanced48 reports.
 * Does not identify or deduplicate listeners. NEVER a human intelligibility or accessibility approval.
 */
import {WORD_PAIRS} from './dou-speech-intelligibility.mjs';
import {QUAD_ARMS} from './dou-speech-quad-protocol.mjs';
const CONTRASTS=Object.freeze(['s/ş','c/ç','b/d','k/g','t/s','t/b']);
export const MAX_AUDIT_REPORTS=16;
export const MAX_AUDIT_BYTES=32768;
const ROOT_KEYS=['schema','protocol','purpose','validatedHumanIntelligibility','scientificSignificance',
 'participantCount','totalTrials','totals','pairs','rehearsalAudio','schedule'];
const REHEARSAL_KEYS=['version','leveling','targetRms','peakLimit','notLufs','notValidatedIntelligibility'];
const keysAre=(value,allowed,required=allowed)=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value)&&
 Object.keys(value).every(k=>allowed.includes(k))&&required.every(k=>Object.hasOwn(value,k));
function fail(message){throw new TypeError(`Rapor reddedildi: ${message}`);}
function validCount(n,max){return Number.isInteger(n)&&n>=0&&n<=max;}
export function validateQuadAuditReport(report){
 if(!keysAre(report,ROOT_KEYS,ROOT_KEYS.filter(k=>!['rehearsalAudio','schedule'].includes(k))))fail('Bilinmeyen alan veya eksik üst bilgi.');
 if(report.schema!=='dou-bep-balanced48-report-v1'||report.protocol!=='balanced48'||
  report.purpose!=='anonymous-engineering-rehearsal'||report.validatedHumanIntelligibility!==false||
  report.scientificSignificance!==null||report.participantCount!==null||report.totalTrials!==48)
  fail('Protokol veya araştırma sınırı uyuşmuyor.');
 if(report.schedule!==undefined&&(!['pair-interleaved8-v1','legacy-mixed48'].includes(report.schedule)))fail('Bilinmeyen sıra yöntemi.');
 if(report.rehearsalAudio!==undefined){
  const a=report.rehearsalAudio;
  if(!keysAre(a,REHEARSAL_KEYS)||!['v2.76','v2.77','v2.78','v2.79','v2.80'].includes(a.version)||a.leveling!=='whole-clip-RMS'||
   a.targetRms!==0.115||a.peakLimit!==0.9||a.notLufs!==true||a.notValidatedIntelligibility!==true)
   fail('Laboratuvar ses koşulu uyuşmuyor.');
 }
 if(!keysAre(report.totals,QUAD_ARMS)||!Array.isArray(report.pairs)||report.pairs.length!==WORD_PAIRS.length)
  fail('Motor veya sözcük çiftleri eksik.');
 const counts=Object.fromEntries(QUAD_ARMS.map(arm=>[arm,0]));
 for(let i=0;i<WORD_PAIRS.length;i++){
  const p=report.pairs[i],words=WORD_PAIRS[i];
  if(!keysAre(p,['pair','contrast','arms'])||p.pair!==words.join('/')||p.contrast!==CONTRASTS[i]||!keysAre(p.arms,QUAD_ARMS))
   fail('Sözcük çifti uyuşmuyor.');
  for(const arm of QUAD_ARMS){
   const a=p.arms[arm];
   if(!keysAre(a,['answered','correct','wrong','targets'])||a.answered!==2||
    !validCount(a.correct,2)||!validCount(a.wrong,2)||a.correct+a.wrong!==2||
    !Array.isArray(a.targets)||a.targets.length!==2)fail('Sözcük bazlı skor geçersiz.');
   let localCorrect=0;
   for(let j=0;j<2;j++){
    const t=a.targets[j];
    if(!keysAre(t,['word','correct','confusedAsOther'])||t.word!==words[j]||
     !validCount(t.correct,1)||t.confusedAsOther!==1-t.correct)fail('Karıştırma alanı geçersiz.');
    localCorrect+=t.correct;
   }
   if(localCorrect!==a.correct)fail('Alt toplam uyuşmuyor.');
   counts[arm]+=localCorrect;
  }
 }
 for(const arm of QUAD_ARMS){
  const t=report.totals[arm];
  if(!keysAre(t,['correct','answered'])||t.answered!==12||t.correct!==counts[arm])
   fail('Motor toplamı uyuşmuyor.');
 }
 return report;
}
export function parseQuadAuditJson(source){
 if(typeof source!=='string'||new TextEncoder().encode(source).length>MAX_AUDIT_BYTES)fail('32 KB sınırı veya biçim geçersiz.');
 let obj;try{obj=JSON.parse(source);}catch{fail('JSON okunamadı.');}
 return validateQuadAuditReport(obj);
}
// Metadata only: no identity, timestamps, raw audio, file name or participant count.
// Identical response patterns can occur naturally, especially at ceiling accuracy.
function reportCondition(r){
 const schedule=r.schedule??'unreported';
 const audio=r.rehearsalAudio?.version??'unreported';
 return {schedule,audioVersion:audio,key:`${schedule}|${audio}`};
}
function responsePattern(r){
 return r.pairs.flatMap(p=>QUAD_ARMS.flatMap(arm=>p.arms[arm].targets.map(t=>t.correct))).join('');
}
function reportStats(reports){
 const sortedByArm=Object.fromEntries(QUAD_ARMS.map(arm=>[arm,reports.map(r=>r.totals[arm].correct).sort((a,b)=>a-b)]));
 return Object.fromEntries(QUAD_ARMS.map(arm=>{
  const values=sortedByArm[arm],middle=Math.floor(values.length/2);
  return [arm,{minimumCorrect:values[0],medianCorrect:values.length%2?values[middle]:(values[middle-1]+values[middle])/2,
   maximumCorrect:values[values.length-1],
   aboveLegacy:reports.filter(r=>r.totals[arm].correct>r.totals.legacy.correct).length,
   equalLegacy:reports.filter(r=>r.totals[arm].correct===r.totals.legacy.correct).length,
   belowLegacy:reports.filter(r=>r.totals[arm].correct<r.totals.legacy.correct).length}];
 }));
}
function conditionSummary(reports){
 const groups=new Map();
 for(const r of reports){
  const c=reportCondition(r);
  if(!groups.has(c.key))groups.set(c.key,{schedule:c.schedule,audioVersion:c.audioVersion,reportCount:0,armCounts:Object.fromEntries(QUAD_ARMS.map(a=>[a,{correct:0,trials:0}]))});
  const group=groups.get(c.key);group.reportCount++;
  for(const arm of QUAD_ARMS){group.armCounts[arm].correct+=r.totals[arm].correct;group.armCounts[arm].trials+=12;}
 }
 const summaries=Array.from(groups.values()).sort((a,b)=>a.schedule.localeCompare(b.schedule)||a.audioVersion.localeCompare(b.audioVersion));
 const complete=summaries.length===1&&summaries[0].schedule!=='unreported'&&summaries[0].audioVersion!=='unreported';
 return {comparable:complete,homogeneous:summaries.length===1,conditionsReported:summaries.every(g=>g.schedule!=='unreported'&&g.audioVersion!=='unreported'),
  groupCount:summaries.length,groups:summaries,reason:complete?
   'Ses ve sıra koşulu aynı bildirilmiş; bağımsız dinleyici ve akustik eşdeğerlik doğrulanmadı.':
   'Eksik ya da farklı deney koşulları: birleşik motor farkları karşılaştırma kanıtı değildir.'};
}
function patternCollisions(reports){
 const patterns=new Map();
 for(const r of reports){const signature=responsePattern(r);patterns.set(signature,(patterns.get(signature)??0)+1);}
 const groups=Array.from(patterns.values()).filter(n=>n>1);
 return {matchingPatternGroups:groups.length,reportsInMatchingGroups:groups.reduce((n,v)=>n+v,0),
  uniqueResponsePatterns:patterns.size,provesDuplicateListener:false};
}
export function aggregateQuadAuditReports(reports){
 if(!Array.isArray(reports)||reports.length===0||reports.length>MAX_AUDIT_REPORTS)
  fail('1–16 anonim rapor seçilmeli.');
 const validated=reports.map(validateQuadAuditReport);
 const comparability=conditionSummary(validated);
 const responsePatterns=patternCollisions(validated);
 const reportDistributions=reportStats(validated);
 const armCounts=Object.fromEntries(QUAD_ARMS.map(arm=>[arm,{correct:0,trials:0,accuracy:null,deltaFromLegacy:null}]));
 const pairCounts=WORD_PAIRS.map((words,i)=>({pair:words.join('/'),contrast:CONTRASTS[i],
  arms:Object.fromEntries(QUAD_ARMS.map(arm=>[arm,{correct:0,trials:0,wrong:0,firstAsSecond:0,secondAsFirst:0}]))}));
 for(const r of validated){
  for(const arm of QUAD_ARMS){armCounts[arm].correct+=r.totals[arm].correct;armCounts[arm].trials+=12;}
  for(let i=0;i<r.pairs.length;i++)for(const arm of QUAD_ARMS){
   const src=r.pairs[i].arms[arm],dst=pairCounts[i].arms[arm];
   dst.correct+=src.correct;dst.trials+=2;dst.wrong+=src.wrong;
   dst.firstAsSecond+=src.targets[0].confusedAsOther;
   dst.secondAsFirst+=src.targets[1].confusedAsOther;
  }
 }
 for(const arm of QUAD_ARMS){
  const a=armCounts[arm];a.accuracy=a.correct/a.trials;
  a.deltaFromLegacy=(a.correct-armCounts.legacy.correct)/a.trials;
 }
 return {
  schema:'dou-bep-local-aggregate-audit-v1',reportCount:validated.length,
  presumedIndependentParticipants:false,canDeduplicateParticipants:false,
  trialCount:validated.length*48,armCounts,pairCounts,comparability,responsePatterns,reportDistributions,
  readiness:{approved:false,reason:'İnsan anlaşılabilirliği, bağımsız katılımcı ve Windows/NVDA kabulü doğrulanmadı.'},
  warnings:[
   'Raporlar kimliksizdir: aynı dinleyicinin tekrarlı raporları ayırt edilemez.',
   'Başarı oranları yalnız betimsel provadır; istatistiksel anlamlılık veya erişilebilirlik onayı değildir.',
   'Dışa aktarılan dosyaların kaynak bütünlüğü kriptografik olarak kanıtlanmaz.',
   '48 hedef sonucu doğrulanır; denemelerin gerçekten dinlendiği veya kaynağının doğru olduğu ispatlanamaz.',
   ...(comparability.comparable?[]:['Koşullar farklı/eksik: birleşik motor farkları karşılaştırma amacıyla kullanılmamalıdır.']),
   ...(responsePatterns.matchingPatternGroups?['En az iki raporda birebir aynı yanıt deseni var; bu aynı dinleyici olduğuna kanıt değildir.']:[])
  ],
  localOnly:true,noPersistence:true
 };
}
