/** Experimental STDIN->WAV bridge for manual, opt-in NVDA driver research.
 * No network endpoints, cookies, file I/O, voice engines, recordings or logs.
 * Refuses input outside the bounded synthetic engine's contract.
 */
import {synthesizeLocalFreeText} from '../dou-speech-free-text.mjs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const MAX_REQUEST_BYTES=2048;
export function validateBridgeRequest(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['text','rate','pitchHz','acousticModel'].includes(k)))throw new TypeError('Invalid request');
 const {text,rate=1,pitchHz=125,acousticModel='legacy'}=value;
 if(typeof text!=='string'||[...text].length>260)throw new RangeError('Invalid length');
 if(!Number.isFinite(rate)||!Number.isFinite(pitchHz)||!['legacy','spectral'].includes(acousticModel))throw new RangeError('Invalid options');
 return {text,rate,pitchHz,acousticModel};
}
async function main(){
 try{
  const chunks=[];let length=0;
  for await(const chunk of process.stdin){
   length+=chunk.byteLength;
   if(length>MAX_REQUEST_BYTES)throw new RangeError('Request too large');
   chunks.push(chunk);
  }
  // Decode once with fatal UTF-8: Turkish characters may cross stdin chunks.
  const raw=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,length));
  const args=validateBridgeRequest(JSON.parse(raw));
  const result=synthesizeLocalFreeText(args.text,args);
  if(result.wav.length>3_000_000)throw new RangeError('WAV too large');
  process.stdout.write(Buffer.from(result.wav));
 }catch{process.stderr.write('DOU experimental bridge rejected request. No text logged.\n');process.exitCode=1;}
}
// fileURLToPath also handles Windows drive letters, spaces and non-ASCII paths.
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url)))await main();
