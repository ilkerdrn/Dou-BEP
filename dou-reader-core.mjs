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
export function readerRate(input){const value=Number(input);return Number.isFinite(value)?Math.min(1.5,Math.max(.65,value)):1;}
/** Okunan bölümler (eşzamanlı vurgu için): her bölüm bir anahtarla ekrandaki öğeye eşlenir. readerText bunların birleşimidir. */
export function readerParts(question){
 if(!question||typeof question!=='object')throw Error('Geçersiz sınav sorusu.');
 if(question.audioAllowed===false)throw Error('Bu soruda uygulama içi seslendirme kapalıdır.');
 const raw=[['number',`Soru ${String(question.number||'').slice(0,10)}`],['prompt',question.prompt],['cue',question.writtenCue?`Ek yönerge: ${question.writtenCue}`:''],
 ['visual',question.visualDescription?`Görsel açıklaması: ${question.visualDescription}`:'']];
 for(const o of Array.isArray(question.options)?question.options:[])raw.push(['option-'+o.id,`Seçenek ${o.id}: ${o.label}`]);
 for(const o of Array.isArray(question.left)?question.left:[])raw.push(['left-'+o.id,`Eşleştirme satırı ${o.id}: ${o.label}`]);
 for(const o of Array.isArray(question.right)?question.right:[])raw.push(['answer',`Eşleştirme seçeneği ${o.id}: ${o.label}`]);
 if(question.type==='short')raw.push(['answer','Bu bir yazılı yanıt sorusudur. Yanıtınızı yazı alanına yazın']);
 if(question.type==='matching')raw.push(['answer','Her satır için ikinci listeden bir seçenek seçin']);
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
