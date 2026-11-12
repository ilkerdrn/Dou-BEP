import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const page=readFileSync(resolve(root,'pilot-admin.html'),'utf8');
const ui=readFileSync(resolve(root,'pilot-admin.mjs'),'utf8');
const server=readFileSync(resolve(root,'server-foundation/pilot-sessions.mjs'),'utf8');
const api=readFileSync(resolve(root,'server-foundation/institutional-api.mjs'),'utf8');

test('pilot control panel filters to server-confirmed eligible exams and explains exclusions',()=>{
 assert.match(ui,/api\('\/pilot\/eligible-exams'\)/);
 assert.match(ui,/candidates\.items\.filter\(x=>x\.eligible\)/);
 assert.match(ui,/candidates\.items\.filter\(x=>!x\.eligible\)/);
 assert.match(ui,/menu\.replaceChildren\(\)/);
 assert.match(ui,/menu\.disabled=!eligible\.length/);
 assert.match(ui,/\$\('create'\)\.disabled=!eligible\.length/);
 assert.match(ui,/reasons\.replaceChildren\(\)/);
 assert.match(ui,/list\.append\(el\('li',item\.title\+' · '\+item\.reason\)\)/);
 assert.match(page,/id="pilot-ineligible-exams"/);
 assert.match(page,/id="pilot-empty-exams"/);
});

test('server eligibility is derived from the same gate as code issuance',()=>{
 assert.match(server,/function validatePilotPayload\(exam\)/);
 assert.match(server,/function eligibleExams\(actor\)/);
 assert.match(server,/function issue\(actor,examId\)/);
 assert.match(server,/const payload=validatePilotPayload\(row\)/);
 assert.match(server,/validatePilotPayload\(exam\);/);
 assert.match(server,/pilotEligibleExams:eligibleExams/);
 assert.match(server,/WHERE tenant_id=\? AND owner_id=\? AND status='approved'/);
 assert.match(api,/path==='\/api\/pilot\/eligible-exams'&&req\.method==='GET'/);
});
