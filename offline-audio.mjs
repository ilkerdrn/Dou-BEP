/** Optional, entirely local Turkish speech audio for an approved, anonymized exam.
 * Requirements: espeak + ffmpeg (libmp3lame), installed on the host. No cloud requests.
 * Synthetic speech is NOT a substitute for a human-reviewed accessible exam.
 */
import {spawn,spawnSync} from 'node:child_process';
import {createStudentPayload,narrationText} from './accessible-player.mjs';
import {fullAudioAllowed} from './question-access.mjs';

const maxTextLength=12500;
const maxMp3Bytes=12*1024*1024;
export function createAudioScript(exam){
 if(!fullAudioAllowed(exam))throw Error('En az bir soruda sesli okuma kapalı; tam sınav MP3 dosyası üretilemez.');
 const payload=createStudentPayload(exam); // strips keys, teacher notes, identities
 if(payload.questions.length>40)throw Error('MP3 için en fazla 40 soru desteklenir.');
 const parts=[`${payload.title}. ${payload.subject}. ${payload.grade}.`,payload.instruction||'Soruları dikkatle dinleyiniz.'];
 for(let i=0;i<payload.questions.length;i++)parts.push(narrationText(payload,i));
 const text=parts.join('\n\n').trim();
 if(text.length>maxTextLength)throw Error('MP3 metni çok uzun. Sınavı daha küçük bölümlere ayırın.');
 return text;
}
export function audioDependencies(){
 const es=spawnSync('espeak',['--version'],{timeout:2500,windowsHide:true});
 const ff=spawnSync('ffmpeg',['-version'],{timeout:2500,windowsHide:true});
 return {available:es.status===0&&ff.status===0,espeak:es.status===0,ffmpeg:ff.status===0};
}
export async function createExamMp3(exam,{timeoutMs=30000}={}){
 const text=createAudioScript(exam);
 if(!audioDependencies().available){const e=Error('MP3 üretimi için bu bilgisayarda eSpeak ve FFmpeg kurulu olmalı.');e.code='audio_unavailable';e.status=503;throw e;}
 return new Promise((resolve,reject)=>{
  const speaker=spawn('espeak',['--stdin','--stdout','-v','tr','-s','132'],{stdio:['pipe','pipe','pipe'],windowsHide:true});
  const encoder=spawn('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-f','wav','-i','pipe:0','-ar','22050','-ac','1','-codec:a','libmp3lame','-q:a','5','-f','mp3','pipe:1'],{stdio:['pipe','pipe','pipe'],windowsHide:true});
  let failed=false,spDone=false,enDone=false,bytes=0;const chunks=[];let stderr='';
  const timer=setTimeout(()=>finish(Error('Ses üretimi zaman aşımına uğradı.')),timeoutMs);
  const cleanup=()=>{clearTimeout(timer);speaker.kill();encoder.kill();};
  function finish(err){if(failed)return;failed=true;cleanup();if(err)reject(err);else resolve(Buffer.concat(chunks));}
  speaker.on('error',err=>finish(err));encoder.on('error',err=>finish(err));
  speaker.stderr.on('data',()=>{});encoder.stderr.on('data',b=>{stderr+=b.toString().slice(0,200);});
  speaker.stdout.pipe(encoder.stdin);
  speaker.stdout.on('error',err=>finish(err));
  encoder.stdin.on('error',err=>{if(!['EPIPE','ERR_STREAM_DESTROYED'].includes(err.code))finish(err);});
  encoder.stdout.on('data',b=>{bytes+=b.length;if(bytes>maxMp3Bytes){finish(Error('MP3 çıktı sınırı aşıldı.'));return;}chunks.push(b);});
  speaker.on('close',code=>{spDone=true;if(code!==0)finish(Error('Türkçe konuşma motoru başarısız oldu.'));else if(enDone)complete();});
  encoder.on('close',code=>{enDone=true;if(code!==0)finish(Error('MP3 kodlama başarısız oldu. '+stderr.slice(0,80)));else if(spDone)complete();});
  function complete(){if(!failed){if(bytes<1000)finish(Error('Boş ses çıktısı.'));else finish(null);}}
  speaker.stdin.on('error',err=>finish(err));speaker.stdin.end(text,'utf8');
 });
}
