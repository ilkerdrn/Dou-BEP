import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {approvalWorkbenchSummary} from '../approval-workbench.mjs';
import {questionDraftGuidance} from '../question-draft-guidance.mjs';
import {getExamPreflight} from '../exam-preflight.mjs';
import {reviewExam} from '../quality.mjs';
import {createDemo} from '../core.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const targets=['exam-main-fields','exam-goal-section','exam-question-section','exam-quality','exam-output-section'];
const ids=['identity','goals','questions','access','delivery'];
const synthetic=(done=[false,false,false,false,false],conflict=false)=>({
 stages:ids.map((id,i)=>({id,title:'Aşama '+(i+1),detail:'İşlem '+(i+1),target:targets[i],done:done[i]})),
 approvalConflict:conflict
});
const draft=(size=2)=>({
 items:Array.from({length:size},(_,index)=>({
  number:index+1,index,focus:index===0?'prompt':'answer',
  blocking:index===0?1:0,warnings:index===0?0:1,state:index===0?'incomplete':'review',
  issues:[{text:'Öğrenci yanıtı gizli',field:'answer'}]
 })),
 incomplete:size?1:0,review:Math.max(0,size-1)
});
const quality=(errors=0,warnings=0)=>({errorCount:errors,warningCount:warnings});

test('panel separates local preparation from server-enforced approval and never auto-approves',()=>{
 const base={preflight:synthetic(),questionDraft:draft(),quality:quality()};
 const unsaved=approvalWorkbenchSummary({...base,saved:false,canEdit:true,canApprove:true,confirmed:true});
 assert.match(unsaved.headline,/kaydedilmeli/);
 assert.equal(unsaved.canRequestApproval,false);
 const dirty=approvalWorkbenchSummary({...base,saved:true,dirty:true,canApprove:true,confirmed:true});
 assert.match(dirty.headline,/Kaydedilmemiş/);
 const errors=approvalWorkbenchSummary({...base,saved:true,dirty:false,canApprove:true,confirmed:true,quality:quality(2,1)});
 assert.match(errors.headline,/Zorunlu kalite/);
 assert.equal(errors.summary.qualityErrors,2);
 const noRole=approvalWorkbenchSummary({...base,saved:true,dirty:false,canApprove:false,confirmed:true});
 assert.match(noRole.headline,/Yetkili incelemeci/);
 const consent=approvalWorkbenchSummary({...base,saved:true,dirty:false,canApprove:true,confirmed:false});
 assert.match(consent.headline,/teyidi/);
 const candidate=approvalWorkbenchSummary({...base,saved:true,dirty:false,canApprove:true,confirmed:true,ownerIsActor:true});
 assert.equal(candidate.canRequestApproval,true);
 assert.match(candidate.detail,/sunucu|sunucuda/i);
 assert.match(candidate.detail,/ayrı olması gereken/);
 assert.ok(!Object.hasOwn(candidate,'approved'));
});

test('prior approval cannot mark unsaved editor changes or missing server record as approved',()=>{
 const base={preflight:synthetic([true,true,true,true,false]),
  questionDraft:draft(0),quality:quality(),canApprove:true,confirmed:true};
 const pending=approvalWorkbenchSummary({...base,saved:true,dirty:true,approved:true});
 assert.equal(pending.state,'review');
 assert.equal(pending.canRequestApproval,false);
 assert.match(pending.headline,/henüz doğrulanmamış/);
 assert.match(pending.detail,/kapsamaz/);
 for(const kind of ['saving','pending','blocked','failed']){
  const result=approvalWorkbenchSummary({...base,saved:true,dirty:false,approved:true,[kind]:true});
  assert.equal(result.state,'review');
  assert.equal(result.canRequestApproval,false);
 }
 const missing=approvalWorkbenchSummary({...base,saved:false,dirty:false,approved:true});
 assert.equal(missing.state,'review');
 assert.match(missing.detail,/Sunucu kaydı doğrulanmadan/);
 const saved=approvalWorkbenchSummary({...base,saved:true,dirty:false,approved:true});
 assert.equal(saved.state,'approved');
 assert.equal(saved.canRequestApproval,false);
});

test('historically approved exam with incomplete BEP preflight keeps the conflict visible',()=>{
 const result=approvalWorkbenchSummary({
  preflight:synthetic([true,false,true,true,false],true),questionDraft:draft(0),
  quality:quality(),saved:true,dirty:false,approved:true,canApprove:true,confirmed:true
 });
 assert.equal(result.state,'approved');
 assert.equal(result.approvalConflict,true);
 assert.match(result.headline,/eksik var/);
 assert.match(result.detail,/onay geçmişi otomatik değiştirilmez/i);
 assert.equal(result.canRequestApproval,false);
});

test('question list is capped, navigable by field and contains no prompts or answers',()=>{
 const large=draft(12);
 large.items[0].focus='source';
 large.items[1].focus='__proto__';
 const view=approvalWorkbenchSummary({
  preflight:synthetic(),questionDraft:large,quality:quality(1,2),
  audioFindings:3,saved:true,dirty:false,canApprove:true
 });
 assert.equal(view.questionItems.length,8);
 assert.equal(view.hiddenQuestionCount,4);
 assert.equal(view.questionItems[0].field,'source');
 assert.equal(view.questionItems[1].field,'prompt');
 assert.equal(view.questionItems[0].target,'exam-question-section');
 assert.equal(view.summary.questionCount,12);
 assert.equal(view.summary.audioFindings,3);
 assert.equal(JSON.stringify(view).includes('Öğrenci yanıtı gizli'),false);
 for(const item of view.questionItems){
  assert.equal(Number.isInteger(item.index),true);
  assert.ok(item.label.startsWith('Soru '));
  assert.ok(item.detail.length>8);
 }
});

