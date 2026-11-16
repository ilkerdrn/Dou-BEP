/**
 * Active Pocket TTS Turkish female_2 reading for explicitly enabled localhost
 * SYNTHETIC student lab. No direct model downloads, browser storage, microphone
 * or arbitrary text submission. Server checks active bearer and question ID.
 * Normal exam mode remains Windows/Edge TTS or independent NVDA.
 */
export function attachPocketStudentReader({doc,win,getToken=()=>null,getQuestion=()=>null}={}){
 const picker=doc.getElementById('reader-engine');
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
  }catch{available=false;}
  if(!available&&picker.value==='pocket')picker.value='system';
  const pocketOption=[...picker.options].find(o=>o.value==='pocket');
  if(pocketOption)pocketOption.disabled=!available;
  picker.disabled=false;
  return available;
 }
 async function read(){
  if(destroyed||!picker||picker.value!=='pocket'||disabled())return false;
  const token=getToken(),q=getQuestion();
  if(typeof token!=='string'||!token||!/^q\d{1,2}$/.test(q?.id||''))return false;
  stop();
  const current=generation,controller=new AbortController();
  request=controller;
  updateStatus('DOU Pocket TTS kadın sesi, yalnız yerel NLP örnek sorusunu hazırlıyor…');
  try{
   const response=await fetcher('/api/pilot/speech',{
    method:'POST',credentials:'omit',cache:'no-store',signal:controller.signal,
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
    body:JSON.stringify({questionId:q.id})
   });
   if(!response.ok)throw Error('synthesis');
   if(!String(response.headers?.get('Content-Type')||'').startsWith('audio/wav'))
    throw Error('invalid-media');
   const wav=await response.blob();
   if(destroyed||current!==generation||getQuestion()?.id!==q.id||
      getQuestion()?.audioAllowed===false)return false;
   if(wav.size<44||wav.size>5*1024*1024)throw Error('invalid-size');
   url=win.URL.createObjectURL(wav);
   player=new win.Audio(url);
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
    updateStatus('DOU Pocket TTS female_2, seçili anonim soruyu okuyor. Ağ hizmeti kullanılmadı.');
    return true;
   }
   return false;
  }catch{
   if(current===generation){
    stop();updateStatus('Yerel Pocket TTS sesi başlatılamadı. Windows sistem sesi veya NVDA ile devam edebilirsiniz.');
   }
   return false;
  }
 }
 function sync(){if(disabled())stop();}
 function onChange(){stop();sync();}
 if(picker)picker.addEventListener('change',onChange);
 return {read,check,stop,sync,get available(){return available;},get selected(){return picker?.value==='pocket';},
  destroy(){destroyed=true;stop();picker?.removeEventListener('change',onChange);}};
}
