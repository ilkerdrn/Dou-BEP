import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const page=readFileSync(resolve(root,'pilot-admin.html'),'utf8');
const ui=readFileSync(resolve(root,'pilot-admin.mjs'),'utf8');
const server=readFileSync(resolve(root,'server.mjs'),'utf8');
const sessions=readFileSync(resolve(root,'server-foundation/pilot-sessions.mjs'),'utf8');

test('filter is keyboard accessible, labels every scoring state and reports result count',()=>{
 assert.match(page,/label for="pilot-session-filter"/);
 assert.match(page,/id="pilot-session-filter" aria-describedby="pilot-session-count"/);
 for(const status of ['all','pending','unreviewed','partial','complete','closed'])
  assert.match(page,new RegExp('value="'+status+'"'));
 assert.match(page,/id="pilot-session-count"[^>]*role="status"/);
 assert.match(ui,/filterPilotOverview\(pilotRows,selected\)/);
 assert.match(ui,/\$\('pilot-session-filter'\)\.addEventListener\('change',renderSessionList\)/);
 assert.match(ui,/progress\.dataset\.reviewStatus=item\.reviewStatus/);
 assert.match(ui,/reviewStatusText\(item\)/);
 assert.match(ui,/pilotRows=pilots\.items/);
});

test('list endpoint returns only summary metadata and respects prior authorization',()=>{
 assert.match(sessions,/function list\(actor\)\{/);
 assert.match(sessions,/permit\(actor\);cleanup\(\);/);
 assert.match(sessions,/WHERE p\.tenant_id=\?/);
 assert.match(sessions,/AND p\.owner_id=\?/);
 assert.match(sessions,/pilotReviewOverview\(\{status:item\.status/);
 assert.match(sessions,/approvedExam\(\{id:row\.exam_id/);
 assert.match(sessions,/const item=meta\(row\)/);
 assert.match(sessions,/return \{\.\.\.item,examTitle:row\.exam_title,\.\.\.summary\}/);
 assert.match(server,/'\/pilot-session-overview\.mjs':\['pilot-session-overview\.mjs'/);
});

test('deleting or leaving a scored session cannot silently discard unsaved review',()=>{
 assert.match(ui,/if\(activeReview\?\.sessionId===item\.id&&\(reviewSaving\|\|reviewDraftSnapshot\(\)\?\.inspection\.changed\)\)/);
 assert.match(ui,/Kaydedilmemiş değişiklik var\. Önce kaydedin/);
 assert.match(ui,/reviewDraftSnapshot\(\)\?\.inspection\.changed&&!confirm/);
 assert.match(ui,/beforeunload/);
 assert.match(ui,/void refresh\(\)\.catch/);
 assert.match(ui,/item\.status==='submitted'\?'Değerlendir':'Durumu gör'/);
});
