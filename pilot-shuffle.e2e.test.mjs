// Şık karıştırma: her aday için farklı ama tekrarlanabilir sıra; puanlama etiket metniyle doğru kalır; "Hepsi" gibi şıklar engellenir.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer as tcp} from 'node:net';
import {createDemo,validateExam} from './core.mjs';
const dir=mkdtempSync(join(tmpdir(),'bep-shuf-'));
const probe=tcp();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'s.sqlite');process.env.PORT=String(port);process.env.BEP_PILOT_REDEEM_GLOBAL_LIMIT='200';
const {openStore}=await import('./server-foundation/institutional-store.mjs');const store=openStore(process.env.BEP_DB_PATH);
const pass='Sentetik-BEP-Yalniz-Test-2026!';store.createTenantAdmin({tenantId:'anonim-q',tenantName:'Anonim',email:'t@anonim-q.invalid',password:pass});
const {createServer}=await import('./server.mjs');const server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
after(async()=>{await new Promise(r=>server.close(r));if(store.db.open)store.db.close();rmSync(dir,{recursive:true,force:true});});
const base=`http://127.0.0.1:${port}`;
const api=(path,{method='GET',body,sess,headers={}}={})=>fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(sess?{Cookie:sess.cookie,'X-CSRF-Token':sess.csrf}:{}),...headers},body:body?JSON.stringify(body):undefined});
test('şık karıştırma: aday başına farklı, devamda aynı, puanlama doğru; atıf yapan şık uyarısı',async()=>{
 const r=await api('/api/login',{method:'POST',body:{tenantId:'anonim-q',email:'t@anonim-q.invalid',password:pass}});const v=await r.json();
 const sess={cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),csrf:v.csrfToken||v.csrf};
 const d=createDemo();d.title='KAR101 Karıştırma';d.duration=20;d.adaptations.visualCues=false;d.profile='';d.adaptations.shuffleOptions=true;const ch=d.questions.find(q=>q.type==='choice');
 d.questions=[{...ch,id:'a',prompt:'Başkent hangisidir?',options:['İstanbul','Ankara','İzmir','Bursa','Antalya'],answer:'Ankara',points:10,teacherNote:''}];
 assert.deepEqual(validateExam(d).filter(i=>i.level==='error'),[]);
 const bad=structuredClone(d);bad.questions[0].options=['A ve B','Ankara','Hepsi'];bad.questions[0].answer='Ankara';
 assert.ok(validateExam(bad).some(i=>/karıştırılırken/.test(i.text)),'atıf yapan şık engellenir');
 const id=(await(await api('/api/exams',{method:'POST',body:{exam:d},sess})).json()).item.id;
 await api(`/api/exams/${id}/approve`,{method:'POST',body:{revision:1,confirmed:true},sess});
 const rows=Array.from({length:8},(_,i)=>({candidateCode:'KOD-S'+(i+1),seat:'PC-'+(i+1),examId:id,adjustments:[],extraMinutes:0,breakMinutes:0}));
 const items=(await(await api('/api/pilot/batch',{method:'POST',body:{rows},sess})).json()).items;
 const orders=new Set(),sessions=[];
 for(const it of items){const red=await(await api('/api/pilot/redeem',{method:'POST',body:{code:it.code}})).json();const labels=red.exam.questions[0].options.map(o=>o.label);orders.add(labels.join('|'));sessions.push({it,red,labels});}
 assert.ok(orders.size>=3,'adaylar farklı sıralar görür: '+orders.size);
 for(const s of sessions)assert.deepEqual(s.red.exam.questions[0].options.map(o=>o.id),['A','B','C','D','E'],'kimlikler konuma göre');
 // devam (aynı kod): aynı sıra
 const again=await(await api('/api/pilot/redeem',{method:'POST',body:{code:sessions[0].it.code}})).json();
 assert.deepEqual(again.exam.questions[0].options.map(o=>o.label),sessions[0].labels,'devamda aynı sıra');
 // doğru etiketi seçen aday tam puan alır, yanlış etiketi seçen almaz
 const pick=(s,label)=>s.red.exam.questions[0].options.find(o=>o.label===label).id;
 for(const [i,label] of [[0,'Ankara'],[1,'İzmir']]){const s=sessions[i];const tok=i===0?again.token:s.red.token;
  const sub=await api('/api/pilot/submit',{method:'POST',headers:{Authorization:'Bearer '+tok},body:{answers:{q1:pick(s,label)}}});assert.equal(sub.status,200,await sub.clone().text());}
 const list=(await(await api('/api/pilot',{sess})).json()).items;
 for(const [code,label,score] of [['KOD-S1','Ankara',10],['KOD-S2','İzmir',0]]){
  const sid=(await(await api('/api/pilot/live',{sess})).json()).items.find(x=>x.candidateCode===code).id;
  const rec=(await(await api(`/api/pilot/${sid}/record`,{sess})).json()).record;
  assert.equal(rec.questions[0].responseLabel,label);assert.equal(rec.questions[0].suggestedScore,score);assert.equal(rec.questions[0].correctLabel,'Ankara');
  assert.equal(rec.questions[0].options.find(o=>o.id===rec.questions[0].correctId).label,'Ankara');}
 assert.ok(list.length>=2);
});
