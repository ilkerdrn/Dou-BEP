/** Presentation-only formatting for anonymous local rehearsal audit reports.
 * It never calculates entitlements, exam deadlines or student identifiers.
 */
export const REHEARSAL_EVENT_LABELS=Object.freeze({
 started:'Simülasyon başlatıldı',paused:'Mola başlatıldı',resumed:'Mola bitirildi',
 'closed:limit_review':'Mola sınırı incelemesiyle kapatıldı',
 'closed:plan_invalid':'Geçersiz plan nedeniyle kapatıldı',
 'closed:elapsed':'Süre dolunca kapatıldı',
 'closed:operator_stopped':'Yetkili tarafından kapatıldı'
});
export const REHEARSAL_REASON_LABELS=Object.freeze({
 limit_review:'Mola sınırı incelemesi',plan_invalid:'Plan geçerliliği kaybı',
 elapsed:'Sürenin dolması',operator_stopped:'Yetkili kararı'
});
export function rehearsalDate(value){
 return Number.isSafeInteger(value)&&value>=0
  ?new Date(value).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})
  :'Belirtilmedi';
}
export function rehearsalMinutes(ms){
 if(!Number.isSafeInteger(ms)||ms<0)return 'Doğrulanamadı';
 return (ms/60000).toLocaleString('tr-TR',{maximumFractionDigits:2})+' dakika';
}
export function summarizeRehearsal(report){
 if(!report||report.mode!=='simulation_only'||report.studentEntitlement!==false||
    !report.item||!Array.isArray(report.events))throw Error('Geçersiz yerel simülasyon raporu.');
 const item=report.item,summary=item.summary;
 const events=report.events.map(event=>({
  label:REHEARSAL_EVENT_LABELS[event.event]||'Bilinmeyen işlem',
  at:rehearsalDate(event.createdAt),
  actor:typeof event.actorId==='string'?event.actorId:'Bilinmiyor'
 }));
 const closure=item.closure;
 let status='not_closed',metrics=null,warning=null;
 if(item.status==='closed'){
  if(!summary){status='legacy_summary_missing';warning='Eski kapanış kaydında sabit özet bulunmuyor.';}
  else if(summary.integrity!=='verified'||summary.mode!=='simulation_only'||summary.studentEntitlement!==false){
   status='integrity_failed';warning='Kapanış özetinin bütünlüğü doğrulanamadı; süre değerleri gösterilmiyor.';
  }else{
   status=summary.reviewRequired?'review_required':'verified';
   metrics={
    startedAt:rehearsalDate(summary.startedAt),closedAt:rehearsalDate(summary.closedAt),
    totalDuration:Number.isInteger(summary.totalDurationMinutes)?summary.totalDurationMinutes+' dakika':'Doğrulanamadı',
    pauseCount:Number.isInteger(summary.pauseCount)?summary.pauseCount:'Doğrulanamadı',
    pausedTime:rehearsalMinutes(summary.completedPauseMs),
    openPause:summary.openPauseAtClosure===true?'Evet':'Hayır',
    remaining:summary.remainingMs===null?'Hesaplanamadı':rehearsalMinutes(summary.remainingMs),
    reason:REHEARSAL_REASON_LABELS[summary.reason]||'Bilinmeyen neden'
   };
  }
 }
 return {status,metrics,warning,closedBy:closure?.closedBy??null,
  closedAt:closure?rehearsalDate(closure.closedAt):null,events};
}
