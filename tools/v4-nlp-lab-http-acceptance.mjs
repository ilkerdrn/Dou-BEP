/**
 * End-to-end anonymous student acceptance for the optional mixed NLP lab.
 * Spawns a NEW temporary DB on 127.0.0.1. No real exam, answer sheet, keys,
 * course roster, student identity, external network or microphone.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const child=spawn(process.execPath,['tools/v4-nvda-manual-lab.mjs','--nlp'],{
 cwd:root,stdio:['pipe','pipe','pipe'],windowsHide:true,
 env:{...process.env,BEP_POCKET_TTS_EXPERIMENT:'0',BEP_POCKET_TTS_RESEARCH_ACK:'0'}
});
let output='',errorOutput='',exited=false;
child.stdout.setEncoding('utf8');child.stdout.on('data',v=>{output+=v;wake();});
child.stderr.setEncoding('utf8');child.stderr.on('data',v=>{errorOutput+=v.slice(-1000);});
child.on('exit',()=>{exited=true;wake();});
const watchers=new Set();function wake(){for(const callback of watchers)callback();}
function waitFor(regex,desc){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>finish(Error(desc+' timeout')),20000);
  let done=false;
  function finish(err,match){
   if(done)return;done=true;clearTimeout(timer);watchers.delete(check);
   if(err)reject(err);else resolve(match);
  }
  function check(){
   const hit=regex.exec(output);
   if(hit)finish(null,hit);
   else if(exited)finish(Error(desc+' exited prematurely'));
  }
  watchers.add(check);check();
 });
}
async function request(base,path,method='GET',body,token){
 const response=await fetch(base+path,{method,signal:AbortSignal.timeout(10000),
  headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},
  ...(body?{body:JSON.stringify(body)}:{})});
 let data={};try{data=await response.json();}catch{}
 return {status:response.status,data};
}
async function run(){
 try{
  const found=await waitFor(
   /Ogrenci sinav sayfasi: (http:\/\/127\.0\.0\.1:\d+\/pilot)[\s\S]*?TEK KULLANIMLIK SENTETIK KOD: ((?:[0-9A-F]{5}-){3}[0-9A-F]{5})/,
   'NLP synthetic lab code');
  const base=new URL(found[1]).origin;
  const redeemed=await request(base,'/api/pilot/redeem','POST',{code:found[2]});
  assert.equal(redeemed.status,200,'Fresh anonymous code');
  const {token,exam}=redeemed.data;
  assert.ok(token,'In-memory student bearer');
  assert.equal(exam.questions.length,6);
  assert.deepEqual(exam.questions.map(q=>q.type),['choice','choice','short','short','truefalse','matching']);
  assert.equal(JSON.stringify(exam.questions).includes('answer'),false,'Never include model answers');
  assert.equal((await request(base,'/api/pilot/redeem','POST',{code:found[2]})).status,401);
  const initial={q1:'A',q3:'Sözcükte ses değişimi basit ek kesmeyi yanıltır.'};
  const saved=await request(base,'/api/pilot/save','POST',{answers:initial},token);
  assert.equal(saved.status,200,'Classic synthetic answer saved');
  const recovered=await request(base,'/api/pilot/progress','GET',null,token);
  assert.equal(recovered.status,200);
  assert.deepEqual(recovered.data.answers,initial,'Plain-text draft recovered from isolated SQLite');
  const tooLong=await request(base,'/api/pilot/save','POST',{answers:{q3:'a'.repeat(801)}},token);
  assert.equal(tooLong.status,400,'Long classic text rejected server-side');
  const forbidden=await request(base,'/api/pilot/speech','POST',{questionId:'q1'},token);
  assert.equal(forbidden.status,503,'Natural TTS disabled by default even in lab');
  const receipt=await request(base,'/api/pilot/submit','POST',{answers:initial},token);
  assert.equal(receipt.status,200,'Final written/choice delivery');
  assert.ok(receipt.data.receipt,'Anonymous receipt');
  assert.equal((await request(base,'/api/pilot/progress','GET',null,token)).status,401,'Submitted bearer cannot be reused');
  console.log('NLP MIXED PILOT HTTP ACCEPTANCE PASS: 6 questions; 2 classic; saved/recovered/submitted; length and speech gates enforced (synthetic only).');
 }finally{
  if(!exited){
   try{child.stdin.write('q\n');}catch{}
   await Promise.race([
    new Promise(resolve=>child.once('exit',resolve)),
    new Promise(resolve=>setTimeout(resolve,2000))
   ]);
  }
  if(!exited)child.kill();
  child.stdin.end();
 }
}
await run();
