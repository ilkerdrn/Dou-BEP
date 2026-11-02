import net from 'node:net';
import {VERSION} from './core.mjs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
export async function probe(port=4173){
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Gecersiz port.');
 const occupied=await new Promise(resolve=>{
  const socket=net.connect({host:'127.0.0.1',port});
  let done=false;const finish=value=>{if(done)return;done=true;socket.destroy();resolve(value);};
  socket.setTimeout(1200);socket.once('connect',()=>finish(true));socket.once('error',e=>finish(e.code==='ECONNREFUSED'?false:true));socket.once('timeout',()=>finish(true));
 });
 if(!occupied)return 'free';
 try{const response=await fetch(`http://127.0.0.1:${port}/api/health`,{signal:AbortSignal.timeout(1200),redirect:'manual'});
  if(!response.ok)return 'other';
  const data=await response.json();
  const valid=data?.ok===true&&data?.scope==='local-only'&&/^2\.[0-9]+\.[0-9]+$/.test(data?.version||'');
  if(valid&&response.headers.get('x-dou-bep-local')==='1'&&data.version===VERSION)return 'bep';
  if(valid&&(response.headers.get('x-dou-bep-local')==='1'||data.version!==VERSION))return 'bep_legacy';
  return 'other';
 }catch{return 'other';}
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const result=await probe(Number(process.env.PORT)||4173);
 console.log({free:'[OK] 4173 portu bos.',bep:'[BILGI] DOU BEP zaten calisiyor. Yeni sunucu acilmiyor.',other:'[HATA] 4173 portunda baska bir uygulama calisiyor. Bu uygulama kapatilmadan DOU baslatilamaz.',bep_legacy:'[UYARI] 4173 portunda onceki DOU BEP surumu acik. Eski BASLAT penceresini kapatip yenisini acin.'}[result]);
 process.exitCode={free:0,bep:10,other:11,bep_legacy:12}[result];
}
