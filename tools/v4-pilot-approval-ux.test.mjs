import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const page=readFileSync(resolve(root,'institutional-exams.html'),'utf8');
const editor=readFileSync(resolve(root,'institutional-exams.mjs'),'utf8');
const exams=readFileSync(resolve(root,'server-foundation/exam-repository.mjs'),'utf8');
const launcher=readFileSync(resolve(root,'PILOT-V4-BASLAT.ps1'),'utf8');

test('approval screen labels the actual reviewer and explains its disabled state',()=>{
 assert.match(page,/id="exam-confirm-label"/);
 assert.match(page,/aria-describedby="exam-confirm-hint"/);
 assert.match(page,/id="exam-confirm-hint" role="status"/);
 assert.match(editor,/role==='reviewer'/);
 assert.match(editor,/İncelemeci olarak bu sınav sürümünün/);
 assert.match(editor,/Yetkili kurum onaylayıcısı olarak/);
 assert.match(editor,/function updateApprovalGuidance\(report\)/);
 assert.match(editor,/updateApprovalGuidance\(report\);/);
 assert.match(editor,/Kaydedilmemiş veya çakışan değişiklikler var/);
 assert.match(editor,/zorunlu kalite kontrol hatası düzeltilmeli/);
 assert.match(editor,/Sunucu son kontrolü ayrıca yapacaktır/);
 assert.match(editor,/\$\('exam-confirm'\)\.addEventListener\('change',\(\)=>\{draw\(\);\}\);/);
});

test('role-specific text never substitutes for server-side separation of duties',()=>{
 assert.match(exams,/requireIndependentExamApproval&&row\.owner_id===actor\.id/);
 assert.match(exams,/separation_of_duties/);
 assert.match(exams,/if\(payload\?\.confirmed!==true\)fail\('confirmation_required'/);
 assert.match(exams,/reviewExam\(JSON\.parse\(row\.body\)\)/);
 assert.match(exams,/Sınav sürümünün onaylanması için yetkili onaylayıcının açık teyidi gerekli/);
});

test('pilot launcher diagnoses occupied port safely without resetting data or killing processes',()=>{
 assert.match(launcher,/Get-NetTCPConnection -LocalPort 4174 -State Listen/);
 assert.match(launcher,/Get-CimInstance Win32_Process/);
 assert.match(launcher,/X-DOU-BEP-Local/);
 assert.match(launcher,/4174 portu dolu/);
 assert.match(launcher,/pilot-only\.marker/);
 assert.doesNotMatch(launcher,/Stop-Process|taskkill(?:\.exe)?|git reset --hard|git clean -fd|rmSync\(/i);
});
