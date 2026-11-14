import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewerRecheckHints} from '../reviewer-recheck-hints.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const id='11111111-1111-4111-8111-111111111111';
const direct=()=>({
 examId:id,currentRevision:2,available:true,comparison:{
  fromRevision:1,toRevision:2,previousQuestionCount:3,currentQuestionCount:3,
  changedSections:['BEP hedefleri'],
  changedQuestions:[
   {number:1,kind:'changed',fields:['Soru metni','Yanıt anahtarı']},
   {number:3,kind:'added',fields:[]}
  ]
 }
});
const feedback=()=>({
 examId:id,currentRevision:2,items:[{
  revision:1,stageIds:['goals','questions'],questionNumbers:[1,2,3],
  privateNote:'CONFIDENTIAL_ANSWER_TEST_131'
 }]
});

test('only adjacent revision feedback is correlated; changed is never marked resolved',()=>{
 const result=reviewerRecheckHints(direct(),feedback());
 assert.equal(result.status,'recheck');
 assert.deepEqual(result.stages.map(x=>x.id),['goals','questions']);
 assert.deepEqual(result.stages.map(x=>x.changed),[true,true]);
 assert.deepEqual(result.questions.map(x=>x.number),[1,2,3]);
 assert.deepEqual(result.questions.map(x=>x.changed),[true,false,true]);
 assert.match(result.questions[1].detail,/yine inceleyin/);
 assert.match(result.intro,/Sürüm 1/);
 assert.match(result.notice,/kanıtlamaz/);
 assert.ok(!JSON.stringify(result).includes('CONFIDENTIAL_ANSWER_TEST_131'));
 assert.equal(Object.hasOwn(result,'approved'),false);
});

test('recheck stage links and current question positions are bounded and cannot auto-approve',()=>{
 const view=reviewerRecheckHints(direct(),feedback());
 assert.deepEqual(view.stages.map(x=>x.target),['exam-goal-section','exam-question-section']);
 assert.deepEqual(view.questions.map(x=>x.canJump),[true,true,true]);
 assert.deepEqual(view.questions.map(x=>x.index),[0,1,2]);
 assert.ok(view.questions.every(x=>!Object.hasOwn(x,'verified')&&!Object.hasOwn(x,'approved')));
 assert.equal(Object.hasOwn(view,'canApprove'),false);
});

test('removed questions and positions absent in the new revision cannot be opened as different questions',()=>{
 const f=feedback(),delta=direct();
 delta.comparison.currentQuestionCount=2;
 delta.comparison.changedQuestions=[
  {number:1,kind:'changed',fields:['Soru metni']},
  {number:3,kind:'removed',fields:[]}
 ];
 const result=reviewerRecheckHints(delta,f);
 assert.deepEqual(result.questions.map(x=>x.canJump),[true,true,false]);
 assert.deepEqual(result.questions.map(x=>x.index),[0,1,null]);
 assert.match(result.questions[2].detail,/yeni sürümde yok/);
 const withoutCount={...direct(),comparison:{...direct().comparison}};
 delete withoutCount.comparison.currentQuestionCount;
 assert.ok(reviewerRecheckHints(withoutCount,f).questions.every(x=>!x.canJump));
 const secret='SECRET_CORRECT_ANSWER_393';
 delta.comparison.changedQuestions[0].rawAnswer=secret;
 f.items[0].privateNote=secret;
 assert.ok(!JSON.stringify(reviewerRecheckHints(delta,f)).includes(secret));
});

test('skipped or unrelated revisions and missing comparison fail closed',()=>{
 const old=feedback();
 const noDirect={...direct(),currentRevision:3,
  comparison:{...direct().comparison,fromRevision:2,toRevision:3}};
 const result=reviewerRecheckHints(noDirect,{...old,currentRevision:3});
 assert.equal(result.status,'no_direct_request');
 assert.deepEqual(result.questions,[]);
 assert.equal(reviewerRecheckHints({...direct(),available:false},old).status,'unavailable');
 assert.equal(reviewerRecheckHints({...direct(),examId:'22222222-2222-4222-8222-222222222222'},old).status,'unavailable');
 assert.equal(reviewerRecheckHints({...direct(),comparison:{...direct().comparison,toRevision:4}},old).status,'unavailable');
 assert.equal(reviewerRecheckHints(direct(),null).status,'unavailable');
});

