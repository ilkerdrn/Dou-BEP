/**
 * BEP adjustment assistant — rule-based, teacher-directed support selections.
 * Area examples are NOT diagnoses, are only held in browser memory, and NEVER saved.
 * Persisted plan records general output adjustments and assessed skill domain only.
 */
export const NEED_AREAS = Object.freeze({
 learning:{label:'Okuma/öğrenme desteği gereksinimi',supports:['large-text','wide-spacing','short-directions'],caution:'Okuma becerisi ölçülüyorsa yönerge değişikliğinin kazanımı etkileyip etkilemediğini kontrol edin.'},
 visual:{label:'Görsel erişilebilirlik gereksinimi',supports:['large-text','high-contrast','wide-spacing'],caution:'Braille, kabartma veya ekran okuyucu için erişilebilir dijital belge bu sürümde otomatik üretilmez.'},
 hearing:{label:'İşitsel erişilebilirlik gereksinimi',supports:['short-directions','visual-support'],caution:'İşitsel anlamayı ölçen sınavlarda sunum biçimini değiştirmek ölçme hedefini etkileyebilir.'},
 predictability:{label:'Öngörülebilir düzen ve duyusal yük desteği',supports:['one-question','short-directions','wide-spacing'],caution:'Her öğrencinin tek-soru düzenini tercih ettiği varsayılmamalıdır.'},
 concrete:{label:'Somutlaştırma / görsel öğrenme desteği',supports:['visual-support','short-directions','wide-answer'],caution:'Görselin cevabı açığa çıkarmadığını ve kazanımı değiştirmediğini denetleyin.'},
 motor:{label:'Motor yanıt desteği gereksinimi',supports:['wide-answer','one-question'],caution:'Sözlü yanıt, yardımcı teknoloji ve ek süre gibi sınav uygulamaları bu basılı çıktıdan ayrı planlanır.'},
 attention:{label:'Dikkat ve yürütücü işlev desteği',supports:['one-question','short-directions','wide-spacing'],caution:'Tek soru/sayfa baskı maliyetini artırabilir; öğrenci için uygunluğunu öğretmen değerlendirir.'}
});
export const DOMAINS=Object.freeze({general:'Genel / karma',math:'Matematiksel beceri',reading:'Okuma becerisi',listening:'Dinlediğini anlama',writing:'Yazılı anlatım'});
export const SUPPORTS=Object.freeze({
 'large-text':{label:'Büyük, okunabilir yazı',detail:'En az 22 punto',kind:'layout'},
 'wide-spacing':{label:'Geniş satır aralığı',detail:'En az 1,9 satır yüksekliği',kind:'layout'},
 'high-contrast':{label:'Yüksek kontrast',detail:'Siyah/beyaz metin görünümü',kind:'layout'},
 'short-directions':{label:'Kısa ve açık yönergeler',detail:'Her soruya öğretmen tarafından alternatif yönerge girilir',kind:'review'},
 'one-question':{label:'Sayfa başına tek soru',detail:'Dikkat dağıtıcı unsurları azaltabilir',kind:'layout'},
 'wide-answer':{label:'Geniş yanıt alanı',detail:'Daha fazla yazma/işaretleme boşluğu',kind:'layout'},
 'visual-support':{label:'Görsel destek',detail:'Görseller ve erişilebilir betimleme öğretmence eklenir',kind:'review'}
});
const KEYS=Object.keys(SUPPORTS);
export const EMPTY_SUPPORT_PLAN=Object.freeze({version:1,domain:'general',selected:[]});
export function normalizeSupportPlan(raw){
 if(raw==null)return {version:1,domain:'general',selected:[]};
 if(typeof raw!=='object'||Array.isArray(raw))throw Error('Uyarlama planı geçersiz.');
 // Reject unexpected fields instead of silently saving possible sensitive data.
 if(Object.keys(raw).some(k=>!['version','domain','selected'].includes(k)))throw Error('Uyarlama planına öğrenci veya tanı bilgisi eklemeyin.');
 if(raw.version!==1||!Object.hasOwn(DOMAINS,raw.domain)||!Array.isArray(raw.selected)||raw.selected.length>KEYS.length)throw Error('Uyarlama planı geçersiz.');
 const selected=[];
 for(const value of raw.selected){if(typeof value!=='string'||!Object.hasOwn(SUPPORTS,value))throw Error('Bilinmeyen uyarlama desteği.');if(selected.includes(value))throw Error('Tekrarlanan uyarlama desteği.');selected.push(value);}
 return {version:1,domain:raw.domain,selected};
}
export function applySupportPlan(exam,rawPlan){
 const plan=normalizeSupportPlan(rawPlan);
 const a={...exam.adaptations};
 // Supports are monotone: never change questions, answer keys, points, or BEP objectives.
 if(plan.selected.includes('large-text'))a.fontSize=Math.max(Number(a.fontSize)||18,22);
 if(plan.selected.includes('wide-spacing'))a.lineSpacing=Math.max(Number(a.lineSpacing)||1.65,1.9);
 if(plan.selected.includes('high-contrast'))a.highContrast=true;
 if(plan.selected.includes('short-directions'))a.simpleInstructions=true;
 if(plan.selected.includes('one-question'))a.onePerPage=true;
 if(plan.selected.includes('wide-answer'))a.largerAnswerArea=true;
 if(plan.selected.includes('visual-support'))a.visualCues=true;
 return {...exam,adaptations:a,supportPlan:plan};
}
export function reviewSupportPlan(exam){
 const issues=[];
 let plan;
 try{plan=normalizeSupportPlan(exam?.supportPlan);}catch(error){return [{level:'error',text:error.message}];}
 const selected=plan.selected,a=exam?.adaptations||{};
 const requireSetting=(code,ok,explanation)=>{if(selected.includes(code)&&!ok)issues.push({level:'error',text:`Uyarlama planında ${SUPPORTS[code].label} seçili ancak ${explanation}.`});};
 requireSetting('large-text',Number(a.fontSize)>=22,'yazı boyutu 22 puntodan küçük');
 requireSetting('wide-spacing',Number(a.lineSpacing)>=1.9,'satır aralığı 1,9 altında');
 requireSetting('high-contrast',a.highContrast===true,'yüksek kontrast kapalı');
 requireSetting('short-directions',a.simpleInstructions===true,'sade yönerge kapalı');
 requireSetting('one-question',a.onePerPage===true,'tek-soru görünümü kapalı');
 requireSetting('wide-answer',a.largerAnswerArea===true,'geniş yanıt alanı kapalı');
 requireSetting('visual-support',a.visualCues===true,'görsel destek kapalı');
 if(selected.includes('short-directions')&&['reading','listening'].includes(plan.domain))issues.push({level:'warning',text:'Dil/okuma becerisi ölçülürken yönerge sadeleştirmesi hedef kazanımı değiştirebilir; öğretmen incelemeli.'});
 if(selected.includes('visual-support')&&plan.domain==='listening')issues.push({level:'warning',text:'Dinlediğini anlamayı ölçerken ek görseller ölçme hedefini değiştirebilir.'});
 if(selected.includes('visual-support')&&!(exam?.questions||[]).some(q=>q.visualNote?.trim()||q.visualDots?.groupA||q.visualDots?.groupB||q.visualMode==='numberline'))issues.push({level:'warning',text:'Görsel destek seçili ancak henüz bir soruya görsel içerik eklenmedi.'});
 if(selected.includes('one-question')&&(exam?.questions||[]).length>8)issues.push({level:'warning',text:'Tek-soru düzeni sınavı çok sayfalı hale getirebilir.'});
 return issues;
}
export function recommendSupports(area){
 return NEED_AREAS[area] ? [...NEED_AREAS[area].supports] : [];
}
