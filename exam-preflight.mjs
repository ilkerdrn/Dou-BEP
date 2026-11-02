/** Local teacher workflow navigator. This report is procedural, not a BEP, WCAG or pedagogical certification. */
import {validateExam} from './core.mjs';
import {reviewExam} from './quality.mjs';
import {goalFingerprint,questionFingerprint,hasAlternative} from './pedagogy-review.mjs';
import {auditAudioAccess} from './accessible-player.mjs';

const STAGES=Object.freeze([
 {id:'identity',title:'Sınav bilgileri',target:'exam-main-fields'},
 {id:'goals',title:'BEP kazanımları',target:'exam-goal-section'},
 {id:'questions',title:'Sorular ve yanıtlar',target:'exam-question-section'},
 {id:'access',title:'Öğretmen ve erişim kontrolü',target:'exam-quality'},
 {id:'delivery',title:'Kaydetme ve onay',target:'exam-output-section'}
]);
export function getExamPreflight(exam,{saved=false,dirty=true,approved=false}={}){
 if(!exam||typeof exam!=='object')throw new Error('Sınav ön kontrolü için geçerli taslak gerekir.');
 const questions=Array.isArray(exam.questions)?exam.questions:[];
 const goals=Array.isArray(exam.bepGoals)?exam.bepGoals:[];
 const guided=exam.reviewPolicy==='guided';
 const baseErrors=validateExam(exam).filter(i=>i.level==='error');
 const quality=reviewExam(exam);
 const verifiedGoals=guided?goals.filter(g=>(exam.goalAttestations||[]).some(a=>a.id===g.id&&a.fingerprint===goalFingerprint(g))).length:0;
 const linked=questions.filter(q=>goals.some(g=>g.id===q.goalId&&String(q.objective||'').trim()===g.text)).length;
 const alternatives=questions.filter(q=>hasAlternative(q,exam));
 const reviewedAlternatives=alternatives.filter(q=>{
  const r=q.equivalenceReview||{};
  return ['objective','answer','demand','access'].every(k=>r.checks?.[k]===true)&&r.fingerprint===questionFingerprint(q,exam);
 }).length;
 const general=Boolean(String(exam.title||'').trim()&&String(exam.subject||'').trim()&&String(exam.grade||'').trim()&&Number.isFinite(Number(exam.duration))&&Number(exam.duration)>0);
 const goalDone=goals.length>0&&questions.length>0&&linked===questions.length&&(!guided||verifiedGoals===goals.length);
 const questionsDone=questions.length>0&&baseErrors.length===0&&questions.every(q=>String(q.objective||'').trim());
 const accessDone=quality.errorCount===0&&auditAudioAccess(exam).length===0&&(!guided||reviewedAlternatives===alternatives.length);
 // An existing server approval is not itself proof that the *whole* teacher workflow
 // is complete. Do not rewrite/revoke the approval here: only gate the local
 // readiness indicator and its anonymous CSV.
 const precedingDone=general&&goalDone&&questionsDone&&accessDone;
 const approvalConflict=Boolean(saved&&!dirty&&approved&&!precedingDone);
 const deliveryDone=Boolean(saved&&!dirty&&approved&&precedingDone);
 const stages=STAGES.map(stage=>{
  switch(stage.id){
   case 'identity':return {...stage,done:general,detail:general?'Temel alanlar dolu.':'Başlık, ders, kademe ve süreyi kontrol edin.'};
   case 'goals':return {...stage,done:goalDone,detail:goals.length?`${verifiedGoals}/${goals.length} doğrulanmış BEP hedefi · ${linked}/${questions.length} bağlı soru`:'BEP hedefi henüz eklenmedi.'};
   case 'questions':return {...stage,done:questionsDone,detail:`${questions.length} soru · ${baseErrors.length} temel alan hatası`};
   case 'access':return {...stage,done:accessDone,detail:`${quality.errorCount} engelleyici kontrol · ${quality.warningCount} uyarı · ${reviewedAlternatives}/${alternatives.length} alternatif metin denetimi`};
   default:return {...stage,done:deliveryDone,detail:deliveryDone?'Kaydedilen bu sürüm onaylı ve hazırlık adımları tamam.':dirty?'Kaydedilmemiş değişiklikler var.':approvalConflict?'Sunucu onayı mevcut; önceki hazırlık adımları eksik. Yetkiliyle yeniden inceleyin.':saved?'Bu sürüm için onay gerekli.':'Önce sınav taslağını kaydedin.'};
  }
 });
 return {
  stages,complete:stages.filter(s=>s.done).length,total:stages.length,
  errors:quality.errorCount,warnings:quality.warningCount,
  workflowReady:deliveryDone,approvalConflict,
  firstPending:stages.find(s=>!s.done)?.id||null,
  notice:'İş akışı durum özeti; ölçme eşdeğerliğini, WCAG uygunluğunu veya kurum onayını tek başına kanıtlamaz.'
 };
}
/** Fixed-label status export; contains no question texts, answers, names, IDs or observations. */
export function preflightCsv(report){
 if(!report?.stages||!Array.isArray(report.stages))throw new Error('Hazırlık raporu bulunamadı.');
 const cell=v=>'"'+String(v).replaceAll('"','""')+'"';
 return '\ufeff'+[['asama','durum'],...report.stages.map(s=>[s.title,s.done?'tamamlandi':'inceleme-gerekli'])].map(row=>row.map(cell).join(';')).join('\r\n')+'\r\n';
}
