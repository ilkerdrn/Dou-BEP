import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {workflowNextAction,workflowReadinessLabels} from '../workflow-next-action.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const stages=[
 {id:'identity',title:'Sınav bilgileri',target:'exam-main-fields'},
 {id:'goals',title:'BEP kazanımları',target:'exam-goal-section'},
 {id:'questions',title:'Sorular ve yanıtlar',target:'exam-question-section'},
 {id:'access',title:'Öğretmen ve erişim kontrolü',target:'exam-quality'},
 {id:'delivery',title:'Kaydetme ve onay',target:'exam-output-section'}
];
const report=(flags,approvalConflict=false)=>{
 const prepared=stages.map((s,i)=>({...s,done:Boolean(flags[i]),detail:s.title+' kontrolü gerekiyor.'}));
 return {stages:prepared,complete:prepared.filter(s=>s.done).length,total:5,approvalConflict};
};

test('five editor steps distinguish optional library from preflight question and quality gates',()=>{
 const r=report([true,true,true,false,false]);
 assert.deepEqual(workflowReadinessLabels(r),['done','done','optional','pending','pending']);
 const action=workflowNextAction(r,{saved:true,dirty:false});
 assert.equal(action.target,'exam-quality');
 assert.equal(action.complete,3);
 assert.deepEqual(action.stepStates,workflowReadinessLabels(r));
 assert.equal(action.stepStates.length,5);
});

test('next-action navigation follows earliest failed required step',()=>{
 const checks=[
  {flags:[false,false,false,false,false],target:'exam-main-fields'},
  {flags:[true,false,false,false,false],target:'exam-goal-section'},
  {flags:[true,true,false,false,false],target:'exam-question-section'},
  {flags:[true,true,true,false,false],target:'exam-quality'},
  {flags:[true,true,true,true,false],target:'exam-output-section'}
 ];
 for(const c of checks){
  const action=workflowNextAction(report(c.flags),{saved:true,dirty:false});
  assert.equal(action.target,c.target);
  assert.equal(action.state,'pending');
 }
});

test('save, independent approval, and export permissions are explained but never bypassed',()=>{
 const delivery=report([true,true,true,true,false]);
 const save=workflowNextAction(delivery,{saved:false,dirty:true,canEdit:true});
 assert.match(save.title,/kaydedin/i);
 const teacher=workflowNextAction(delivery,{saved:true,dirty:false,canApprove:false});
 assert.match(teacher.title,/onay/i);
 assert.match(teacher.detail,/Yetkili incelemecinin/);
 const approver=workflowNextAction(delivery,{saved:true,dirty:false,canApprove:true});
 assert.match(approver.detail,/bağımsız incelemeci/i);
 const readonly=workflowNextAction(report([false,false,false,false,false]),{canEdit:false});
 assert.match(readonly.title,/Yetkili düzenlemesi/i);
 const readonlySave=workflowNextAction(delivery,{saved:false,dirty:true,canEdit:false});
 assert.match(readonlySave.title,/Yetkili kullanıcı kaydı/);
 assert.doesNotMatch(readonlySave.title,/Taslağı kaydedin/);
 const done=workflowNextAction(report([true,true,true,true,true]),{saved:true,dirty:false,approved:true,canExport:false});
 assert.equal(done.state,'complete');
 assert.equal(done.target,'exam-output-section');
 assert.match(done.detail,/Çıktı indirme yetkisi olmayan/);
});

test('real exam-preflight schema still maps the optional library independently',async()=>{
 const {getExamPreflight}=await import('../exam-preflight.mjs');
 const {createDemo}=await import('../core.mjs');
 const report=getExamPreflight(createDemo(),{saved:false,dirty:true,approved:false});
 assert.equal(report.total,5);
 assert.equal(report.firstPending,'goals');
 const guidance=workflowNextAction(report,{saved:false,dirty:true});
 assert.equal(guidance.target,'exam-goal-section');
 assert.equal(guidance.stepStates[2],'optional');
});

test('conflicting historical approval remains a visible blocker without changing it',()=>{
 const r=report([true,false,true,true,false],true);
 const action=workflowNextAction(r,{saved:true,dirty:false,approved:true});
 assert.equal(action.approvalConflict,true);
 assert.equal(action.target,'exam-goal-section');
 assert.match(action.title,/uyuşmuyor/i);
 assert.match(action.detail,/Yetkili incelemesi gerekir/);
 const invalid=report([false,false,false,false,false]);
 invalid.stages[0].target='https://invalid.example';
 assert.throws(()=>workflowNextAction(invalid),/hedefi geçersiz/);
});

test('wizard surface, focus navigation, and local-only module preserve exam controls',()=>{
 const page=readFileSync(resolve(root,'institutional-exams.html'),'utf8');
 const js=readFileSync(resolve(root,'institutional-exams.mjs'),'utf8');
 const server=readFileSync(resolve(root,'server.mjs'),'utf8');
 const css=readFileSync(resolve(root,'dou-unified-ui.css'),'utf8');
 assert.match(page,/id="workflow-next-action"/);
 assert.match(page,/id="workflow-next-action-open"/);
 assert.match(page,/id="workflow-readiness-count"/);
 assert.match(js,/workflowNextAction\(report,\{/);
 assert.match(js,/guidance\.stepStates\[index\]/);
 assert.match(js,/function visitPreflightTarget\(id\)/);
 assert.match(js,/stageId=id==='exam-quality'\?'exam-question-section':id/);
 assert.match(js,/focusTarget\.focus\(\{preventScroll:true\}\)/);
 assert.match(js,/\$\('workflow-next-action-open'\)\.addEventListener\('click'/);
 assert.match(server,/'\/workflow-next-action\.mjs':\['workflow-next-action\.mjs'/);
 assert.match(css,/workflow-next-action-content/);
 assert.doesNotMatch(readFileSync(resolve(root,'workflow-next-action.mjs'),'utf8'),/fetch\(|localStorage|sessionStorage|document\.|window\.|approveExam|updateExam/);
});
