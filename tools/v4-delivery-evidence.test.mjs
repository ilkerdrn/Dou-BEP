import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deliverySelection,sameDeliverySelection,assertDeliveryReady,deliveryReceipt,deliveryProfileLabel} from '../exam-delivery-ux.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const id='ab1d1fc8-3f9a-4dc1-a312-600da644ca00';
const hash='b'.repeat(64);
const selection=deliverySelection({id,revision:4,status:'approved',dirty:false,profile:'large'});
const ready={meta:{id,revision:4,status:'approved'},profile:'large',ready:true,questionCount:5,
 sourceSha256:hash,qualityWarnings:1,structuralAudit:{summary:{passed:7}}};

test('only approved, unchanged, numbered revision and known delivery profiles are accepted',()=>{
 assert.deepEqual(selection,{id,revision:4,profile:'large'});
 for(const input of [
  {id,revision:4,status:'draft',dirty:false,profile:'large'},
  {id,revision:4,status:'approved',dirty:true,profile:'large'},
  {id,revision:0,status:'approved',dirty:false,profile:'large'},
  {id,revision:4,status:'approved',dirty:false,profile:'broken'},
  {id:'bad',revision:4,status:'approved',dirty:false,profile:'large'}
 ])assert.throws(()=>deliverySelection(input));
 assert.equal(sameDeliverySelection(selection,{...selection}),true);
 assert.equal(sameDeliverySelection(selection,{...selection,revision:5}),false);
 assert.equal(sameDeliverySelection(selection,{...selection,profile:'motor'}),false);
});

test('readiness must match exact exam, revision and profile, plus complete source digest',()=>{
 assert.deepEqual(assertDeliveryReady(ready,selection),{
  questionCount:5,profile:'large',revision:4,sourceSha256:hash,qualityWarnings:1,structuralChecks:7
 });
 for(const changed of [
  {...ready,meta:{...ready.meta,revision:5}},
  {...ready,meta:{...ready.meta,id:'ab1d1fc8-3f9a-4dc1-a312-600da644ca01'}},
  {...ready,profile:'standard'},
  {...ready,sourceSha256:'x'},
  {...ready,questionCount:0}
 ])assert.throws(()=>assertDeliveryReady(changed,selection));
 assert.throws(()=>assertDeliveryReady({...ready,ready:false,problems:[{code:'quality_errors',message:'Sınav kontrolü engellendi.'}]},selection),
  /Sınav kontrolü engellendi/);
});

test('download evidence includes actual verified digest, not PDF-UA or academic claims',()=>{
 const receipt=deliveryReceipt({kind:'zip',filename:'anonim-onayli-sinav-large.zip',
  profile:'large',revision:4,sha256:hash});
 assert.equal(receipt.sha256,hash);
 assert.match(receipt.description,/Sürüm 4/);
 assert.equal(deliveryProfileLabel('large'),'Geniş okuma');
 assert.match(receipt.description,/Geniş okuma profili/);
 assert.match(receipt.description,/tarayıcıya gönderildi/);
 assert.doesNotMatch(JSON.stringify(receipt),/PDF\/UA onaylı|WCAG sertifikalı|öğrenci/i);
 for(const props of [
  {kind:'exe',filename:'exam.exe',profile:'large',revision:4,sha256:hash},
  {kind:'pdf',filename:'abc.pdf',profile:'large',revision:4,sha256:'bad'},
  {kind:'zip',filename:'../../exam.zip',profile:'large',revision:4,sha256:hash}
 ])assert.throws(()=>deliveryReceipt(props));
});

test('browser re-checks server, binds revision on ZIP/PDF, verifies integrity and exposes receipt',()=>{
 const js=readFileSync(resolve(root,'institutional-exams.mjs'),'utf8');
 const html=readFileSync(resolve(root,'institutional-exams.html'),'utf8');
 const api=readFileSync(resolve(root,'server-foundation/institutional-api.mjs'),'utf8');
 const server=readFileSync(resolve(root,'server.mjs'),'utf8');
 assert.match(js,/async function getDeliveryReadiness\(selection\)/);
 assert.match(js,/assertDeliveryReady\(info,selection\)/);
 assert.match(js,/sameDeliverySelection\(selection,currentDeliverySelection\(\)\)/);
 assert.match(js,/await getDeliveryReadiness\(selection\)/);
 assert.match(js,/revision:selection\.revision/);
 assert.match(js,/verifyExamDownload\(response,\{format\}\)/);
 assert.match(js,/showDeliveryReceipt\(receipt\)/);
 assert.match(js,/selection\.revision\+'-pdf-pilot\.pdf'/);
 assert.match(js,/selection\.revision\+'\.zip'/);
 assert.match(js,/surum-'\+state\.current\.revision\+'-kurumsal\.docx/);
 assert.match(js,/deliveryInFlight/);
 assert.match(js,/r\.meta\?\.revision!==revision/);
 assert.match(html,/id="exam-delivery-receipt"/);
 assert.match(html,/id="exam-delivery-receipt-sha"/);
 assert.match(html,/id="exam-delivery-copy-sha"/);
 assert.match(api,/if\(current\.meta\.revision!==data\.revision\)throw new StoreError\('revision_conflict'/);
 assert.match(api,/if\(readiness\.meta\.revision!==data\.revision\)throw new StoreError\('revision_conflict'/);
 assert.match(server,/'\/exam-delivery-ux\.mjs':\['exam-delivery-ux\.mjs'/);
});
