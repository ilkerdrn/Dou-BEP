import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createDemo,generateDocx,printableHtml} from '../core.mjs';
import {generateAccessibleExamHtml} from '../accessible-player.mjs';
import {auditDeliveryArtifacts} from './delivery-accessibility-audit.mjs';
import {makeDeliveryPackage} from './delivery-package.mjs';
import {verifyPackageBytes} from '../tools/verify-batch-package.mjs';

function sample(){const exam=createDemo();exam.questions=exam.questions.map(q=>({...q,teacherNote:'Sadece ogretmen notu - GIZLI-REVIEW-SENTINEL'}));return exam;}
function files(exam){return {'SINAV.docx':generateDocx(exam,false),'SINAV-YAZDIR.html':printableHtml(exam,false),'SINAV-ERISILEBILIR.html':generateAccessibleExamHtml(exam)};}

test('v2.29 semantic Word headings and HTML question headings have one h1 + per-question h2',()=>{
 const exam=sample(),artifacts=files(exam),report=auditDeliveryArtifacts(artifacts,{questionCount:exam.questions.length});
 assert.equal(report.summary.failed,0);assert.equal(report.summary.passed,7);assert.equal(report.manualReviewRequired,true);
 assert.match(artifacts['SINAV-YAZDIR.html'],/<h2 class="paper-question-header">Soru 1/);
 assert.doesNotMatch(artifacts['SINAV-YAZDIR.html'],/GIZLI-REVIEW-SENTINEL/);
 assert.doesNotMatch(artifacts['SINAV-ERISILEBILIR.html'],/GIZLI-REVIEW-SENTINEL/);
 assert.ok(report.outstanding.some(s=>s.includes('gerçek kullanıcı')));
 assert.ok(report.outstanding.some(s=>s.includes('PDF')));
});

test('v2.29 structural delivery gate rejects altered markup, remote assets, leaked answer keys and broken Word heading styles',()=>{
 const exam=sample();const base=files(exam),count=exam.questions.length;
 const corrupt=[
  {'SINAV-YAZDIR.html':base['SINAV-YAZDIR.html'].replace('<h2 class="paper-question-header">','<div class="paper-question-header">')},
  {'SINAV-ERISILEBILIR.html':base['SINAV-ERISILEBILIR.html'].replace("connect-src 'none'", "connect-src 'self'")},
  {'SINAV-ERISILEBILIR.html':base['SINAV-ERISILEBILIR.html'].replace('const data=', 'fetch("https://example.org");const data=')},
  {'SINAV-ERISILEBILIR.html':base['SINAV-ERISILEBILIR.html'].replace('"number":1', '"answer":"secret","number":1')},
  {'SINAV.docx':Buffer.from(base['SINAV.docx'])}
 ];
 // Alter the package's Word semantic heading declaration without touching the original.
 const edited=corrupt.at(-1)['SINAV.docx'];
 const pos=edited.indexOf(Buffer.from('Heading2'));assert.ok(pos>0);edited.write('HeadingX',pos,'utf8');
 for(const change of corrupt){const r=auditDeliveryArtifacts({...base,...change},{questionCount:count});assert.ok(r.summary.failed>=1,JSON.stringify(change));}
});

test('v2.29 delivery archive includes noncertifying evidence that is re-verified from document bytes',()=>{
 const exam=sample();const hash=createHash('sha256').update(JSON.stringify(exam)).digest('hex');
 const pkg=makeDeliveryPackage(exam,{id:'00000000-0000-0000-0000-000000000000',revision:1,profile:'standard',approved:true,sourceSha256:hash,approvalSha256:hash});
 const verified=verifyPackageBytes(pkg.zip,pkg.sha256);
 assert.equal(verified.valid,true);assert.equal(verified.files,6);
 assert.equal(pkg.manifest.files.length,4);
 assert.ok(pkg.manifest.files.some(x=>x.name==='ERISILEBILIRLIK-DENETIM.json'));
});
