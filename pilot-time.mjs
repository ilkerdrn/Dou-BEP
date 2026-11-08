/** Display-only local pilot timer. Server remains authoritative for expiry. */
export function pilotTimeState(expiresAt,clock=Date.now()){
 if(!Number.isFinite(expiresAt)||!Number.isFinite(clock)||expiresAt<=0)
  return {phase:'unknown',seconds:null,label:'Oturum bitiş zamanı alınamadı.'};
 const seconds=Math.max(0,Math.ceil((expiresAt-clock)/1000));
 if(seconds===0)return {phase:'expired',seconds:0,label:'Oturum süresi doldu. Yanıtlar artık kaydedilemez veya teslim edilemez.'};
 const minutes=Math.floor(seconds/60),remaining=String(seconds%60).padStart(2,'0');
 return {phase:seconds<=300?'warning':'active',seconds,label:'Oturumun bitmesine '+minutes+' dakika '+remaining+' saniye kaldı.'};
}
