/**
 * Strict deterministic acceptance for local Piper research PCM output.
 * A valid file is NOT proof that Turkish words were intelligible.
 * No audio playback, text input, logs, network, or persistence.
 */
export function inspectLocalSpeechPcm(wav, expectedSampleRate) {
 const fail=reason=>Object.freeze({valid:false,reason,validatedIntelligibility:false,productionApproved:false});
 if(!(wav instanceof Uint8Array)||wav.byteLength<46||
    wav.byteLength>2*1024*1024||!Number.isInteger(expectedSampleRate)||
    expectedSampleRate<8000||expectedSampleRate>48000)return fail('invalid-size-or-rate');
 const v=new DataView(wav.buffer,wav.byteOffset,wav.byteLength);
 const mark=(n)=>String.fromCharCode(...wav.subarray(n,n+4));
 if(mark(0)!=='RIFF'||mark(8)!=='WAVE'||mark(12)!=='fmt '||
    mark(36)!=='data'||v.getUint32(4,true)!==wav.byteLength-8||
    v.getUint32(16,true)!==16||v.getUint16(20,true)!==1||
    v.getUint16(22,true)!==1||v.getUint32(24,true)!==expectedSampleRate||
    v.getUint32(28,true)!==expectedSampleRate*2||
    v.getUint16(32,true)!==2||v.getUint16(34,true)!==16||
    v.getUint32(40,true)!==wav.byteLength-44||
    (wav.byteLength-44)%2!==0)return fail('invalid-pcm-header');
 const count=(wav.byteLength-44)/2;
 const duration=count/expectedSampleRate;
 if(duration<.15||duration>30)return fail('invalid-duration');
 let sum=0,peak=0,active=0,clip=0;
 for(let i=0;i<count;i++){
  const sample=Math.abs(v.getInt16(44+i*2,true))/32768;
  sum+=sample*sample;
  if(sample>peak)peak=sample;
  if(sample>=.999)clip++;
  if(sample>.01)active++;
 }
 const rms=Math.sqrt(sum/count);
 if(rms<.003||active/count<.01)return fail('silent-or-near-silent-output');
 if(clip>count*.01)return fail('excessive-clipping');
 return Object.freeze({
  valid:true,reason:'syntactically-valid-audible-pcm',
  sampleRate:expectedSampleRate,durationSeconds:Number(duration.toFixed(3)),
  rms:Number(rms.toFixed(5)),peak:Number(peak.toFixed(5)),
  activeRatio:Number((active/count).toFixed(4)),
  validatedIntelligibility:false,productionApproved:false
 });
}
