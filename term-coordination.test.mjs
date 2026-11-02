import test from 'node:test';import assert from 'node:assert/strict';
import {createDemo} from './core.mjs';
import {TERM_CSV_TEMPLATE,parseTermCourseBatchCsv,courseBatchGroups,validateTermMappings,makeMultiCourseBatchFiles,parseCourseBatchCsv,COURSE_CSV_TEMPLATE} from './batch-accommodations.mjs';
const rows=()=>parseTermCourseBatchCsv(TERM_CSV_TEMPLATE);
const sessions=()=>[
 {term:'2026-GUZ',courseCode:'BLP103',examLabel:'VIZE',examId:'os',readiness:'ready'},
 {term:'2026-GUZ',courseCode:'BGT1011',examLabel:'VIZE',examId:'server',readiness:'ready'},
 {term:'2026-GUZ',courseCode:'ALG101',examLabel:'FINAL',examId:'alg',readiness:'ready'}
];
const selections=()=>new Map([['2026-GUZ::BLP103::VIZE',{examId:'os',approvedExam:true,exam:{...createDemo(),title:'OS vize'}}],['2026-GUZ::BGT1011::VIZE',{examId:'server',approvedExam:true,exam:{...createDemo(),title:'Server vize'}}],['2026-GUZ::ALG101::FINAL',{examId:'alg',approvedExam:true,exam:{...createDemo(),title:'Algoritma final'}}]]);
test('Dönemli Excel/CSV listeleri ders ve dönem üzerinden ayrı gruplanır',()=>{
 const r=rows();assert.equal(r.length,4);assert.equal(courseBatchGroups(r).length,3);
 assert.equal(courseBatchGroups(r)[0].key,'2026-GUZ::BLP103::VIZE');
 const next=TERM_CSV_TEMPLATE.replaceAll('2026-GUZ','2026-BAHAR');assert.equal(rows().length,parseTermCourseBatchCsv(next).length);
 const extra=TERM_CSV_TEMPLATE+'2026-BAHAR;BLP103;VIZE;KOD-001;vision;LARGE_PRINT;0;onayli\n';
 assert.equal(courseBatchGroups(parseTermCourseBatchCsv(extra)).length,4);
});
test('Eksik oturum, yanlış dönem, onaysız veya farklı kaynak kesin reddedilir',()=>{
 const r=rows().filter(x=>x.ready),ss=sessions(),map=selections();
 assert.equal(validateTermMappings(r,map,ss),true);
 assert.throws(()=>validateTermMappings(r,map,ss.slice(1)),/bulunamadı/);
 assert.throws(()=>validateTermMappings(r,map,ss.map(s=>({...s,term:'2026-BAHAR'}))),/bulunamadı/);
 assert.throws(()=>validateTermMappings(r,map,ss.map((s,i)=>i===0?{...s,readiness:'recheck'}:s)),/onaysız/);
 const wrong=selections();wrong.get('2026-GUZ::BLP103::VIZE').examId='another';assert.throws(()=>validateTermMappings(r,wrong,ss),/uyuşmuyor/);
});
test('Dönemli paket üretiminde koordinasyon doğrulaması zorunlu; çıktı dönem klasörlü',()=>{
 const r=rows().filter(x=>x.ready);assert.throws(()=>makeMultiCourseBatchFiles(selections(),r),/koordinasyon/);
 const result=makeMultiCourseBatchFiles(selections(),r,{sessions:sessions()});
 assert.equal(result.groupCount,3);assert.ok(result.filenames.includes('donemler/2026-GUZ/dersler/BLP103/VIZE/sinavlar/KOD-001.docx'));
 assert.ok(result.filenames.includes('GOREVLI-PLANI.csv'));
 assert.ok(!result.filenames.some(s=>/cevap|answer.key/i.test(s)));
});
test('Eski dönem içermeyen çok dersli CSV akışı korunur',()=>{
 const r=parseCourseBatchCsv(COURSE_CSV_TEMPLATE);assert.equal(r.length,5);assert.equal(courseBatchGroups(r)[0].key,'BLP103::VIZE');
});
test('Onayı bekleyen tek kayıt bütün dönemli paketi durdurur',()=>{
 assert.throws(()=>makeMultiCourseBatchFiles(selections(),rows(),{sessions:sessions()}),/Onayı eksik/);
});
