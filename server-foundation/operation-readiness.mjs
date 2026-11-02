/** v2.21 Operations Center: tenant-scoped, aggregated readiness; never returns candidate identifiers. */
const safeCount=(v)=>Number.isInteger(v)&&v>=0?v:0;
const sameExam=(decision,session)=>decision.term===session.term&&decision.courseCode===session.courseCode&&decision.examLabel===session.examLabel;
export function buildOperationsReadiness({exams=[],sessions=[],decisions=[]}={}){
 if(!Array.isArray(exams)||!Array.isArray(sessions)||!Array.isArray(decisions))throw Error('Geçersiz operasyon girdisi.');
 const examCounts={total:exams.length,approved:exams.filter(e=>e.status==='approved').length,
  draft:exams.filter(e=>e.status!=='approved').length};
 const entries=sessions.map(session=>{
  const relevant=decisions.filter(d=>sameExam(d,session));
  const approved=relevant.filter(d=>d.status==='approved'&&d.contentSha256&&d.approvedSha256===d.contentSha256);
  const notApproved=relevant.length-approved.length;
  const reasons=[];
  if(session.readiness==='unmapped')reasons.push('SOURCE_UNMAPPED');
  else if(session.readiness!=='ready')reasons.push('SOURCE_STALE');
  if(relevant.length===0)reasons.push('NO_DECISIONS');
  else if(approved.length===0)reasons.push('NO_APPROVED_DECISIONS');
  if(notApproved>0)reasons.push('PENDING_DECISIONS');
  return {
   id:session.id,term:session.term,department:session.department,program:session.program,
   courseCode:session.courseCode,courseName:session.courseName,examLabel:session.examLabel,
   startsAt:session.startsAt,roomCode:session.roomCode,examRevision:session.examRevision,
   examReadiness:session.readiness,
   decisions:{total:relevant.length,approved:approved.length,requiresReview:notApproved},
   status:reasons.length?'blocked':'ready',reasons
  };
 });
 const decisionCounts={total:decisions.length,approved:decisions.filter(d=>d.status==='approved'&&d.approvedSha256===d.contentSha256&&d.contentSha256).length};
 decisionCounts.requiresReview=decisionCounts.total-decisionCounts.approved;
 const ready=entries.filter(x=>x.status==='ready').length;
 return {scope:'anonymous-local-pilot',examCounts,decisionCounts,sessions:{total:safeCount(entries.length),ready,blocked:entries.length-ready},entries};
}

export function institutionalOperationsReadiness(store,actor){
 if(!actor||!['admin','coordinator'].includes(actor.role)){
  const e=new Error('Operasyon paneli yalnızca kurum yöneticisi ve koordinatöre açıktır.');e.code='forbidden';e.status=403;throw e;
 }
 return buildOperationsReadiness({exams:store.listExams(actor),sessions:store.coordinationList(actor),decisions:store.accommodationList(actor)});
}
