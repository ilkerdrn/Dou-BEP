/**
 * Compares two already-sanitized exam revisions at the time of update.
 * The output intentionally contains only fixed field labels and question numbers:
 * never question text, responses, student details or secret hashes.
 * Indices are positional, so reordering can appear as multiple changes.
 */
const groups=Object.freeze({
 'Sınav bilgileri':['title','subject','grade','duration','instruction'],
 'BEP hedefleri':['objective','bepGoals','goalAttestations','supportPlan'],
 'Erişilebilirlik':['adaptations','reviewPolicy']
});
const questionGroups=Object.freeze({
 'Soru türü':['type'],
 'Soru metni':['prompt','simplifiedPrompt'],
 'Kazanım':['objective','goalId','bepGoalIds'],
 'Puan':['points'],
 'Seçenekler':['options','pairs'],
 'Yanıt anahtarı':['answer'],
 'Görsel ve erişim':['visualAltText','visualNote','visualDots','access','presentationMode'],
 'Kaynak ve inceleme':['provenance','equivalenceReview']
});
const compare=(a,b)=>JSON.stringify(a??null)!==JSON.stringify(b??null);
export function examRevisionDelta(oldExam,newExam,fromRevision){
 if(!oldExam||!newExam||!Array.isArray(oldExam.questions)||!Array.isArray(newExam.questions)||
    !Number.isSafeInteger(fromRevision)||fromRevision<1)throw Error('Sınav sürüm karşılaştırması geçersiz.');
 const changedSections=[];
 for(const [label,fields] of Object.entries(groups)){
  if(fields.some(key=>compare(oldExam[key],newExam[key])))changedSections.push(label);
 }
 const older=oldExam.questions,newer=newExam.questions,changedQuestions=[];
 const common=Math.min(older.length,newer.length);
 for(let index=0;index<common;index++){
  const before=older[index],after=newer[index],fields=[];
  for(const [label,keys] of Object.entries(questionGroups)){
   if(keys.some(key=>compare(before?.[key],after?.[key])))fields.push(label);
  }
  // Unknown schema fields still count as a change without exposing their values.
  if(compare(before,after)&&!fields.length)fields.push('Diğer soru alanları');
  if(fields.length)changedQuestions.push({number:index+1,kind:'changed',fields});
 }
 for(let index=common;index<newer.length;index++)
  changedQuestions.push({number:index+1,kind:'added',fields:[]});
 for(let index=common;index<older.length;index++)
  changedQuestions.push({number:index+1,kind:'removed',fields:[]});
 if(!changedSections.length&&!changedQuestions.length&&compare(oldExam,newExam))
  changedSections.push('Diğer sınav alanları');
 return {fromRevision,toRevision:fromRevision+1,changedSections,changedQuestions,
  previousQuestionCount:older.length,currentQuestionCount:newer.length,
  notice:'Alan bazlı teknik fark özetidir. Soru sıralaması değiştiğinde birden çok soru değişmiş görünebilir. Düzeltme, pedagojik eşdeğerlik veya erişilebilirlik onayı anlamına gelmez.'};
}
