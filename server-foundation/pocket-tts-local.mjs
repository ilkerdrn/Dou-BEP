/**
 * LOCAL Pocket TTS Turkish candidate adapter. Experiment only.
 * It accepts ONLY a readerText() result from a server-validated anonymous
 * synthetic pilot session, never arbitrary HTTP text or user answers.
 * Strict opt-in and permission checks reside in the API handler.
 *
 * CLI invocation: no shell, no student file paths, no stdout or log of text.
 * HF/transformers explicitly offline; network firewall remains an operator duty.
 * Temporary WAV files exist only for one request and are deleted after use.
 */
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,isAbsolute} from 'node:path';

const MAX_CHARS=1000;
const MAX_CHUNK=200;
const MAX_CHUNKS=6;
const MAX_WAV_BYTES=5*1024*1024;
let busy=false;

export function pocketSpeechGate(env=process.env){
 return env.BEP_PILOT_ONLY==='1'&&env.BEP_PILOT_CLASSIC_SAMPLE==='1'&&
  env.BEP_POCKET_TTS_EXPERIMENT==='1'&&env.BEP_POCKET_TTS_RESEARCH_ACK==='1'&&
  typeof env.BEP_POCKET_TTS_CLI==='string'&&isAbsolute(env.BEP_POCKET_TTS_CLI);
}
export function splitPocketText(text){
 if(typeof text!=='string'||text.length<1||text.length>MAX_CHARS||
  /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(text))
  throw new RangeError('Sentetik soru seslendirme metni sınır dışında.');
 const parts=[];let remaining=text.trim().replace(/\s+/g,' ');
 while(remaining){
  if(remaining.length<=MAX_CHUNK){parts.push(remaining);break;}
  let at=remaining.lastIndexOf(' ',MAX_CHUNK);
  if(at<MAX_CHUNK/2)throw new RangeError('Seslendirme için çok uzun boşluksuz ifade.');
  parts.push(remaining.slice(0,at).trim());
  remaining=remaining.slice(at).trim();
  if(parts.length>=MAX_CHUNKS)throw new RangeError('Seslendirme metni parça sınırını aşıyor.');
 }
 if(!parts.length||parts.length>MAX_CHUNKS)throw new RangeError('Seslendirme içeriği boş veya çok uzun.');
 return parts;
}
function decodePcm(wav){
 if(!Buffer.isBuffer(wav)||wav.length<44||wav.length>MAX_WAV_BYTES||
  wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE')
  throw new Error('Pocket TTS geçerli WAV üretmedi.');
 const dv=new DataView(wav.buffer,wav.byteOffset,wav.byteLength);
 let pos=12,format=null,data=null;
 while(pos+8<=wav.length){
  const tag=wav.toString('ascii',pos,pos+4);
  const len=dv.getUint32(pos+4,true),end=pos+8+len;
  if(end>wav.length)throw new Error('WAV chunk uzunluğu bozuk.');
  if(tag==='fmt '){
   if(len<16)throw new Error('WAV formatı eksik.');
   format={code:dv.getUint16(pos+8,true),channels:dv.getUint16(pos+10,true),
    rate:dv.getUint32(pos+12,true),bits:dv.getUint16(pos+22,true)};
  }
  if(tag==='data')data=wav.subarray(pos+8,end);
  pos=end+(len%2);
 }
 if(!format||!data||!data.length||format.channels!==1||
    format.rate<16000||format.rate>48000||
    !((format.code===1&&format.bits===16)||(format.code===3&&format.bits===32)))
  throw new Error('Pocket TTS yalnız mono PCM16 veya Float32 WAV ile pilot ses verebilir.');
 if(format.code===3){
  if(data.length%4)throw new Error('Float32 WAV veri boyutu bozuk.');
  // Some generators save float32 WAV; convert in memory to PCM16 for merging.
  const floatView=new DataView(data.buffer,data.byteOffset,data.byteLength);
  const converted=Buffer.alloc((data.length/4)*2);
  for(let i=0;i<data.length/4;i++){
   const v=floatView.getFloat32(i*4,true);
   if(!Number.isFinite(v))throw new Error('Float32 WAV geçersiz ses örneği.');
   converted.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),i*2);
  }
  data=converted;
 }else if(data.length%2)throw new Error('PCM16 WAV veri boyutu bozuk.');
 return {format:{code:1,channels:1,rate:format.rate,bits:16},data};
}
function combinePcm(samples){
 const a=samples[0].format;
 if(samples.some(s=>JSON.stringify(s.format)!==JSON.stringify(a)))
  throw new Error('Pocket TTS WAV parçalarının ses biçimleri farklı.');
 const pauseBytes=Math.floor(a.rate*0.12)*2;
 const count=samples.reduce((n,s)=>n+s.data.length,0)+pauseBytes*(samples.length-1);
 if(count>MAX_WAV_BYTES-44)throw new Error('Pocket TTS WAV boyutu sınırı aşıldı.');
 const out=Buffer.alloc(44+count),v=new DataView(out.buffer,out.byteOffset,out.byteLength);
 out.write('RIFF',0,'ascii');v.setUint32(4,out.length-8,true);
 out.write('WAVE',8,'ascii');out.write('fmt ',12,'ascii');v.setUint32(16,16,true);
 v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,a.rate,true);
 v.setUint32(28,a.rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);
 out.write('data',36,'ascii');v.setUint32(40,count,true);
 let offset=44;
 for(const [i,s] of samples.entries()){
  if(i)offset+=pauseBytes;
  s.data.copy(out,offset);offset+=s.data.length;
 }
 return out;
}
async function defaultRunner(chunk,out,{cli,folder}){
 const args=['generate','--text',chunk,'--voice','female_2','--emotion','sakin','-o',out];
 await new Promise((resolve,reject)=>{
  const child=spawn(cli,args,{
   cwd:folder,shell:false,windowsHide:true,stdio:'ignore',
   env:{...process.env,HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1',
    HF_DATASETS_OFFLINE:'1',TOKENIZERS_PARALLELISM:'false'}
  });
  let finished=false;
  const limit=setTimeout(()=>{if(!finished)child.kill();},60000);
  child.once('error',err=>{finished=true;clearTimeout(limit);reject(err);});
  child.once('close',(code)=>{if(finished)return;finished=true;clearTimeout(limit);
   if(code!==0)reject(Error('Yerel Pocket TTS sentezi başarısız oldu veya süresi doldu.'));
   else resolve();
  });
 });
}
/** runner injection is for isolated deterministic tests only. */
export async function synthesizePocketQuestion(text,{cli=process.env.BEP_POCKET_TTS_CLI,runner=defaultRunner}={}){
 if(busy)throw new Error('Pocket TTS motoru zaten bir soruyu seslendiriyor.');
 if(!cli||!isAbsolute(cli))throw new Error('Yerel Pocket TTS komut yolu tanımlanmadı.');
 const chunks=splitPocketText(text);
 busy=true;
 let folder=null;
 try{
  const check=await stat(cli);
  if(!check.isFile())throw new Error('Pocket TTS komutu bulunamadı.');
  folder=await mkdtemp(join(tmpdir(),'dou-pocket-pilot-'));
  const samples=[];
  for(const [i,chunk] of chunks.entries()){
   const output=join(folder,'speech-'+i+'.wav');
   await runner(chunk,output,{cli,folder});
   const bytes=await readFile(output);
   samples.push(decodePcm(bytes));
  }
  return combinePcm(samples);
 }finally{
  if(folder)await rm(folder,{recursive:true,force:true,maxRetries:4,retryDelay:100});
  busy=false;
 }
}
