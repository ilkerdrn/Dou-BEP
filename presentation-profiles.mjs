/** Teacher-approved anonymous accessibility presets; never diagnose or lower question difficulty. */
export const DELIVERY_PROFILES=Object.freeze({
 standard:{label:'Standart',details:'Öğretmen onaylı temel sürüm',settings:{}},
 large:{label:'Geniş okuma',details:'24 punto, geniş satır aralığı',settings:{fontSize:24,lineSpacing:2.1,largerAnswerArea:true}},
 focus:{label:'Odaklanma',details:'Her sayfada tek soru',settings:{fontSize:20,lineSpacing:1.9,onePerPage:true,largerAnswerArea:true}},
 contrast:{label:'Yüksek kontrast',details:'Siyah-beyaz yüksek kontrast',settings:{fontSize:22,highContrast:true,largerAnswerArea:true}},
 motor:{label:'Geniş yanıt alanları',details:'Motor erişilebilirlik düzeni',settings:{fontSize:20,largerAnswerArea:true,lineSpacing:2.1}}
});
export function makeDeliveryVersion(exam,id){
 if(!DELIVERY_PROFILES[id])throw Error('Bilinmeyen erişilebilirlik profili.');
 const cloned=structuredClone(exam);
 cloned.adaptations={...cloned.adaptations,...DELIVERY_PROFILES[id].settings};
 // Pure layout transformation only. The exam questions, correct answers, and goals are never changed.
 return cloned;
}
