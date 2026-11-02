/** Exam delivery bundle. Source and approval are supplied only by the trusted repository.
 * These hashes prove file consistency, not educational equivalence or issuer authenticity.
 */
import {createHash, randomUUID} from 'node:crypto';
import {VERSION, generateDocx, printableHtml, zipStore} from '../core.mjs';
import {generateAccessibleExamHtml, auditAudioAccess} from '../accessible-player.mjs';
import {makeDeliveryVersion, DELIVERY_PROFILES} from '../presentation-profiles.mjs';
import {reviewExam} from '../quality.mjs';
import {auditDeliveryArtifacts} from './delivery-accessibility-audit.mjs';

const sha256=data=>createHash('sha256').update(data).digest('hex');
const MAX_ZIP_BYTES=12*1024*1024;
const canonicalQuestions=exam=>sha256(JSON.stringify({
 title:exam.title,subject:exam.subject,grade:exam.grade,duration:exam.duration,
 instruction:exam.instruction,objective:exam.objective,
 bepGoals:exam.bepGoals,questions:exam.questions
}));
function buildDocuments(exam,profile){
 const variant=makeDeliveryVersion(exam,profile);
 return {
  'SINAV.docx':generateDocx(variant,false),
  'SINAV-YAZDIR.html':printableHtml(variant,false),
  'SINAV-ERISILEBILIR.html':generateAccessibleExamHtml(variant)
 };
}
export function deliveryReadiness(exam,{approved,sourceSha256,approvalSha256,profile='standard'}={}){
 if(!exam||typeof exam!=='object'||Array.isArray(exam))throw Error('Sınav gerekli.');
 const problems=[];
 if(!Object.hasOwn(DELIVERY_PROFILES,profile))problems.push({code:'invalid_profile',message:'Bilinmeyen erişilebilir sunum profili.'});
 if(approved!==true)problems.push({code:'not_approved',message:'Bu sürüm kurumca onaylanmamış.'});
 if(!/^[a-f0-9]{64}$/.test(sourceSha256||'')||sourceSha256!==approvalSha256)problems.push({code:'approval_integrity',message:'Onaylı sürümün içerik özeti doğrulanamadı.'});
 const quality=reviewExam(exam);
 if(quality.errorCount)problems.push({code:'quality_errors',message:`${quality.errorCount} engelleyici sınav kontrolü bulunuyor.`});
 const audioFindings=auditAudioAccess(exam);
 if(audioFindings.length)problems.push({code:'audio_access',message:`${audioFindings.length} sesli sınav erişimi incelemesi gerekiyor.`});
 const contentSha256=canonicalQuestions(exam);
 if(Object.hasOwn(DELIVERY_PROFILES,profile)){
  const variant=makeDeliveryVersion(exam,profile);
  if(canonicalQuestions(variant)!==contentSha256)problems.push({code:'content_changed',message:'Sunum profili soru içeriğini değiştirdi.'});
 }
 let structuralAudit=null;
 if(problems.length===0){
  try{
   structuralAudit=auditDeliveryArtifacts(buildDocuments(exam,profile),{questionCount:exam.questions.length});
   if(structuralAudit.summary.failed)problems.push({code:'output_accessibility',message:`${structuralAudit.summary.failed} çıktı yapısı kontrolü başarısız. Teslim durduruldu.`});
  }catch{problems.push({code:'output_accessibility',message:'Çıktı yapısı doğrulanamadı. Teslim durduruldu.'});}
 }
 return {ready:problems.length===0,profile,version:VERSION,questionCount:exam.questions?.length||0,
  sourceSha256,contentSha256,qualityWarnings:quality.warningCount,structuralAudit,problems,
  notice:'Dosya ve sürüm bütünlüğü denetimidir; WCAG, görsel/baskı eşdeğerliği veya pedagojik uygunluk sertifikası değildir.'};
}
export function makeDeliveryPackage(exam,{id,revision,profile='standard',sourceSha256,approvalSha256,approved}={}){
 const readiness=deliveryReadiness(exam,{approved,sourceSha256,approvalSha256,profile});
 if(!readiness.ready){const error=new Error('Sınav teslimine engel bulunan kontrol var.');error.code='not_ready';error.problems=readiness.problems;throw error;}
 const files=buildDocuments(exam,profile);
 const audit=auditDeliveryArtifacts(files,{questionCount:readiness.questionCount});
 if(audit.summary.failed){const error=new Error('Erişilebilir çıktı denetimi başarısız.');error.code='not_ready';error.problems=[{code:'output_accessibility',message:error.message}];throw error;}
 files['ERISILEBILIRLIK-DENETIM.json']=JSON.stringify(audit,null,2)+'\n';
 const documentDigests=Object.entries(files).map(([name,contents])=>({name,bytes:Buffer.byteLength(contents),sha256:sha256(contents)}));
 const packageId=randomUUID();
 const manifest={format:'DOU-BEP-EXAM-DELIVERY-1',packageId,version:VERSION,createdAt:new Date().toISOString(),
  examId:id,revision,profile,sourceSha256,academicContentSha256:readiness.contentSha256,
  questionCount:readiness.questionCount,qualityWarnings:readiness.qualityWarnings,
  structuralAudit:{passed:audit.summary.passed,total:audit.summary.total,manualReviewRequired:true},
  files:documentDigests,notice:readiness.notice};
 const manifestJson=JSON.stringify(manifest,null,2)+'\n';
 const contents={'INTEGRITY-MANIFEST.json':manifestJson,'OKU-BENI.txt':
  'Bu paket sunucuda onaylı anonim sınav sürümünden üretilmiştir.\n'+
  'SHA-256 özetleri yalnız dosya bütünlüğünü karşılaştırmak içindir; dijital imza değildir.\n'+
  'Dosyalar cevap anahtarı veya öğrenci kişisel verisi içermez.\n'+
  'Erişilebilir HTML ses için sistem/tarayıcı seslerine bağlı olabilir.\n'+
  'ERISILEBILIRLIK-DENETIM.json yapısal kontrolleri ve tamamlanmamış insan incelemelerini listeler; sertifika değildir.\n'+
  'Gerçek sınavda basılı ve dijital çıktılar öğretmen/erişilebilirlik uzmanı tarafından incelenmelidir.\n',...files};
 const zip=zipStore(contents);
 if(zip.byteLength>MAX_ZIP_BYTES){const error=new Error('Teslim paketi 12 MB sınırını aşıyor.');error.code='too_large';throw error;}
 return {zip,sha256:sha256(zip),manifestSha256:sha256(manifestJson),packageId,manifest};
}
