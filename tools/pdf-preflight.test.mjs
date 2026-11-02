import test from 'node:test';
import assert from 'node:assert/strict';
import {preflightPdf} from './pdf-preflight.mjs';
const pdf=(body,tail='%%EOF')=>Buffer.from(`%PDF-1.7\n${body}\n${tail}\n`,'latin1');
test('PDF preflight never claims PDF/UA and never returns exam or student text',()=>{
 const input=pdf('1 0 obj\n<< /Type /Catalog /Pages 2 0 R /Lang (tr-TR) /MarkInfo << /Marked true >> /StructTreeRoot 3 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 0 >>\nendobj\n3 0 obj\n<< /Type /StructTreeRoot /K [] >>\nendobj\n4 0 obj\n<< /ToUnicode 5 0 R >>\nendobj\n5 0 obj\n<< /ExamText (SECRET-LEARNER-CODE-123) >>\nendobj');
 const result=preflightPdf(input);
 assert.equal(result.pdfUaVerified,false);
 assert.equal(result.screenReaderTested,false);
 assert.equal(result.manualExpertReviewRequired,true);
 assert.equal(result.indicatorSummary.readyForCertification,false);
 assert.equal(result.checks.find(x=>x.id==='structure-tree').state,'observed');
 assert.equal(result.checks.find(x=>x.id==='document-language').state,'observed');
 assert.ok(!JSON.stringify(result).includes('SECRET-LEARNER-CODE-123'));
});
test('PDF preflight refuses to treat decorative markers inside a stream as actual structure',()=>{
 const input=pdf('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 0 >>\nendobj\n3 0 obj\n<< /Length 130 >>\nstream\n/StructTreeRoot 4 0 R /MarkInfo << /Marked true >> /Lang (tr-TR)\nendstream\nendobj');
 const result=preflightPdf(input);
 assert.equal(result.checks.find(x=>x.id==='structure-tree').state,'not-verified');
 assert.equal(result.checks.find(x=>x.id==='marked').state,'not-verified');
 assert.equal(result.checks.find(x=>x.id==='document-language').state,'not-verified');
});
test('PDF preflight does not approve untagged PDF or incomplete file',()=>{
 const untagged=preflightPdf(pdf('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj'));
 assert.equal(untagged.checks.find(x=>x.id==='structure-tree').state,'not-verified');
 assert.equal(untagged.indicatorSummary.readyForCertification,false);
 const incomplete=preflightPdf(pdf('1 0 obj\n<< /Type /Catalog >>\nendobj','not-a-trailer'));
 assert.equal(incomplete.checks.find(x=>x.id==='pdf-envelope').state,'missing');
 assert.throws(()=>preflightPdf(Buffer.from('%FICTITIOUS')));
 assert.throws(()=>preflightPdf(Buffer.alloc(24*1024*1024+1)));
});
