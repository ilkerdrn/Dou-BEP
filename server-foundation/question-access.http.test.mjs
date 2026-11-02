import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
import {openStore} from './institutional-store.mjs';
import {createApiHandler} from './institutional-api.mjs';
import {createDemo} from '../core.mjs';
const pass='Yerel-Test-Icin-Kuvvetli-Parola-123!';
test('tenant-scoped access support persists, approval resets, forbidden MP3 returns 422',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'bep-access-'));
 const store=openStore(join(dir,'tmp.sqlite'));let server;
 try{
  store.createTenantAdmin({tenantId:'kampus-a',tenantName:'Pilot A',email:'admin@a.test',password:pass});
  const login=store.signIn({tenantId:'kampus-a',email:'admin@a.test',password:pass});
  const actor=store.requireActor(login.token);
  const exam=createDemo();exam.profile='';exam.questions=exam.questions.map(q=>({...q,teacherNote:''}));
  exam.questions[0].access={audioAllowed:false,largeTargets:true,writtenCue:'Bir adımda düşün.'};
  const created=store.createExam(actor,{exam});
  assert.equal(store.getExam(actor,created.id).exam.questions[0].access.writtenCue,'Bir adımda düşün.');
  store.approveExam(actor,created.id,{revision:1,confirmed:true});
  let api;server=http.createServer((req,res)=>api(req,res,new URL(req.url,'http://localhost').pathname));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;api=createApiHandler(store,{port});
  const mp3=await fetch(`http://127.0.0.1:${port}/api/exams/${created.id}/audio-mp3`,{method:'POST',headers:{Cookie:`bep_session=${login.token}`,'X-CSRF-Token':login.csrf}});
  assert.equal(mp3.status,422);assert.match(await mp3.text(),/sesli okumayı kapatmış/);
  const status=store.getExam(actor,created.id);
  assert.equal(status.status,'approved');
  // Direct audio construction is also refused; no silent playback of a blocked item.
  const {createAudioScript}=await import('../offline-audio.mjs');
  assert.throws(()=>createAudioScript(store.exportExam(actor,created.id).exam),/sesli okuma kapalı/);
  const edited=structuredClone(status.exam);edited.questions[0].access.audioAllowed=true;
  const after=store.updateExam(actor,created.id,{revision:1,exam:edited});
  assert.equal(after.status,'draft');assert.equal(after.revision,2);
  assert.throws(()=>store.exportExam(actor,created.id),{code:'not_approved'});
  assert.equal(store.getExam(actor,created.id).exam.questions[0].access.largeTargets,true);
 }finally{if(server)await new Promise(resolve=>server.close(resolve));store.db.close();rmSync(dir,{recursive:true,force:true});}
});
