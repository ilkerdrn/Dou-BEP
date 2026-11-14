import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {openStore} from './institutional-store.mjs';
import {reviewerSeparationViolation} from './exam-review-separation.mjs';

test('owner and current revision editor cannot act as an independent reviewer',()=>{
 const row={owner_id:'teacher-1',last_editor_id:'coordinator-2'};
 assert.equal(reviewerSeparationViolation(row,'teacher-1'),'owner');
 assert.equal(reviewerSeparationViolation(row,'coordinator-2'),'revision_editor');
 assert.equal(reviewerSeparationViolation(row,'reviewer-3'),null);
 assert.equal(reviewerSeparationViolation(row,''),null);
 assert.equal(reviewerSeparationViolation(null,'teacher-1'),null);
});

test('legacy records with unknown last editor retain the original owner block',()=>{
 const legacy={owner_id:'teacher-1'};
 assert.equal(reviewerSeparationViolation(legacy,'teacher-1'),'owner');
 assert.equal(reviewerSeparationViolation(legacy,'reviewer-3'),null);
 assert.equal(reviewerSeparationViolation({...legacy,last_editor_id:null},'reviewer-3'),null);
});

test('existing SQLite exams table is additively upgraded without dropping it',()=>{
 const dir=mkdtempSync(join(tmpdir(),'dou-bep-exam-author-'));
 const filename=join(dir,'legacy.sqlite');
 try{
  const legacy=new DatabaseSync(filename);
  legacy.exec(`CREATE TABLE exams(
   id TEXT PRIMARY KEY,
   tenant_id TEXT NOT NULL REFERENCES tenants(id),
   owner_id TEXT NOT NULL REFERENCES members(id),
   title TEXT NOT NULL,
   body TEXT NOT NULL,
   revision INTEGER NOT NULL DEFAULT 1,
   status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved')),
   approved_by TEXT REFERENCES members(id),
   approved_at INTEGER,
   created_at INTEGER NOT NULL,
   updated_at INTEGER NOT NULL
  );`);
  legacy.close();
  let store=openStore(filename,{requireIndependentExamApproval:true});
  let columns=store.db.prepare('PRAGMA table_info(exams)').all().map(c=>c.name);
  assert.equal(columns.filter(c=>c==='last_editor_id').length,1);
  assert.ok(columns.includes('body'));
  assert.ok(columns.includes('revision'));
  store.db.close();
  store=openStore(filename,{requireIndependentExamApproval:true});
  columns=store.db.prepare('PRAGMA table_info(exams)').all().map(c=>c.name);
  assert.equal(columns.filter(c=>c==='last_editor_id').length,1);
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM exams').get().n,0);
  store.db.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});
