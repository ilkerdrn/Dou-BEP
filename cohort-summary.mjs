/** Aggregate teacher-entered scores from anonymous *independent* attempts of one exam revision.
 * These data do NOT track a learner over time and cannot infer an IEP progress trajectory.
 * Suppress small groups at both report and objective levels to limit singling out.
 */
export const MIN_ANONYMOUS_REVIEWS=3;
export function summarizeAnonymousCohort(reviews,{minimum=MIN_ANONYMOUS_REVIEWS}={}){
 if(!Array.isArray(reviews)||!Number.isSafeInteger(minimum)||minimum<3)throw Error('Geçersiz anonim grup sınırı.');
 const sessions=reviews.filter(r=>Array.isArray(r?.questions)&&r.questions.some(q=>q.score!==null&&q.score!==undefined&&q.score!==''));
 if(sessions.length<minimum)return {available:false,minimum,reviewedSessions:null,objectives:[],message:`En az ${minimum} ayrı anonim değerlendirme gereklidir. Küçük grupların puanları yayımlanmaz.`};
 const grouped=new Map();
 for(const r of sessions){
  const sessionObjectives=new Set();
  for(const q of r.questions){
   const objective=String(q.objective||'').trim()||'Hedef belirtilmemiş';
   if(!grouped.has(objective))grouped.set(objective,{objective,reviewedQuestions:0,unreviewedQuestions:0,earned:0,possible:0,noteCount:0,reviewedSessions:0});
   const entry=grouped.get(objective);
   if(q.score===null||q.score===undefined||q.score===''){entry.unreviewedQuestions++;continue;}
   const score=Number(q.score),max=Number(q.maxPoints);
   if(typeof q.score!=='number'||!Number.isFinite(score)||!Number.isFinite(max)||max<=0||score<0||score>max)throw Error('Geçersiz değerlendirme puanı.');
   entry.reviewedQuestions++;entry.earned+=score;entry.possible+=max;
   if(String(q.note||'').trim())entry.noteCount++;
   sessionObjectives.add(objective);
  }
  for(const objective of sessionObjectives)grouped.get(objective).reviewedSessions++;
 }
 return {available:true,minimum,reviewedSessions:sessions.length,objectives:[...grouped.values()].sort((a,b)=>a.objective.localeCompare(b.objective,'tr')).map(g=>g.reviewedSessions<minimum?
  {objective:g.objective,available:false,message:`Bu kazanım için en az ${minimum} farklı anonim oturum gerekir.`}:
  {objective:g.objective,available:true,reviewedSessions:g.reviewedSessions,reviewedQuestions:g.reviewedQuestions,unreviewedQuestions:g.unreviewedQuestions,earned:Number(g.earned.toFixed(2)),possible:Number(g.possible.toFixed(2)),rate:g.possible?Math.round(g.earned/g.possible*10000)/100:null,noteCount:g.noteCount})};
}
export function anonymousCohortCsv(summary){
 if(!summary?.available)throw Error('Küçük gruplar dışa aktarılamaz.');
 const clean=value=>{let s=String(value??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const headers=['BEP kazanımı','Anonim oturum','Değerlendirilen soru','Puanlanmayan soru','Girilen puan','Değerlendirilen azami puan','Puan oranı (%)','Gözlem notu adedi'];
 const rows=summary.objectives.filter(g=>g.available).map(g=>[g.objective,g.reviewedSessions,g.reviewedQuestions,g.unreviewedQuestions,g.earned,g.possible,g.rate??'',g.noteCount]);
 return '\ufeff'+[headers,...rows].map(r=>r.map(clean).join(';')).join('\r\n')+'\r\n';
}
