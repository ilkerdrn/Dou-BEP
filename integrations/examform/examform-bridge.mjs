/** Read-only ExamForm OS v1.34 mapping preview. Never writes to BEP or grants approvals. */
const TYPES=Object.freeze({'Klasik':'short','Çoktan seçmeli':'choice','Doğru / Yanlış':'truefalse'});
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function str(v,key,max=2000){if(v===undefined||v===null)return '';if(typeof v!=='string'||v.length>max)throw new Error(key+': invalid text');return v;}
function obj(v,key){if(!v||typeof v!=='object'||Array.isArray(v))throw new Error(key+': expected object');return v;}
export function previewExamFormConversion(source){
 const raw=obj(source,'source'),info=obj(raw.info,'info');
 if(!Array.isArray(raw.questions)||raw.questions.length<1||raw.questions.length>120)throw new Error('Question count must be 1..120');
 const questions=raw.questions.map((value,i)=>{
  const q=obj(value,'question '+(i+1)),kind=own(q,'kind')?q.kind:'Klasik';
  if(!own(TYPES,kind))throw new Error('question '+(i+1)+': unsupported kind');
  const points=Number(q.points??0);
  if(typeof q.points==='boolean'||!Number.isFinite(points)||points<0||points>100)throw new Error('question '+(i+1)+': invalid points');
  const options=kind==='Çoktan seçmeli'?(q.options??[]):[];
  if(!Array.isArray(options)||options.length>5)throw new Error('question '+(i+1)+': invalid options');
  return {type:TYPES[kind],prompt:str(q.text,'text',10000),options:options.map((x,j)=>str(x,'option '+j,2000)),answer:str(q.answer,'answer'),points,objective:str(q.outcome,'outcome'),sourceKind:kind,importStatus:'requires_teacher_review'};
 });
 return {mode:'preview_only',sourceSystem:'ExamForm OS',sourceVersion:'1.34',status:'requires_manual_review_and_fresh_approval',
 title:str(info.exam,'exam',200)||'ExamForm transfer draft',subject:str(info.course,'course',200),
 courseCode:str(info.code,'code',80),semester:str(info.semester,'semester',50),academicYear:str(info.year,'year',50),questions,
 requiredReviews:['question text and answer','grading and learning outcomes','accommodation decisions','independent academic approval'],
 exclusions:['student identities','diagnoses','grades','credentials','approval history','audit logs']};
}