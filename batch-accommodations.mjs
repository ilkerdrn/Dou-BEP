/** v2.14 local-only examination arrangement packer. No diagnoses or real student identifiers. */
import {makeDeliveryVersion} from './presentation-profiles.mjs';
import {printCss,paperBody,escapeHtml,generateDocx,zipStore} from './core.mjs';
import {generateAccessibleExamHtml} from './accessible-player.mjs';

export const ADJUSTMENTS=Object.freeze({
 LARGE_PRINT:{label:'Büyük punto',kind:'layout'},
 HIGH_CONTRAST:{label:'Yüksek kontrast',kind:'layout'},
 ONE_PER_PAGE:{label:'Her sayfada tek soru',kind:'layout'},
 WIDE_RESPONSE:{label:'Geniş cevap alanı',kind:'layout'},
 ACCESSIBLE_HTML:{label:'Ekran okuyucu / çevrimdışı sesli HTML',kind:'digital'},
 READER:{label:'Okuyucu görevli',kind:'staff'},
 SCRIBE:{label:'Yazıcı/işaretleyici görevli',kind:'staff'},
 SIGN_SUPPORT:{label:'İşaret dili/iletişim desteği',kind:'staff'},
 QUIET_ROOM:{label:'Ayrı/sessiz sınav salonu',kind:'staff'},
 BREAKS:{label:'Onaylı ara düzenlemesi',kind:'staff'},
 ASSISTIVE_TECH:{label:'Onaylı yardımcı teknoloji',kind:'staff'}
});
export const NEED_AREAS=Object.freeze({vision:'Görsel erişim',hearing:'İşitsel erişim',speech:'İfade/iletişim',motor:'Fiziksel erişim',reading:'Okuma/yazma erişimi',other:'Diğer / bireysel'});
export const CSV_TEMPLATE='ogrenci_kodu;gereksinim_alani;onayli_duzenlemeler;ek_sure_dakika;onay_durumu\nORNEK-001;vision;LARGE_PRINT|HIGH_CONTRAST;15;onayli\nORNEK-002;hearing;SIGN_SUPPORT;0;onayli\nORNEK-003;speech;SCRIBE|QUIET_ROOM;10;bekliyor\nORNEK-004;motor;WIDE_RESPONSE|SCRIBE;20;onayli\n';
const COLUMNS=['ogrenci_kodu','gereksinim_alani','onayli_duzenlemeler','ek_sure_dakika','onay_durumu'];
const RESTRICTED=/^(ad|adi|soyad|soyadi|ad_soyad|tc|tckn|tc_kimlik_no|ogrenci_no|ogrenci_numarasi|email|e_posta|telefon|adres|tani|engel_turu|engellilik_orani|dogum_tarihi)$/i;
function cellsOf(line,sep){
 const cells=[];let cell='',quoted=false;
 for(let i=0;i<line.length;i++){const c=line[i];
  if(c==='"'){if(quoted&&line[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(c===sep&&!quoted){cells.push(cell.trim());cell='';}
  else cell+=c;
 }
 if(quoted)throw Error('Kapanmamış CSV tırnağı var.');cells.push(cell.trim());return cells;
}
function cleanCode(s){
 const code=String(s||'').trim();
 if(!/^[A-Za-z0-9][A-Za-z0-9_-]{2,31}$/.test(code)||/^(?:=|\+|-|@)/.test(code))throw Error('Öğrenci kodu 3–32 karakterlik anonim harf/rakam/alt çizgi/tire içermeli.');
 return code;
}
export function parseAccommodationCsv(raw){
 if(typeof raw!=='string'||raw.length>60000)throw Error('CSV metni eksik ya da 60 KB sınırını aşıyor.');
 const txt=raw.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
 if(/"[^"\n]*\n/.test(txt))throw Error('Çok satırlı CSV hücreleri desteklenmiyor.');
 const lines=txt.split('\n').filter(s=>s.trim());
 if(lines.length<2||lines.length>101)throw Error('Başlık ve 1–100 anonim kayıt gerekli.');
 const sep=lines[0].includes(';')?';':',';
 const head=cellsOf(lines[0],sep).map(x=>x.toLocaleLowerCase('tr-TR').replace(/^\uFEFF/,''));
 if(head.some(x=>RESTRICTED.test(x)))throw Error('Dosyada kimlik, tanı veya sağlık verisi başlığı var; yalnız anonim örnek şablonu kullanın.');
 if(head.length!==COLUMNS.length||!COLUMNS.every((x,i)=>head[i]===x))throw Error('CSV başlıkları örnek şablonla aynı sırada olmalı: '+COLUMNS.join(';'));
 const seen=new Set();const rows=[];
 for(let i=1;i<lines.length;i++){
  const columns=cellsOf(lines[i],sep);if(columns.length!==5)throw Error(`${i+1}. satırda 5 sütun bekleniyor.`);
  const [rawCode,need,plan,extra,approval]=columns,code=cleanCode(rawCode);
  if(seen.has(code))throw Error(`${i+1}. satır: yinelenen anonim öğrenci kodu.`);seen.add(code);
  if(need&&!Object.hasOwn(NEED_AREAS,need))throw Error(`${i+1}. satır: bilinmeyen ihtiyaç alanı.`);
  const adjustments=plan.split('|').map(x=>x.trim()).filter(Boolean);
  if(new Set(adjustments).size!==adjustments.length||adjustments.some(x=>!Object.hasOwn(ADJUSTMENTS,x)))throw Error(`${i+1}. satır: geçersiz veya yinelenen düzenleme kodu.`);
  if(!/^(0|[1-9][0-9]{0,2})$/.test(extra)||Number(extra)>120)throw Error(`${i+1}. satır: ek süre 0–120 dakika olmalı.`);
  if(!['onayli','bekliyor'].includes(approval))throw Error(`${i+1}. satır: onay durumu onayli veya bekliyor olmalı.`);
  const ready=approval==='onayli'&&(adjustments.length>0||Number(extra)>0);
  rows.push({code,need,adjustments,extraMinutes:Number(extra),approved:approval==='onayli',ready,reason:ready?'':approval==='bekliyor'?'Kurumsal onay bekleniyor.':'Onaylı sınav düzenlemesi belirtilmemiş.'});
 }
 return rows;
}
export function individualExam(base,row){
 if(!row.ready)throw Error('Bu öğrenci kaydı için onaylı düzenleme yok.');
 const exam=makeDeliveryVersion(base,'standard'),a=exam.adaptations;
 if(row.adjustments.includes('LARGE_PRINT')){a.fontSize=Math.max(24,a.fontSize||18);a.lineSpacing=Math.max(2,a.lineSpacing||1.65);}
 if(row.adjustments.includes('HIGH_CONTRAST')){a.highContrast=true;}
 if(row.adjustments.includes('ONE_PER_PAGE')){a.onePerPage=true;}
 if(row.adjustments.includes('WIDE_RESPONSE')){a.largerAnswerArea=true;a.lineSpacing=Math.max(2,a.lineSpacing||1.65);}
 exam.duration=Number(base.duration)+row.extraMinutes;
 if(!Number.isFinite(exam.duration)||exam.duration<1||exam.duration>420)throw Error('Toplam sınav süresi geçersiz; görevli onayı gerekli.');
 return exam;
}
export function batchReview(rows){return {total:rows.length,ready:rows.filter(x=>x.ready).length,blocked:rows.filter(x=>!x.ready).length,manual:rows.filter(x=>x.ready&&x.adjustments.some(k=>ADJUSTMENTS[k].kind==='staff')).length};}
function escapeCsv(s){let v=String(s??'');if(/^[\s\uFEFF]*[=+\-@\t\r]/.test(v))v="'"+v;return `"${v.replaceAll('"','""')}"`;}
/** Separate approved exams are mapped manually to (course code, assessment label). */
export const COURSE_CSV_TEMPLATE='ders_kodu;sinav_etiketi;ogrenci_kodu;gereksinim_alani;onayli_duzenlemeler;ek_sure_dakika;onay_durumu\nBLP103;VIZE;KOD-001;vision;LARGE_PRINT|HIGH_CONTRAST;15;onayli\nBLP103;VIZE;KOD-002;hearing;SIGN_SUPPORT;0;onayli\nBGT1011;VIZE;KOD-001;vision;ACCESSIBLE_HTML|READER;15;onayli\nALG101;FINAL;KOD-003;motor;WIDE_RESPONSE|SCRIBE;20;onayli\nALG101;FINAL;KOD-004;speech;QUIET_ROOM;10;bekliyor\n';
const COURSE_COLUMNS=['ders_kodu','sinav_etiketi',...COLUMNS];
function safeCourseToken(input,kind){
 const value=String(input||'').trim().toUpperCase();
 if(!/^[A-Z][A-Z0-9_-]{1,23}$/.test(value))throw Error(`${kind} 2–24 karakterlik anonim harf/rakam/tire/alt çizgi içermeli.`);
 return value;
}
export const courseGroupKey=(row)=>`${row.term?row.term+'::':''}${row.courseCode}::${row.examLabel}`;
export function parseCourseBatchCsv(raw){
 if(typeof raw!=='string'||raw.length>60000)throw Error('CSV metni eksik ya da 60 KB sınırını aşıyor.');
 const txt=raw.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
 if(/"[^"\n]*\n/.test(txt))throw Error('Çok satırlı CSV hücreleri desteklenmiyor.');
 const lines=txt.split('\n').filter(s=>s.trim());
 if(lines.length<2||lines.length>101)throw Error('Başlık ve 1–100 anonim ders-sınav kaydı gerekli.');
 const sep=lines[0].includes(';')?';':',';
 const head=cellsOf(lines[0],sep).map(x=>x.toLocaleLowerCase('tr-TR').replace(/^\uFEFF/,''));
 if(head.some(x=>RESTRICTED.test(x)))throw Error('Kimlik, tanı veya sağlık verisi sütunu kabul edilmiyor.');
 if(head.length!==COURSE_COLUMNS.length||!COURSE_COLUMNS.every((x,i)=>x===head[i]))throw Error('CSV başlıkları örnek çok dersli şablonla aynı sırada olmalı: '+COURSE_COLUMNS.join(';'));
 const rows=[],seen=new Set();
 for(let i=1;i<lines.length;i++){
  const cells=cellsOf(lines[i],sep);
  if(cells.length!==7)throw Error(`${i+1}. satırda 7 sütun bekleniyor.`);
  const courseCode=safeCourseToken(cells[0],'Ders kodu'),examLabel=safeCourseToken(cells[1],'Sınav etiketi');
  // Reuse the exact same single-candidate validation as the original safe parser.
  const escaped=cells.slice(2).map(v=>'"'+v.replaceAll('"','""')+'"').join(';');
  let item;
  try{item=parseAccommodationCsv(COLUMNS.join(';')+'\n'+escaped)[0];}
  catch(e){throw Error(`${i+1}. satır: ${e.message}`);}
  const composite=courseCode+'::'+examLabel+'::'+item.code;
  if(seen.has(composite))throw Error(`${i+1}. satır: aynı ders ve sınav için yinelenen anonim öğrenci kodu.`);
  seen.add(composite);rows.push({...item,courseCode,examLabel});
 }
 if(new Set(rows.map(courseGroupKey)).size>40)throw Error('Bir pakette en çok 40 ayrı ders-sınav grubu olabilir.');
 return rows;
}
export function courseBatchGroups(rows){
 const groups=new Map();
 for(const row of rows){
  const key=courseGroupKey(row);if(!groups.has(key))groups.set(key,{key,term:row.term||'',courseCode:row.courseCode,examLabel:row.examLabel,count:0,blocked:0});
  const group=groups.get(key);group.count++;if(!row.ready)group.blocked++;
 }
 return [...groups.values()];
}
/** v2.16: term-aware list. Legacy 7-column lists remain supported with manual mapping. */
export const TERM_CSV_TEMPLATE='donem;'+COURSE_CSV_TEMPLATE.split('\n')[0]+'\n2026-GUZ;BLP103;VIZE;KOD-001;vision;LARGE_PRINT|HIGH_CONTRAST;15;onayli\n2026-GUZ;BGT1011;VIZE;KOD-001;hearing;SIGN_SUPPORT;0;onayli\n2026-GUZ;ALG101;FINAL;KOD-002;motor;WIDE_RESPONSE|SCRIBE;20;onayli\n2026-GUZ;ALG101;FINAL;KOD-003;speech;QUIET_ROOM;10;bekliyor\n';
const TERM=/^20\d{2}-(GUZ|BAHAR|YAZ)$/;
export function parseTermCourseBatchCsv(raw){
 if(typeof raw!=='string'||raw.length>60000)throw Error('CSV içeriği 60 KB sınırını aşıyor.');
 const lines=raw.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim().split('\n');
 if(lines.length<2||lines.length>101)throw Error('Başlık ve 1–100 anonim kayıt gerekli.');
 const header=TERM_CSV_TEMPLATE.split('\n')[0];
 const sep=lines[0].includes(';')?';':',';
 if(cellsOf(lines[0],sep).join(';').toLocaleLowerCase('tr-TR')!==header)throw Error('Dönemli CSV başlıkları örnek Excel şablonuyla aynı sırada olmalı.');
 const rows=[],seen=new Set();
 for(let i=1;i<lines.length;i++){
  const cols=cellsOf(lines[i],sep);
  if(cols.length!==8)throw Error(`${i+1}. satırda 8 sütun olmalı.`);
  const term=cols.shift().toUpperCase();if(!TERM.test(term))throw Error(`${i+1}. satır: dönem 2026-GUZ / 2026-BAHAR biçiminde olmalı.`);
  const quoted=cols.map(x=>'"'+x.replaceAll('"','""')+'"').join(';');
  let row;try{row=parseCourseBatchCsv(COURSE_CSV_TEMPLATE.split('\n')[0]+'\n'+quoted)[0];}catch(e){throw Error(`${i+1}. satır: ${e.message}`);}
  const key=term+'::'+row.courseCode+'::'+row.examLabel+'::'+row.code;
  if(seen.has(key))throw Error(`${i+1}. satır: aynı dönemde yinelenen ders-sınav-aday kodu.`);
  seen.add(key);rows.push({...row,term});
 }
 if(courseBatchGroups(rows).length>40)throw Error('En çok 40 dönem-ders-sınav grubu olabilir.');
 return rows;
}
/** Strong match to coordinator's current approved source, never inferred from need category. */
export function validateTermMappings(rows,selections,sessions){
 if(rows.some(x=>!x.term))throw Error('Dönem eşleştirmesi için her satırda dönem olmalı.');
 if(!(selections instanceof Map)||!Array.isArray(sessions))throw Error('Onaylı sınav ve güncel koordinasyon listesi gerekli.');
 for(const group of courseBatchGroups(rows)){
  const matches=sessions.filter(s=>s.term===group.term&&s.courseCode===group.courseCode&&s.examLabel===group.examLabel);
  if(!matches.length)throw Error(`${group.key}: koordinasyonda sınav oturumu bulunamadı.`);
  if(matches.some(s=>s.readiness!=='ready'||!s.examId))throw Error(`${group.key}: koordinasyon sınavı onaysız veya yeniden kontrol edilmeli.`);
  const chosen=selections.get(group.key);
  if(!chosen||!chosen.approvedExam||!chosen.examId||matches.some(s=>s.examId!==chosen.examId))throw Error(`${group.key}: seçilen sınav koordinasyonun onaylı kaynağı ile uyuşmuyor.`);
 }
 return true;
}
function buildCandidateFiles(base,row,prefix){
 const exam=individualExam(base,row),code=cleanCode(row.code);
 const marker=`<div class="candidate-code">Anonim sınav kodu: <strong>${escapeHtml(code)}</strong></div>`;
 const html=`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Uyarlanmış sınav · ${escapeHtml(code)}</title><style>${printCss}\n.candidate-code{margin:0 0 14px;padding:8px;border:2px solid #000;font:700 12pt Arial}\n@media print{.candidate-code{break-inside:avoid}}</style></head><body>${paperBody(exam,false).replace('<header class="paper-header">',marker+'<header class="paper-header">')}</body></html>`;
 const files={[`${prefix}${code}.html`]:html,[`${prefix}${code}.docx`]:generateDocx(exam,false,code)};
 if(row.adjustments.includes('ACCESSIBLE_HTML'))files[`${prefix}${code}-erisilebilir.html`]=generateAccessibleExamHtml(exam);
 const manual=row.adjustments.filter(x=>ADJUSTMENTS[x].kind==='staff').map(x=>ADJUSTMENTS[x].label);
 return {files,exam,manual};
}
const PACK_NOTE='YALNIZCA ANONIM YEREL PILOT\n\nHer sınav ayrı onaylı kaynak sınavdan öğretmen eşleştirmesiyle türetilir.\nHTML dosyalarını tarayıcıda açarak PDF olarak yazdırabilirsiniz.\nKişisel öğrenci kimliği, tanı veya sağlık bilgisi içermemelidir.\nÖğretmenlerin ölçme eşdeğerliği ve erişilebilirlik incelemesi gereklidir.\nYanıt anahtarı pakete dahil değildir.\n';
function ensureRows(rows){
 if(!Array.isArray(rows)||!rows.length||rows.some(x=>!x.ready))throw Error('Onayı eksik kayıtlar var. Sınav paketinden önce tüm satırları düzeltin.');
 if(rows.length>100)throw Error('100 kayıt sınırı aşıldı.');
}
export function makeBatchFiles(base,rows,{approvedExam=false}={}){
 if(!approvedExam)throw Error('Yalnızca kayıtlı ve kurumsal olarak onaylı sınav kullanılabilir.');
 ensureRows(rows);
 const entries={},table=[['kod','toplam_sure_dakika','duzenlemeler','gorevli_islemleri'].map(escapeCsv).join(';')];
 for(const row of rows){
  const {files,exam,manual}=buildCandidateFiles(base,row,'sinavlar/');Object.assign(entries,files);
  table.push([row.code,String(exam.duration),row.adjustments.join('|'),manual.join(' | ')].map(escapeCsv).join(';'));
 }
 entries['GOREVLI-PLANI.csv']='\uFEFF'+table.join('\r\n')+'\r\n';entries['OKU-BENI.txt']=PACK_NOTE;
 return {zip:zipStore(entries),filenames:Object.keys(entries)};
}
/** No course inference: every group requires an explicitly chosen, currently approved exam. */
export function makeMultiCourseBatchFiles(selections,rows,{sessions,finalizeEntries}={}){
 ensureRows(rows);
 if(rows.some(r=>r.term))validateTermMappings(rows,selections,sessions);
 const groups=courseBatchGroups(rows);
 if(groups.length>40)throw Error('40 ders-sınav grubu sınırı aşıldı.');
 if(!(selections instanceof Map))throw Error('Ders-sınav eşleştirmeleri gereklidir.');
 const entries={};const usedExamIds=new Set();
 const plan=[['donem','ders_kodu','sinav_etiketi','anonim_kod','kaynak_ders','kaynak_sinav','toplam_sure_dakika','duzenlemeler','gorevli_islemleri'].map(escapeCsv).join(';')];
 const inventory=[['donem','ders_kodu','sinav_etiketi','kaynak_ders','kaynak_sinav','aday_sayisi'].map(escapeCsv).join(';')];
 for(const group of groups){
  const selection=selections.get(group.key);
  if(!selection||selection.approvedExam!==true||!selection.exam||typeof selection.examId!=='string'||!selection.examId)throw Error(`${group.courseCode}/${group.examLabel}: onaylı kaynak sınav seçilmedi.`);
  if(usedExamIds.has(selection.examId))throw Error('Aynı onaylı sınav farklı ders/sınav gruplarına atanamaz; eşleştirmeleri kontrol edin.');
  usedExamIds.add(selection.examId);
  if(safeCourseToken(group.courseCode,'Ders kodu')!==group.courseCode||safeCourseToken(group.examLabel,'Sınav etiketi')!==group.examLabel)throw Error('Ders ve sınav kodları geçersiz.');
  const base=selection.exam,prefix=`${group.term?'donemler/'+group.term+'/':''}dersler/${group.courseCode}/${group.examLabel}/sinavlar/`;
  const these=rows.filter(r=>courseGroupKey(r)===group.key);
  inventory.push([group.term||'',group.courseCode,group.examLabel,base.subject||'',base.title||'',String(these.length)].map(escapeCsv).join(';'));
  for(const row of these){
   const {files,exam,manual}=buildCandidateFiles(base,row,prefix);Object.assign(entries,files);
   plan.push([group.term||'',group.courseCode,group.examLabel,row.code,base.subject||'',base.title||'',String(exam.duration),row.adjustments.join('|'),manual.join(' | ')].map(escapeCsv).join(';'));
  }
 }
 entries['DERS-SINAV-ENVANTERI.csv']='\uFEFF'+inventory.join('\r\n')+'\r\n';
 entries['GOREVLI-PLANI.csv']='\uFEFF'+plan.join('\r\n')+'\r\n';
 entries['OKU-BENI.txt']=PACK_NOTE+'\nDönemli dosyalar: donemler/DONEM/dersler/DERS_KODU/SINAV_ETIKETI/sinavlar/KOD.docx ve KOD.html.\nDönemsiz eski listeler: dersler/DERS_KODU/SINAV_ETIKETI/sinavlar/KOD.docx ve KOD.html.\nDönemli listelerde kaynak sınavlar güncel koordinasyon kayıtlarıyla doğrulanmıştır.\n';
 if(typeof finalizeEntries==='function'){const additions=finalizeEntries({...entries});if(!additions||typeof additions!=='object'||Array.isArray(additions))throw Error('Geçersiz paket manifesti.');for(const [name,body] of Object.entries(additions)){if(Object.hasOwn(entries,name)||!/^INTEGRITY-MANIFEST\.json$/.test(name))throw Error('Geçersiz paket dosyası.');entries[name]=body;}}
 return {zip:zipStore(entries),filenames:Object.keys(entries),groupCount:groups.length};
}