test('quality findings show fixed categories and never expose answer text',()=>{
 const secret='SECRET_CORRECT_ANSWER_X97';
 const qualityReport={
  errorCount:2,warningCount:1,
  issues:[
   {level:'error',text:'1. soru: Cevap anahtarı ('+secret+') geçersiz.'},
   {level:'warning',text:'2. soru: Görselin alternatif açıklaması eksik.'},
   {level:'error',text:'Onay açıklaması içindeki '+secret+' gözden geçirilmeli.'},
   {level:'info',text:'Öğretmen bilgilendirmesi '+secret}
  ]
 };
 const model=approvalWorkbenchSummary({
  preflight:synthetic(),questionDraft:draft(),quality:qualityReport
 });
 assert.equal(model.qualityItems.length,3);
 assert.equal(model.qualityItems[0].index,0);
 assert.equal(model.qualityItems[0].field,'answer');
 assert.equal(model.qualityItems[1].target,'exam-quality');
 assert.equal(model.qualityItems[1].index,null);
 assert.equal(model.qualityItems[2].field,'visualAltText');
 assert.equal(model.qualityItems[2].index,1);
 assert.ok(model.qualityItems.every(item=>!JSON.stringify(item).includes(secret)));
 assert.equal(JSON.stringify(model).includes(secret),false);
});

test('accepts the existing five preflight stages and real demo question guidance',()=>{
 const exam=createDemo();
 const preflight=getExamPreflight(exam,{saved:false,dirty:true,approved:false});
 const view=approvalWorkbenchSummary({
  preflight,questionDraft:questionDraftGuidance(exam),quality:reviewExam(exam),
  saved:false,dirty:true,canEdit:true
 });
 assert.equal(view.stages.length,5);
 assert.deepEqual(view.stages.map(x=>x.target),targets);
 assert.equal(view.summary.questionCount,5);
 assert.match(view.notice,/sertifikası değildir/);
});

test('unexpected routing, missing stages or invalid quality are rejected without side effects',()=>{
 const base={preflight:synthetic(),questionDraft:draft(),quality:quality()};
 assert.throws(()=>approvalWorkbenchSummary({...base,preflight:{...base.preflight,stages:[]}}),/geçersiz/);
 const shifted=synthetic();shifted.stages[2].target='/api/exams/delete';
 assert.throws(()=>approvalWorkbenchSummary({...base,preflight:shifted}),/hedefi geçersiz/);
 assert.throws(()=>approvalWorkbenchSummary({...base,quality:{errorCount:'1',warningCount:0}}),/geçersiz/);
});

test('UI renders text-only summaries, retains original approval endpoint and keyboard targets',()=>{
 const page=readFileSync(resolve(root,'institutional-exams.html'),'utf8');
 const js=readFileSync(resolve(root,'institutional-exams.mjs'),'utf8');
 const server=readFileSync(resolve(root,'server.mjs'),'utf8');
 const css=readFileSync(resolve(root,'dou-unified-ui.css'),'utf8');
 for(const id of ['exam-approval-workbench','exam-approval-workbench-headline',
  'exam-approval-workbench-stages','exam-approval-workbench-questions',
  'exam-approval-workbench-quality','exam-approval-workbench-confirm',
  'exam-approval-workbench-findings','exam-approval-workbench-findings-count'])
  assert.match(page,new RegExp('id="'+id+'"'));
 assert.match(page,/id="exam-approval-workbench-headline"[^>]*role="status"/);
 assert.match(js,/function renderApprovalWorkbench\(preflight\)/);
 assert.match(js,/renderApprovalWorkbench\(report\)/);
 assert.match(js,/approvalWorkbenchSummary\(\{/);
 assert.match(js,/name\.textContent=label/);
 assert.match(js,/description\.textContent=detail/);
 assert.match(js,/stages\.replaceChildren/);
 assert.match(js,/questions\.replaceChildren/);
 assert.match(js,/findings\.replaceChildren/);
 assert.match(js,/model\.qualityItems\.map/);
 assert.match(js,/function visitApprovalQuestion\(index,field\)/);
 assert.match(js,/function visitPreflightTarget\(id\)/);
 assert.match(js,/visitPreflightTarget\('exam-quality'\)/);
 assert.match(js,/\$\('exam-confirm'\)/);
 assert.match(js,/submitExamApproval\(\{/);
 assert.match(js,/\/exams\/\x27\+examId\+\x27\/approve/);
 assert.match(server,/'\/approval-workbench\.mjs':\['approval-workbench\.mjs'/);
 assert.match(css,/exam-approval-workbench-columns/);
 const helper=readFileSync(resolve(root,'approval-workbench.mjs'),'utf8');
 assert.doesNotMatch(helper,/fetch\(|localStorage|sessionStorage|document\.|window\.|updateExam\(|approveExam\(/);
});
