/**
 * Read-only reviewer checklist for a previous structured correction request
 * and the exact next revision's sanitized technical delta.
 * Not an approval, grading, verification, or pedagogical equivalence engine.
 */
const STAGES=Object.freeze({
 identity:{title:'Sınav bilgileri',categories:['Sınav bilgileri']},
 goals:{title:'BEP kazanımları',categories:['BEP hedefleri','Kazanım']},
 questions:{title:'Sorular ve yanıtlar',categories:[]},
 access:{title:'Erişilebilirlik ve kalite',categories:['Erişilebilirlik','Görsel ve erişim']},
 delivery:{title:'Kaydetme ve onay',categories:[]}
});
const LIMIT=20;
export function reviewerRecheckHints(diff,feedback){
 const base={status:'unavailable',intro:'Bu sürüm için doğrudan önceki düzeltme isteğiyle güvenilir karşılaştırma yok.',
  stages:[],questions:[],notice:'Teknik fark bulunması, önceki eksikliğin giderildiğini veya sınavın onaylanabileceğini kanıtlamaz.'};
 if(!diff?.available||!diff.comparison||!feedback||diff.examId!==feedback.examId||
    diff.currentRevision!==feedback.currentRevision)return base;
 const comparison=diff.comparison,from=comparison.fromRevision,to=comparison.toRevision;
 if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||to!==from+1||to!==diff.currentRevision||
    !Array.isArray(comparison.changedSections)||!Array.isArray(comparison.changedQuestions))return base;
 const previous=(Array.isArray(feedback.items)?feedback.items:[]).filter(item=>
  item.revision===from&&Array.isArray(item.stageIds)&&Array.isArray(item.questionNumbers));
 if(!previous.length)return {...base,status:'no_direct_request',
  intro:'Son iki sürüm arasında kayıtlı bir önceki incelemeci düzeltme isteği yok. Teknik değişiklik özetini yine kontrol edin.'};
 const stageIds=[...new Set(previous.flatMap(item=>item.stageIds))].filter(id=>Object.hasOwn(STAGES,id));
 const questionNumbers=[...new Set(previous.flatMap(item=>item.questionNumbers))]
  .filter(n=>Number.isSafeInteger(n)&&n>0&&n<=100).sort((a,b)=>a-b).slice(0,LIMIT);
 const sections=new Set(comparison.changedSections);
 const questionChanges=new Map(comparison.changedQuestions.map(item=>[item.number,item]));
 const stages=stageIds.map(id=>{
  const item=STAGES[id];
  const differs=id==='questions'?comparison.changedQuestions.length>0:
   item.categories.some(category=>sections.has(category)||
    comparison.changedQuestions.some(q=>q.fields?.includes(category)));
  return {id,label:item.title,changed:differs,
   text:differs?'Bu aşamayla ilişkili teknik alan değişmiş; içeriği yeniden inceleyin.':
    'Bu aşamaya ait görünür teknik fark yok; eksikliğin giderildiğini varsaymayın.'};
 });
 const questions=questionNumbers.map(number=>{
  const entry=questionChanges.get(number);
  return {number,changed:Boolean(entry),
   label:entry?'Soru '+number+' · teknik fark var ('+
    (entry.kind==='removed'?'kaldırıldı':entry.kind==='added'?'eklendi':'alan değişikliği')+')':
    'Soru '+number+' · bu konumda teknik fark görülmedi',
   detail:entry?'Yeni sürümde içeriği, BEP bağlantısını ve erişilebilirliği tekrar değerlendirin.':
    'Önceki düzeltme isteğini kapatmak için bu soruyu yine inceleyin.'};
 });
 return {status:'recheck',intro:'Sürüm '+from+' için önceki düzeltme istekleri ile sürüm '+to+
  ' teknik farkları karşılaştırıldı. Soru konumları sıralama değişirse kayabilir.',
  stages,questions,notice:base.notice};
}
