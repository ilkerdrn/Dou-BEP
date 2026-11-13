import test from 'node:test';import assert from 'node:assert/strict';
import {readerText,readerStemText,readerChoicesText,readerHasChoices,readerChunks,localTurkishVoices,readerShortcut,readerRate} from './dou-reader-core.mjs';
const q={number:3,prompt:'Üçgenin alanı kaçtır?',audioAllowed:true,writtenCue:'Dikkatli okuyun',visualDescription:'Tabanı dört birim',options:[{id:'A',label:'Altı'},{id:'B',label:'Sekiz'}],answer:'CEVAP_752',teacherNote:'OGRETMEN_761',studentResponse:'OZEL_KOD_781'};
test('DOU Reader narrates only question-visible text and leaves all secrets out',()=>{
 const text=readerText(q);assert.match(text,/Soru 3/);assert.match(text,/Üçgenin alanı/);assert.match(text,/Görsel açıklaması/);assert.match(text,/Seçenek B: Sekiz/);
 for(const secret of ['CEVAP_752','OGRETMEN_761','OZEL_KOD_781'])assert.ok(!text.includes(secret));
});
test('teacher can disable audio and reader cannot bypass restriction',()=>{
 assert.throws(()=>readerText({...q,audioAllowed:false}),/kapalıdır/);
});
test('local Turkish voices must be explicitly marked local; never auto-select unknown service',()=>{
 const voices=[{name:'Remote Türkçe',lang:'tr-TR',localService:false,voiceURI:'remote'},
 {name:'Unknown Türkçe',lang:'tr-TR',voiceURI:'unknown'},
 {name:'Local English',lang:'en-US',localService:true,voiceURI:'eng'},
 {name:'Türkçe Yerel',lang:'tr-TR',localService:true,voiceURI:'local'}];
 assert.deepEqual(localTurkishVoices(voices).map(v=>v.voiceURI),['local']);
});
test('long Turkish questions split into bounded chunks without dropping characters',()=>{
 const input=('Merhaba dünya. ').repeat(300);const parts=readerChunks(input,120);
 assert.ok(parts.length>5);assert.ok(parts.every(x=>x.length<=120));
 assert.equal(parts.join(' ').replace(/\s+/g,' '),input.trim().replace(/\s+/g,' '));
});
test('shortcuts ignore typing, content-editable, repeats and modifier conflicts',()=>{
 const k={altKey:true,shiftKey:true,ctrlKey:false,metaKey:false,code:'KeyR',repeat:false,target:{tagName:'DIV'}};
 assert.equal(readerShortcut(k),'read');assert.equal(readerShortcut({...k,code:'KeyN'}),'next');
 assert.equal(readerShortcut({...k,target:{tagName:'INPUT'}}),null);
 assert.equal(readerShortcut({...k,target:{tagName:'TEXTAREA'}}),null);
 assert.equal(readerShortcut({...k,target:{tagName:'SELECT'}}),null);
 assert.equal(readerShortcut({...k,target:{isContentEditable:true}}),null);
 assert.equal(readerShortcut({...k,repeat:true}),null);
 assert.equal(readerShortcut({...k,ctrlKey:true}),null);
});
test('reading rate limited to safe configurable range',()=>{
 assert.equal(readerRate(10),1.5);assert.equal(readerRate(-10),.65);assert.equal(readerRate('not a number'),1);
});

test('oversized narration refuses truncation instead of hiding content',()=>{
 assert.throws(()=>readerText({...q,prompt:'ö'.repeat(17000)}),/sınırını aşıyor/);
});

test('split narration keeps question-only and choice-only outputs disjoint',()=>{
 const stem=readerStemText(q),choices=readerChoicesText(q),all=readerText(q);
 assert.match(stem,/Üçgenin alanı/);
 assert.match(stem,/Ek yönerge/);
 assert.match(stem,/Görsel açıklaması/);
 assert.doesNotMatch(stem,/Seçenek A|Seçenek B/);
 assert.match(choices,/Soru 3/);
 assert.match(choices,/Seçenek A: Altı/);
 assert.match(choices,/Seçenek B: Sekiz/);
 assert.doesNotMatch(choices,/Üçgenin alanı|Görsel açıklaması/);
 assert.match(all,/Üçgenin alanı/);
 assert.match(all,/Seçenek B: Sekiz/);
 for(const result of [stem,choices,all])
  for(const secret of ['CEVAP_752','OGRETMEN_761','OZEL_KOD_781'])
   assert.equal(result.includes(secret),false);
 assert.equal(readerHasChoices(q),true);
});
test('matching questions allow reading only the matching rows and targets',()=>{
 const item={number:5,audioAllowed:true,prompt:'Eşleştirin.',
  left:[{id:'L1',label:'Birinci'}],right:[{id:'R1',label:'İkinci'}],
  answer:{L1:'R1'},teacherNote:'DO_NOT_READ'};
 assert.equal(readerHasChoices(item),true);
 const choices=readerChoicesText(item);
 assert.match(choices,/Eşleştirme satırı L1: Birinci/);
 assert.match(choices,/Eşleştirme seçeneği R1: İkinci/);
 assert.doesNotMatch(choices,/DO_NOT_READ|Eşleştirin/);
});
test('split narration refuses teacher-disabled questions and absent options',()=>{
 assert.equal(readerHasChoices({...q,audioAllowed:false}),false);
 assert.throws(()=>readerStemText({...q,audioAllowed:false}),/kapalıdır/);
 assert.throws(()=>readerChoicesText({...q,audioAllowed:false}),/kapalıdır/);
 const noOptions={number:6,audioAllowed:true,prompt:'Yanıtınızı açıklayınız.'};
 assert.equal(readerHasChoices(noOptions),false);
 assert.match(readerStemText(noOptions),/Yanıtınızı/);
 assert.throws(()=>readerChoicesText(noOptions),/seçenek bulunamadı/);
});
test('split narration rejects overlong text rather than truncating or leaking it',()=>{
 assert.throws(()=>readerStemText({...q,prompt:'ö'.repeat(20000)}),/sınırını aşıyor/);
 assert.throws(()=>readerChoicesText({...q,options:[{id:'A',label:'ö'.repeat(20000)}]}),/sınırını aşıyor/);
});
