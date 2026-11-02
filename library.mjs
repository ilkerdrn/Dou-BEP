/**
 * Illustrative teacher-editable starter objectives and deterministic draft templates.
 * NOT an official MEB curriculum, BEP decision system, or AI model.
 */
export const STARTER_OBJECTIVES = Object.freeze([
 {id:'MATH-2-A01',subject:'Matematik',grade:'2. Sınıf',domain:'Sayılar ve işlemler',title:'20 içinde toplama',description:'20 içinde iki doğal sayının toplamını bulma.',source:'Örnek amaç — resmî MEB kazanım kodu değil'},
 {id:'MATH-2-A02',subject:'Matematik',grade:'2. Sınıf',domain:'Sayılar ve işlemler',title:'20 içinde çıkarma',description:'20 içinde iki doğal sayının farkını bulma.',source:'Örnek amaç — resmî MEB kazanım kodu değil'},
 {id:'MATH-1-A01',subject:'Matematik',grade:'1. Sınıf',domain:'Sayılar ve işlemler',title:'10 içinde toplama',description:'10 içinde toplama işlemi yapma.',source:'Örnek amaç — resmî MEB kazanım kodu değil'},
 {id:'MATH-3-A01',subject:'Matematik',grade:'3. Sınıf',domain:'Sayılar ve işlemler',title:'100 içinde toplama',description:'100 içinde iki doğal sayının toplamını bulma.',source:'Örnek amaç — resmî MEB kazanım kodu değil'},
 {id:'TURK-2-O01',subject:'Türkçe',grade:'2. Sınıf',domain:'Okuduğunu anlama',title:'Metinden bilgi bulma',description:'Kısa bir metinden açıkça verilen bilgiyi belirleme.',source:'Örnek amaç — resmî MEB kazanım kodu değil'},
 {id:'TURK-1-S01',subject:'Türkçe',grade:'1. Sınıf',domain:'Sözcük bilgisi',title:'Karşıt anlamı fark etme',description:'Günlük yaşamdan basit sözcüklerin karşıt anlamlarını ayırt etme.',source:'Örnek amaç — resmî MEB kazanım kodu değil'},
 {id:'HAYAT-2-G01',subject:'Hayat Bilgisi',grade:'2. Sınıf',domain:'Günlük yaşam',title:'Güvenli davranış',description:'Günlük yaşamda uygun bir güvenli davranış örneğini seçme.',source:'Örnek amaç — resmî MEB kazanım kodu değil'}
]);
export function findObjectives({subject='',grade='',term=''}={},catalog=STARTER_OBJECTIVES){
 const t=String(term).toLocaleLowerCase('tr-TR').trim();
 return catalog.filter(o=>(!subject||o.subject===subject)&&(!grade||o.grade===grade)&&(!t||`${o.id} ${o.title} ${o.description} ${o.domain}`.toLocaleLowerCase('tr-TR').includes(t)));
}
export function objectiveById(id,catalog=STARTER_OBJECTIVES){return catalog.find(o=>o.id===id)||null;}

/** Return a fully stated draft, never silently inject into an exam. */
export function makeProposal(objectiveId,variant=0){
 const o=objectiveById(objectiveId);
 if(!o)throw new Error('Örnek kazanım bulunamadı.');
 const k=Math.max(0,Math.min(5,Math.floor(Number(variant)||0)));
 let prompt='',options=[],answer='',simplifiedPrompt='',visualDots={groupA:0,groupB:0},visualNote='',type='choice',pairs=[];
 if(o.id.startsWith('MATH')){
  const bound=o.id==='MATH-1-A01'?10:o.id==='MATH-3-A01'?100:20;
  let first=[3,5,4,6,2,7][k],second=[2,3,4,2,5,1][k];
  if(bound===100){first+=21;second+=12;}
  if(o.id==='MATH-2-A02'){
    const larger=first+second;prompt=`${larger} − ${second} işleminin sonucu kaçtır?`;simplifiedPrompt=`${larger} − ${second} = ?`;answer=String(first);
    options=[String(first-1),String(first),String(first+1)];
  }else{
    prompt=`${first} + ${second} işleminin sonucu kaçtır?`;simplifiedPrompt=`${first} + ${second} = ?`;answer=String(first+second);
    options=[String(first+second-1),String(first+second),String(first+second+1)];
  }
  if(bound!==100){visualDots={groupA:first,groupB:second};visualNote='Gruplar somut nesnelerle gösterilebilir; işlemin anlamına uygunluğunu öğretmen kontrol eder.';}
 }else if(o.id==='TURK-2-O01'){
  const samples=[
    {text:'Ece sabah okula yürüyerek gitti. Okula nasıl gitti?',simple:'Ece okula nasıl gitti?',options:['Yürüyerek','Bisikletle','Otobüsle'],answer:'Yürüyerek'},
    {text:'Ali kırmızı çantasını masaya koydu. Çanta ne renktir?',simple:'Ali’nin çantası ne renk?',options:['Mavi','Kırmızı','Yeşil'],answer:'Kırmızı'},
    {text:'Mina parkta bir kedi gördü. Mina nerede kedi gördü?',simple:'Mina kediyi nerede gördü?',options:['Evde','Parkta','Sınıfta'],answer:'Parkta'}
  ];const sample=samples[k%samples.length];prompt=sample.text;simplifiedPrompt=sample.simple;options=sample.options;answer=sample.answer;
 }else if(o.id==='TURK-1-S01'){
  const samples=[['Büyük','Küçük','Uzun','Hızlı'],['Sıcak','Soğuk','Yeni','Temiz'],['Açık','Kapalı','Büyük','İnce']];const s=samples[k%samples.length];prompt=`“${s[0]}” sözcüğünün karşıtı hangisidir?`;simplifiedPrompt=`${s[0]} sözcüğünün karşıtını seç.`;options=s.slice(1);answer=s[1];
 }else{
  prompt='Yaya geçidinden karşıya geçmeden önce hangisi yapılmalıdır?';simplifiedPrompt='Yaya geçidinde önce ne yaparız?';options=['Trafiği kontrol etmek','Koşarak geçmek','Telefona bakmak'];answer='Trafiği kontrol etmek';
 }
 if(!options.includes(answer))throw new Error('Öneri cevap anahtarı doğrulanamadı.');
 return {
  id:`taslak-${o.id}-${k}`,type,prompt,simplifiedPrompt,objective:o.description,
  points:10,options,answer,pairs,visualNote,visualDots,visualStyle:'dot',visualAltText:'',teacherNote:`Öğretmen taslak kontrolü: ${o.id} (örnek amaç, resmî kod değil). Uyarlama ve kazanım denkliği gözden geçirilmeli.`,
  provenance:{kind:'local-template',objectiveId:o.id,source:'Örnek yerel kural tabanlı taslak',reviewed:false}
 };
}
export function proposalAudit(q){
 const issues=[];
 if(q.type==='choice' && (!Array.isArray(q.options)||!q.options.includes(q.answer)))issues.push('Doğru yanıt seçeneklerde bulunmuyor.');
 if(!String(q.objective||'').trim())issues.push('Kazanım eşleştirilmedi.');
 if(String(q.prompt||'').length<5)issues.push('Soru metni yetersiz.');
 return {ok:issues.length===0,issues};
}
