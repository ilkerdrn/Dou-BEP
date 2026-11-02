/**
 * v2.10: Teacher-selected, incomplete question skeletons.
 * These patterns never generate a correct answer or claim alignment/equivalence.
 * The teacher must select a BEP objective and supply question content.
 */
import {createQuestionFrame} from './question-frames.mjs';

export const GUIDED_PATTERNS = Object.freeze([
 Object.freeze({id:'choice-3',type:'choice',label:'3 seçenekli çoktan seçmeli',category:'Seçim',hint:'Tek bir açık soru yazın; üç seçeneğin tamamını ve doğru yanıtı öğretmen belirlesin.',help:'Bir doğru yanıt ve öğrencinin erişebileceği çeldiricileri hazırlayın.'}),
 Object.freeze({id:'choice-2',type:'choice',label:'Büyük hedefli 2 seçenek',category:'Erişilebilir seçim',hint:'İki seçeneğin ölçme gücüne etkisini değerlendirin. Büyük dokunma/işaretleme hedefleri işaretlenir.',help:'İki seçenekle tahmin olasılığı artabilir; öğretmen denetimi gerekir.'}),
 Object.freeze({id:'short',type:'short',label:'Tek adımlı kısa yanıt',category:'Açık yanıt',hint:'Ölçülecek tek bir beceri için yalın soru ve cevap anahtarı yazın.',help:'Yanıt biçimini ve gerekirse ek cevap alanını öğretmen belirlesin.'}),
 Object.freeze({id:'truefalse',type:'truefalse',label:'Doğru / Yanlış değerlendirmesi',category:'Karar',hint:'Açık, tek yargılı bir ifade yazın. Doğru yanıtı öğretmen girsin.',help:'İfadeyi olumsuzluk ve belirsizlik açısından gözden geçirin.'}),
 Object.freeze({id:'matching',type:'matching',label:'İki satırlı eşleştirme',category:'Eşleştirme',hint:'Sol ve sağ kavramları ikişer satırda öğretmen doldursun; çiftler hazır değildir.',help:'Kavramların kazanıma uygunluğunu ve alternatif erişimi kontrol edin.'}),
 Object.freeze({id:'shapes',type:'choice',label:'Nesne grupları ile seçim',category:'Görsel destek',hint:'Nesne sayılarını 0–12 içinde ve metin alternatifini öğretmen girsin. Görseller sınav ayarlarından açılır.',help:'Görsel ipucunun ölçülen beceriyi değiştirmediğini denetleyin.'}),
 Object.freeze({id:'numberline',type:'short',label:'Sayı doğrusu ile kısa yanıt',category:'Görsel destek',hint:'0–30 aralığındaki sayı doğrusunu ve alternatif betimlemeyi öğretmen düzenlesin. Görseller ayrıca etkinleştirilir.',help:'Sayı doğrusu verilmesi kazanıma uygun mu kontrol edin.'})
]);

export function guidedPattern(id){
 return GUIDED_PATTERNS.find(pattern=>pattern.id===id)||null;
}

/** No diagnosis, student metadata, assumed answers, automatic BEP mapping, or approvals. */
export function createGuidedQuestion(id,{objective,goalId=''}={}){
 const pattern=guidedPattern(id);
 if(!pattern)throw Error('Bilinmeyen soru şablonu.');
 const question=createQuestionFrame(pattern.type,objective,goalId);
 if(id==='choice-2'){
  question.options=['',''];
  question.access={...question.access,largeTargets:true};
 }
 if(id==='shapes'){
  question.visualMode='shapes';
  question.visualDots={groupA:0,groupB:0};
  question.visualAltText='';
  question.options=['','',''];
 }
 if(id==='numberline'){
  question.visualMode='numberline';
  question.numberLineStart=0;
  question.numberLineEnd=10;
  question.visualAltText='';
 }
 return question;
}
