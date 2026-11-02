/** Read-only local code-font readiness check. Does not publish or copy host fonts. */
import {createTaggedPdfPilot,findHostPdfCodeFont} from '../server-foundation/tagged-pdf.mjs';
import {createDemo} from '../core.mjs';
try{
 const codeFontPath=findHostPdfCodeFont();
 if(!codeFontPath)throw Error('Kod fontu yok');
 const exam=createDemo();exam.adaptations.visualCues=false;
 exam.questions[0].prompt='Kod çıktısını açıklayınız:\n```python\nif 1 < 2:\n    print("Türkçe")\n```';
 const {pdf,report}=createTaggedPdfPilot(exam);
 if(!pdf.length||report.checks.some(x=>x.state==='missing'))throw Error('PDF denetimi başarısız');
 console.log('Kodlu PDF font denetimi: UYGUN (yerel eş aralıklı ve gömülebilir Unicode TTF).');
 console.log('Bu sonuç PDF/UA veya ekran okuyucu uygunluğu kanıtı değildir.');
}catch{
 console.error('Kodlu PDF font denetimi: UYGUN DEĞİL. BEP_PDF_CODE_FONT_PATH ile lisansı uygun eş aralıklı Unicode TTF belirtin.');
 process.exitCode=1;
}
