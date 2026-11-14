/**
 * Teacher-only, read-only navigation for the actual student question preview.
 * Keep all correct answers and teacher notes out of labels and actions.
 * The canonical validation/preview reports remain authoritative; this is NOT
 * pedagogical certification, accessible-content approval or a save operation.
 */
import {questionDraftGuidance} from './question-draft-guidance.mjs';

const LABELS=Object.freeze({
 prompt:'Soru metnini tamamla',
 objective:'Kazanım ilişkisini kontrol et',
 points:'Soru puanını kontrol et',
 options:'Seçenekleri ve tekrarları kontrol et',
 pairs:'Eşleştirme çiftlerini kontrol et',
 answer:'Yanıt anahtarını kontrol et',
 source:'Kaynak belge karşılaştırmasını tamamla',
 simplifiedPrompt:'Sadeleştirilmiş metni kontrol et',
 visualAltText:'Görsel betimlemesini kontrol et',
 visualCues:'Sınavın görsel gösterim ayarını kontrol et',
 numberLineEnd:'Sayı doğrusu aralığını kontrol et'
});
const FIELD_KEYS=new Set(Object.keys(LABELS));
function mappedPreviewField(message){
 const text=String(message||'').toLocaleLowerCase('tr');
 if(/sayı doğrusu.*(aralık|değer)/u.test(text))return 'numberLineEnd';
 if(/görsel materyal.*kapalı/u.test(text))return 'visualCues';
 if(/metin alternatifi|alternatif açıklama|görsel için/u.test(text))return 'visualAltText';
 if(/sade metin|alternatif metin yeni bir işlem/u.test(text))return 'simplifiedPrompt';
 if(/seçenek/u.test(text))return 'options';
 if(/eşleştirme/u.test(text))return 'pairs';
 if(/soru metni/u.test(text))return 'prompt';
 return 'prompt';
}
export function previewReviewActions(exam,index,preview){
 const questions=Array.isArray(exam?.questions)?exam.questions:[];
 if(!Number.isSafeInteger(index)||index<0||index>=questions.length)
  throw Error('Önizleme kontrolü için geçerli soru gerekli.');
 if(!preview||!Array.isArray(preview.problems))
  throw Error('Güncel öğrenci önizlemesi gerekli.');
 const draft=questionDraftGuidance(exam).items[index];
 const actions=new Map();
 const add=(field,level)=>{
  const key=FIELD_KEYS.has(field)?field:'prompt';
  const severity=level==='error'?'error':'warning';
  const previous=actions.get(key);
  if(previous&&!(previous.level==='warning'&&severity==='error'))return;
  const kind=questions[index]?.type;
  const label=key==='answer'&&kind==='truefalse'?'Doğru/Yanlış cevap anahtarını seç':
   key==='answer'&&kind==='choice'?'Doğru yanıtın seçeneklerle eşleşmesini kontrol et':
   key==='answer'&&kind==='short'?'Örnek yanıtı kontrol et':LABELS[key];
  actions.set(key,{field:key,level:severity,label});
 };
 for(const item of draft.issues)add(item.field,item.level);
 for(const item of preview.problems)add(mappedPreviewField(item.text),item.level);
 const items=[...actions.values()].sort((a,b)=>(a.level==='error'?0:1)-(b.level==='error'?0:1));
 return {
  questionNumber:index+1,type:questions[index].type,
  items,blocking:items.filter(x=>x.level==='error').length,
  warnings:items.filter(x=>x.level==='warning').length,
  notice:'Bu liste yalnızca öğretmen düzenleme rehberidir; gerçek sınav önizlemesi ve kurum onayı ayrı denetlenir.'
 };
}
