import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewerInbox,reviewerFeedbackText} from '../reviewer-inbox.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const make=(id,status,title,ownerId,revision,updatedAt)=>({
 id,title,status,ownerId,revision,updatedAt,
 exam:{questions:[{prompt:'SECRET_ANSWER_88',answer:'SECRET_ANSWER_88'}]},
 token:'PRIVATE_TOKEN',teacherNote:'SECRET_ANSWER_88'
});
const data=[
 make('11111111-1111-4111-8111-111111111111','draft','Matematik B', 'teacher-a',3,1700),
 make('22222222-2222-4222-8222-222222222222','approved','Türkçe A','teacher-b',2,1600),
 make('33333333-3333-4333-8333-333333333333','draft','Matematik A','reviewer-1',1,1800),
 make('bad','draft','Geçersiz','teacher-b',1,1500)
];
const snapshot={items:[{number:1,index:0,blocking:1,warnings:0,focus:'answer',state:'incomplete',
 issues:[{text:'SECRET_ANSWER_88'}]}],incomplete:1,review:0};
const workbench={
 summary:{questionIncomplete:1,questionReview:0,qualityErrors:2,qualityWarnings:3,audioFindings:1},
 stages:[
  {id:'identity',done:true,title:'SECRET_ANSWER_88',detail:'SECRET_ANSWER_88'},
  {id:'goals',done:false,title:'SECRET_ANSWER_88',detail:'SECRET_ANSWER_88'},
  {id:'questions',done:false,title:'SECRET_ANSWER_88',detail:'SECRET_ANSWER_88'},
  {id:'access',done:false,title:'SECRET_ANSWER_88',detail:'SECRET_ANSWER_88'},
  {id:'delivery',done:false,title:'SECRET_ANSWER_88',detail:'SECRET_ANSWER_88'}
 ],questionItems:snapshot.items
};

test('only authorized reviewer-role screens derive a local read-only inbox',()=>{
 for(const role of ['observer','teacher',undefined]){
  const result=reviewerInbox(data,{role,actorId:'teacher-a'});
  assert.equal(result.enabled,false);
  assert.deepEqual(result.items,[]);
 }
 for(const role of ['reviewer','admin','coordinator']){
  const result=reviewerInbox(data,{role,actorId:'reviewer-1'});
  assert.equal(result.enabled,true);
  assert.deepEqual(result.counts,{draft:2,recheck:0,approved:1,all:3});
  assert.deepEqual(result.items.map(x=>x.id),[data[2].id,data[0].id]);
  assert.equal(result.items[0].own,true);
  assert.match(result.items[0].hint,/başka bir incelemeci/);
  assert.match(result.items[1].label,/inceleme gerekli/);
  assert.ok(!result.items[1].label.includes('hazır'));
 }
});

test('search, filter and ordering are confined to approved metadata returned by the server',()=>{
 assert.deepEqual(reviewerInbox(data,{role:'reviewer',filter:'approved'}).items.map(x=>x.id),[data[1].id]);
 assert.deepEqual(reviewerInbox(data,{role:'reviewer',query:'MATEMATİK',filter:'all'}).items.map(x=>x.id),
  [data[2].id,data[0].id]);
 assert.equal(reviewerInbox(data,{role:'reviewer',query:'yok'}).items.length,0);
 assert.equal(reviewerInbox(data,{role:'reviewer',filter:'invalid'}).filter,'draft');
 const output=JSON.stringify(reviewerInbox(data,{role:'reviewer',filter:'all'}));
 assert.ok(!output.includes('SECRET_ANSWER_88'));
 assert.ok(!output.includes('PRIVATE_TOKEN'));
 assert.ok(!output.includes('teacherNote'));
 assert.ok(!output.includes('exam":'));
});

test('review note is revision-specific and never copies raw exam issues, answers or titles',()=>{
 const note=reviewerFeedbackText({
  examId:data[0].id,revision:3,workbench
 });
 assert.match(note,/Sürüm 3/);
 assert.match(note,/11111111/);
 assert.match(note,/BEP kazanım bağlantıları: Kontrol gerekli/);
 assert.match(note,/Zorunlu kalite hatası: 2/);
 assert.match(note,/Bu mesaj onay kararı değildir/);
 assert.ok(!note.includes('SECRET_ANSWER_88'));
 assert.ok(!note.includes('Matematik B'));
 assert.ok(!note.includes('teacher-a'));
 assert.doesNotMatch(note,/otomatik onaylandı|sertifikalı/);
});

test('invalid versions and unknown stages cannot become a shareable review note',()=>{
 for(const revision of [0,'3',-1,1.5]){
  assert.throws(()=>reviewerFeedbackText({examId:data[0].id,revision,workbench}));
 }
 assert.throws(()=>reviewerFeedbackText({examId:'wrong',revision:3,workbench}));
 const bad={...workbench,stages:[...workbench.stages]};
 bad.stages[0]={id:'secret',done:false};
 assert.throws(()=>reviewerFeedbackText({examId:data[0].id,revision:3,workbench:bad}));
});

test('inbox opens selected current revision and history without writing approvals',()=>{
 const page=readFileSync(resolve(root,'institutional-exams.html'),'utf8');
 const ui=readFileSync(resolve(root,'institutional-exams.mjs'),'utf8');
 const server=readFileSync(resolve(root,'server.mjs'),'utf8');
 const repo=readFileSync(resolve(root,'server-foundation/exam-repository.mjs'),'utf8');
 for(const id of ['exam-reviewer-inbox','exam-reviewer-filter','exam-reviewer-search',
  'exam-reviewer-items','exam-reviewer-count','exam-reviewer-feedback-copy',
  'exam-reviewer-feedback-fallback','exam-reviewer-feedback-text'])
  assert.match(page,new RegExp('id="'+id+'"'));
 assert.match(page,/id="exam-reviewer-count"[^>]*role="status"/);
 assert.match(ui,/reviewerInbox\(state\.exams,\{role,actorId:state\.actor\?\.id/);
 assert.match(ui,/state\.exams=r\.items;drawExamList\(\);renderReviewerInbox\(\)/);
 assert.match(ui,/button\.dataset\.examRevision/);
 assert.match(ui,/state\.current\?\.revision!==expectedRevision/);
 assert.match(ui,/details\.open=true/);
 assert.match(ui,/querySelector\('summary'\)\?\.focus/);
 assert.match(ui,/visitPreflightTarget\('exam-output-section'\)/);
 assert.match(ui,/reviewerFeedbackText\(\{examId:current\.id,revision:current\.revision/);
 assert.match(ui,/navigator\.clipboard\.writeText\(note\)/);
 assert.match(ui,/field\.select\(\)/);
 assert.match(server,/'\/reviewer-inbox\.mjs':\['reviewer-inbox\.mjs'/);
 assert.match(repo,/requireIndependentExamApproval&&row\.owner_id===actor\.id/);
 assert.match(repo,/SELECT \* FROM exams WHERE tenant_id=\?/);
 const helper=readFileSync(resolve(root,'reviewer-inbox.mjs'),'utf8');
 assert.doesNotMatch(helper,/fetch\(|localStorage|sessionStorage|document\.|window\.|approveExam\(|updateExam\(/);
});
