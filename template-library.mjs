/**
 * Browser-only, anonymous draft template library. NOT a shared school database.
 * Templates are intentionally detached from assessment sessions and learner profiles.
 */
export const MAX_EXAM_TEMPLATES=16;
export const MAX_RUBRIC_TEMPLATES=24;
const allowedTypes=new Set(['choice','short','truefalse','matching']);
const plain=(v)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const text=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
const rawId=(v)=>typeof v==='string'&&/^[a-zA-Z0-9_-]{3,70}$/.test(v);
function copy(x){return JSON.parse(JSON.stringify(x));}
export function validateCustomRubric(input){
 if(!plain(input)||input.format!=='bep-rubric-template'||input.schemaVersion!==1||!rawId(input.id))throw new Error('Rubrik şablonu kimliği geçersiz.');
 if(typeof input.name!=='string'||input.name.trim().length<3||input.name.length>90)throw new Error('Rubrik adı 3–90 karakter olmalıdır.');
 if(!allowedTypes.has(input.questionType))throw new Error('Rubrik soru türü geçersiz.');
 if(!Array.isArray(input.criteria)||input.criteria.length<1||input.criteria.length>6)throw new Error('Rubrik 1–6 ölçüt içermelidir.');
 const seen=new Set();let total=0;
 for(const c of input.criteria){
  if(!plain(c)||typeof c.id!=='string'||!/^[a-z][a-z0-9_]{0,25}$/.test(c.id)||seen.has(c.id))throw new Error('Rubrik ölçüt kimlikleri benzersiz olmalıdır.');
  if(typeof c.label!=='string'||c.label.trim().length<3||c.label.length>95)throw new Error('Ölçüt açıklaması 3–95 karakter olmalıdır.');
  if(!Number.isInteger(c.weight)||c.weight<1||c.weight>100)throw new Error('Ölçüt ağırlıkları tam sayı ve 1–100 olmalıdır.');
  seen.add(c.id);total+=c.weight;
 }
 if(total!==100)throw new Error('Rubrik ölçüt ağırlıkları toplamı %100 olmalıdır.');
 if(Object.keys(input).some(k=>!['format','schemaVersion','id','name','questionType','criteria','createdAt'].includes(k)))throw new Error('Beklenmeyen rubrik alanı.');
 return {format:'bep-rubric-template',schemaVersion:1,id:input.id,name:input.name.trim(),questionType:input.questionType,
  criteria:input.criteria.map(c=>({id:c.id,label:c.label.trim(),weight:c.weight})),createdAt:text(input.createdAt,40)};
}
export function makeCustomRubric({name,questionType,criteria},id=`rubrik-${Date.now()}`){
 const values=(Array.isArray(criteria)?criteria:[]).map((c,i)=>({id:`olcut${i+1}`,label:String(c.label||''),weight:Number(c.weight)}));
 return validateCustomRubric({format:'bep-rubric-template',schemaVersion:1,id,name,questionType,criteria:values,createdAt:new Date().toISOString()});
}
export function sanitizeCustomRubrics(raw){
 if(!Array.isArray(raw))return [];
 const out=[];const ids=new Set();
 for(const value of raw.slice(0,MAX_RUBRIC_TEMPLATES)){
  try{const x=validateCustomRubric(value);if(!ids.has(x.id)){out.push(x);ids.add(x.id);}}catch{}
 }
 return out;
}
export function createExamTemplate(exam,name,normalizeExam,id=`exam-${Date.now()}`){
 if(!rawId(id)||typeof name!=='string'||name.trim().length<3||name.length>90)throw new Error('Şablon adı 3–90 karakter olmalıdır.');
 const clean=normalizeExam(exam);
 clean.profile='';
 clean.questions=clean.questions.map(q=>({...q,teacherNote:'',provenance:q.provenance?{...q.provenance,reviewed:false}:null}));
 const result={format:'bep-exam-template',schemaVersion:1,id,name:name.trim(),createdAt:new Date().toISOString(),exam:clean};
 if(JSON.stringify(result).length>250000)throw new Error('Şablon boyutu 250 KB sınırını aşıyor.');
 return result;
}
export function validateExamTemplate(raw,normalizeExam){
 if(!plain(raw)||raw.format!=='bep-exam-template'||raw.schemaVersion!==1||!rawId(raw.id)||typeof raw.name!=='string'||raw.name.trim().length<3||raw.name.length>90||JSON.stringify(raw).length>250000)throw new Error('Sınav şablonu geçersiz.');
 if(!plain(raw.exam)||raw.exam.profile)throw new Error('Şablonda kişisel profil alanı olmamalıdır.');
 const clean=createExamTemplate(raw.exam,raw.name,normalizeExam,raw.id);
 return {...clean,createdAt:text(raw.createdAt,40)};
}
export function sanitizeExamTemplates(raw,normalizeExam){
 if(!Array.isArray(raw))return [];
 const out=[];const ids=new Set();
 for(const entry of raw.slice(0,MAX_EXAM_TEMPLATES)){
  try{const t=validateExamTemplate(entry,normalizeExam);if(!ids.has(t.id)){out.push(t);ids.add(t.id);}}catch{}
 }
 return out;
}
export function openExamTemplate(template,normalizeExam){
 const checked=validateExamTemplate(template,normalizeExam);
 const exam=copy(checked.exam);
 exam.profile='';
 // Applying a template is a new exam draft: prior review approvals are invalidated.
 for(const q of exam.questions){if(q.provenance)q.provenance.reviewed=false;}
 return exam;
}
export function exportLibraryJson(examTemplates,rubricTemplates){
 return JSON.stringify({format:'bep-teacher-library',schemaVersion:1,notice:'Anonim yerel şablonlar; öğrenci kişisel verisi içermemelidir.',
  exams:examTemplates,rubrics:rubricTemplates},null,2);
}
export function importLibraryJson(payload,normalizeExam){
 if(!plain(payload)||payload.format!=='bep-teacher-library'||payload.schemaVersion!==1||!Array.isArray(payload.exams)||!Array.isArray(payload.rubrics)||payload.exams.length>MAX_EXAM_TEMPLATES||payload.rubrics.length>MAX_RUBRIC_TEMPLATES)throw new Error('Şablon kütüphanesi dosyası geçersiz.');
 const exams=payload.exams.map(x=>validateExamTemplate(x,normalizeExam)),rubrics=payload.rubrics.map(validateCustomRubric);
 if(new Set(exams.map(x=>x.id)).size!==exams.length||new Set(rubrics.map(x=>x.id)).size!==rubrics.length)throw new Error('Yinelenen şablon kimliği.');
 return {exams,rubrics};
}
