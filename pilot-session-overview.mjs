/** Pure, privacy-preserving anonymous pilot overview helpers.
 * No answer keys, learner responses, reviewer notes or scores are exposed.
 * These summaries never infer pass/fail or BEP progress.
 */
const FILTERS=new Set(['all','pending','unreviewed','partial','complete','closed']);
const SCORABLE_STATUS=new Set(['unreviewed','partial','complete']);

export function pilotReviewOverview(row){
 if(row?.status!=='submitted')
  return {reviewStatus:'not_submitted',reviewedQuestions:0,totalQuestions:0};
 if(row.examStatus!=='approved'||row.examRevision!==row.revision)
  return {reviewStatus:'unavailable',reviewedQuestions:0,totalQuestions:0};
 try{
  const questions=JSON.parse(row.examBody).questions;
  if(!Array.isArray(questions)||questions.length<1||questions.length>30)
   throw Error('Invalid exam question count');
  const entries=row.reviewEntries?JSON.parse(row.reviewEntries):{};
  if(!entries||typeof entries!=='object'||Array.isArray(entries))throw Error('Invalid review entries');
  let reviewed=0;
  for(const [i,q] of questions.entries()){
   const entry=entries['q'+(i+1)];
   if(!entry||typeof entry.score!=='number'||!Number.isFinite(entry.score))continue;
   const max=Number(q.points);
   if(Number.isFinite(max)&&max>0&&entry.score>=0&&entry.score<=max)reviewed++;
  }
  return {reviewStatus:reviewed===0?'unreviewed':reviewed===questions.length?'complete':'partial',
   reviewedQuestions:reviewed,totalQuestions:questions.length};
 }catch{
  return {reviewStatus:'unavailable',reviewedQuestions:0,totalQuestions:0};
 }
}
export function filterPilotOverview(items,filter='all'){
 const type=FILTERS.has(filter)?filter:'all';
 return (Array.isArray(items)?items:[]).filter(item=>{
  if(type==='all')return true;
  if(type==='pending')return item.status==='issued'||item.status==='started';
  if(type==='closed')return item.status==='expired'||item.status==='revoked';
  if(type==='unreviewed')return item.status==='submitted'&&(item.reviewStatus==='unreviewed'||item.reviewStatus==='unavailable');
  return item.status==='submitted'&&SCORABLE_STATUS.has(item.reviewStatus)&&item.reviewStatus===type;
 });
}
