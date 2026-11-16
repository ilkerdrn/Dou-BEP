/**
 * Active Pocket TTS Turkish female_2 / male_1 reading for explicitly enabled localhost
 * SYNTHETIC student lab. No direct model downloads, browser storage, microphone
 * or arbitrary text submission. Server checks active bearer and question ID.
 * Normal exam mode remains Windows/Edge TTS or independent NVDA.
 */
export function attachPocketStudentReader({doc,win,getToken=()=>null,getQuestion=()=>null}={}){
 const picker=doc.getElementById('reader-engine');
 const voicePicker=doc.getElementById('reader-pocket-voice');
 const ratePicker=doc.getElementById('reader-rate');
 const allowedVoices=['female_2','male_1'];
 const status=doc.getElementById('reader-status');
 const fetcher=typeof win.fetch==='function'?win.fetch.bind(win):null;
 let available=false,request=null,player=null,url='',generation=0,destroyed=false;
 const updateStatus=text=>{if(status)status.textContent=text;};
 const disabled=()=>!available||!getQuestion()||getQuestion().audioAllowed===false;
 function stop(){
  generation++;
  if(request){request.abort();request=null;}
  if(player){try{player.pause();player.removeAttribute('src');player.load?.();}catch{}player=null;}
  if(url){win.URL.revokeObjectURL(url);url='';}
 }
 async function check(){
  if(destroyed||!picker||!fetcher)return false;
  try{
   const response=await fetcher('/api/pilot/speech-capability',{credentials:'omit',cache:'no-store'});
   if(destroyed)return false;
   const data=response.ok?await response.json():{};
   available=data.available===true;
   const voices=Array.isArray(data.voices)?data.voices:[];
   if(voicePicker){
    const permitted=allowedVoices.filter(v=>voices.includes(v));
    for(const option of voicePicker.options)option.disabled=!permitted.includes(option.value);
    if(!permitted.includes(voicePicker.value))voicePicker.value=permitted[0]||'female_2';
    voicePicker.disabled=!available||permitted.length===0;
    if(!permitted.length)available=false;
   }
  }catch{available=false;}
  if(!available&&voicePicker)voicePicker.disabled=true;
  if(!available&&picker.value==='pocket')picker.value='system';
  const pocketOption=[...picker.options].find(o=>o.value==='pocket');
  if(pocketOption)pocketOption.disabled=!available;
  picker.disabled=false;
  return available;
 }
 async function read(){
  if(destroyed||!picker||picker.value!=='pocket'||disabled())return false;
  const token=getToken(),q=getQuestion();
  const voice=voicePicker?.value||'female_2';
  if(!allowedVoices.includes(voice))return false;
  if(typeof token!=='string'||!token||!/^q\d{1,2}$/.test(q?.id||''))return false;
  stop();
  const current=generation,controller=new AbortController();
  request=controller;
  updateStatus('DOU Pocket TTS '+voice+', yalnız yerel NLP örnek sorusunu hazırlıyor…');
  try{
   const response=await fetcher('/api/pilot/speech',{
    method:'POST',credentials:'omit',cache:'no-store',signal:controller.signal,
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
    body:JSON.stringify({questionId:q.id,voice})
   });
   if(!response.ok){
    let code='speech_engine_failed';
    try{const error=await response.json();if(typeof error?.error==='string')code=error.error;}catch{}
    if(code==='speech_busy'||response.status===429)
     throw Error('speech_busy');
    if(code==='speech_timeout')throw Error('speech_timeout');
    if(code==='speech_audio_format')throw Error('speech_audio_format');
    if(code==='speech_text_limit')throw Error('speech_text_limit');
    throw Error('speech_engine_failed');
   }
   if(!String(response.headers?.get('Content-Type')||'').startsWith('audio/wav'))
    throw Error('invalid-media');
   const wav=await response.blob();
   if(destroyed||current!==generation||getQuestion()?.id!==q.id||
      getQuestion()?.audioAllowed===false)return false;
   if(wav.size<44||wav.size>5*1024*1024)throw Error('invalid-size');
   url=win.URL.createObjectURL(wav);
   player=new win.Audio(url);
   player.playbackRate=safeRate(ratePicker?.value);
   const playing=player;
   playing.addEventListener('ended',()=>{if(playing===player){
    stop();updateStatus('DOU Pocket TTS oynatımı tamamlandı; duyulabilirlik insan tarafından kontrol edilmelidir.');
   }},{once:true});
   playing.addEventListener('error',()=>{if(playing===player){
    stop();updateStatus('DOU Pocket TTS ses çıkışı başarısız. Windows ses aygıtını kontrol edin.');
   }},{once:true});
   request=null;
   await playing.play();
   if(current===generation){
    updateStatus('DOU Pocket TTS '+voice+', seçili anonim soruyu okuyor. Ağ hizmeti kullanılmadı.');
    return true;
   }
   return false;
  }catch(error){
   if(current===generation){
    const messages={
     speech_busy:'Önceki ses üretimi hâlâ sürüyor. Tamamlandıktan sonra Soruyu oku düğmesini tekrar deneyin.',
     speech_timeout:'Yerel ses üretimi zaman sınırını aştı. Daha kısa bir soruda tekrar deneyin.',
     speech_audio_format:'Ses üretildi ancak WAV biçimi geçersiz. Windows sistem sesi veya NVDA kullanılabilir.',
     speech_text_limit:'Bu soru deneysel seslendirme sınırını aşıyor. Yazılı soru kullanılabilir.'
    };
    stop();updateStatus(messages[error?.message]||'Yerel Pocket TTS sesi başlatılamadı. Windows sistem sesi veya NVDA ile devam edebilirsiniz.');
   }
   return false;
  }
 }
 function safeRate(value){const rate=Number(value);return [0.75,1,1.25,1.5].includes(rate)?rate:1;}
 function pause(){if(player&&!player.paused){player.pause();updateStatus('Pocket TTS oynatımı duraklatıldı.');return true;}return false;}
 async function resume(){if(!player||!player.paused)return false;
  const playing=player,current=generation;
  try{await playing.play();if(current===generation&&playing===player){updateStatus('Pocket TTS oynatımı sürdürüldü.');return true;}}
  catch{if(current===generation&&playing===player){stop();updateStatus('Pocket TTS oynatımı sürdürülemedi.');}}
  return false;
 }
 function setRate(){if(player)player.playbackRate=safeRate(ratePicker?.value);}
 function sync(){if(disabled())stop();}
 function onChange(){stop();sync();}
 if(picker)picker.addEventListener('change',onChange);
 if(voicePicker)voicePicker.addEventListener('change',onChange);
 if(ratePicker)ratePicker.addEventListener('change',setRate);
 return {read,check,stop,sync,pause,resume,get available(){return available;},get selected(){return picker?.value==='pocket';},
  destroy(){destroyed=true;stop();picker?.removeEventListener('change',onChange);voicePicker?.removeEventListener('change',onChange);ratePicker?.removeEventListener('change',setRate);}};
}
