/**
 * Optional isolated HTTP acceptance of the MANUAL NVDA lab's one-use codes.
 * Creates a child process with its own OS-temp SQLite DB. No real students,
 * microphone, browser storage, remote network, or user-owned BEP_DB_PATH.
 *
 * Run: node tools/v4-nvda-code-http-acceptance.mjs
 * Does not print issued code, anonymous bearer, or any submitted content.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const child=spawn(process.execPath,['tools/v4-nvda-manual-lab.mjs'],{
 cwd:root,env:{...process.env},stdio:['pipe','pipe','pipe'],windowsHide:true
});
let output='',errors='',ended=false;
const subscriptions=new Set();
function wake(){
 for(const watcher of subscriptions)watcher();
}
child.stdout.setEncoding('utf8');
child.stdout.on('data',v=>{output+=v;if(output.length>30000)output=output.slice(-30000);wake();});
child.stderr.setEncoding('utf8');
child.stderr.on('data',v=>{errors+=v;if(errors.length>3000)errors=errors.slice(-3000);});
child.on('exit',()=>{ended=true;wake();});
function awaitOutput(expression,label,timeoutMs=20000){
 return new Promise((resolve,reject)=>{
  let settled=false;
  const timeout=setTimeout(()=>finish(Error(label+' timed out')),timeoutMs);
  function finish(err,match){
   if(settled)return;settled=true;clearTimeout(timeout);subscriptions.delete(check);
   if(err)reject(err);else resolve(match);
  }
  function check(){
   const match=expression.exec(output);
   if(match)finish(null,match);
   else if(ended)finish(Error(label+' stopped before completion'));
  }
  subscriptions.add(check);check();
 });
}
async function redeem(url,code){
 return fetch(url+'/api/pilot/redeem',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({code}),signal:AbortSignal.timeout(8000)
 });
}
async function main(){
 let failed=null;
 try{
  const match=await awaitOutput(
   /Ogrenci sinav sayfasi: (http:\/\/127\.0\.0\.1:\d+\/pilot)[\s\S]*?TEK KULLANIMLIK SENTETIK KOD: ((?:[0-9A-F]{5}-){3}[0-9A-F]{5})/,
   'Initial anonymous NVDA lab code');
  const base=new URL(match[1]).origin,code=match[2];
  const health=await fetch(base+'/api/health',{signal:AbortSignal.timeout(8000)});
  assert.equal(health.status,200,'Local fixture server health');
  const first=await redeem(base,code);
  assert.equal(first.status,200,'Fresh code must redeem through the actual HTTP endpoint');
  const payload=await first.json();
  assert.equal(payload.exam?.questions?.length,4,'Only synthetic 4-question fixture is available');
  assert.ok(payload.token,'Anonymous bearer created in memory');
  assert.equal((await redeem(base,code)).status,401,'A redeemed code cannot be used twice');
  child.stdin.write('n\n');
  const renewed=await awaitOutput(/YENI TEK KULLANIMLIK SENTETIK KOD: ((?:[0-9A-F]{5}-){3}[0-9A-F]{5})/,
   'Manual lab code rotation');
  const code2=renewed[1];
  assert.notEqual(code,code2,'Renewal must issue a different random code');
  const second=await redeem(base,code2);
  assert.equal(second.status,200,'New code must be accepted by same localhost HTTP worker');
  assert.equal((await redeem(base,code2)).status,401,'Replacement is also one-time');
  console.log('NVDA LAB CODE HTTP ACCEPTANCE PASS: fresh=200, reuse=401, new=200, reuse=401 (synthetic only).');
 }catch(error){
  failed=error;
  console.error('NVDA LAB CODE HTTP ACCEPTANCE FAIL: '+error.message);
  process.exitCode=1;
 }finally{
  if(!ended){
   try{child.stdin.write('q\n');}catch{}
   await Promise.race([
    new Promise(resolve=>child.once('exit',resolve)),
    new Promise(resolve=>setTimeout(resolve,1800))
   ]);
  }
  if(!ended)child.kill();
  child.stdin.end();
 }
 if(failed)throw failed;
}
await main();
