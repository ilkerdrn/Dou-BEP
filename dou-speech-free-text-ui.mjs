/** DOU Speech Lab v2.70 — user-triggered, memory-only, local audio experiment.
 * Does not access network, device microphone, persistent storage or personal data APIs.
 */
import {synthesizeLocalFreeText,planLocalFreeText,FREE_TEXT_MAX_CHARACTERS} from './dou-speech-free-text.mjs';
const $=id=>document.getElementById(id);
const input=$('free-text-input'),status=$('free-text-status');
const play=$('free-text-play'),download=$('free-text-download'),stop=$('free-text-stop'),clear=$('free-text-clear'),preview=$('free-text-preview');
const count=$('free-text-count'),pronunciation=$('free-text-pronunciation');
const options=['free-text-rate','free-text-pitch','free-text-number-mode','free-text-delivery','free-text-context-mode','free-text-acoustic-model'];
let audio=null,previewUrl=null,lastWav=null,busy=false,generation=0;
const describe=(message,isError=false)=>{status.textContent=message;status.dataset.state=isError?'error':'ready';};
function releasePreview(){
 if(audio){audio.pause();audio.removeAttribute('src');audio.load();audio=null;}
 if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}
}
function forget(){releasePreview();lastWav=null;download.disabled=true;pronunciation.textContent='';}
function invalidate(){generation++;forget();}
function stopPlayback(){generation++;if(audio){audio.pause();audio.currentTime=0;}describe('Yerel ses durduruldu. Metin cihazınızdan gönderilmedi.');}
function readyState(){
 const used=[...input.value].length;count.textContent=`${used} / ${FREE_TEXT_MAX_CHARACTERS} karakter`;
 play.disabled=busy||!input.value.trim()||used>FREE_TEXT_MAX_CHARACTERS;
 preview.disabled=busy||!input.value.trim()||used>FREE_TEXT_MAX_CHARACTERS;
}
function parameters(){return {
 rate:Number($('free-text-rate').value),pitchHz:Number($('free-text-pitch').value),
 numberMode:$('free-text-number-mode').value,delivery:$('free-text-delivery').value,
 contextMode:$('free-text-context-mode').value,acousticModel:$('free-text-acoustic-model').value
};}
input.addEventListener('input',()=>{invalidate();readyState();describe('Metin değişti. Sesi yeniden oluşturabilirsiniz.');});
for(const id of options)$(id).addEventListener('change',()=>{
 invalidate();readyState();describe('Ses ayarı değişti. Yeni ses için “WAV üret ve dinle”yi seçin.');
});
preview.addEventListener('click',()=>{
 try{
  const plan=planLocalFreeText(input.value,parameters());
  pronunciation.textContent=`Planlanan okunuş (yaklaşık): ${plan.expanded}`;
  describe(`${plan.wordCount} sözcük; ${plan.contextConversions} bağlamsal dönüşüm. Bu okunuş, telaffuz doğrulaması değildir.`);
 }catch(e){pronunciation.textContent='';describe(e instanceof Error?e.message:'Önizleme oluşturulamadı.',true);}
});
play.addEventListener('click',async()=>{
 if(busy)return;
 busy=true;const request=++generation;readyState();
 describe('Örnek metin yalnız cihazınızda çözümleniyor ve robotik WAV hesaplanıyor.');
 try{
  // Render the status before CPU-bound local synthesis. If the user navigates
  // away or changes input before the frame, do not synthesize stale text.
  await new Promise(resolve=>requestAnimationFrame(resolve));
  if(request!==generation)return;
  document.dispatchEvent(new Event('dou-speech-lab-stop'));
  forget();
  const args=parameters();const plan=planLocalFreeText(input.value,args);
  const result=synthesizeLocalFreeText(input.value,args);
  if(request!==generation)return;
  lastWav=result.wav;
  pronunciation.textContent=`Planlanan okunuş (yaklaşık): ${plan.expanded}`;
  previewUrl=URL.createObjectURL(new Blob([lastWav],{type:'audio/wav'}));
  audio=new Audio(previewUrl);const current=audio;
  current.addEventListener('ended',()=>{if(audio===current)describe('Robotik WAV tamamlandı. Anlaşılabilir Türkçe TTS olduğu doğrulanmadı.');},{once:true});
  current.addEventListener('error',()=>{if(audio===current)describe('Tarayıcı yerel WAV oynatamadı. Dosyayı indirebilirsiniz.',true);},{once:true});
  download.disabled=false;
  describe(`${result.wordCount} sözcük · ${result.chunkCount} ses parçası · ${result.durationSeconds.toFixed(1)} sn. ${args.numberMode==='cardinal'?'Tam sayı':'Rakam'} okunuşu, ${args.delivery==='phrased'?'cümle duraklaması':'eski ritim'} seçildi. Ses robotik ve doğrulanmamıştır.`);
  try{await current.play();}catch{if(audio===current)describe('Ses otomatik başlatılamadı. WAV dosyasını indirebilir veya yeniden deneyebilirsiniz.',true);}
 }catch(e){forget();describe(e instanceof RangeError||e instanceof TypeError?e.message:'Yerel WAV üretilemedi. Kısa bir anonim örnek metin deneyin.',true);}
 finally{busy=false;readyState();}
});
stop.addEventListener('click',stopPlayback);
clear.addEventListener('click',()=>{input.value='';invalidate();readyState();describe('Metin ve WAV bu sekmenin belleğinden temizlendi.');input.focus();});
download.addEventListener('click',()=>{
 if(!lastWav)return;
 const objectUrl=URL.createObjectURL(new Blob([lastWav],{type:'audio/wav'}));
 const a=document.createElement('a');a.href=objectUrl;a.download='DOU-Speech-v2.71-Deneysel-Turkce.wav';
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(objectUrl),2000);
});
document.addEventListener('dou-free-text-stop',stopPlayback);
window.addEventListener('pagehide',invalidate);
readyState();
