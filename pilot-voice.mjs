/** Sesli yanıt (yalnız kurumun onayladığı adaylar): mikrofonla kayıt, sunucuya yükleme, öğretmene dinletme.
 * Ses metne ÇEVRİLMEZ ve puanlanmaz; üçüncü taraf/bulut yok. Tarayıcı depolaması kullanılmaz; kayıt yalnız oturum anahtarıyla yüklenir.
 * Mikrofon yalnız güvenli bağlamda (https veya localhost) kullanılabilir. DOM yalnız textContent ile kurulur. */
export const VOICE_MAX_SECONDS=180;
const MIMES=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4'];
export function createVoice({doc,win,getToken,announce,onChange=()=>{},beforeRecord=()=>{}}){
 let enabled=false,meta={},consent=false,locked=false,rec=null;
 const boxes=new Set();
 const el=(tag,text,cls)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const supported=()=>!!(win.navigator?.mediaDevices?.getUserMedia)&&typeof win.MediaRecorder==='function';
 const pickMime=()=>MIMES.find(t=>{try{return win.MediaRecorder.isTypeSupported(t);}catch{return false;}})||'';
 function beep(freq){try{const AC=win.AudioContext||win.webkitAudioContext;const c=new AC();const o=c.createOscillator(),g=c.createGain();o.frequency.value=freq;g.gain.value=.12;o.connect(g);g.connect(c.destination);o.start();setTimeout(()=>{try{o.stop();c.close();}catch{}},180);}catch{}}
 async function call(method,qid,body,headers={}){
  const r=await win.fetch('/api/pilot/voice/'+qid,{method,credentials:'omit',headers:{Authorization:'Bearer '+getToken(),...headers},body});
  if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.message||'Ses isteği işlenemedi.');}
  return r;
 }
 function paint(){
  for(const b of boxes){
   const qid=b.dataset.qid,rec_=rec&&rec.qid===qid,has=!!meta[qid];
   b.querySelector('.v-start').disabled=locked||!!rec||!supported();
   b.querySelector('.v-stop').disabled=!rec_;
   b.querySelector('.v-play').disabled=!has||!!rec;
   b.querySelector('.v-del').disabled=locked||!has||!!rec;
   b.querySelector('.v-consent').checked=consent;
  }
 }
 function say(box,text,error=false){const s=box.querySelector('.v-status');s.textContent=text;s.className='v-status'+(error?' err':'');announce(text,error);}
 async function start(box){
  const qid=box.dataset.qid;
  if(locked||rec)return;
  if(!supported()){say(box,'Bu bağlantıda mikrofon kullanılamıyor (güvenli bağlantı, yani https veya localhost gerekir). Yazılı yanıt veya yazıcı desteğini kullanın.',true);return;}
  if(!consent){say(box,'Önce sesimin kaydedilmesini ve öğretmenimce dinlenmesini kabul ettiğinizi belirten kutuyu işaretleyin.',true);box.querySelector('.v-consent').focus();return;}
  beforeRecord();
  let stream;
  try{stream=await win.navigator.mediaDevices.getUserMedia({audio:true});}
  catch{say(box,'Mikrofon izni verilmedi veya mikrofon bulunamadı. Yazılı yanıt veya yazıcı desteğini kullanın.',true);return;}
  const mime=pickMime();let recorder;
  try{recorder=mime?new win.MediaRecorder(stream,{mimeType:mime}):new win.MediaRecorder(stream);}
  catch{for(const t of stream.getTracks())t.stop();say(box,'Bu tarayıcı ses kaydı yapamıyor. Yazılı yanıt veya yazıcı desteğini kullanın.',true);return;}
  const chunks=[];const startedAt=Date.now();
  rec={qid,recorder,stream,chunks,startedAt,box};
  recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
  rec.done=new Promise(resolve=>{recorder.onstop=async()=>{
   for(const t of stream.getTracks())t.stop();
   clearTimeout(rec?.limit);const mine=rec;rec=null;
   const seconds=Math.min(VOICE_MAX_SECONDS,Math.round((Date.now()-startedAt)/1000));
   try{
    const type=(recorder.mimeType||mime||'audio/webm').split(';')[0];const blob=new win.Blob(chunks,{type});
    if(!blob.size)throw new Error('Ses kaydı boş kaldı. Tekrar deneyin.');
    await call('PUT',qid,blob,{'Content-Type':type,'X-Voice-Seconds':String(seconds)});
    meta[qid]={seconds,bytes:blob.size};beep(440);say(mine.box,`Sesli yanıtınız kaydedildi (${seconds} saniye). Dinlemek için Kaydı dinle, yeniden kaydetmek için Kaydı başlat düğmesini kullanın.`);
   }catch(e){say(mine.box,'Ses kaydı kaydedilemedi: '+e.message+' Yeniden deneyin veya yazılı yanıt kullanın.',true);}
   paint();onChange();resolve();};});
  recorder.start();rec.limit=setTimeout(()=>stop(),VOICE_MAX_SECONDS*1000);
  beep(880);say(box,`Kayıt başladı. Konuşabilirsiniz. Durdurmak için Kaydı durdur düğmesine veya Alt Shift K tuşlarına basın. En çok ${VOICE_MAX_SECONDS/60} dakika kaydedilir.`);paint();
 }
 function stop(){if(!rec)return Promise.resolve();const r=rec;try{r.recorder.state!=='inactive'&&r.recorder.stop();}catch{}return r.done;}
 async function play(box){
  const qid=box.dataset.qid;
  try{const r=await call('GET',qid);const blob=await r.blob();const url=win.URL.createObjectURL(blob);const a=new win.Audio(url);a.onended=()=>win.URL.revokeObjectURL(url);say(box,'Kaydınız oynatılıyor.');await a.play();}
  catch(e){say(box,'Kayıt oynatılamadı: '+e.message,true);}
 }
 async function del(box){
  const qid=box.dataset.qid;
  try{await call('DELETE',qid);delete meta[qid];say(box,'Sesli yanıt silindi.');paint();onChange();}catch(e){say(box,'Silinemedi: '+e.message,true);}
 }
 function build(q){
  const box=el('div','','voice-box');box.dataset.qid=q.id;box.setAttribute('role','group');box.setAttribute('aria-label','Soru '+q.number+' için sesli yanıt');
  box.append(el('h3','Sesli yanıt'),el('p','Bu soruyu yazmak yerine sesinizle yanıtlayabilirsiniz. Sesiniz yazıya çevrilmez; yalnızca öğretmeniniz dinler ve sınav verileriyle birlikte saklama süresi sonunda silinir. Kaydı başlatmak veya durdurmak için Alt Shift K.','muted'));
  const lab=el('label','','v-consent-label');const cb=el('input');cb.type='checkbox';cb.className='v-consent';cb.autocomplete='off';
  cb.addEventListener('change',()=>{consent=cb.checked;paint();});lab.append(cb,doc.createTextNode(' Sesimin kaydedilmesini ve öğretmenimce dinlenmesini kabul ediyorum.'));box.append(lab);
  const row=el('div','','inline');
  for(const [cls,label,fn] of [['v-start','Kaydı başlat',()=>start(box)],['v-stop','Kaydı durdur',()=>stop()],['v-play','Kaydı dinle',()=>play(box)],['v-del','Kaydı sil',()=>del(box)]]){
   const b=el('button',label,cls+(cls==='v-start'?'':' ghost'));b.type='button';b.addEventListener('click',fn);row.append(b);}
  box.append(row);const st=el('p','','v-status');st.setAttribute('role','status');st.setAttribute('aria-live','polite');box.append(st);
  if(meta[q.id])st.textContent=`Kayıtlı sesli yanıtınız var (${meta[q.id].seconds} saniye).`;
  else if(!supported())st.textContent='Bu bağlantıda mikrofon kullanılamıyor (https veya localhost gerekir). Yazılı yanıt veya yazıcı desteğini kullanın.';
  boxes.add(box);paint();return box;
 }
 return {
  configure({enabled:e,meta:m}){enabled=!!e;meta=m&&typeof m==='object'?{...m}:{};boxes.clear();rec=null;consent=false;locked=false;},
  get enabled(){return enabled;},build,stop,has:qid=>!!meta[qid],seconds:qid=>meta[qid]?.seconds||0,
  get recording(){return !!rec;},
  lock(){locked=true;const p=stop();paint();return p;},
  toggleCurrent(){const box=[...boxes].find(b=>b.isConnected&&b.offsetParent!==null);if(!box)return false;if(rec)stop();else start(box);return true;},
  reset(){boxes.clear();}
 };
}
