/** Anonymous, student-selected presentation preferences for the pilot exam.
 * These are UI choices, NOT disability records or diagnosis labels.
 * Do not store, upload, or include in exam answer payloads.
 */
const PROFILES=Object.freeze({
 standard:Object.freeze({id:'standard',fontSize:20,highContrast:false,largeTargets:false,single:true,
  description:'Standart metin ve klavye ile gezinme açık.'}),
 listen:Object.freeze({id:'listen',fontSize:24,highContrast:false,largeTargets:false,single:true,
  description:'Soru odağı ve klavye gezinmesi açık. Yerel ses bulunursa soruyu dinlemek için ayrıca Oku düğmesine basın.'}),
 written:Object.freeze({id:'written',fontSize:24,highContrast:false,largeTargets:false,single:true,
  description:'Sorular, seçenekler, ek yönergeler, süre uyarıları ve teslim durumu yazıyla gösterilir; ses kullanmak zorunda değilsiniz.'}),
 vision:Object.freeze({id:'vision',fontSize:28,highContrast:true,largeTargets:false,single:true,
  description:'Büyük metin ve yüksek kontrast açık. Tarayıcı yakınlaştırmasını da kullanabilirsiniz.'}),
 motor:Object.freeze({id:'motor',fontSize:24,highContrast:false,largeTargets:true,single:true,
  description:'Büyük yanıt alanları ve tek soru odağı açık. Tab, Shift+Tab, Enter ve boşluk ile kontrol edebilirsiniz.'})
});
export function studentAccessProfile(id){
 return PROFILES[typeof id==='string'&&Object.hasOwn(PROFILES,id)?id:'standard'];
}
export function studentAccessProfileIds(){return Object.keys(PROFILES);}
