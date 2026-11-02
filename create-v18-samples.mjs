/** Deterministic anonymous teaching examples. Never input real student information. */
import {writeFileSync} from 'node:fs';
import {createDemo,normalizeExam,generateDocx,printableHtml} from './core.mjs';
import {generateAccessibleExamHtml} from './accessible-player.mjs';
const exam=createDemo();
exam.title='DOU BEP · Örnek Erişilebilir Değerlendirme';exam.profile='';exam.adaptations={...exam.adaptations,fontSize:18,lineSpacing:1.45,institutionalHeader:true};
exam.questions=exam.questions.slice(0,3).map(q=>({...q,teacherNote:''}));
exam.questions[0].access={writtenCue:'Sayıları sırayla inceleyin. Sonucu işaretleyin.',largeTargets:true,audioAllowed:true};
exam.questions[1].access={writtenCue:'Önce işlemi düşünün. Sonra yanıtı seçin.',largeTargets:true,audioAllowed:false};
exam.questions[2].access={writtenCue:'Sonucunuzu yanıt alanına yazın.',largeTargets:false,audioAllowed:true};
const checked=normalizeExam(exam);
writeFileSync('DOU-v18-Ornek-Erisilebilir-Sinav.html',generateAccessibleExamHtml(checked));
writeFileSync('DOU-v18-Ornek-Kagida-Basili-Sinav.html',printableHtml(checked,false));
writeFileSync('DOU-v18-Ornek-Sinav.docx',Buffer.from(generateDocx(checked)));
console.log('3 anonim soru için HTML ve DOCX örnekleri üretildi.');
