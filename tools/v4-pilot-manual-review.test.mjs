import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPilotReviewDraft} from '../pilot-review-workbench.mjs';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const questions=[
 {id:'q1',number:1,maxPoints:25,score:null,note:''},
 {id:'q2',number:2,maxPoints:25,score:0,note:'İncelendi'},
 {id:'q3',number:3,maxPoints:50,score:12.5,note:''}
];
const same={q1:{score:null,note:''},q2:{score:'0',note:'İncelendi'},q3:{score:'12.50',note:''}};

test('saved zero differs from blank and does not create unsaved changes',()=>{
 const r=inspectPilotReviewDraft(questions,same);
 assert.equal(r.total,3);assert.equal(r.reviewed,2);assert.equal(r.missing,1);
 assert.equal(r.points,12.5);assert.equal(r.maximum,75);
 assert.equal(r.changed,false);assert.equal(r.complete,false);
 assert.deepEqual(r.needsAttention.map(q=>q.number),[1]);
 assert.deepEqual(r.errors,[]);
});

test('scoring every question displays reviewed progress but does not infer correctness',()=>{
 const draft={...same,q1:{score:'25',note:'Anonim gözlem'}};
 const r=inspectPilotReviewDraft(questions,draft);
 assert.equal(r.complete,true);assert.equal(r.reviewed,3);
 assert.equal(r.points,37.5);assert.equal(r.maximum,100);
 assert.equal(r.changed,true);assert.equal(r.needsAttention.length,0);
 assert.equal(Object.hasOwn(r,'pass'),false);
 assert.equal(Object.hasOwn(r,'grade'),false);
});

test('invalid decimal, range, text and note control characters stop unsafe saves',()=>{
 for(const bad of ['1.234','-1','26','not-a-number','GEÇERSİZ','NaN','Infinity']){
  const result=inspectPilotReviewDraft(questions,{...same,q1:{score:bad,note:''}});
  assert.ok(result.errors.length>0,bad);
  assert.ok(result.needsAttention.some(x=>x.id==='q1'&&x.invalid));
  assert.equal(result.changed,true);
 }
 const long=inspectPilotReviewDraft(questions,{...same,q1:{score:'2',note:'x'.repeat(301)}});
 assert.match(long.errors[0],/gözlem notu/);
 const control=inspectPilotReviewDraft(questions,{...same,q1:{score:'2',note:'anonim\u0001not'}});
 assert.ok(control.errors.length>0);
});

test('only non-sensitive anonymous progress is derived from the review draft',()=>{
 const r=inspectPilotReviewDraft(questions,{...same,q1:{score:'0.25',note:'   anonim not   '}});
 assert.equal(r.reviewed,3);
 assert.equal(r.points,12.75);
 assert.equal(r.changed,true);
 assert.equal(JSON.stringify(r).includes('anonim not'),false);
});

test('review page imports workbench through offline allowlist and protects unfinished edits',()=>{
 const page=readFileSync(resolve(root,'pilot-admin.html'),'utf8');
 const js=readFileSync(resolve(root,'pilot-admin.mjs'),'utf8');
 const server=readFileSync(resolve(root,'server.mjs'),'utf8');
 assert.match(page,/id="review-draft-status"/);
 assert.match(page,/id="review-first-unscored"/);
 assert.match(page,/id="review-save" type="submit" disabled/);
 assert.match(js,/inspectPilotReviewDraft\(activeReview\.questions,entries\)/);
 assert.match(js,/reviewDraftSnapshot\(\)\?\.inspection\.changed/);
 assert.match(js,/Kaydedilmemiş puan veya gözlem notları var/);
 assert.match(js,/reviewSaving=true;updateReviewDraftStatus\(\)/);
 assert.match(js,/JSON\.stringify\(latest\?\.entries\)===JSON\.stringify\(snapshot\.entries\)/);
 assert.match(js,/review_conflict|reviewVersion:revision/);
 assert.match(server,/\x27\/pilot-review-workbench\.mjs\x27:\[/);
});
