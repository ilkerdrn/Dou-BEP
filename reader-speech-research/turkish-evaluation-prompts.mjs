/**
 * DOU Speech offline Turkish intelligibility evaluation prompts.
 * Invented generic examples only. No university exams, people, recordings,
 * credentials, user input, students or network. NOT a training corpus.
 * Reserved held-out set for future human transcription of model output.
 */
const ITEMS = [
 ['TR001','vowels','Arı ile iri aynı değildir.'],
 ['TR002','vowels','Üç küçük ördek gölde yüzüyor.'],
 ['TR003','vowels','Öğle ışığı odayı aydınlatıyor.'],
 ['TR004','vowels','Ilık su ile soğuk su farklıdır.'],
 ['TR005','consonants','Sarı şal sandalyede duruyor.'],
 ['TR006','consonants','Çiçekçi çarşıda çiçek seçti.'],
 ['TR007','consonants','Kedi kapının yanında bekledi.'],
 ['TR008','consonants','Bora bir bardak su aldı.'],
 ['TR009','morphology','Kitapları raflara yerleştirdiler.'],
 ['TR010','morphology','Çocuklarımız bahçede oynuyor.'],
 ['TR011','morphology','Evlerinden erken çıktılar.'],
 ['TR012','morphology','Kalemlerimizi masada bıraktık.'],
 ['TR013','numbers','Yedi kutunun içinde iki kalem var.'],
 ['TR014','numbers','Bugün on iki kişi yürüyüş yaptı.'],
 ['TR015','numbers','Üç ile beşin toplamı sekizdir.'],
 ['TR016','numbers','Saat dokuzu on beş geçiyor.'],
 ['TR017','navigation','Sonraki düğmeye geç.'],
 ['TR018','navigation','Başlıklar arasında ilerle.'],
 ['TR019','navigation','Okumayı durdur ve bekle.'],
 ['TR020','navigation','Seçenekleri sırayla dinle.'],
 ['TR021','prosody','Bugün hava çok güzel!'],
 ['TR022','prosody','Bu bir soru mu?'],
 ['TR023','prosody','Hayır, henüz bitmedi.'],
 ['TR024','prosody','Evet, şimdi başlayabiliriz.']
];
const HELD_OUT_IDS = new Set(['TR003','TR006','TR011','TR015','TR019','TR022']);
const VALIDATION_IDS = new Set(['TR002','TR008','TR012','TR016','TR020','TR024']);
const ALLOWED_CATEGORIES = new Set(['vowels','consonants','morphology','numbers','navigation','prosody']);

export const TURKISH_EVALUATION_PROMPTS = Object.freeze(ITEMS.map(([id,category,text])=>
 Object.freeze({id,category,text,
  split: HELD_OUT_IDS.has(id)?'held-out':VALIDATION_IDS.has(id)?'validation':'development',
  syntheticPrompt:true,recordingProvided:false})
));

export function auditTurkishEvaluationPrompts(prompts=TURKISH_EVALUATION_PROMPTS) {
 if(!Array.isArray(prompts)||prompts.length<12||prompts.length>1000){
  return {valid:false,reason:'invalid-count'};
 }
 const ids=new Set(),splits=new Set(),categories=new Map();
 for(const p of prompts){
  if(!p||typeof p!=='object'||typeof p.id!=='string'||!/^TR\d{3}$/.test(p.id)||
     ids.has(p.id)||!ALLOWED_CATEGORIES.has(p.category)||typeof p.text!=='string'||
     p.text.length<12||p.text.length>120||p.syntheticPrompt!==true||
     p.recordingProvided!==false||
     !['development','validation','held-out'].includes(p.split)||
     /[\r\n\x00-\x1f]/u.test(p.text)||
     /@|https?:|www\.|\b(?:password|parola|şifre|token|api.key)\b/iu.test(p.text)){
   return {valid:false,reason:'invalid-prompt'};
  }
  ids.add(p.id);splits.add(p.split);
  categories.set(p.category,(categories.get(p.category)||0)+1);
 }
 if(splits.size!==3||categories.size!==6||[...categories.values()].some(x=>x<2)){
  return {valid:false,reason:'insufficient-coverage'};
 }
 return {valid:true,count:prompts.length,
  splits:Object.fromEntries(['development','validation','held-out'].map(x=>[x,prompts.filter(p=>p.split===x).length])),
  categories:Object.fromEntries([...categories].sort())};
}
