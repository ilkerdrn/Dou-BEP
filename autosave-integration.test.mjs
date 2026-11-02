import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openStore} from './server-foundation/institutional-store.mjs';
import {createAutosaveManager} from './autosave-manager.mjs';
import {createDemo} from './core.mjs';
const PASSWORD='Local-Only-Private-Test-2026!';
function example(){const x=createDemo();x.profile='';x.questions=x.questions.map(q=>({...q,teacherNote:''}));return x;}
test('two browser-like editors cannot silently overwrite server revision; manual recovery produces separate draft',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'bep-auto-two-tab-'));const s=openStore(join(dir,'state.sqlite'));
 try{
  s.createTenantAdmin({tenantId:'school-x',tenantName:'Anonim okul',email:'teacher@example.test',password:PASSWORD});
  const actor=s.requireActor(s.signIn({tenantId:'school-x',email:'teacher@example.test',password:PASSWORD}).token);
  const original=s.createExam(actor,{exam:example()});
  let aExam=example(),bExam=example(),aRevision=original.revision,bRevision=original.revision;
  aExam.title='Birinci sekmedeki anonim sınav';bExam.title='İkinci sekmedeki anonim sınav';
  const a=createAutosaveManager({getDraft:()=>structuredClone(aExam),persist:async exam=>{
   const result=s.updateExam(actor,original.id,{revision:aRevision,exam});aRevision=result.revision;return result;
  }});
  const b=createAutosaveManager({getDraft:()=>structuredClone(bExam),persist:async exam=>{
   const result=s.updateExam(actor,original.id,{revision:bRevision,exam});bRevision=result.revision;return result;
  }});
  a.changed();await a.flush();assert.equal(s.getExam(actor,original.id).revision,2);
  b.changed();await assert.rejects(b.flush(),{code:'revision_conflict'});
  assert.equal(b.isBlocked(),true);
  assert.equal(s.getExam(actor,original.id).exam.title,'Birinci sekmedeki anonim sınav');
  // Recover as a NEW draft, leaving the original unchanged.
  const recovered=s.createExam(actor,{exam:bExam});
  assert.notEqual(recovered.id,original.id);
  assert.equal(recovered.exam.title,'İkinci sekmedeki anonim sınav');
  assert.equal(s.getExam(actor,original.id).exam.title,'Birinci sekmedeki anonim sınav');
  a.stop();b.stop();
 }finally{s.db.close();rmSync(dir,{recursive:true,force:true});}
});
