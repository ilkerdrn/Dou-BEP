/**
 * QUICK source contracts for optional REAL Edge teacher/reviewer handoff.
 * The actual browser must be executed on Windows with installed Edge:
 * npm run ui:browser:handoff
 * These tests never claim a browser run or NVDA user acceptance.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');

test('handoff uses only new temporary SQLite and Edge profile with localhost server',()=>{
 const browser=read('tools/browser-review-handoff.mjs');
 for(const phrase of [
  "mkdtempSync(join(tmpdir(),'dou-bep-browser-handoff-'))",
  "const profile=join(temp,'edge-profile'),dbFile=join(temp,'handoff.sqlite')",
  "process.env.BEP_DB_PATH=dbFile",
  "process.env.BEP_NO_LISTEN='1'",
  "process.env.BEP_REQUIRE_INDEPENDENT_EXAM_APPROVAL='1'",
  "requireIndependentExamApproval:true",
  "server.listen(port,'127.0.0.1',resolve)",
  "const base='http://127.0.0.1:'+port",
  "'--user-data-dir='+profile",
  "fixtureStore.db.close();fixtureStore=null",
  "rmSync(temp,{recursive:true,force:true,maxRetries:5,retryDelay:250})"
 ])assert.ok(browser.includes(phrase),phrase);
 assert.doesNotMatch(browser,/https:\/\/|D:\\Projects|git reset|git clean|production\.sqlite/);
 assert.doesNotMatch(browser,/process\.env\.BEP_UI_CAPTURE_DIR|Page\.captureScreenshot/);
});

test('reviewer and teacher use actual authenticated sessions and live UI controls',()=>{
 const browser=read('tools/browser-review-handoff.mjs');
 assert.match(browser,/fetch\('\/api\/login'/);
 assert.match(browser,/fetch\('\/api\/logout'/);
 assert.match(browser,/headers:\{'X-CSRF-Token':session\.csrf\}/);
 assert.match(browser,/await login\(base,reviewerEmail,'reviewer'\)/);
 assert.match(browser,/await login\(base,teacherEmail,'teacher'\)/);
 assert.match(browser,/await openExam\(base,id\)/);
 assert.match(browser,/document\.getElementById\('exam-review-feedback-form'\)\.requestSubmit\(\)/);
 assert.match(browser,/document\.getElementById\('exam-save'\)\.click\(\)/);
 assert.match(browser,/document\.getElementById\('exam-approve'\)\.click\(\)/);
 assert.match(browser,/reviewExam\(exam\)\.errorCount===0/);
 assert.match(browser,/created\.revision===1&&created\.status==='draft'/);
 assert.match(browser,/await waitUntil\(\(\)=>evaluate\(\(\)=>\s*document\.getElementById\('exam-status'\)\?\.textContent==='ONAYLI'\)/);
});

test('feedback, revision mismatch and independent approval are distinct observable states',()=>{
 const browser=read('tools/browser-review-handoff.mjs');
 for(const phrase of [
  'Active correction request blocks browser approval',
  'All reviewer correction links visible; teacher cannot self-approve',
  'Teacher revision 2 saved without approval',
  'Prior review remains in revision history',
  'Teacher cannot independently approve revised exam',
  'Reviewer inbox flags new revision for manual recheck',
  'Technical differences never automatically validate requested changes',
  'Review summary omits exam text and answer keys',
  'Reviewer can focus requested current question position',
  'Approval available only after independent confirmation',
  'Independent reviewer approves exact current revision',
  'Server-approved revision distinct from saved draft'
 ])assert.ok(browser.includes(phrase),phrase);
 const script=read('institutional-exams.mjs');
 assert.match(script,/reviewFeedbackCheckPending\(\)\|\|hasCurrentReviewFeedback\(\)/);
 assert.match(script,/independentSelfApprovalBlocked\(\)/);
 assert.match(script,/submitExamApproval\(\{/);
});

test('the optional browser gate runs both independent browser suites and QUICK stays headless',()=>{
 const runner=read('tools/v4-local-acceptance.mjs');
 const pkg=JSON.parse(read('package.json'));
 const quick=runner.slice(runner.indexOf('const QUICK_TESTS='),runner.indexOf('const allTests='));
 assert.match(quick,/'tools\/v4-browser-role-handoff-contract\.test\.mjs'/);
 assert.match(runner,/if\(browser\)\{/);
 assert.match(runner,/id:'browser_edge'/);
 assert.match(runner,/id:'browser_handoff'/);
 assert.match(runner,/argv:\['tools\/browser-review-handoff\.mjs'\]/);
 assert.equal(pkg.scripts['ui:browser:handoff'],'node tools/browser-review-handoff.mjs');
 assert.equal(pkg.scripts['acceptance:v4:quick'],'node tools/v4-local-acceptance.mjs --quick');
});
