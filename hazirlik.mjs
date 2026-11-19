/** Salon hazırlık kontrolü: her öğrenci bilgisayarında sınavdan önce çalıştırılır. Kimlik, kod, yanıt veya depolama yok. */
import {localTurkishVoices} from './dou-reader-core.mjs';
import {createNeuralSpeech,neuralSupported} from './dou-speech-neural.mjs';
const $=id=>document.getElementById(id);
const state={server:null,browser:null,voice:null,neural:null,sound:null,keys:null,screen:null};
const set=(key,ok,text)=>{state[key]=ok;$('s-'+key).textContent=(ok===true?'✓ Hazır. ':ok===false?'✗ Sorun var. ':'')+text;$('s-'+key).dataset.state=ok===true?'ok':ok===false?'bad':'info';summarize();};
function summarize(){
 const voiceOk=state.voice===true||state.neural===true;
 const required={'sunucu bağlantısı':state.server,'tarayıcı özellikleri':state.browser,'ses (yerel Türkçe ses veya çevrimdışı model)':voiceOk?true:(state.voice===null&&state.neural===null?null:false)};
 const bad=Object.entries(required).filter(([,v])=>v===false).map(([k])=>k),pending=Object.entries(required).filter(([,v])=>v===null).map(([k])=>k);
 const extra=[state.sound===false?'ses denemesi duyulmadı':'',state.keys===false?'kısayol tuşları yakalanmadı':'',state.screen===false?'ekran küçük':''].filter(Boolean);
 let text;
 if(bad.length)text='✗ Eksik var: '+bad.join(', ')+'. Salon görevlisine bildirin.';
 else if(pending.length)text='Henüz denenmedi: '+pending.join(', ')+'.';
 else text='✓ Bu bilgisayar sınava hazır.'+(extra.length?' Dikkat: '+extra.join(', ')+'.':'');
 $('summary').textContent=text;$('summary').dataset.state=bad.length?'bad':pending.length?'info':'ok';
}
const neural=neuralSupported(window)?createNeuralSpeech({win:window,onStatus:m=>{$('s-neural').textContent=m;}}):null;
async function checkServer(){
 set('server',null,'Deneniyor…');const times=[];
 try{for(let i=0;i<3;i++){const t=performance.now();const r=await fetch('/api/ping',{cache:'no-store',credentials:'omit'});if(!r.ok)throw Error('HTTP '+r.status);await r.json();times.push(performance.now()-t);}
  const med=[...times].sort((a,b)=>a-b)[1];set('server',med<1500,`Yanıt süresi ortalama ${Math.round(med)} ms.${med>=500?' Bağlantı yavaş; görevliye bildirin.':''}`);
 }catch(e){set('server',false,'Sunucuya ulaşılamıyor ('+e.message+'). Ağ kablosunu ve adresi kontrol edin.');}
}
function checkBrowser(){
 const need={'Web Worker':typeof Worker==='function','WebAssembly':typeof WebAssembly==='object','Ses (AudioContext)':!!(window.AudioContext||window.webkitAudioContext),'Seslendirme (speechSynthesis)':!!window.speechSynthesis};
 const missing=Object.entries(need).filter(([,v])=>!v).map(([k])=>k);
 // speechSynthesis alone is optional (the offline model needs Worker+WebAssembly+AudioContext).
 const fatal=missing.filter(m=>m!=='Seslendirme (speechSynthesis)');
 set('browser',fatal.length===0,fatal.length?'Eksik özellik: '+fatal.join(', ')+'. Güncel Chrome veya Edge kullanın.':'Gerekli özelliklerin hepsi var.'+(missing.length?' (Yerel seslendirme API\'si yok; çevrimdışı model kullanılacak.)':''));
}
function findVoices(){return localTurkishVoices(window.speechSynthesis?.getVoices?.()||[]);}
function checkVoice(){
 const v=findVoices();
 if(v.length)set('voice',true,'Yerel Türkçe ses bulundu: '+v.map(x=>x.name).join(', ')+'.');
 else set('voice',false,'Yerel Türkçe ses yok. 4. adımdaki çevrimdışı modeli hazırlayın (veya Windows Ayarlar > Zaman ve dil > Konuşma > Türkçe ses ekle).');
}
async function prepareNeural(){
 if(!neural){set('neural',false,'Bu tarayıcı çevrimdışı modeli çalıştıramıyor.');return;}
 const t=performance.now();set('neural',null,'Hazırlanıyor, bekleyin…');$('b-neural').disabled=true;
 try{await neural.preload();const r=await neural.synthesize('Merhaba.');set('neural',r.seconds>0.2,`Model hazır (${((performance.now()-t)/1000).toFixed(1)} sn). Bu bilgisayarın önbelleğinde kalır.`);}
 catch(e){set('neural',false,'Model hazırlanamadı: '+e.message);}
 finally{$('b-neural').disabled=false;}
}
async function trySound(){
 $('b-heard').disabled=false;$('b-notheard').disabled=false;set('sound',null,'Ses çalınıyor: "Merhaba. Bu bir ses denemesidir." Duydunuz mu?');
 const text='Merhaba. Bu bir ses denemesidir.';const v=findVoices()[0];
 if(v&&window.SpeechSynthesisUtterance){const u=new SpeechSynthesisUtterance(text);u.lang='tr-TR';u.voice=v;speechSynthesis.cancel();speechSynthesis.speak(u);}
 else if(neural){await neural.speak(text);}
 else set('sound',false,'Ses çalınamadı: ne yerel Türkçe ses ne de model var.');
}
$('b-heard').addEventListener('click',()=>{set('sound',true,'Sesi duydunuz.');$('b-heard').disabled=true;$('b-notheard').disabled=true;});
$('b-notheard').addEventListener('click',()=>{set('sound',false,'Ses duyulmadı. Kulaklık/hoparlör bağlantısını ve ses düzeyini kontrol edin; sorun sürerse görevliye bildirin.');$('b-heard').disabled=true;$('b-notheard').disabled=true;});
window.addEventListener('keydown',e=>{if(e.altKey&&e.shiftKey&&!e.ctrlKey&&!e.metaKey&&e.key.toLowerCase()==='t'){e.preventDefault();set('keys',true,'Alt+Shift+T tuşları algılandı; sınavdaki kısayollar bu bilgisayarda çalışır.');}});
function checkScreen(){
 const w=window.innerWidth,h=window.innerHeight,zoom=Math.round((window.devicePixelRatio||1)*100);
 set('screen',w>=700,`Pencere ${w}×${h}. Yakınlaştırma/ölçek yaklaşık %${zoom}.${w<700?' Pencere dar: tam ekran yapın veya yakınlaştırmayı azaltın.':''}`);
}
$('b-server').addEventListener('click',checkServer);$('b-browser').addEventListener('click',checkBrowser);$('b-voice').addEventListener('click',checkVoice);
$('b-neural').addEventListener('click',prepareNeural);$('b-sound').addEventListener('click',trySound);$('b-screen').addEventListener('click',checkScreen);
$('run-all').addEventListener('click',async()=>{$('run-all').disabled=true;await checkServer();checkBrowser();checkVoice();if(state.voice!==true)await prepareNeural();checkScreen();$('run-all').disabled=false;$('b-sound').focus();});
window.speechSynthesis?.addEventListener?.('voiceschanged',()=>{if(state.voice!==null)checkVoice();});
