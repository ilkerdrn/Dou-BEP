import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {pilotDraftPrecheck} from '../pilot-draft-precheck.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const question=(type,number=1)=>({
 type,prompt:'PRIVATE_QUESTION_'+number,answer:'PRIVATE_ANSWER_'+number,
 objective:'PRIVATE_GOAL_'+number,points:10
});
const exam=types=>({questions:types.map((type,index)=>question(type,index+1))});

test('zero questions and 31 questions trigger pilot-only warnings, not mutation or conversion',()=>{
 const empty=pilotDraftPrecheck(exam([]));
 assert.equal(empty.state,'empty');
 assert.equal(empty.formatOk,false);
 assert.equal(empty.target,'exam-question-section');
 const many=exam(Array.from({length:31},()=> 'choice'));
 const before=JSON.stringify(many);
 const result=pilotDraftPrecheck(many);
 assert.equal(result.state,'too_many');
 assert.equal(result.total,31);
 assert.equal(result.maxPilotQuestions,30);
 assert.equal(result.questionIndex,null);
 assert.match(result.detail,/Word\/PDF/);
 assert.equal(JSON.stringify(many),before);
});

test('30 supported questions pass only the question count/type portion of pilot checks',()=>{
 const types=Array.from({length:30},(_,index)=>['choice','truefalse','matching'][index%3]);
 const result=pilotDraftPrecheck(exam(types),{saved:true,dirty:false,approved:true});
 assert.equal(result.formatOk,true);
 assert.equal(result.state,'format_ok');
 assert.equal(result.unsupportedCount,0);
 assert.equal(result.counts.reduce((sum,row)=>sum+row.count,0),30);
 assert.match(result.detail,/sunucu/);
 assert.match(result.notice,/Pilot uygunluğu veya kurumsal onay kararı değildir/);
 assert.equal(Object.hasOwn(result,'eligible'),false);
});

test('short-answer or unknown kinds remain valid general exam data but cannot enter pilot',()=>{
 const draft=exam(['choice','short','matching','unknown']);
 const before=JSON.stringify(draft);
 const result=pilotDraftPrecheck(draft);
 assert.equal(result.state,'unsupported');
 assert.equal(result.questionIndex,1);
 assert.equal(result.firstUnsupported.number,2);
 assert.equal(result.firstUnsupported.label,'Kısa yanıt');
 assert.equal(result.unsupportedCount,2);
 assert.deepEqual(result.counts.filter(item=>item.type==='short').map(item=>item.count),[1]);
 assert.ok(!JSON.stringify(result).includes('PRIVATE_QUESTION_'));
 assert.ok(!JSON.stringify(result).includes('PRIVATE_ANSWER_'));
 assert.equal(JSON.stringify(draft),before);
});

test('quality and accessibility blockers are reported separately after format is acceptable',()=>{
 const correct=exam(['choice','truefalse','matching']);
 const blocked=pilotDraftPrecheck(correct,{
  saved:true,dirty:false,approved:true,qualityErrors:2,accessibilityErrors:1
 });
 assert.equal(blocked.state,'review');
 assert.equal(blocked.formatOk,true);
 assert.equal(blocked.target,'exam-quality');
 assert.match(blocked.detail,/2 kalite hatası/);
 assert.match(blocked.detail,/1 erişilebilirlik/);
 const unapproved=pilotDraftPrecheck(correct,{saved:true,dirty:false,approved:false});
 assert.match(unapproved.detail,/bağımsız incelemeci/);
 const unsaved=pilotDraftPrecheck(correct,{saved:false,dirty:true});
 assert.match(unsaved.detail,/taslağı kaydedin/);
 const mixed=pilotDraftPrecheck(exam(['short']),{qualityErrors:10});
 assert.equal(mixed.state,'unsupported');
});

test('pilot UI has safe navigation, live updates, offline allowlist, and no approval side-effects',()=>{
 const page=readFileSync(resolve(root,'institutional-exams.html'),'utf8');
 const ui=readFileSync(resolve(root,'institutional-exams.mjs'),'utf8');
 const server=readFileSync(resolve(root,'server.mjs'),'utf8');
 const css=readFileSync(resolve(root,'dou-unified-ui.css'),'utf8');
 const pilot=readFileSync(resolve(root,'server-foundation/pilot-sessions.mjs'),'utf8');
 for(const id of ['exam-pilot-draft-precheck','exam-pilot-draft-title','exam-pilot-draft-count',
  'exam-pilot-draft-description','exam-pilot-draft-types','exam-pilot-draft-action'])
  assert.match(page,new RegExp('id="'+id+'"'));
 assert.match(page,/id="exam-pilot-draft-count" role="status" aria-live="polite"/);
 assert.match(ui,/import \{pilotDraftPrecheck\} from '\.\/pilot-draft-precheck\.mjs'/);
 assert.match(ui,/function renderPilotDraftPrecheck\(\)/);
 assert.match(ui,/renderGoalMatrix\(\);updateQuestionDraftGuidance\(\);renderPilotDraftPrecheck\(\)/);
 assert.match(ui,/updateQuestionDraftGuidance\(\);\s*renderPilotDraftPrecheck\(\)/);
 assert.match(ui,/if\(kind==='saved'&&!autosave\.hasChanges\(\)\)\{[\s\S]*?renderPreflight\(\);\s*\/\/ Saving must refresh pilot guidance without redrawing the question inputs\.\s*renderPilotDraftPrecheck\(\)/);
 assert.match(ui,/visitApprovalQuestion\(preview\.questionIndex,'type'\)/);
 assert.match(ui,/visitApprovalQuestion\(30,'type'\)/);
 assert.match(ui,/const allowed=new Set\(\['prompt','objective','points','options','pairs','answer','source','visualAltText','type'/);
 assert.match(ui,/const key=allowed\.has\(field\)\?field:'prompt'/);
 assert.match(server,/'\/pilot-draft-precheck\.mjs':\['pilot-draft-precheck\.mjs'/);
 assert.match(css,/V4 anonymous pilot format precheck/);
 assert.match(pilot,/payload\.questions\.length<1\|\|payload\.questions\.length>30/);
 assert.match(pilot,/\['choice','truefalse','matching'\]/);
 const helper=readFileSync(resolve(root,'pilot-draft-precheck.mjs'),'utf8');
 assert.doesNotMatch(helper,/fetch\(|localStorage|sessionStorage|document\.|window\.|approveExam\(|updateExam\(/);
});
