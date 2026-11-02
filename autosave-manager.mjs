/** v2.6: Server-backed autosave orchestration. Never writes exams to browser storage. */
export function createAutosaveManager({getDraft,persist,onEvent=()=>{},delayMs=2400,clock={set:setTimeout,clear:clearTimeout}}){
 if(typeof getDraft!=='function'||typeof persist!=='function')throw Error('Kaydetme bağımlılıkları eksik.');
 let timer=null,inFlight=null,epoch=0,changes=0,saved=0,blocked=false,failed=false,stopped=false;
 const emit=(state,detail)=>{if(!stopped)onEvent(state,detail);};
 const cancel=()=>{if(timer!==null){clock.clear(timer);timer=null;}};
 const schedule=()=>{cancel();if(!stopped&&!blocked&&!failed&&changes>saved)timer=clock.set(()=>{timer=null;flush().catch(()=>{});},delayMs);};
 function changed(){if(stopped)return;changes++;failed=false;emit(blocked?'conflict':'pending');if(!blocked)schedule();}
 async function flush({force=false}={}){
  if(stopped)throw Error('Kaydedici kapalı.');
  cancel();
  if(blocked)throw Object.assign(Error('Başka bir sekmede kaydedilmiş sürüm değişmiş. Önce çakışmayı çözün.'),{code:'revision_conflict',status:409});
  if(inFlight){await inFlight;if(changes>saved)return flush();return null;}
  if(!force&&changes===saved)return null;
  const captured=changes,generation=epoch;let snapshot;
  try{snapshot=getDraft();}catch(err){failed=true;emit('error',err);throw err;}
  emit('saving');
  const job=(async()=>{
   // The request cannot always be cancelled; the caller may safely discard
  // a late response after a draft switch or editor teardown.
  const isCurrent=()=>generation===epoch&&!stopped;
  try{const result=await persist(snapshot,{isCurrent});if(!isCurrent())return null;
    saved=captured;failed=false;emit(changes>saved?'pending':'saved',result);return result;
   }catch(err){if(generation!==epoch||stopped)return null;
    failed=true;
    if(err?.code==='revision_conflict'){blocked=true;emit('conflict',err);}else emit('error',err);
    throw err;
   }
  })();
  inFlight=job;
  try{return await job;}finally{if(inFlight===job){inFlight=null;if(!blocked&&!failed&&changes>saved)schedule();}}
 }
 function reset(){cancel();epoch++;inFlight=null;changes=0;saved=0;blocked=false;failed=false;emit('idle');}
 function stop(){cancel();stopped=true;epoch++;inFlight=null;}
 return {changed,flush,reset,stop,hasChanges:()=>changes>saved,isSaving:()=>inFlight!==null,isBlocked:()=>blocked,hasFailure:()=>failed};
}
