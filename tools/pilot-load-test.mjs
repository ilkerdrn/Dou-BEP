/** v2.91: Single-machine load measurement for the learner flow (redeem -> breaks optional -> submit), HTTP, temp SQLite only.
 * Usage: node tools/pilot-load-test.mjs [students=200] [concurrency=50]
 * It reports latencies and errors for THIS machine. It is NOT a capacity guarantee, security test or proctoring test.
 */
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {webcrypto} from 'node:crypto';
import {createServer as tcp} from 'node:net';
import {createDemo} from '../core.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const students=Math.min(2000,Math.max(1,Number(process.argv[2])||200)),concurrency=Math.min(500,Math.max(1,Number(process.argv[3])||50));
const temp=mkdtempSync(join(tmpdir(),'bep-load-'));const pass='Sentetik-BEP-Yalniz-Test-2026!';
let server,store;
try{
 const probe=tcp();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 process.env.PORT=String(port);process.env.BEP_DB_PATH=join(temp,'load.sqlite');process.env.BEP_NO_LISTEN='1';process.env.BEP_PILOT_MAX_OPEN_SESSIONS=String(Math.max(100,students));
 const {openStore}=await import('../server-foundation/institutional-store.mjs');store=openStore(process.env.BEP_DB_PATH);
 store.createTenantAdmin({tenantId:'anonim-load',tenantName:'Anonim',email:'t@anonim-load.invalid',password:pass});
 const {createServer}=await import('../server.mjs');server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
 const base=`http://127.0.0.1:${port}`;
 const call=(path,{method='GET',body,sess,token}={})=>fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(sess?{Cookie:sess.cookie,'X-CSRF-Token':sess.csrf}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
 const lr=await call('/api/login',{method:'POST',body:{tenantId:'anonim-load',email:'t@anonim-load.invalid',password:pass}});const lv=await lr.json();
 const sess={cookie:lr.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),csrf:lv.csrf};
 const d=createDemo();d.adaptations.visualCues=false;d.profile='';const ch=d.questions.find(q=>q.type==='choice'),sh=d.questions.find(q=>q.type==='short');
 d.questions=[{...ch,prompt:'5 + 3 işleminin sonucu kaçtır?',options:['6','8','9'],answer:'8',teacherNote:''},{...sh,type:'short',prompt:'Ağ nedir?',answer:'',options:[],pairs:[],points:20,teacherNote:''}];
 const id=(await(await call('/api/exams',{method:'POST',body:{exam:d},sess})).json()).item.id;
 await call(`/api/exams/${id}/approve`,{method:'POST',body:{revision:1,confirmed:true},sess});
 const codes=[];const t0=performance.now();
 for(let i=0;i<students;i++){const r=await call('/api/pilot',{method:'POST',body:{examId:id},sess});if(r.status!==201)throw Error('kod üretilemedi: '+r.status+' '+JSON.stringify(await r.json()));codes.push((await r.json()).item.code);}
 const issueMs=performance.now()-t0;
 const lat={redeem:[],submit:[]};let failures=0,next=0;
 const text='Ağ, cihazların veri paylaşmasıdır. '.repeat(40);
 async function student(code){
  try{
   let t=performance.now();const rr=await call('/api/pilot/redeem',{method:'POST',body:{code}});lat.redeem.push(performance.now()-t);
   if(rr.status!==200){failures++;return;}const red=await rr.json();
   t=performance.now();const sr=await call('/api/pilot/submit',{method:'POST',body:{answers:{q1:red.exam.questions[0].options[1].id,q2:text}},token:red.token});lat.submit.push(performance.now()-t);
   if(sr.status!==200)failures++;
  }catch{failures++;}
 }
 const t1=performance.now();
 await Promise.all(Array.from({length:concurrency},async()=>{while(next<codes.length){const c=codes[next++];await student(c);}}));
 const total=performance.now()-t1;
 const pct=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return s.length?s[Math.min(s.length-1,Math.floor(s.length*p))]:0;};
 const f=n=>n.toFixed(0)+' ms';
 console.log(JSON.stringify({students,concurrency,failures,
  issueCodes:{total:f(issueMs),perCode:f(issueMs/students)},
  learnerFlowTotal:f(total),studentsPerSecond:+(students/(total/1000)).toFixed(1),
  redeem:{p50:f(pct(lat.redeem,.5)),p95:f(pct(lat.redeem,.95)),max:f(Math.max(...lat.redeem))},
  submit:{p50:f(pct(lat.submit,.5)),p95:f(pct(lat.submit,.95)),max:f(Math.max(...lat.submit))},
  note:'Tek makine, tek süreç, yerel SQLite. Kapasite garantisi veya güvenlik testi değildir.'},null,2));
 process.exitCode=failures?1:0;
}finally{if(server?.listening)await new Promise(r=>server.close(r));if(store?.db?.open)store.db.close();rmSync(temp,{recursive:true,force:true});}
