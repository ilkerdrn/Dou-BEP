/** v2.74 third, deliberately experimental acoustic contrast arm.
 * Deterministic bounded offline spectral post-filter for fricative contrasts.
 * Not a claim of improved intelligibility or a valid general-purpose TTS.
 */
import {synthesizeTurkishSpectralPreview} from './dou-speech-waveform.mjs';
import {planTurkishProsody} from './dou-speech-prosody.mjs';
export function synthesizeTurkishContrastPreview(text,{pitchHz=125,rate=1}={}){
 const source=synthesizeTurkishSpectralPreview(text,{pitchHz,rate});
 const plan=planTurkishProsody(text,{pitchHz,rate});
 const out=source.wav.slice();
 const view=new DataView(out.buffer,out.byteOffset,out.byteLength);
 if(view.getUint32(24,true)!==22050 || view.getUint16(22,true)!==1 || view.getUint16(34,true)!==16 ||
    view.getUint32(40,true)!==out.length-44)throw new Error('Desteklenmeyen PCM ses biçimi.');
 let offset=0,edited=0;
 for(const segment of plan.items){
  const {length,letter}=segment;
  if(['s','ş','ç','c','z'].includes(letter)){
   let low=0; const edge=Math.min(150,Math.floor(length/3));
   for(let i=0;i<length;i++){
    const p=44+2*(offset+i);
    const sample=view.getInt16(p,true)/32768;
    low+= (letter==='ş'?.22:.47)*(sample-low);
    // Increase high-frequency energy for s, preserve smoother mid-band noise for ş.
    const adjusted=letter==='ş'?(sample*.82+low*.19):(sample*.86+(sample-low)*.43);
    const blend=Math.min(1,(i+1)/(edge||1),(length-i)/(edge||1));
    const value=sample+(adjusted-sample)*blend;
    view.setInt16(p,Math.max(-32768,Math.min(32767,Math.round(value*32768))),true);
   }
   edited++;
  }
  offset+=length;
 }
 if(offset*2!==out.length-44)throw new Error('Fonem planı ile WAV süresi farklı.');
 return {...source,wav:out,contrastSegments:edited,contrastArm:true,validatedIntelligibility:false,experimental:true};
}
