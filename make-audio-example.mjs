import {writeFileSync} from 'node:fs';
import {createDemo} from './core.mjs';
import {auditAudioAccess,generateAccessibleExamHtml} from './accessible-player.mjs';
const exam=createDemo();
exam.title='BEP Matematik · Sesli Sınav Örneği';
exam.adaptations.visualCues=true;
exam.adaptations.highContrast=false;
exam.adaptations.fontSize=22;
for(const q of exam.questions){
 if(q.visualMode==='numberline'){q.visualAltText='Sıfırdan ona kadar sayı doğrusu. İşaretlenmiş tek bir doğru yanıt bulunmuyor.';}
 else if((q.visualDots?.groupA||0)+(q.visualDots?.groupB||0)>0){q.visualAltText=`Birinci grupta ${q.visualDots.groupA||0} nokta, ikinci grupta ${q.visualDots.groupB||0} nokta bulunuyor.`;}
}
if(auditAudioAccess(exam).length)throw new Error('Görsel betimleme eksik.');
const html=generateAccessibleExamHtml(exam);
writeFileSync('DOU-v1.2-Sesli-Sinav-Ornegi.html',html);
console.log(`Çevrimdışı HTML: ${html.length} karakter`);
