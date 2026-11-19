/** v2.89: Teacher question sheet (Excel). Same preview shape as exam-document-import.mjs so the existing
 * review -> explicit teacher confirmation -> server re-parse -> UNAPPROVED draft flow applies unchanged.
 * Strict, anonymous, single-sheet, no formulas/macros/links (see xlsx-import.mjs). Source file is not stored.
 */
import {createHash} from 'node:crypto';
import {readAnonymousXlsx} from './xlsx-import.mjs';
import {detectSensitive} from './bep-plan-import.mjs';
export const QUESTION_SHEET_HEADER=Object.freeze(['soru_no','soru','secenek_a','secenek_b','secenek_c','secenek_d','secenek_e','dogru_cevap','puan','gorsel_betimleme','kazanim']);
const MAX_FILE=512*1024,MAX_QUESTIONS=60;
export const isQuestionSheetName=name=>/\.xlsx$/i.test(String(name||''));
export async function previewQuestionSheet({filename,base64}={}){
 if(typeof filename!=='string'||filename.length>150||!isQuestionSheetName(filename)||/[\\/\u0000-\u001f]/.test(filename))throw Error('Yalnızca kısa isimli .xlsx dosyası yükleyin.');
 if(typeof base64!=='string'||base64.length>Math.ceil(MAX_FILE/3)*4+8||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64))throw Error('Dosya kodlaması geçersiz veya çok büyük (en çok 512 KB).');
 const bytes=Buffer.from(base64,'base64');if(!bytes.length||bytes.length>MAX_FILE)throw Error('Excel dosyası en fazla 512 KB olabilir.');
 if(bytes.subarray(0,2).toString()!=='PK')throw Error('XLSX imzası geçersiz.');
 const table=await readAnonymousXlsx(bytes,{cols:QUESTION_SHEET_HEADER.length,chars:1500,maxRow:MAX_QUESTIONS+2,maxRecords:MAX_QUESTIONS+1,multiline:true});
 const header=(table[0]||[]).map(v=>String(v).toLocaleLowerCase('tr-TR').trim());
 if(QUESTION_SHEET_HEADER.some((h,i)=>header[i]!==h))throw Error('Başlıklar şablonla aynı olmalı: '+QUESTION_SHEET_HEADER.join(', ')+'. Ad, numara veya tanı sütunu eklemeyin.');
 const blocking=[],warnings=[],questions=[],seen=new Set();
 for(let r=1;r<table.length;r++){
  const [no,prompt,a,b,c,d,e,key,points,alt,objective]=table[r].map(v=>String(v??'').trim()),label=`${r}. satır`;
  const number=Number(no);
  if(!/^\d{1,3}$/.test(no)||number<1||number>200){blocking.push(`${label}: soru numarası 1–200 arası tam sayı olmalı.`);continue;}
  if(seen.has(number))blocking.push(`${label}: tekrarlı soru numarası (${number}).`);seen.add(number);
  if(!prompt){blocking.push(`${number}. soru: soru metni boş.`);continue;}
  const raw=[a,b,c,d,e];let last=-1;raw.forEach((x,i)=>{if(x)last=i;});
  const options=raw.slice(0,last+1);
  if(options.some(x=>!x)){blocking.push(`${number}. soru: seçenekler A'dan başlayıp boşluksuz sıralanmalı.`);continue;}
  if(options.length===1){blocking.push(`${number}. soru: tek seçenek var; en az iki seçenek veya hiç seçenek (kısa yanıt) olmalı.`);continue;}
  const type=options.length>=2?'choice':'short';
  let answer='';
  if(type==='choice'){
   if(key){const idx='ABCDE'.indexOf(key.toUpperCase());
    if(key.length!==1||idx<0||idx>=options.length){blocking.push(`${number}. soru: doğru cevap A–${String.fromCharCode(64+options.length)} harflerinden biri olmalı.`);continue;}
    answer=options[idx];}
   else warnings.push(`${number}. soru: doğru cevap boş; editörde girilmelidir.`);
  }else{answer=key;if(!key)warnings.push(`${number}. soru: kısa yanıt için cevap boş; editörde girilmelidir.`);}
  let pt=10;if(points){if(!/^\d{1,4}$/.test(points)||Number(points)>1000){blocking.push(`${number}. soru: puan 0–1000 arası tam sayı olmalı.`);continue;}pt=Number(points);}
  if(alt.length>200){blocking.push(`${number}. soru: görsel betimlemesi 200 karakteri aşıyor.`);continue;}
  if(objective.length>500){blocking.push(`${number}. soru: kazanım 500 karakteri aşıyor.`);continue;}
  if(prompt.length>5000||options.some(x=>x.length>500))blocking.push(`${number}. soru: metin veya seçenek uzunluk sınırını aşıyor.`);
  questions.push({number,type,prompt,options:type==='choice'?options:[],hasCode:false,answer,points:pt,visualAltText:alt,objective});
 }
 if(!questions.length&&!blocking.length)blocking.push('Soru bulunamadı.');
 if(questions.length>MAX_QUESTIONS)blocking.push('60 sorudan fazla soru yüklenemez.');
 const pii=detectSensitive(table.slice(1).flat().join('\n'));
 if(pii.length)blocking.push('Olası kişisel veri: '+pii.join(', '));
 if(questions.length)warnings.unshift('Doğru cevaplar, puanlar ve kazanımlar Excel dosyasından alındı; öğretmen her birini kontrol etmelidir.');
 if(questions.some(q=>q.visualAltText))warnings.push('Görsel betimlemeleri Excel\'den alındı; görseli gören bir öğretmen doğruluğunu onaylamalıdır.');
 return {sourceSha256:createHash('sha256').update(bytes).digest('hex'),format:'xlsx',filename,richItems:[],manualEligible:false,questions,warnings,blocking,blocked:blocking.length>0,
  notice:'Excel soru sayfası ayrıştırıldı. Taslak onaysızdır; kaynak dosya saklanmaz. Cevap anahtarı, kazanım ve erişilebilirlik öğretmen tarafından kontrol edilmeli, sonra kurumsal onaya gönderilmelidir.'};
}
