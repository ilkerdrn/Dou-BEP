/** v2.75 offline laboratory-only RMS leveling. Does NOT alter the three source
 * synthesizers. RMS is not LUFS and cannot establish human perceptual equality.
 * Never use this helper for clinical accessibility or NVDA speech output.
 */
const RATE=22050, MAX_BYTES=2_800_000;
export const LAB_TARGET_RMS=0.115;
export function levelRecognitionWav(wav,{targetRms=LAB_TARGET_RMS}={}){
 if(!(wav instanceof Uint8Array)||wav.length<46||wav.length>MAX_BYTES||wav.length%2!==0)
  throw new TypeError('Geçersiz WAV boyutu.');
 if(!(targetRms>=0.04&&targetRms<=0.2&&Number.isFinite(targetRms)))
  throw new RangeError('Hedef RMS desteklenmiyor.');
 const raw=new DataView(wav.buffer,wav.byteOffset,wav.byteLength);
 const tag=offset=>String.fromCharCode(...wav.subarray(offset,offset+4));
 if(tag(0)!=='RIFF'||tag(8)!=='WAVE'||tag(12)!=='fmt '||tag(36)!=='data'||
  raw.getUint32(4,true)!==wav.length-8||raw.getUint32(16,true)!==16||
  raw.getUint16(20,true)!==1||raw.getUint16(22,true)!==1||
  raw.getUint32(24,true)!==RATE||raw.getUint32(28,true)!==RATE*2||
  raw.getUint16(32,true)!==2||raw.getUint16(34,true)!==16||
  raw.getUint32(40,true)!==wav.length-44)
  throw new TypeError('Yalnız 22,05 kHz mono PCM16 WAV.');
 const count=(wav.length-44)/2;
 let sum=0,peak=0;
 for(let i=0;i<count;i++){
  const x=raw.getInt16(44+i*2,true)/32768;sum+=x*x;peak=Math.max(peak,Math.abs(x));
 }
 const rms=Math.sqrt(sum/count);
 if(rms<0.0001||peak<0.0001)throw new RangeError('Sessiz örnek dengelenemez.');
 // Conservative headroom; some quiet voices may be limited by peak.
 const gain=Math.min(targetRms/rms,0.9/peak,4.0);
 const out=wav.slice(),view=new DataView(out.buffer,out.byteOffset,out.byteLength);
 let normalizedPower=0,normalizedPeak=0;
 for(let i=0;i<count;i++){
  const x=raw.getInt16(44+i*2,true);
  const next=Math.max(-32768,Math.min(32767,Math.round(x*gain)));
  view.setInt16(44+i*2,next,true);
  const y=next/32768;normalizedPower+=y*y;normalizedPeak=Math.max(normalizedPeak,Math.abs(y));
 }
 const after=Math.sqrt(normalizedPower/count);
 return {wav:out,sampleRate:RATE,appliedGain:gain,beforeRms:rms,afterRms:after,
  beforePeak:peak,afterPeak:normalizedPeak,targetRms,
  reachedTarget:Math.abs(20*Math.log10(after/targetRms))<=0.5,
  localOnly:true,validatedIntelligibility:false,levelingType:'whole-clip-RMS-not-LUFS'};
}
