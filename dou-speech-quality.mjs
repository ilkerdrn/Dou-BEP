/** v2.46 objective PCM-WAV safety measurements for synthetic acoustic research.
 * NOT a MOS, intelligibility, naturalness, phoneme accuracy or human evaluation.
 * Does not persist, transmit or label source text, and never plays audio.
 */
export function inspectSpeechWaveform(wav){
 if(!(wav instanceof Uint8Array)||wav.byteLength<46||wav.byteLength>22050*16*2+44)throw new RangeError('Beklenmeyen WAV verisi boyutu.');
 const read=where=>String.fromCharCode(...wav.subarray(where,where+4));
 const view=new DataView(wav.buffer,wav.byteOffset,wav.byteLength);
 if(read(0)!=='RIFF'||read(8)!=='WAVE'||read(12)!=='fmt '||read(36)!=='data' ||
  view.getUint32(4,true)!==wav.byteLength-8||view.getUint16(20,true)!==1||
  view.getUint16(22,true)!==1||view.getUint16(32,true)!==2||view.getUint32(16,true)!==16||
  view.getUint16(34,true)!==16||view.getUint32(24,true)!==22050||
  view.getUint32(40,true)!==wav.byteLength-44|| (wav.byteLength-44)%2!==0){
  throw new RangeError('22.050 Hz mono 16-bit PCM WAV bekleniyor.');
 }
 const count=(wav.byteLength-44)/2;if(!count)throw new RangeError('Boş ses verisi.');
 let energy=0,peak=0,clipped=0,active=0,zeros=0,last=0,deltaPeak=0;
 for(let i=0;i<count;i++){
  const sample=view.getInt16(44+i*2,true)/32768;
  const abs=Math.abs(sample);
  energy+=sample*sample;peak=Math.max(peak,abs);
  if(abs>=.999)clipped++;
  if(abs>.01)active++;
  if(i&&sample*last<0)zeros++;
  if(i)deltaPeak=Math.max(deltaPeak,Math.abs(sample-last));
  last=sample;
 }
 return {sampleRate:22050,durationSeconds:count/22050,
  peak:Math.round(peak*10000)/10000,rms:Math.round(Math.sqrt(energy/count)*10000)/10000,
  clippedSamples:clipped,activeRatio:Math.round(active/count*10000)/10000,
  zeroCrossings:zeros,maxStep:Math.round(deltaPeak*10000)/10000,
  objectiveOnly:true,validatedIntelligibility:false};
}
