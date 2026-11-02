/**
 * BEP goal/question coverage for a teacher's live, anonymous exam draft.
 * Only structural matching is measured; percentages are NOT pedagogical validity scores.
 * This module never edits exam content or attests to learner-specific suitability.
 */
import {goalFingerprint} from './pedagogy-review.mjs';

const safeList=value=>Array.isArray(value)?value:[];
const clean=value=>String(value??'').trim();
const numericPoints=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;

export function buildGoalCoverage(exam){
 if(!exam||typeof exam!=='object'||Array.isArray(exam))throw new Error('Geçerli sınav taslağı gerekiyor.');
 const goals=safeList(exam.bepGoals),questions=safeList(exam.questions),attestations=safeList(exam.goalAttestations);
 const goalMap=new Map(goals.map(g=>[g.id,g]));
 const questionRows=questions.map((question,index)=>{
  const goalId=clean(question?.goalId),goal=goalMap.get(goalId);
  let status='unlinked';
  if(goalId&&!goal)status='unknown-goal';
  else if(goal&&clean(question?.objective)!==clean(goal.text))status='mismatched';
  else if(goal)status='linked';
  // An exact textual match is a possible navigation hint, never an automatic association.
  const suggestions=!goalId?goals.filter(g=>clean(g.text)&&clean(g.text)===clean(question?.objective)).map(g=>g.id):[];
  return {number:index+1,goalId,status,points:numericPoints(question?.points),suggestions};
 });
 const rows=goals.map(goal=>{
  const associated=questionRows.filter(q=>q.goalId===goal.id);
  const valid=associated.filter(q=>q.status==='linked');
  const verified=exam.reviewPolicy==='guided'&&attestations.some(a=>a?.id===goal.id&&a.fingerprint===goalFingerprint(goal));
  const status=!valid.length?(associated.length?'mismatched':'uncovered'):associated.length!==valid.length?'mismatched':verified?'covered':'review';
  return {id:goal.id,level:goal.level,verified,status,questionNumbers:associated.map(q=>q.number),validQuestionNumbers:valid.map(q=>q.number),questionCount:valid.length,points:valid.reduce((sum,q)=>sum+q.points,0)};
 });
 return {
  rows,questionRows,totalQuestions:questions.length,totalGoals:goals.length,
  linked:questionRows.filter(q=>q.status==='linked').length,
  orphaned:questionRows.filter(q=>q.status!=='linked').length,
  uncovered:rows.filter(g=>!g.questionCount).length,
  verified:rows.filter(g=>g.verified).length,
  notice:'Bu tablo yalnızca soru-hedef bağlantılarını ve öğretmen işaretlemelerini özetler; BEP kazanım yeterliliğini veya pedagojik uygunluğu ölçmez.'
 };
}

/** Privacy-preserving CSV; no goal text, question prompt, answer, title or personal data. */
export function goalCoverageCsv(report){
 if(!report||!Array.isArray(report.rows)||!Array.isArray(report.questionRows))throw new Error('Kapsam raporu bulunamadı.');
 const validCode=value=>/^H\d{2,3}$/.test(value)?value:'gecersiz-kod';
 const cell=value=>'"'+String(value??'').replaceAll('"','""').replace(/^[\s\uFEFF]*[=+@-]/u,"'$&")+'"';
 const lines=[['tur','kod','durum','gecerli_soru','bagli_soru','gecerli_puan'],
  ...report.rows.map(row=>['hedef',validCode(row.id),row.status,row.questionCount,row.questionNumbers.length,row.points]),
  ...report.questionRows.filter(q=>q.status!=='linked').map(q=>['soru',`S${q.number}`,q.status,0,q.goalId?1:0,0])];
 return '\ufeff'+lines.map(line=>line.map(cell).join(';')).join('\r\n')+'\r\n';
}
