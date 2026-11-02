/** Manual anonymous draft export/import. No localStorage, IndexedDB or automatic plaintext backups. */
import {normalizeExam} from './core.mjs';
const FORMAT='bep-anonymous-draft-v1';
const FORBIDDEN=['student','studentName','learner','needArea','diagnosis','disability','medical','health'];
export function makeRecoveryDocument(exam){
 const data=normalizeExam(exam);
 if(String(data.profile||'').trim())throw Error('Öğrenci profili içeren taslak indirilemez.');
 if(data.questions.some(q=>q.teacherNote?.trim()))throw Error('Serbest öğretmen notu içeren taslak indirilemez.');
 return {format:FORMAT,note:'Yalnızca anonim yerel öğretmen taslağıdır. Dosyayı güvenli saklayın.',exam:data};
}
export function parseRecoveryDocument(raw){
 if(typeof raw!=='string'||raw.length>300000)throw Error('JSON dosyası çok büyük veya okunamıyor.');
 let doc;try{doc=JSON.parse(raw);}catch{throw Error('Geçerli JSON dosyası değil.');}
 if(!doc||Array.isArray(doc)||doc.format!==FORMAT||!doc.exam||Array.isArray(doc.exam)||typeof doc.exam!=='object')throw Error('Bu dosya geçerli bir BEP taslak kurtarma dosyası değil.');
 if(FORBIDDEN.some(k=>Object.hasOwn(doc.exam,k))||String(doc.exam.profile||'').trim())throw Error('Öğrenciye ait kişisel alanlar içeren dosya içe aktarılamaz.');
 const exam=normalizeExam(doc.exam);
 if(JSON.stringify(exam).length>260000||exam.questions.length>100)throw Error('Sınav boyutu/soru sınırı aşılıyor.');
 if(exam.questions.some(q=>q.teacherNote?.trim()))throw Error('Serbest öğretmen notu içeren dosya içe aktarılamaz.');
 // The server still re-validates sensitive strings, ownership, permissions and CSRF on persistence.
 return exam;
}
