/** DOU Speech Lab v2.70 — opt-in bounded, offline free-text acoustic study.
 * No browser voice engine, network, recordings or persistence.
 * NOT an intelligible/validated Turkish TTS or a Windows screen reader.
 * Calls the existing deterministic robotically articulated PCM synthesizer in
 * bounded utterances. Does not change older fixed-experiment outputs.
 */
import {synthesizeTurkishArticulationPreview,synthesizeTurkishSpectralPreview} from './dou-speech-waveform.mjs';
import {synthesizeTurkishContrastPreview} from './dou-speech-contrast.mjs';
import {synthesizeTurkishPlacePreview} from './dou-speech-place.mjs';
import {expandTurkishNumbers} from './dou-speech-number-words.mjs';
import {normalizeTurkishSpeechContext} from './dou-speech-context-normalization.mjs';
export const FREE_TEXT_MAX_CHARACTERS=360;
const MAX_EXPANDED_LENGTH=620;
const MAX_SECONDS=60;
const SAMPLE_RATE=22050;
const JOIN_PAUSE_SAMPLES=Math.round(SAMPLE_RATE*0.09);
const VALID=/^[a-zA-ZçğıöşüÇĞİÖŞÜı0-9\s,.!?;:–\-’']+$/u;
const readable=/[a-zA-ZçğıöşüÇĞİÖŞÜı0-9]/u;
/** Chunk on word boundaries rather than truncating or deleting source content. */
export function planLocalFreeText(text,{numberMode='digits',delivery='legacy',contextMode='literal',acousticModel='legacy'}={}){
 if(!['legacy','spectral','contrast','place'].includes(acousticModel))throw new RangeError('Geçersiz deneysel fonem modeli.');
 if(!['digits','cardinal'].includes(numberMode))throw new RangeError('Geçersiz sayı okuma modu.');
 if(!['legacy','phrased'].includes(delivery))throw new RangeError('Geçersiz ritim modu.');
 if(typeof text!=='string')throw new TypeError('Metin yazı olmalıdır.');
 if([...text].length>FREE_TEXT_MAX_CHARACTERS)throw new RangeError(`En fazla ${FREE_TEXT_MAX_CHARACTERS} karakter kullanın.`);
 if(!VALID.test(text))throw new RangeError('Yalnız Türkçe harfler, rakamlar ve temel noktalama desteklenir. Emoji, HTML veya özel işaret kullanmayın.');
 if(!readable.test(text))throw new RangeError('Seslendirilebilecek metin bulunamadı.');
 // Apostrophes act as a token boundary: approximation, not a morphology model.
 const normalized=text.normalize('NFC').replace(/[’']/gu,' ').replace(/\s+/gu,' ').trim();
 const context=normalizeTurkishSpeechContext(normalized,{mode:contextMode});
 const expanded=expandTurkishNumbers(context.text,{mode:numberMode}).replace(/\s+/gu,' ').trim();
 if(expanded.length>MAX_EXPANDED_LENGTH)throw new RangeError('Sayıların açılımıyla birlikte metin çok uzun. Daha kısa metin kullanın.');
 // Preserve the v2.68 legacy phonetic path exactly when using default options.
 // In the new experimental path, phrase boundaries and cardinal words must be
 // forwarded to the synthesizer, rather than just counted for validation.
 const actual=numberMode==='cardinal'?expanded:normalized;
 const tokens=actual.split(' ');
 const chunks=[];let current='';
 for(const token of tokens){
  if(token.length>45)throw new RangeError('Çok uzun bitişik sözcük/rakam dizisi. Araya boşluk koyun.');
  const next=current?`${current} ${token}`:token;
  if(next.length>45&&current){chunks.push(current);current=token;}else current=next;
  if(delivery==='phrased'&&/[.!?;:]$/u.test(token)&&current){chunks.push(current);current='';}
 }
 if(current)chunks.push(current);
 if(chunks.length>30)throw new RangeError('Çok fazla kısa parça var. Daha kısa bir metin deneyin.');
 const pausesMs=chunks.slice(0,-1).map(chunk=>delivery==='legacy'?90:
   /[.!?]$/u.test(chunk)?240:/[;:]$/u.test(chunk)?170:/,$/u.test(chunk)?110:35);
 return Object.freeze({chunks:Object.freeze(chunks),pausesMs:Object.freeze(pausesMs),characterCount:[...text].length,
  wordCount:normalized.split(' ').length,normalized,expandedLength:expanded.length,
  numberMode,delivery,contextMode,acousticModel,contextConversions:context.conversions,expanded,experimental:true});
}
function encodePcmWav(pcm){
 const wav=new Uint8Array(44+pcm.length);
 const view=new DataView(wav.buffer);
 for(const [pos,tag] of [[0,'RIFF'],[8,'WAVE'],[12,'fmt '],[36,'data']])for(let i=0;i<4;i++)wav[pos+i]=tag.charCodeAt(i);
 view.setUint32(4,wav.length-8,true);view.setUint32(16,16,true);view.setUint16(20,1,true);
 view.setUint16(22,1,true);view.setUint32(24,SAMPLE_RATE,true);view.setUint32(28,SAMPLE_RATE*2,true);
 view.setUint16(32,2,true);view.setUint16(34,16,true);view.setUint32(40,pcm.length,true);
 wav.set(pcm,44);return wav;
}
/** Explicitly user-triggered local synthesis. No I/O, DB, HTTP, cache or logs. */
export function synthesizeLocalFreeText(text,{pitchHz=125,rate=1,numberMode='digits',delivery='legacy',contextMode='literal',acousticModel='legacy'}={}){
 if(typeof pitchHz!=='number'||!Number.isFinite(pitchHz)||pitchHz<90||pitchHz>220)throw new RangeError('Perde 90–220 Hz aralığında olmalıdır.');
 if(typeof rate!=='number'||!Number.isFinite(rate)||rate<0.75||rate>1.5)throw new RangeError('Hız 0,75–1,5 aralığında olmalıdır.');
 const plan=planLocalFreeText(text,{numberMode,delivery,contextMode,acousticModel});
 const blocks=[];let count=0,phonemeCount=0;
 for(let i=0;i<plan.chunks.length;i++){
  const fn=acousticModel==='legacy'?synthesizeTurkishArticulationPreview:acousticModel==='spectral'?synthesizeTurkishSpectralPreview:acousticModel==='contrast'?synthesizeTurkishContrastPreview:synthesizeTurkishPlacePreview;
  const part=fn(plan.chunks[i],{pitchHz,rate});
  const bytes=part.wav;
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(view.getUint32(24,true)!==SAMPLE_RATE||view.getUint16(22,true)!==1||view.getUint16(34,true)!==16||
    view.getUint32(40,true)!==bytes.length-44)throw new Error('Beklenmeyen PCM WAV biçimi.');
  const pcm=bytes.subarray(44);
  const silence=i?(delivery==='legacy'?JOIN_PAUSE_SAMPLES:Math.round(SAMPLE_RATE*plan.pausesMs[i-1]/1000))*2:0;
  count+=pcm.length+silence;
  if(count>SAMPLE_RATE*MAX_SECONDS*2)throw new RangeError('60 saniyelik deneysel ses sınırı aşıldı. Daha kısa metin kullanın.');
  blocks.push({pcm,silence});phonemeCount+=part.phonemeCount;
 }
 const combined=new Uint8Array(count);let index=0;
 for(const block of blocks){index+=block.silence;combined.set(block.pcm,index);index+=block.pcm.length;}
 return {wav:encodePcmWav(combined),sampleRate:SAMPLE_RATE,durationSeconds:count/(2*SAMPLE_RATE),
  chunkCount:blocks.length,phonemeCount,characterCount:plan.characterCount,wordCount:plan.wordCount,
  numberMode,delivery,contextMode,acousticModel,contextConversions:plan.contextConversions,localOnly:true,freeText:true,experimental:true,validatedIntelligibility:false};
}