test('multiple requests combine and deduplicate bounded question references',()=>{
 const f=feedback();
 f.items.push({revision:1,stageIds:['access','goals'],questionNumbers:[1,3,100,100,101,-1]});
 const hint=reviewerRecheckHints(direct(),f);
 assert.deepEqual(hint.questions.map(x=>x.number),[1,2,3,100]);
 assert.deepEqual(hint.stages.map(x=>x.id),['goals','questions','access']);
 assert.equal(hint.stages.find(x=>x.id==='access').changed,false);
 assert.ok(hint.questions.every(x=>typeof x.label==='string'));
});

test('browser navigation and responsive help avoid student/answer details',()=>{
 const html=readFileSync(resolve(root,'institutional-exams.html'),'utf8');
 const js=readFileSync(resolve(root,'institutional-exams.mjs'),'utf8');
 const server=readFileSync(resolve(root,'server.mjs'),'utf8');
 const styles=readFileSync(resolve(root,'dou-unified-ui.css'),'utf8');
 assert.match(html,/id="exam-recheck-hints"[^>]*hidden/);
 assert.match(html,/id="exam-recheck-hints-items"/);
 assert.match(js,/function renderRecheckHints\(\)/);
 assert.match(html,/id="exam-recheck-hints-status"[^>]*role="status"/);
 assert.match(html,/id="exam-recheck-hints-items"[^>]*role="group"/);
 assert.match(js,/dataset\.recheckRevision=String\(current\.revision\)/);
 assert.match(js,/more\.open=true|\$\('exam-revision-compare'\)\.open=true/);
 assert.match(js,/if\(hints\.status!=='recheck'\)return/);
 assert.match(js,/visitApprovalQuestion\(item\.index,'prompt'\)/);
 assert.match(js,/visitPreflightTarget\(stage\.target\)/);
 assert.match(js,/item\.index<\(state\.exam\?\.questions\?\.length\|\|0\)/);
 assert.match(styles,/V4 revision recheck action rows/);
 assert.match(js,/reviewerRecheckHints\(delta,feedback\)/);
 assert.match(js,/state\.reviewFeedback=feedback;refreshApprovalFeedbackUi\(\);renderRecheckHints\(\)/);
 assert.match(js,/state\.revisionDelta=diff;\s*renderRevisionDelta\(\);renderRecheckHints\(\)/);
 assert.match(js,/Kaydedilmemiş düzenlemeler bu fark özetine dahil değil/);
 assert.match(server,/'\/reviewer-recheck-hints\.mjs':\['reviewer-recheck-hints\.mjs'/);
 assert.match(styles,/V4 reviewer recheck checklist/);
 const helper=readFileSync(resolve(root,'reviewer-recheck-hints.mjs'),'utf8');
 assert.doesNotMatch(helper,/fetch\(|localStorage|sessionStorage|window\.|document\.|approveExam\(/);
});

test('direct recheck action remains bound to the inbox revision and never auto-confirms an issue',()=>{
 const html=readFileSync(resolve(root,'institutional-exams.html'),'utf8');
 const js=readFileSync(resolve(root,'institutional-exams.mjs'),'utf8');
 const styles=readFileSync(resolve(root,'dou-unified-ui.css'),'utf8');
 assert.match(html,/id="exam-recheck-hints-status"[^>]*role="status"/);
 assert.match(js,/item\.feedbackRecheck\?\[\['Düzeltmeleri yeniden incele','recheck'\]\]/);
 assert.match(js,/\['review','history','diff','recheck'\]/);
 assert.match(js,/if\(action==='diff'\|\|action==='recheck'\)/);
 assert.match(js,/const sameOpened=state\.current\?\.id===id&&state\.current\?\.revision===expectedRevision/);
 assert.match(js,/if\(state\.current\?\.revision!==expectedRevision\)/);
 assert.match(js,/Number\(button\.dataset\.recheckRevision\)!==current\.revision/);
 assert.match(js,/state\.revisionDelta\.currentRevision!==current\.revision/);
 assert.match(js,/state\.reviewFeedback\.currentRevision!==current\.revision/);
 assert.match(js,/const hints=reviewerRecheckHints\(state\.revisionDelta,state\.reviewFeedback\)/);
 assert.match(js,/item&&Number\.isSafeInteger\(item\.index\)/);
 assert.match(js,/button\.dataset\.recheckStage=item\.id/);
 assert.match(js,/button\.dataset\.recheckQuestion=String\(item\.number\)/);
 assert.match(js,/Teknik fark, tamamlanan düzeltme veya onay anlamına gelmez/);
 assert.match(styles,/\.exam-recheck-hint-row button:focus-visible/);
 assert.doesNotMatch(html,/id="exam-recheck-mark-all-fixed"/);
});
