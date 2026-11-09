/** Deterministic, synthetic-only schedule calculation. Not a student entitlement.
 * All times are UTC milliseconds. Server decides real session deadlines.
 * A pause must be explicitly authorized before it can affect any future live session.
 */
export const MINUTE_MS=60_000;
export const MAX_BREAK_MS=30*MINUTE_MS;
export const MAX_TOTAL_BREAK_MS=60*MINUTE_MS;
export function calculateExamWindow({startedAt,totalMinutes,pauses=[],now=Date.now(),breaksAllowed=false}){
 if(!Number.isSafeInteger(startedAt)||startedAt<0||!Number.isSafeInteger(now)||now<startedAt)
  throw Error('Geçerli sunucu başlangıç zamanı ve kontrol zamanı gerekli.');
 if(!Number.isInteger(totalMinutes)||totalMinutes<15||totalMinutes>480)
  throw Error('Toplam sınav süresi 15–480 dakika olmalıdır.');
 if(!Array.isArray(pauses)||pauses.length>10)
  throw Error('En fazla 10 mola kaydı desteklenir.');
 if(pauses.length&&!breaksAllowed)throw Error('Mola yetkisi bulunmayan planda süre durdurulamaz.');
 let lastEnd=startedAt,pausedMs=0,active=false;
 for(let i=0;i<pauses.length;i++){
  const p=pauses[i];
  if(!p||!Number.isSafeInteger(p.startedAt)||p.startedAt<lastEnd||
     p.startedAt<startedAt||p.startedAt>now)throw Error('Geçersiz veya çakışan mola.');
  const open=p.endedAt===null;
  if(open&&i!==pauses.length-1)throw Error('Yalnızca son mola açık olabilir.');
  const end=open?now:p.endedAt;
  if(!Number.isSafeInteger(end)||end<p.startedAt||end>now||end-p.startedAt>MAX_BREAK_MS)
   throw Error('Mola süresi geçersiz veya 30 dakika sınırını aşıyor.');
  pausedMs+=end-p.startedAt;
  if(pausedMs>MAX_TOTAL_BREAK_MS)throw Error('Toplam mola 60 dakika sınırını aşıyor.');
  lastEnd=end;active=open;
 }
 const plannedEnd=startedAt+totalMinutes*MINUTE_MS+pausedMs;
 // For active pauses, remaining working time stays fixed; no student autosubmit.
 const remainingMs=Math.max(0,plannedEnd-now);
 const elapsedWorkingMs=now-startedAt-pausedMs;
 // Historical pause cannot start after the working-time budget is consumed.
 for(let i=0,prior=0;i<pauses.length;i++){
  const p=pauses[i];
  if(p.startedAt-startedAt-prior>=totalMinutes*MINUTE_MS)
   throw Error('Sınav süresi dolduktan sonra mola başlatılamaz.');
  prior+=(p.endedAt??now)-p.startedAt;
 }
 return {phase:elapsedWorkingMs>=totalMinutes*MINUTE_MS?'expired':active?'paused':'running',
  startedAt,plannedEnd,remainingMs,pausedMs,elapsedWorkingMs,
  totalMinutes,breaksAllowed,activePause:active};
}
/** Read-only limit assessment, including an overdue open pause.
 * Does not clamp, close or extend an active break. Intervention is required.
 */
export function inspectExamBreakLimits({startedAt,pauses=[],now=Date.now(),breaksAllowed=false}){
 if(!breaksAllowed||!Number.isSafeInteger(startedAt)||!Number.isSafeInteger(now)||
    now<startedAt||!Array.isArray(pauses)||pauses.length>10)
  return {reviewRequired:true,reason:'invalid_break_policy'};
 let prior=0,lastEnd=startedAt,openCount=0;
 for(let i=0;i<pauses.length;i++){
  const p=pauses[i];
  if(!p||!Number.isSafeInteger(p.startedAt)||p.startedAt<lastEnd||p.startedAt>now)
   return {reviewRequired:true,reason:'invalid_break_history'};
  const open=p.endedAt===null;
  if(open){openCount++;if(i!==pauses.length-1)return {reviewRequired:true,reason:'invalid_break_history'};}
  const end=open?now:p.endedAt;
  if(!Number.isSafeInteger(end)||end<p.startedAt||end>now)
   return {reviewRequired:true,reason:'invalid_break_history'};
  const used=end-p.startedAt;
  // The first reached threshold is the relevant one, never silently extend.
  if(used>MAX_BREAK_MS)return {reviewRequired:true,reason:'single_break_over_limit'};
  prior+=used;
  if(prior>MAX_TOTAL_BREAK_MS)return {reviewRequired:true,reason:'total_break_over_limit'};
  lastEnd=end;
 }
 return {reviewRequired:false,reason:null,usedBreakMs:prior,activePause:openCount===1,
  remainingBreakMs:Math.max(0,MAX_TOTAL_BREAK_MS-prior)};
}
export function beginExamBreak(input,at){
 if(!Array.isArray(input.pauses)||input.pauses.length>=10)
  throw Error('10 mola kaydı sınırına ulaşıldı; yeni mola başlatılamaz.');

 const result=calculateExamWindow({...input,now:at});
 if(result.pausedMs>=MAX_TOTAL_BREAK_MS)throw Error('Toplam mola süresi sınırına ulaşıldı; yeni mola başlatılamaz.');
 if(!input.breaksAllowed||result.phase!=='running')throw Error('Bu oturumda mola başlatılamaz.');
 return [...input.pauses,{startedAt:at,endedAt:null}];
}
export function endExamBreak(input,at){
 const result=calculateExamWindow({...input,now:at});
 if(result.phase!=='paused')throw Error('Açık mola bulunmuyor.');
 const pauses=input.pauses.map(p=>({...p}));
 pauses[pauses.length-1].endedAt=at;
 calculateExamWindow({...input,pauses,now:at});
 return pauses;
}
