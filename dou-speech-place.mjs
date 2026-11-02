/** v2.76: separate, bounded offline experiment for Turkish stop/affricate place cues.
 * Deterministic release + low/mid/high-band envelopes. Not measured or validated
 * phonetic synthesis. Keeps the earlier acoustic arms byte-identical.
 */
import {synthesizeTurkishSpectralPreview} from './dou-speech-waveform.mjs';
import {planTurkishProsody} from './dou-speech-prosody.mjs';
const RATE=22050;
const CUES=Object.freeze({
 b:{ms:13,center:600,noise:.12,voicing:.30},
 d:{ms:16,center:2500,noise:.16,voicing:.22},
 g:{ms:20,center:1600,noise:.14,voicing:.25},
 k:{ms:25,center:3000,noise:.20,voicing:0},
 c:{ms:25,center:2100,noise:.19,voicing:.20},
 ç:{ms:36,center:3100,noise:.26,voicing:0}
});
function boundedInt16(value){return Math.max(-32768,Math.min(32767,Math.round(value)));}
function validatePcm(wav){
 if(!(wav instanceof Uint8Array)||wav.length<46||wav.length%2||wav.length>22050*16*2+44)throw new RangeError('Geçersiz WAV boyutu.');
 const v=new DataView(wav.buffer,wav.byteOffset,wav.byteLength);
 const tag=(p)=>String.fromCharCode(...wav.subarray(p,p+4));
 if(tag(0)!=='RIFF'||tag(8)!=='WAVE'||tag(12)!=='fmt '||tag(36)!=='data'||
 v.getUint32(4,true)!==wav.length-8||v.getUint32(16,true)!==16||v.getUint16(20,true)!==1||
 v.getUint16(22,true)!==1||v.getUint32(24,true)!==RATE||v.getUint32(28,true)!==RATE*2||
 v.getUint16(32,true)!==2||v.getUint16(34,true)!==16||v.getUint32(40,true)!==wav.length-44)
 throw new Error('Desteklenmeyen yerel PCM WAV biçimi.');
 return v;
}
export function synthesizeTurkishPlacePreview(text,{pitchHz=125,rate=1}={}){
 const source=synthesizeTurkishSpectralPreview(text,{pitchHz,rate});
 const plan=planTurkishProsody(text,{pitchHz,rate});
 const wav=source.wav.slice();const view=validatePcm(wav);
 let offset=0,edited=0,seed=0x71fa2026;
 const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return ((seed>>>0)/2147483648)-1;};
 for(const item of plan.items){
  if(!Number.isInteger(item.length)||item.length<0||offset+item.length>(wav.length-44)/2)throw new Error('Ses planı sınırı aşıldı.');
  const cue=CUES[item.letter];
  if(cue&&item.kind!=='silence'){
   const frames=Math.min(item.length,Math.round(RATE*cue.ms/1000));
   // Two stable low-pass filters yield a bounded differentiator emphasizing
   // a broad spectral region; this is NOT a measured human formant target.
   const slowA=1-Math.exp(-2*Math.PI*Math.min(cue.center*.65,RATE*.42)/RATE);
   const fastA=1-Math.exp(-2*Math.PI*Math.min(cue.center*1.5,RATE*.45)/RATE);
   let slow=0,fast=0;
   for(let i=0;i<frames;i++){
    const sample=view.getInt16(44+2*(offset+i),true)/32768;
    const noise=rand();slow+=slowA*(noise-slow);fast+=fastA*(noise-fast);
    const band=fast-slow;
    const fade=Math.sin(Math.PI*(i+.5)/frames)**2;
    const release=(band*cue.noise+Math.sin(2*Math.PI*110*i/RATE)*cue.voicing*.08)*fade;
    view.setInt16(44+2*(offset+i),boundedInt16((sample*(1-.05*fade)+release)*32768),true);
   }
   edited++;
  }
  offset+=item.length;
 }
 if(offset*2!==wav.length-44)throw new Error('Fonem ve WAV uzunluğu eşleşmiyor.');
 return {...source,wav,placeCueSegments:edited,placeArm:true,
  experimental:true,validatedIntelligibility:false,accessibleReaderReady:false};
}
