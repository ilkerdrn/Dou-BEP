/**
 * Revision-bound read-only navigation for structured reviewer feedback.
 * Uses only authorized stage IDs and bounded question positions.
 * Never includes exam text, correct answers, personal data or reviewer identity.
 * Links are teacher/reviewer navigation only; they do not close corrections.
 */
const STAGES=Object.freeze({
 identity:{target:'exam-main-fields',label:'Sınav bilgilerini incele'},
 goals:{target:'exam-goal-section',label:'BEP kazanımlarını incele'},
 questions:{target:'exam-question-section',label:'Soruları ve yanıtları incele'},
 access:{target:'exam-quality',label:'Erişilebilirlik ve kaliteyi incele'},
 delivery:{target:'exam-output-section',label:'Kaydetme ve onayı incele'}
});

export function reviewFeedbackNavigation(record,{revision,questionCount}={}){
 if(!record||!Number.isSafeInteger(revision)||revision<1||
    record.revision!==revision||!Number.isSafeInteger(questionCount)||
    questionCount<0||questionCount>100)return {stages:[],questions:[],count:0};
 const stageIds=Array.isArray(record.stageIds)?record.stageIds:[];
 const numbers=Array.isArray(record.questionNumbers)?record.questionNumbers:[];
 const stages=[...new Set(stageIds.filter(id=>typeof id==='string'&&Object.hasOwn(STAGES,id)))]
  .slice(0,5).map(id=>({id,target:STAGES[id].target,label:STAGES[id].label}));
 const questions=[...new Set(numbers.filter(n=>Number.isSafeInteger(n)&&n>=1&&n<=questionCount))]
  .slice(0,20).map(number=>({number,index:number-1,label:'Soru '+number+' konumuna git'}));
 return {stages,questions,count:stages.length+questions.length};
}
