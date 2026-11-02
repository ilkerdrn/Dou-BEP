import {validateExam,totalPoints} from './core.mjs';
import {reviewBepGoalLinks} from './bep-goals.mjs';
import {reviewGoalExam} from './pedagogy-review.mjs';
import {reviewSupportPlan} from './support-plan.mjs';
import {inspectExamVariants} from './presentation-variants.mjs';
import {accessibilityAudit} from './question-access.mjs';
/** Rule checks, not a clinical/educational suitability score. */
export function reviewExam(exam){
 const issues=[...validateExam(exam),...reviewSupportPlan(exam),...inspectExamVariants(exam),...accessibilityAudit(exam),...reviewBepGoalLinks(exam),...reviewGoalExam(exam)];
 const add=(level,text)=>issues.push({level,text});
 if(totalPoints(exam)!==100)add('warning',`Toplam puan ${totalPoints(exam)}; 100 puan zorunlu değil, kurum yönergesini kontrol edin.`);
 const coverage=new Map();
 for(const [i,q] of (exam.questions||[]).entries()){
  const key=String(q.objective||'').trim();if(key)coverage.set(key,(coverage.get(key)||0)+1);
  if(exam.adaptations?.visualCues){
   const dots=(q.visualDots?.groupA||0)+(q.visualDots?.groupB||0);
   if(q.visualMode==='numberline'){
    const start=Number(q.numberLineStart??0),end=Number(q.numberLineEnd??10);
    if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>30||end<=start||end-start>12)add('error',`${i+1}. soru: Sayı doğrusu 0–30 aralığında, en fazla 12 birim ve artan olmalı.`);
    if(!String(q.visualAltText||'').trim())add('warning',`${i+1}. soru: Sayı doğrusunun alternatif açıklaması yok.`);
   }else if(dots>0&&!String(q.visualAltText||'').trim())add('warning',`${i+1}. soru: Görselin alternatif açıklamasını yazmanız önerilir.`);
  }
  // Narrow arithmetic consistency check only: not a general correctness or pedagogical review.
  if(['choice','short'].includes(q.type)){
   const expression=String(q.prompt||'').trim().match(/^(\d{1,3})\s*([+＋−-])\s*(\d{1,3})\s*(?:işleminin|=|[?])/u);
   if(expression){
    const left=Number(expression[1]),right=Number(expression[3]);
    const expected=expression[2]==='+'||expression[2]==='＋'?left+right:left-right;
    if(String(q.answer||'').trim()!==String(expected))add('error',`${i+1}. soru: İşlem ${left} ${expression[2]} ${right} için cevap anahtarı (${q.answer||'boş'}) hesaplanan ${expected} sonucuyla uyuşmuyor.`);
   }
  }
  if(q.type==='choice' && q.options?.length===2)add('warning',`${i+1}. soru: İki seçenek kullanımı ölçülen beceriyi ve tahmin olasılığını etkileyebilir.`);
  if(q.provenance?.kind==='local-template' && q.provenance.reviewed)add('info',`${i+1}. soru: Yerel taslak öğretmen tarafından gözden geçirildi olarak işaretli.`);
 }
 if(exam.adaptations?.onePerPage && (exam.questions||[]).length>12)add('warning','Her sayfada bir soru seçimi uzun çıktı üretebilir.');
 return {issues,coverage:[...coverage].map(([objective,count])=>({objective,count})),errorCount:issues.filter(x=>x.level==='error').length,warningCount:issues.filter(x=>x.level==='warning').length};
}
export function projectBackup(exam,objectives){return {format:'bep-atolyesi-project',schemaVersion:1,exam,objectives,notice:'Anonim taslak. Gerçek öğrenci/sağlık bilgisi kullanmayın.'};}
export function inspectProject(raw,normalizeExam,sanitizeObjectives){
 if(raw?.format==='bep-atolyesi-project'){
  if(raw.schemaVersion!==1)throw new Error('Desteklenmeyen proje yedeği sürümü.');
  return {exam:normalizeExam(raw.exam),objectives:sanitizeObjectives(raw.objectives||[])};
 }
 return {exam:normalizeExam(raw),objectives:null};
}
