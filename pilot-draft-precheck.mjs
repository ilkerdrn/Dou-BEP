/**
 * Read-only, local precheck for the ANONYMOUS pilot format.
 * This is NOT pilot eligibility; the server validates approved content,
 * quality, accessibility, permissions and integrity again before issuing.
 * Ordinary Word/PDF exam drafts may contain up to 100 questions or short answers.
 */
const ALLOWED=new Set(['choice','truefalse','matching']);
const TYPE_NAMES=Object.freeze({choice:'Çoktan seçmeli',truefalse:'Doğru / Yanlış',matching:'Eşleştirme',short:'Kısa yanıt'});
export function pilotDraftPrecheck(exam,{saved=false,dirty=true,approved=false,qualityErrors=0,accessibilityErrors=0}={}){
 const questions=Array.isArray(exam?.questions)?exam.questions:[];
 const total=questions.length;
 const unsupported=questions.flatMap((question,index)=>
  ALLOWED.has(question?.type)?[]:[{index,number:index+1,type:question?.type||'unknown'}]);
 const countOk=total>=1&&total<=30;
 const formatOk=countOk&&!unsupported.length;
 const qualityBlocked=Number.isSafeInteger(qualityErrors)&&qualityErrors>0;
 const accessibilityBlocked=Number.isSafeInteger(accessibilityErrors)&&accessibilityErrors>0;
 let state='format_ok',heading='',detail='',target='exam-output-section',questionIndex=null;
 if(!total){
  state='empty';heading='Pilot için soru ekleyin';
  detail='Anonim pilotta en az 1, en fazla 30 desteklenen soru gerekir.';
  target='exam-question-section';
 }else if(!countOk){
  state='too_many';heading='Pilot için soru sınırı aşıldı';
  detail='Bu taslak '+total+' soru içeriyor. Pilot en fazla 30 soru kabul eder. Word/PDF sınavının 100 soru sınırı değişmedi.';
  target='exam-question-section';
 }else if(unsupported.length){
  state='unsupported';heading='Pilotun desteklemediği soru türü var';
  detail=unsupported.length+' sorunun türü anonim pilot için uygun değil. Kısa yanıt Word/PDF taslaklarında kullanılabilir.';
  target='exam-question-section';
  questionIndex=unsupported[0].index;
 }else if(qualityBlocked||accessibilityBlocked){
  state='review';heading='Pilot biçimi uygun; kalite denetimi gerekli';
  detail=(qualityBlocked?qualityErrors+' kalite hatası. ':'')+
   (accessibilityBlocked?accessibilityErrors+' erişilebilirlik / betimleme bulgusu. ':'')+
   'Hataları giderip sunucu incelemesine devam edin.';
  target='exam-quality';
 }else{
  state='format_ok';
  heading='Pilot soru sayısı ve türleri uygun görünüyor';
  detail=(!saved||dirty)
   ?'Önce taslağı kaydedin. Onay ve sunucudaki pilot uygunluk denetimi ayrıca gereklidir.'
   :!approved
    ?'Bu sürüm henüz onaylı değil. Yetkili bağımsız incelemeci onayı ve sunucu pilot denetimi ayrıca gerekir.'
    :'Sürüm onaylı görünüyor. Pilot oturumu oluşturulmadan önce sunucu erişilebilirlik, bütünlük ve yetki kontrollerini tekrar yapar.';
 }
 const label=type=>Object.hasOwn(TYPE_NAMES,type)?TYPE_NAMES[type]:'Desteklenmeyen tür';
 const kindCounts=['choice','truefalse','matching','short'].map(type=>({
  type,label:label(type),count:questions.filter(q=>q?.type===type).length
 }));
 return {
  state,heading,detail,target,questionIndex,total,maxPilotQuestions:30,unsupportedCount:unsupported.length,
  firstUnsupported:unsupported.length?{number:unsupported[0].number,label:label(unsupported[0].type)}:null,
  counts:kindCounts,formatOk,
  notice:'Yalnızca taslak üzerinden yapılan soru sayısı ve türü ön kontrolüdür. Pilot uygunluğu veya kurumsal onay kararı değildir.'
 };
}
