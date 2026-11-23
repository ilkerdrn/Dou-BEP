/** DOU Reader — dependency-free, learner-facing question narration policy.
 * Never accepts teacher answers, arbitrary page DOM, or user-entered responses.
 * This is a focused exam reader, NOT a system-level screen reader.
 */
const MAX_TEXT=16000;
export function isTurkishLocalVoice(voice){
 return Boolean(voice&&voice.localService===true&&/^tr(?:[-_]|$)/i.test(String(voice.lang||''))&&String(voice.voiceURI||voice.name||'').length>0);
}
export function localTurkishVoices(voices){
 return Array.from(voices||[]).filter(isTurkishLocalVoice).sort((a,b)=>String(a.name).localeCompare(String(b.name),'tr'));
}
/** Yerel (çevrimdışı) ses envanteri: dil kodu 'tr' veya 'en'. */
export function isLocalVoiceOf(voice,lang='tr'){
 return Boolean(voice&&voice.localService===true&&new RegExp('^'+(lang==='en'?'en':'tr')+'(?:[-_]|$)','i').test(String(voice.lang||''))&&String(voice.voiceURI||voice.name||'').length>0);
}
export function localVoicesOf(voices,lang='tr'){
 return Array.from(voices||[]).filter(v=>isLocalVoiceOf(v,lang)).sort((a,b)=>String(a.name).localeCompare(String(b.name),'tr'));
}
/** Tarayıcı sesin cinsiyetini bildirmez; bilinen Windows/macOS/Android ses adlarına dayalı en iyi tahmin (kesin değildir). */
const FEMALE=/\b(emel|zira|hazel|susan|eva|aria|jenny|samantha|karen|moira|fiona|victoria|tessa|veena|serena|libby|sonia|catherine|heera|linda|yelda|ayşe|filiz|female|kadın)\b/i;
const MALE=/\b(tolga|david|mark|george|richard|james|guy|ryan|daniel|alex|fred|ravi|male|erkek|cem)\b/i;
export function voiceGender(voice){const n=String(voice?.name||'');if(FEMALE.test(n))return 'female';if(MALE.test(n))return 'male';return 'unknown';}
export function preferVoice(list,pref){
 if(!list.length)return null;
 if(pref==='female'||pref==='male'){const m=list.find(v=>voiceGender(v)===pref);if(m)return m;}
 return list[0];
}
export function readerRate(input){const value=Number(input);return Number.isFinite(value)?Math.min(1.5,Math.max(.65,value)):1;}
/** Okunan bölümler (eşzamanlı vurgu için): her bölüm bir anahtarla ekrandaki öğeye eşlenir. readerText bunların birleşimidir. */
const LABELS={tr:{q:'Soru',opt:'Seçenek',cue:'Ek yönerge',vis:'Görsel açıklaması',left:'Eşleştirme satırı',right:'Eşleştirme seçeneği',short:'Bu bir yazılı yanıt sorusudur. Yanıtınızı yazı alanına yazın',match:'Her satır için ikinci listeden bir seçenek seçin'},
 en:{q:'Question',opt:'Option',cue:'Additional instruction',vis:'Image description',left:'Matching row',right:'Matching choice',short:'This is a written answer question. Type your answer in the text box',match:'For each row, choose one option from the second list'}};
export function readerParts(question){
 if(!question||typeof question!=='object')throw Error('Geçersiz sınav sorusu.');
 if(question.audioAllowed===false)throw Error('Bu soruda uygulama içi seslendirme kapalıdır.');
 const L=LABELS[question.lang==='en'?'en':'tr'];
 const raw=[['number',`${L.q} ${String(question.number||'').slice(0,10)}`],['prompt',question.prompt],['cue',question.writtenCue?`${L.cue}: ${question.writtenCue}`:''],
 ['visual',question.visualDescription?`${L.vis}: ${question.visualDescription}`:'']];
 for(const o of Array.isArray(question.options)?question.options:[])raw.push(['option-'+o.id,`${L.opt} ${o.id}: ${o.label}`]);
 for(const o of Array.isArray(question.left)?question.left:[])raw.push(['left-'+o.id,`${L.left} ${o.id}: ${o.label}`]);
 for(const o of Array.isArray(question.right)?question.right:[])raw.push(['answer',`${L.right} ${o.id}: ${o.label}`]);
 if(question.type==='short')raw.push(['answer',L.short]);
 if(question.type==='matching')raw.push(['answer',L.match]);
 // No answer, teacherNote, rubric, course roster, token, code or user response paths.
 // Parts that already end in punctuation must not produce ".." when joined (screen-friendly, natural pauses).
 const parts=raw.filter(([,v])=>typeof v==='string'&&v.trim()).map(([key,v])=>({key,text:v.trim().replace(/[.]+$/,'').replace(/[\u0000-\u001f\u007f]/g,' ')}));
 const total=parts.map(x=>x.text).join('. ');
 if(total.length>MAX_TEXT)throw Error('Soru seslendirme sınırını aşıyor; içerik kesilmeden işlem durduruldu.');
 if(!total.trim())throw Error('Seslendirilecek soru bulunamadı.');
 return parts;
}
export function readerText(question){return readerParts(question).map(x=>x.text).join('. ');}
export function readerChunks(text,maxLength=600){
 if(typeof text!=='string'||!text.trim())return [];
 const max=Math.min(1200,Math.max(80,Number(maxLength)||600));
 const chunks=[];let remaining=text.trim();
 while(remaining.length){
  if(remaining.length<=max){chunks.push(remaining);break;}
  let at=remaining.lastIndexOf(' ',max);
  if(at<Math.floor(max*.4))at=max;
  chunks.push(remaining.slice(0,at).trim());remaining=remaining.slice(at).trimStart();
 }
 return chunks;
}
export function readerShortcut(event){
 if(!event?.altKey||!event?.shiftKey||event.ctrlKey||event.metaKey||event.repeat)return null;
 const target=event.target;
 if(target?.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(String(target?.tagName||'').toUpperCase()))return null;
 return ({KeyR:'read',KeyS:'stop',KeyN:'next',KeyP:'previous',KeyH:'help'})[event.code]||null;
}
