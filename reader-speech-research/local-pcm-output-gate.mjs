/**
 * Bounded, strict RIFF/WAVE PCM16 mono inspection for offline speech research.
 * Accepts normal FFmpeg metadata chunks (e.g. LIST/INFO) and odd chunk padding.
 * Rejects malformed boundaries, duplicates, mismatched format and extra bytes.
 * Signal validity never proves intelligibility or production readiness.
 */
export function inspectLocalSpeechPcm(wav, expectedSampleRate) {
 const fail=reason=>Object.freeze({valid:false,reason,validatedIntelligibility:false,productionApproved:false});
 if(!(wav instanceof Uint8Array)||wav.byteLength<46||
    wav.byteLength>2*1024*1024||!Number.isInteger(expectedSampleRate)||
    expectedSampleRate<8000||expectedSampleRate>48000)return fail('invalid-size-or-rate');

 const v=new DataView(wav.buffer,wav.byteOffset,wav.byteLength);
 const mark=offset=>String.fromCharCode(...wav.subarray(offset,offset+4));
 if(mark(0)!=='RIFF'||mark(8)!=='WAVE'||v.getUint32(4,true)!==wav.byteLength-8)
  return fail('invalid-pcm-header');

 let offset=12,formatFound=false,dataFound=false,dataOffset=0,dataSize=0;
 let chunkCount=0;
 while(offset<wav.byteLength){
  if(++chunkCount>64||offset+8>wav.byteLength)return fail('invalid-pcm-header');
  const type=mark(offset);
  const length=v.getUint32(offset+4,true);
  const start=offset+8;
  const end=start+length;
  const paddedEnd=end+(length%2);
  if(!Number.isSafeInteger(end)||paddedEnd>wav.byteLength)
   return fail('invalid-pcm-header');
  if(type==='fmt '){
   if(formatFound||length!==16)return fail('invalid-pcm-header');
   formatFound=true;
   if(v.getUint16(start,true)!==1||v.getUint16(start+2,true)!==1||
      v.getUint32(start+4,true)!==expectedSampleRate||
      v.getUint32(start+8,true)!==expectedSampleRate*2||
      v.getUint16(start+12,true)!==2||v.getUint16(start+14,true)!==16)
    return fail('invalid-pcm-header');
  }else if(type==='data'){
   if(dataFound||!formatFound||length===0||length%2!==0)
    return fail('invalid-pcm-header');
   dataFound=true;dataOffset=start;dataSize=length;
  }else{
   // Only known non-audio metadata chunks; reject unknown or hidden audio.
   if(!['LIST','JUNK','fact','bext','iXML','id3 ','ID3 '].includes(type))
    return fail('invalid-pcm-header');
  }
  offset=paddedEnd;
 }
 if(!formatFound||!dataFound||offset!==wav.byteLength)return fail('invalid-pcm-header');

 const count=dataSize/2;
 const duration=count/expectedSampleRate;
 if(duration<.15||duration>30)return fail('invalid-duration');
 let sum=0,peak=0,active=0,clip=0;
 for(let i=0;i<count;i++){
  const sample=Math.abs(v.getInt16(dataOffset+i*2,true))/32768;
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
