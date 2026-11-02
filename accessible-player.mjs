/** Offline, learner-facing accessible exam. Not a secured proctoring environment.
 * No answer key, teacher notes, identity or learner profile is included in the export.
 * Browser speech synthesis is separate from opt-in MediaRecorder audio responses.
 */
import {normalizeExam,formatPrompt,escapeHtml} from './core.mjs';
import {questionAccess} from './question-access.mjs';

export function auditAudioAccess(raw){
 const exam=normalizeExam(raw);const issues=[];
 for(const [i,q] of exam.questions.entries()){
  const used=exam.adaptations.visualCues && (q.visualMode==='numberline'||Number(q.visualDots?.groupA||0)+Number(q.visualDots?.groupB||0)>0);
  if(used&&!String(q.visualAltText||'').trim())issues.push({level:'error',question:i+1,text:`${i+1}. sorudaki görsel için öğretmen tarafından kontrol edilmiş betimleme gerekli.`});
  if(q.type==='matching'&&(q.pairs||[]).length<2)issues.push({level:'error',question:i+1,text:`${i+1}. soru: Eşleştirmede iki çift gerekli.`});
 }
 return issues;
}

export function createStudentPayload(raw){
 const exam=normalizeExam(raw);
 const issues=auditAudioAccess(exam);if(issues.length)throw new Error(issues.map(i=>i.text).join(' '));
 return {
  format:'bep-accessible-exam',version:1,language:'tr-TR',
  title:exam.title,subject:exam.subject,grade:exam.grade,instruction:exam.instruction,
  appearance:{fontSize:exam.adaptations.fontSize,highContrast:exam.adaptations.highContrast,lineSpacing:exam.adaptations.lineSpacing},
  questions:exam.questions.map((q,i)=>{
   const access=questionAccess(q);
   const base={number:i+1,id:`q${i+1}`,type:q.type,prompt:formatPrompt(q,exam),points:q.points,
     writtenCue:access.writtenCue,largeTargets:access.largeTargets,audioAllowed:access.audioAllowed,
     visualDescription:exam.adaptations.visualCues?String(q.visualAltText||'').trim():''};
   if(q.type==='choice')base.options=q.options.map((label,index)=>({id:String.fromCharCode(65+index),label}));
   if(q.type==='truefalse')base.options=[{id:'A',label:'Doğru'},{id:'B',label:'Yanlış'}];
   if(q.type==='matching'){
    // Two distinct lists. Never send original left/right pairs or solution mappings.
    base.left=q.pairs.map((p,index)=>({id:String(index+1),label:p.left}));
    base.right=q.pairs.map(p=>p.right).sort((a,b)=>a.localeCompare(b,'tr')).map((label,index)=>({id:String.fromCharCode(65+index),label}));
   }
   return base;
  })
 };
}
export function narrationText(payload, index){
 const q=payload.questions[index];if(!q)throw Error('Geçersiz soru numarası.');
 const lines=[`Soru ${q.number}.`,...(q.writtenCue?[`Ek yönerge: ${q.writtenCue}`]:[]),q.prompt];
 if(q.visualDescription)lines.push(`Görsel açıklaması: ${q.visualDescription}`);
 if(q.options?.length)lines.push(...q.options.map(o=>`Seçenek ${o.id}. ${o.label}.`));
 if(q.left)lines.push('Birinci liste.',...q.left.map(x=>`${x.id}. ${x.label}.`),'İkinci liste.',...q.right.map(x=>`${x.id}. ${x.label}.`));
 return lines.join(' ');
}
// A static offline player; microphone recordings require explicit opt-in and remain in memory.
const playerScript=String.raw`(()=>{
'use strict';
const data=JSON.parse(document.getElementById('exam-data').textContent);
const $=id=>document.getElementById(id);
const responses=Object.create(null);
// Deliberately no localStorage, IndexedDB, fetch, Web Speech Recognition, or background upload.
const recordings=new Map();
let activeRecording=null;
let recordTimer=null;
const MAX_RECORD_MS=60000;
const MAX_RECORD_BYTES=8*1024*1024;
function mediaType(){
 if(typeof MediaRecorder==='undefined')return '';
 for(const mime of ['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/webm','audio/mp4']){
  if(MediaRecorder.isTypeSupported(mime))return mime;
 }
 return '';
}
function revokeRecording(qid){const existing=recordings.get(qid);if(existing){URL.revokeObjectURL(existing.url);recordings.delete(qid);}}
function releaseMic(){if(!activeRecording)return;for(const track of activeRecording.stream.getTracks())track.stop();}
function setRecordingControls(){
 const recording=!!activeRecording;
 $('record-start').disabled=recording || !$('mic-consent').checked || !micSupported;
 $('record-stop').disabled=!recording;
 $('back').disabled=recording||index===0;
 $('next').disabled=recording||index===data.questions.length-1;
 $('record-start').textContent=recording?'Kayıt sürüyor':'● Yanıtımı sesle kaydet';
}
function renderRecording(){
 const q=data.questions[index];const rec=recordings.get(q.id);
 $('record-audio').hidden=!rec;
 $('record-audio').src=rec?.url||'';
 $('record-download').disabled=!rec;
 $('record-delete').disabled=!rec;
 $('record-feedback').textContent=activeRecording?'Mikrofon açık. Kayıt sürüyor, en fazla 60 saniye.':
  rec?'Bu sorunun geçici ses kaydı hazır ('+Math.max(1,Math.round(rec.blob.size/1024))+' KB). Dinleyebilir, cihazınıza indirebilir veya silebilirsiniz.':'Bu soru için kayıt yok.';
 setRecordingControls();
}
function stopRecording(save=true){
 if(!activeRecording)return;
 const current=activeRecording;current.keep=save;
 clearTimeout(recordTimer);recordTimer=null;
 try{if(current.recorder.state!=='inactive')current.recorder.stop();else releaseMic();}
 catch{current.stream.getTracks().forEach(t=>t.stop());activeRecording=null;renderRecording();}
}
const micSupported=!!(data.enableVoiceResponse&&navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&window.MediaRecorder&&mediaType());
async function startRecording(){
 if(activeRecording||!$('mic-consent').checked)return;
 if(!micSupported){$('record-feedback').textContent='Bu cihazda mikrofonla kayıt desteklenmiyor. Yazılı yanıt kullanabilirsiniz.';return;}
 const q=data.questions[index];
 if(recordings.has(q.id)&&!confirm('Bu soru için önceki geçici ses kaydını silip yeniden kaydetmek istiyor musunuz?'))return;
 let stream;
 try{stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});}
 catch{$('record-feedback').textContent='Mikrofon izni verilmedi veya cihaz kullanılamıyor. Yazılı yanıt kullanabilirsiniz.';return;}
 if(!$('mic-consent').checked||activeRecording||data.questions[index].id!==q.id){stream.getTracks().forEach(t=>t.stop());return;}
 try{
  const mime=mediaType();const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
  const entry={qid:q.id,recorder,stream,keep:true,chunks:[],size:0};activeRecording=entry;
  recorder.ondataavailable=e=>{if(e.data?.size){entry.size+=e.data.size;if(entry.size<=MAX_RECORD_BYTES)entry.chunks.push(e.data);else {entry.keep=false;stopRecording(false);$('record-feedback').textContent='Kayıt 8 MB sınırını aştı; ses tutulmadı.';}}};
  recorder.onerror=()=>{entry.keep=false;stopRecording(false);};
  recorder.onstop=()=>{
   entry.stream.getTracks().forEach(t=>t.stop());
   if(entry.keep&&entry.chunks.length&&entry.size<=MAX_RECORD_BYTES){
    const blob=new Blob(entry.chunks,{type:recorder.mimeType||mime||'audio/webm'});
    revokeRecording(entry.qid);recordings.set(entry.qid,{blob,url:URL.createObjectURL(blob)});
   }
   if(activeRecording===entry)activeRecording=null;
   renderRecording();
  };
  recorder.start(1000);
  recordTimer=setTimeout(()=>{stopRecording(true);$('record-feedback').textContent='60 saniyelik azami kayıt süresine ulaşıldı.';},MAX_RECORD_MS);
  renderRecording();
 }catch{stream.getTracks().forEach(t=>t.stop());activeRecording=null;$('record-feedback').textContent='Kayıt başlatılamadı. Yazılı yanıt kullanabilirsiniz.';renderRecording();}
}
function downloadRecording(){
 const q=data.questions[index];const rec=recordings.get(q.id);if(!rec)return;
 if(!confirm('Ses dosyasını bu cihaza indirmek istiyor musunuz? İndirilen dosya şifreli değildir; otomatik gönderilmez.'))return;
 const extension=rec.blob.type.includes('mp4')?'m4a':rec.blob.type.includes('ogg')?'ogg':'webm';
 const link=document.createElement('a');link.href=rec.url;link.download='anonim-soru-'+q.number+'.'+extension;document.body.append(link);link.click();link.remove();
 $('record-feedback').textContent='Ses dosyası bu cihaza indirildi. Öğretmene otomatik gönderilmedi.';
}

let index=0,utterance=null,phase='idle';
const synth=window.speechSynthesis;
const speakerSupported=typeof window.SpeechSynthesisUtterance==='function'&&!!synth;
$('title').textContent=data.title;
$('course').textContent=data.subject+' · '+data.grade;
$('instructions').textContent=data.instruction||'Her soruyu dikkatle dinleyiniz.';
$('font').value=String(data.appearance.fontSize||20);
$('contrast').checked=!!data.appearance.highContrast;
function sayStatus(message){$('status').textContent=message;}
function element(tag,attrs={},txt){const e=document.createElement(tag);for(const [key,value] of Object.entries(attrs)){if(key==='class')e.className=value;else e.setAttribute(key,value);}if(txt!==undefined)e.textContent=txt;return e;}
function readText(q){const p=['Soru '+q.number+'.',...(q.writtenCue?['Ek yönerge: '+q.writtenCue]:[]),q.prompt];if(q.visualDescription)p.push('Görsel açıklaması: '+q.visualDescription);if(q.options)p.push(...q.options.map(x=>'Seçenek '+x.id+'. '+x.label+'.'));if(q.left)p.push('Birinci liste.',...q.left.map(x=>x.id+'. '+x.label+'.'),'İkinci liste.',...q.right.map(x=>x.id+'. '+x.label+'.'));return p.join(' ');}
function stop(){utterance=null;if(speakerSupported)synth.cancel();phase='idle';$('pause').disabled=true;$('pause').textContent='Duraklat';}
function speakText(text,description){if(!speakerSupported){sayStatus('Bu tarayıcıda seslendirme yok. Ekran okuyucu kullanabilir veya yazılı sorulara erişebilirsiniz.');return;}
 stop();const u=new SpeechSynthesisUtterance(text);u.lang='tr-TR';u.rate=Number($('speed').value)||1;
 const voices=synth.getVoices?.()||[];
 const tr=voices.find(v=>v.localService===true&&/^tr(?:[-_]|$)/i.test(String(v.lang||'')));
 // Never fall back to a remote or unspecified default Web Speech voice.
 if(!tr){sayStatus('Bu cihazda doğrulanmış yerel Türkçe ses bulunamadı. Ekran okuyucuyu veya yazılı sınavı kullanın.');return;}
 u.voice=tr;
 u.onend=()=>{if(utterance===u){phase='idle';$('pause').disabled=true;sayStatus('Okuma tamamlandı.');}};
 u.onerror=()=>{if(utterance===u){phase='idle';$('pause').disabled=true;sayStatus('Seslendirme başlatılamadı. Ekran okuyucu kullanılabilir.');}};
 utterance=u;phase='playing';$('pause').disabled=false;$('pause').textContent='Duraklat';synth.speak(u);sayStatus(description+' okunuyor.');
}
function speak(){const q=data.questions[index];if(q.audioAllowed===false){sayStatus('Bu soru için uygulama içi sesli okuma öğretmen tarafından kapatılmıştır. Metni ekran okuyucu yine okuyabilir.');return;}speakText(readText(q),'Soru '+q.number);}
function optionControl(q,o){const lbl=element('label',{class:'answer-choice'});const input=element('input',{type:'radio',name:'response-'+q.id,value:o.id});input.checked=responses[q.id]===o.id;input.addEventListener('change',()=>{responses[q.id]=o.id;sayStatus('Seçim kaydedildi, yalnızca bu tarayıcı sekmesinde geçerli.');});lbl.append(input,element('span',{},o.id+' — '+o.label));return lbl;}
function render(){stop();const q=data.questions[index];$('progress').textContent='Soru '+(index+1)+' / '+data.questions.length;
 $('back').disabled=index===0;$('next').disabled=index===data.questions.length-1;
 $('prompt').textContent=q.prompt;$('question-area').classList.toggle('large-target',q.largeTargets===true);$('listen').disabled=q.audioAllowed===false;$('audio-rule').textContent=q.audioAllowed===false?'Bu soru için uygulama içi sesli okuma kapalıdır. Ekran okuyucu ayrı çalışabilir.':'';$('written-cue').hidden=!q.writtenCue;$('written-cue').textContent=q.writtenCue?'Ek yazılı yönerge: '+q.writtenCue:'';$('visual').hidden=!q.visualDescription;$('visual').textContent=q.visualDescription?'Görsel betimlemesi: '+q.visualDescription:'';
 const a=$('answer');a.replaceChildren();
 if(q.options){const fs=element('fieldset');fs.append(element('legend',{},'Yanıtınızı seçin'));q.options.forEach(o=>fs.append(optionControl(q,o)));a.append(fs);}
 else if(q.type==='short'){const lbl=element('label',{},'Yanıtınız (bu oturumda geçicidir)');const ta=element('textarea',{rows:'4',autocomplete:'off',spellcheck:'false'});ta.value=responses[q.id]||'';ta.addEventListener('input',()=>{responses[q.id]=ta.value;});lbl.append(ta);a.append(lbl);}
 else if(q.type==='matching'){const fs=element('fieldset');fs.append(element('legend',{},'Her satır için ikinci listeden bir seçenek seçin'));for(const l of q.left){const lbl=element('label',{class:'match-row'},l.id+'. '+l.label);const s=element('select');s.append(element('option',{value:''},'Bir yanıt seçin'));for(const r of q.right)s.append(element('option',{value:r.id},r.id+'. '+r.label));s.value=responses[q.id]?.[l.id]||'';s.addEventListener('change',()=>{responses[q.id]??={};responses[q.id][l.id]=s.value;});lbl.append(s);fs.append(lbl);}a.append(fs);}
 renderRecording();$('prompt').focus();sayStatus('Soru '+(index+1)+' açıldı. Soruyu dinlemek için Sesli oku düğmesini seçin.');
}
$('listen').addEventListener('click',speak);
$('read-intro').addEventListener('click',()=>speakText(data.title+'. '+data.subject+'. '+(data.instruction||'Her soruyu dikkatle dinleyiniz.'),'Sınav yönergesi'));
$('stop').addEventListener('click',()=>{stop();sayStatus('Okuma durduruldu.');});
$('pause').addEventListener('click',()=>{if(!speakerSupported)return;if(phase==='playing'){synth.pause();phase='paused';$('pause').textContent='Devam et';sayStatus('Okuma duraklatıldı.');}else if(phase==='paused'){synth.resume();phase='playing';$('pause').textContent='Duraklat';sayStatus('Okuma devam ediyor.');}});
$('back').addEventListener('click',()=>{if(index>0){index--;render();}});
$('next').addEventListener('click',()=>{if(index<data.questions.length-1){index++;render();}});
$('font').addEventListener('change',()=>{document.documentElement.style.setProperty('--text-size',$('font').value+'px');});
$('contrast').addEventListener('change',()=>{document.body.classList.toggle('high-contrast',$('contrast').checked);});
window.addEventListener('pagehide',()=>{stop();stopRecording(false);for(const key of [...recordings.keys()])revokeRecording(key);});
$('mic-consent').addEventListener('change',()=>{if(!$('mic-consent').checked){stopRecording(false);for(const key of [...recordings.keys()])revokeRecording(key);renderRecording();sayStatus('Mikrofon izni tercihi kapatıldı; geçici ses kayıtları temizlendi.');}setRecordingControls();});
$('record-start').addEventListener('click',startRecording);
$('record-stop').addEventListener('click',()=>stopRecording(true));
$('record-download').addEventListener('click',downloadRecording);
$('record-delete').addEventListener('click',()=>{
 if(!recordings.has(data.questions[index].id))return;
 if(confirm('Bu sorunun geçici ses kaydını silmek istiyor musunuz?')){revokeRecording(data.questions[index].id);renderRecording();}
});
// Keyboard controls must never override typing, screen-reader browsing, or native form controls.
window.addEventListener('keydown',e=>{if(!(e.altKey&&e.shiftKey)||e.ctrlKey||e.metaKey)return;const t=e.target?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(t)||e.target?.isContentEditable)return;
 const key=e.key.toLowerCase();if(key==='r'){e.preventDefault();speak();}if(key==='s'){e.preventDefault();stop();}if(key==='n'&&!$('next').disabled){e.preventDefault();index++;render();}if(key==='p'&&!$('back').disabled){e.preventDefault();index--;render();}});
function answerLines(){
 const lines=['ANONİM YANITLAR - OTOMATİK PUANLAMA YOK',data.title,''];
 for(const q of data.questions){
  const a=responses[q.id];let formatted='(boş)';
  if(typeof a==='string'&&a.trim())formatted=a.trim();
  else if(a&&typeof a==='object')formatted=Object.entries(a).filter(([,v])=>v).map(([k,v])=>k+' = '+v).join(', ')||'(boş)';
  lines.push('Soru '+q.number+': '+formatted);
 }
 return lines.join('\n');
}
$('save-answers').addEventListener('click',()=>{
 if(!confirm('Yanıtlarınızı yalnızca bu cihaza metin dosyası olarak indirmek istiyor musunuz? Dosya korunmuyor. Ad, kimlik veya sağlık bilgisi yazmayın.'))return;
 const blob=new Blob(['\ufeff'+answerLines()],{type:'text/plain;charset=utf-8'});
 const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='anonim-sinav-yanitlari.txt';document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2000);sayStatus('Yanıt dosyası bu cihaza indirildi. Otomatik gönderim yapılmadı.');
});
$('clear-answers').addEventListener('click',()=>{
 if(!confirm('Bu sekmedeki tüm yazılı yanıtları ve ses kayıtlarını temizlemek istiyor musunuz? İndirmiş olduğunuz dosyalar silinmez.'))return;
 stopRecording(false);for(const key of [...recordings.keys()])revokeRecording(key);for(const key of Object.keys(responses))delete responses[key];render();sayStatus('Bu sekmedeki yanıtlar temizlendi.');
});
$('no-speech').hidden=speakerSupported;
$('mic-unsupported').hidden=micSupported;
setRecordingControls();
$('offline').textContent='Bağımsız HTML · Yanıtlar sekmede geçicidir. İsterseniz yalnızca kendi cihazınıza anonim .txt dosyası indirebilirsiniz. Otomatik gönderim yapılmaz.'+(data.enableVoiceResponse?' Öğretmenin izin verdiği mikrofon seçeneği yalnızca açık kullanıcı tercihiyle etkinleşir.':' Bu sınavda mikrofonla yanıt seçeneği kapalıdır.');
document.documentElement.style.setProperty('--text-size',$('font').value+'px');
document.body.classList.toggle('high-contrast',$('contrast').checked);
render();
})();`;
const playerCss=`:root{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;--text-size:22px;color:#18202a;background:#f7f7f8}*{box-sizing:border-box}body{margin:0;line-height:1.65;font-size:var(--text-size)}header{background:#fff;border-bottom:5px solid #c50e1f;padding:20px max(18px,calc((100vw - 920px)/2))}header small{letter-spacing:.09em;color:#8a1720;font-weight:800;font-size:14px}h1{margin:6px 0;font-size:1.4em}h2{margin:0 0 18px;font-size:1.3em}main{max-width:940px;margin:auto;padding:24px 16px 90px}.card{background:white;border:1px solid #d8dde3;border-radius:16px;padding:24px;margin-top:18px;box-shadow:0 3px 18px #1b24300d}.toolbar{display:flex;flex-wrap:wrap;gap:12px;align-items:end}button,select,textarea,input{font:inherit}button{background:#c50e1f;border:2px solid #c50e1f;border-radius:11px;color:white;padding:12px 16px;cursor:pointer;min-height:52px}button.secondary{background:white;color:#18202a;border-color:#586576}button:disabled{opacity:.48;cursor:not-allowed}button:focus-visible,select:focus-visible,textarea:focus-visible,input:focus-visible{outline:4px solid #1b6ed2;outline-offset:4px}label{display:block}.toolbar label{font-size:.73em}.toolbar select{min-height:52px;padding:8px}.toolbar input{height:26px;width:26px;vertical-align:middle}.status{font-size:.85em;min-height:2em;color:#324052}.narration-warning{padding:12px;border-left:4px solid #af7300;background:#fff9ea}.question-index{color:#a11123;font-weight:700}#prompt{font-size:1.15em;scroll-margin:35px}.voice-panel{border-top:2px solid #d8dde3;margin-top:25px;padding-top:18px}.voice-panel p{font-size:.83em}.voice-panel audio{max-width:100%;width:100%;margin:14px 0}.voice-panel .consent{display:flex;align-items:flex-start;gap:12px}.voice-panel input[type=checkbox]{width:26px;height:26px;flex:0 0 26px;margin-top:5px}.voice-panel .toolbar button{font-size:.82em}.high-contrast .voice-panel{border-color:white}.written-cue{padding:13px 16px;background:#f4f5f7;border-left:4px solid #c50e1f;white-space:pre-wrap}.large-target .answer-choice{min-height:74px;padding:22px}.large-target .match-row select{min-height:70px}.high-contrast .written-cue{background:#000;color:white;border-color:white}fieldset{border:0;padding:0;margin:25px 0}legend{font-weight:700;margin-bottom:12px}.answer-choice{display:flex;gap:14px;border:2px solid #b1bdc6;border-radius:12px;padding:17px;margin:10px 0;align-items:center;cursor:pointer}.answer-choice:has(input:checked){border-color:#b50020;background:#fff2f3}input[type=radio]{width:28px;height:28px;flex:0 0 auto}textarea{display:block;width:100%;min-height:160px;margin-top:12px;padding:14px;border:2px solid #697482;border-radius:9px}.match-row{border-bottom:1px solid #ccc;padding:14px 0}.match-row select{display:block;width:100%;padding:12px;margin-top:9px}.navigation{display:flex;justify-content:space-between;gap:14px;margin-top:24px}.high-contrast{background:#000;color:white}.high-contrast .card,.high-contrast header{background:#000;color:#fff;border-color:#fff;box-shadow:none}.high-contrast button{background:#000;color:#fff;border-color:#fff}.high-contrast button.secondary{background:#fff;color:#000}.high-contrast .status,.high-contrast .question-index,.high-contrast header small{color:#fff}.high-contrast .answer-choice,.high-contrast .match-row{border-color:#fff}.high-contrast .answer-choice:has(input:checked){background:#133960}.high-contrast select,.high-contrast textarea{background:#000;color:white;border:2px solid white} @media(max-width:570px){.card{padding:17px}button{flex:1}.navigation button{min-width:0}body{line-height:1.5}}@media print{.toolbar,.navigation,#offline,#status,#no-speech{display:none}body{background:white}.card{box-shadow:none}}`;
export function generateAccessibleExamHtml(raw,{allowVoiceResponse=false}={}){
 const data=createStudentPayload(raw);
 data.enableVoiceResponse=allowVoiceResponse===true;
 const json=JSON.stringify(data).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; media-src blob:; connect-src 'none'; form-action 'none'; base-uri 'none'"><title>${escapeHtml(data.title)} — Erişilebilir sesli sınav</title><style>${playerCss}</style></head><body>
 <header><small>DOU TEMASI · ERİŞİLEBİLİR SINAV</small><h1 id="title">Sesli sınav</h1><div id="course"></div></header><main>
 <section class="card"><h2>Başlamadan önce</h2><p id="instructions"></p><button type="button" class="secondary" id="read-intro">▶ Yönergeyi dinle</button><p id="offline"></p><p id="no-speech" class="narration-warning" hidden>Bu tarayıcı seslendirme sunmuyor. Soruları ekran okuyucuyla veya yazılı olarak takip edebilirsiniz.</p></section>
 <section class="card" aria-label="Okuma ve görünüm ayarları"><div class="toolbar"><button id="listen" type="button">▶ Sesli oku</button><button id="pause" type="button" class="secondary" disabled>Duraklat</button><button id="stop" type="button" class="secondary">■ Durdur</button><label>Okuma hızı <select id="speed"><option value="0.75">Yavaş</option><option value="1" selected>Normal</option><option value="1.25">Hızlı</option></select></label><label>Yazı boyutu <select id="font"><option value="18">18</option><option value="20">20</option><option value="22">22</option><option value="24">24</option><option value="28">28</option><option value="32">32</option></select></label><label><input id="contrast" type="checkbox"> Yüksek kontrast</label></div><p class="status" id="status" role="status" aria-live="polite"></p><p style="font-size:.75em">Klavye: Tab / Shift+Tab ile dolaşın; Enter veya boşlukla düğmelere basın. İsteğe bağlı kısayollar: Alt+Shift+R oku, Alt+Shift+S durdur, Alt+Shift+N sonraki, Alt+Shift+P önceki.</p></section>
 <section class="card" id="question-area" aria-labelledby="prompt"><p id="progress" class="question-index"></p><p id="audio-rule" role="status"></p><p id="written-cue" class="written-cue" hidden></p><h2 tabindex="-1" id="prompt"></h2><p id="visual" hidden></p><div id="answer"></div>
 <section class="voice-panel" ${data.enableVoiceResponse?'':'hidden'} aria-label="İsteğe bağlı sesli yanıt"><h3>İsteğe bağlı sesli yanıt</h3>
 <p>Ses kaydı yalnızca bu cihazın belleğinde tutulur. Mikrofon siz başlatmadıkça açılmaz. Kayıt en fazla 60 saniye ve 8 MB'dır; indirilirse dosya şifreli değildir. Bu pilotta gerçek çocuk sesi kaydetmeyin.</p>
 <label class="consent"><input id="mic-consent" type="checkbox"><span>Mikrofonla yanıtı denemek istiyorum; kaydın yerel olduğunu ve bu pilotta gerçek öğrenci verisi kullanmamam gerektiğini anladım.</span></label>
 <p class="narration-warning" id="mic-unsupported" hidden>Mikrofon kaydı bu tarayıcıda veya bağlantı türünde kullanılamıyor. Yazılı yanıt kullanabilirsiniz.</p>
 <div class="toolbar"><button id="record-start" type="button" disabled>● Yanıtımı sesle kaydet</button><button type="button" class="secondary" id="record-stop" disabled>■ Kaydı bitir</button><button type="button" class="secondary" id="record-download" disabled>Ses kaydını indir</button><button type="button" class="secondary" id="record-delete" disabled>Ses kaydını sil</button></div>
 <p id="record-feedback" role="status" aria-live="polite"></p><audio id="record-audio" controls preload="none" hidden aria-label="Kendi yanıtımı dinle"></audio>
 </section><div class="navigation"><button type="button" class="secondary" id="back">← Önceki soru</button><button type="button" id="next">Sonraki soru →</button></div></section>
 <section class="card" aria-label="Yanıt dosyası ve gizlilik"><h2>Yanıtlarınızı kontrol edin</h2><p>Yazılı yanıtlar ve indirilmemiş ses kayıtları yalnızca bu sekmede geçici tutulur. İsteğe bağlı olarak şifresiz bir metin dosyasını bu cihaza indirebilirsiniz. Bu dosya kişisel bilgiler içerebilir; gerçek öğrenci verileriyle kullanmayın. Öğretmene otomatik gönderilmez.</p><div class="toolbar"><button type="button" id="save-answers">Yanıtları TXT olarak indir</button><button type="button" class="secondary" id="clear-answers">Yanıtları temizle</button></div></section>
 </main><script type="application/json" id="exam-data">${json}</script><script>${playerScript}</script></body></html>`;
}
