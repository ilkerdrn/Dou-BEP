/** Read-only local font suitability indicator. Never uploads or publishes font data. */
import {findHostPdfFont,createTaggedPdfPilot} from '../server-foundation/tagged-pdf.mjs';
import {createDemo} from '../core.mjs';
try{
 const path=findHostPdfFont();
 if(!path)throw Error('Gömülebilir Unicode TrueType font bulunamadı.');
 const exam=createDemo();exam.adaptations.visualCues=false;
 const {pdf,report}=createTaggedPdfPilot(exam,{fontPath:path});
 if(!pdf.length||report.checks.some(x=>x.state==='missing'))throw Error('Font/PDF doğrulanamadı.');
 console.log('PDF pilot font denetimi: UYGUN (yerel, gömülebilir Unicode TTF).');
 console.log('Bu sonuç PDF/UA veya erişilebilirlik uygunluğu değildir.');
}catch{
 console.error('PDF pilot font denetimi: UYGUN DEĞİL. BEP_PDF_FONT_PATH ile lisansı izin veren bir Unicode TTF belirtin.');
 process.exitCode=1;
}
