import {validateCustomRubric} from './template-library.mjs';
/**
 * Teacher-selected, descriptive scoring criteria. These are DEMONSTRATION
 * defaults, not validated psychological scales or official BEP rubrics.
 * Supports/assistive accommodations never reduce a score by themselves.
 */
const CRITERIA = Object.freeze({
 choice: [{id:'answer',label:'Yanıt doğruluğu',weight:100}],
 truefalse: [{id:'answer',label:'İşaretlenen yanıtın doğruluğu',weight:100}],
 matching: [{id:'matches',label:'Doğru eşleştirme oranı',weight:100}],
 short: [{id:'approach',label:'Çözüm yaklaşımının uygunluğu',weight:40},{id:'outcome',label:'Yanıtın doğruluğu',weight:60}]
});
export const RUBRIC_LEVELS = Object.freeze([
 {value:0,label:'0 · Kanıt gözlenmedi'},
 {value:1,label:'1 · Sınırlı kanıt'},
 {value:2,label:'2 · Kısmi kanıt'},
 {value:3,label:'3 · Büyük ölçüde gözlendi'},
 {value:4,label:'4 · Tam olarak gözlendi'}
]);
export function criteriaFor(type,customTemplate=null){
 if(customTemplate){const tpl=validateCustomRubric(customTemplate);if(tpl.questionType!==type)throw new Error('Rubrik şablonu soru türüyle uyuşmuyor.');return tpl.criteria;}
 if(!Object.hasOwn(CRITERIA,type))throw new Error('Desteklenmeyen soru türü.');
 return CRITERIA[type].map(c=>({...c}));
}
export function validateRubricRatings(type,ratings,customTemplate=null){
 const criteria=criteriaFor(type,customTemplate);
 if(!ratings||typeof ratings!=='object'||Array.isArray(ratings))throw new Error('Rubrik kayıt biçimi geçersiz.');
 if(Object.keys(ratings).some(k=>!criteria.some(c=>c.id===k)))throw new Error('Beklenmeyen rubrik ölçütü.');
 for(const c of criteria){const level=ratings[c.id];if(level!==undefined&&level!==null&&(!Number.isInteger(level)||level<0||level>4))throw new Error('Rubrik düzeyi 0–4 olmalıdır.');}
 return true;
}
export function rubricPoints(question,ratings,customTemplate=null){
 validateRubricRatings(question.type,ratings,customTemplate);
 const cs=criteriaFor(question.type,customTemplate);
 if(cs.some(c=>ratings[c.id]===undefined||ratings[c.id]===null))return null;
 const maximum=Number(question.points);
 if(!Number.isFinite(maximum)||maximum<=0)throw new Error('Soru azami puanı geçersiz.');
 const fraction=cs.reduce((sum,c)=>sum+(ratings[c.id]/4)*(c.weight/100),0);
 return Math.round((maximum*fraction+Number.EPSILON)*100)/100;
}
export function criterionDescription(question,ratings,customTemplate=null){
 validateRubricRatings(question.type,ratings,customTemplate);
 return criteriaFor(question.type,customTemplate).map(c=>`${c.label} (${c.weight}%): ${ratings[c.id]??'—'}/4`).join(' | ');
}
