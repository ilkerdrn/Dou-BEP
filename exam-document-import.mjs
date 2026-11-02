/** v2.20 - Stateless teacher source-exam import. No student identity or source documents persisted. */
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import {textFromDocument, detectSensitive} from './bep-plan-import.mjs';
import {starterQuestion,VERSION,DEFAULT_ADAPTATIONS} from './core.mjs';

const MAX_FILE=1024*1024;
const ALLOWED=/\.(?:docx|pdf|txt)$/i;
const normalized=s=>String(s||'').replace(/\u0000/g,'').replace(/\u00a0/g,' ').trim();

function inspectWord(bytes){
 const b=Buffer.from(bytes);let eocd=-1;
 for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--){if(b.readUInt32LE(i)===0x06054b50){eocd=i;break;}}
 if(eocd<0)throw Error('DOCX paket dizini bulunamadı.');
 const count=b.readUInt16LE(eocd+10);if(count>500)throw Error('DOCX dosya sayısı sınırı aşıldı.');
 let at=b.readUInt32LE(eocd+16),xml='',rels='',files=[];
 for(let i=0;i<count;i++){
  if(at+46>b.length||b.readUInt32LE(at)!==0x02014b50)throw Error('DOCX merkezi dizin bozuk.');
  const method=b.readUInt16LE(at+10),comp=b.readUInt32LE(at+20),size=b.readUInt32LE(at+24),nlen=b.readUInt16LE(at+28),elen=b.readUInt16LE(at+30),clen=b.readUInt16LE(at+32),local=b.readUInt32LE(at+42);
  if(at+46+nlen+elen+clen>b.length)throw Error('DOCX paket sınırı aşıldı.');
  const name=b.toString('utf8',at+46,at+46+nlen);files.push(name);at+=46+nlen+elen+clen;
  if(name!=='word/document.xml'&&name!=='word/_rels/document.xml.rels')continue;
  if(size>1000000||comp>MAX_FILE||local+30>b.length||b.readUInt32LE(local)!==0x04034b50)throw Error('DOCX XML boyutu geçersiz.');
  const offset=local+30+b.readUInt16LE(local+26)+b.readUInt16LE(local+28);
  if(offset+comp>b.length)throw Error('DOCX XML taşması.');
  const raw=b.subarray(offset,offset+comp);
  const decoded=(method===8?inflateRawSync(raw,{maxOutputLength:1000000}):method===0?raw:(()=>{throw Error('DOCX sıkıştırma yöntemi desteklenmiyor.');})()).toString('utf8');
  if(name==='word/document.xml')xml=decoded;else rels=decoded;
 }
 if(!xml)throw Error('DOCX belge XML verisi yok.');
 const flags=[];
 if(files.some(n=>/vbaProject|\.bin$|word\/activeX\//i.test(n)))flags.push('Makro veya etkin içerik');
 if(files.some(n=>/^word\/embeddings\//i.test(n)))flags.push('Gömülü OLE/dosya nesnesi');
 if(/<w:tbl(?:\s|\/?>)/.test(xml))flags.push('Tablo');
 if(/<m:oMath(?:Para)?(?:\s|>)/.test(xml))flags.push('Office denklem nesnesi');
 if(/<w:(?:drawing|pict|object)(?:\s|\/?>)/.test(xml)||files.some(n=>/^word\/(?:media|charts|diagrams|embeddings)\//.test(n)))flags.push('Görsel, çizim veya gömülü nesne');
 if(files.some(n=>/^word\/(?:comments|footnotes|endnotes)/.test(n)))flags.push('Dipnot veya yorum');
 // Structural inventory is advisory, never a semantic conversion of a table,
 // equation, image, or accessibility alternative. Position is XML document order.
 // A bounded number of items prevents oversized manual checklists.
 const items=[];
 const rx=/<(?:w:tbl(?=[\s/>])|m:oMath(?:Para)?(?=[\s/>])|w:(?:drawing|pict|object)(?=[\s/>]))/g;
 for(const match of xml.matchAll(rx)){
  const tag=match[0];const type=tag.startsWith('<w:tbl')?'table':tag.startsWith('<m:')?'equation':'visual';
  if(type==='equation'&&tag.startsWith('<m:oMath')&&xml.slice(0,match.index).lastIndexOf('<m:oMathPara')>xml.slice(0,match.index).lastIndexOf('</m:oMathPara'))continue;
  if(items.length<41)items.push({id:`item-${String(items.length+1).padStart(3,'0')}`,type,order:items.length+1});
 }
 // Media parts not represented by an ordinary drawing are still evidence that
 // automated text extraction cannot preserve all the source content.
 if(items.length===0&&files.some(n=>/^word\/(?:media|charts|diagrams|embeddings)\//.test(n)))items.push({id:'item-001',type:'visual',order:1});
 // Hyperlinks and related package parts may point to external resources.
 // They cannot become mandatory network dependencies during an offline exam.
 if(/\bTargetMode\s*=\s*['"]External['"]/i.test(xml+'\n'+rels))flags.push('Dış bağlantı');
 return {flags,items,overflow:items.length>40};
}
function findQuestions(raw){
 const text=String(raw||'').replace(/\r/g,'');
 const lines=text.split('\n');
 const questions=[],ignored=[],warnings=[];let current=null,options=false,stopped=false,unclosedCode=false,unmarkedCode=false;
 const finish=()=>{if(!current)return;
  if(current.code){warnings.push(`${current.number}. soruda kapanmamış kod bloğu var.`);unclosedCode=true;}
  // Ordinary prose is joined as before, but explicit fenced source code retains its
  // own newlines, indentation and tabs. Never treat numbered lines inside code as questions.
  current.prompt=current.parts.map(p=>p.code?p.value:` ${p.value}`).join('').trim();
  delete current.parts;delete current.code;
  if(current.prompt)questions.push(current);else warnings.push(`${current.number}. soru metni boş.`);
  current=null;options=false;
 };
 for(const rawLine of lines){
  const line=normalized(rawLine);
  if(current&&/^```[a-zA-Z0-9_.#+-]{0,20}\s*$/.test(line)){
   if(!current.code){current.code=true;current.hasCode=true;current.parts.push({code:true,value:'\nKod:\n'});}
   else{current.code=false;current.parts.push({code:true,value:'\n'});}
   continue;
  }
  if(current?.code){
   // A code line can begin with '1.' or 'A)' without becoming a question or answer option.
   current.parts.push({code:true,value:rawLine.replace(/[ \t]+$/,'')+'\n'});
   continue;
  }
  if(!line)continue;
  if(/^(?:cevap|yanıt)\s+anahtar[ıi](?:\s|[:：]|$)/iu.test(line)){finish();stopped=true;warnings.push('Cevap anahtarı bölümü aktarılmadı; öğretmen doğru yanıtları ayrıca kontrol etmelidir.');break;}
  if(current&&/^(?:not\s*[:：]|öğretmen\s+doğrulamas[ıi]|bu\s+belge\s+|sayfa\s+\d+\b)/iu.test(line)){finish();stopped=true;warnings.push('Belgenin sonundaki not/altbilgi soru metnine eklenmedi; özgün içerikle karşılaştırın.');break;}
  const header=/^(?:soru\s*)?(\d{1,3})\s*[.):-]\s*(.*)$/iu.exec(line);
  if(header&&Number(header[1])>=1&&Number(header[1])<=200){
   finish();current={number:Number(header[1]),parts:header[2]?[{code:false,value:header[2]}]:[],options:[],code:false,hasCode:false};options=false;continue;
  }
  // Code-like lines without explicit fences would lose their structural meaning when
  // ordinary prose is reflowed. Do not silently turn them into an exam question.
  if(current&&/^(?:def\s+[a-zA-Z_]\w*\s*\(|(?:const|let|var)\s+[a-zA-Z_]\w*\s*=|#include\s*<|(?:if|for|while)\s*\([^)]*\)\s*[{:]?|[{}]\s*$)/u.test(line)){
   warnings.push(`${current.number}. soruda işaretlenmemiş kod benzeri satır algılandı.`);
   unmarkedCode=true;
  }
  const choice=/^([A-E])\s*[).:-]\s*(.{1,500})$/iu.exec(line);
  if(choice&&current){current.options.push(normalized(choice[2]));options=true;continue;}
  if(current){
   if(options){warnings.push(`${current.number}. sorunun seçeneklerden sonra ayrıştırılamayan satırı var; özgün belgeyi kontrol edin.`);}
   else current.parts.push({code:false,value:line});
  }else if(ignored.length<12){ignored.push(line);}
 }
 if(!stopped)finish();
 if(ignored.length)warnings.push(`Numaralandırılmış sorular dışında ${ignored.length} veya daha fazla başlık/satır aktarılamadı; özgün dosyayla karşılaştırın.`);
 const unique=new Set();
 if(questions.some(q=>{if(unique.has(q.number))return true;unique.add(q.number);return false;}))warnings.push('Tekrarlanan soru numarası algılandı.');
 for(const q of questions){
  if(q.prompt.length>5000)warnings.push(`${q.number}. soru 5000 karakteri aşıyor.`);
  if(q.options.length===1)warnings.push(`${q.number}. soruda tek seçenek algılandı.`);
  if(q.options.length>12)warnings.push(`${q.number}. soruda 12 seçenek sınırı aşıldı.`);
  if(q.hasCode)warnings.push(`${q.number}. sorunun kod satırları korunmuştur; öğretmen girintileri ve kodun anlamını kontrol etmelidir.`);
 }
 return {questions:questions.slice(0,60),warnings,tooMany:questions.length>60,unclosedCode,unmarkedCode};
}
export function previewSourceExam({filename,base64}={}){
 if(typeof filename!=='string'||filename.length>150||!ALLOWED.test(filename)||/[\\/\u0000-\u001f]/.test(filename))throw Error('Yalnızca kısa isimli .docx, .pdf veya .txt dosyası yükleyin.');
 if(typeof base64!=='string'||base64.length>Math.ceil(MAX_FILE/3)*4+8||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64))throw Error('Dosya kodlaması geçersiz veya çok büyük.');
 const bytes=Buffer.from(base64,'base64');if(!bytes.length||bytes.length>MAX_FILE)throw Error('Dosya en fazla 1 MB olabilir.');
 const ext=filename.split('.').at(-1).toLowerCase();
 if(ext==='docx'&&bytes.subarray(0,2).toString()!=='PK')throw Error('DOCX imzası geçersiz.');
 if(ext==='pdf'&&!bytes.subarray(0,5).toString().startsWith('%PDF-'))throw Error('PDF imzası geçersiz.');
 let rich={flags:[],items:[],overflow:false};if(ext==='docx')rich=inspectWord(bytes);
 const structural=rich.flags;
 const raw=textFromDocument(filename,bytes);
 if(!raw.trim())throw Error('Belge boş veya taranmış PDF. OCR ile otomatik sınav aktarımı desteklenmiyor.');
 const pii=detectSensitive(raw);
 const {questions,warnings,tooMany,unclosedCode,unmarkedCode}=findQuestions(raw);
 if(ext==='pdf')warnings.unshift('PDF metin çıkarımı sayfa düzenini, tabloları, kod girintilerini ve matematik/grafik gösterimini güvenilir biçimde korumaz; özgün belgeyi elle karşılaştırın.');
 const blocking=[];
 if(pii.length)blocking.push('Olası kişisel veri: '+pii.join(', '));
 if(structural.length)blocking.push('Otomatik aktarılamayan zengin içerik: '+structural.join(', '));
 if(rich.overflow)blocking.push('40 üzerinde karmaşık öğe: bu dosya için manuel aktarım da engellendi.');
 if(tooMany)blocking.push('60 sorudan fazla tespit edildi.');
 if(unclosedCode)blocking.push('Kapanmamış kod bloğu; soruların sınırları güvenilir değil.');
 if(unmarkedCode)blocking.push('Kod benzeri satırlar açık kod bloğu içinde değil; kaynak biçimini kontrol ederek üç ters tırnakla işaretleyin.');
 if(!questions.length)blocking.push('Numaralandırılmış sınav sorusu bulunamadı.');
 if(questions.some(q=>q.prompt.length>5000||q.options.length>12))blocking.push('Uzun soru veya seçenek sınırı aşıldı.');
 if(warnings.includes('Tekrarlanan soru numarası algılandı.'))blocking.push('Tekrarlı soru numaraları.');
 if(questions.some(q=>q.options.length===1))blocking.push('Eksik çoktan seçmeli şık tespit edildi.');
 const manualEligible=ext==='docx'&&rich.items.length>0&&!rich.overflow&&pii.length===0&&structural.every(x=>['Tablo','Office denklem nesnesi','Görsel, çizim veya gömülü nesne'].includes(x));
 return {sourceSha256:createHash('sha256').update(bytes).digest('hex'),format:ext,filename,richItems:rich.items,manualEligible,questions:questions.map(q=>({number:q.number,type:q.options.length>=2?'choice':'short',prompt:q.prompt,options:q.options,hasCode:q.hasCode===true})),warnings,blocking,blocked:blocking.length>0,notice:'Metin ve açık işaretli kod satırları ayrıştırılır. Gerçek DOCX tabloları, denklem nesneleri ve görseller engellenir. Puan, cevap anahtarı, kazanım ve erişilebilirlik öğretmen tarafından kontrol edilmelidir. Kaynak dosya saklanmaz.'};
}
export function examDraftFromSource(preview,{title,subject,duration=30,selectedNumbers}={}){
 if(preview.blocked)throw Error('Bu dosyanın otomatik taslağı engellendi: '+preview.blocking.join('; '));
 if(typeof title!=='string'||!title.trim()||title.length>200||typeof subject!=='string'||!subject.trim()||subject.length>100)throw Error('Sınav adı ve ders adı gereklidir.');
 if(!Number.isInteger(Number(duration))||Number(duration)<1||Number(duration)>300)throw Error('Sınav süresi 1-300 dakika olmalıdır.');
 if(!Array.isArray(selectedNumbers)||!selectedNumbers.length||selectedNumbers.length>60||!selectedNumbers.every(n=>Number.isInteger(n)))throw Error('En az bir soru seçilmelidir.');
 const selected=new Set(selectedNumbers);if(selected.size!==selectedNumbers.length)throw Error('Tekrarlı soru seçimi.');
 const questions=preview.questions.filter(q=>selected.has(q.number));
 if(questions.length!==selectedNumbers.length)throw Error('Geçersiz veya tekrarlanan soru numarası.');
 const exam={version:VERSION,title:title.trim(),subject:subject.trim(),grade:'Önlisans / Lisans',duration:Number(duration),profile:'',objective:'',instruction:'Soruları dikkatle okuyunuz.',reviewPolicy:'guided',adaptations:{...DEFAULT_ADAPTATIONS,institutionalHeader:true},bepGoals:[],goalAttestations:[],supportPlan:{version:1,domain:'general',selected:[]},questions:questions.map(q=>({
  ...starterQuestion(q.type),prompt:q.prompt,options:q.type==='choice'?q.options:[],answer:'',points:10,teacherNote:'',provenance:{kind:'source-import',source:'anonim '+preview.format.toUpperCase()+' dosyası',sourceSha256:preview.sourceSha256,transcriptionSha256:preview.transcriptionSha256||'',reviewed:false}
 }))};
 return exam;
}


/** A separate, explicitly manual pathway for rich DOCX sources. The application
 * never claims to have converted an OMML formula, image, or table correctly.
 * Original bytes are rechecked before any independent, unapproved draft exists.
 */
export function previewManualSourceExam({filename,base64,transcription,acknowledgedIds}={}){
 const source=previewSourceExam({filename,base64});
 if(!source.manualEligible)throw Error('Bu DOCX manuel uyarlama için uygun değil; makro, kişisel veri veya başka bir engel bulunabilir.');
 if(typeof transcription!=='string'||transcription.length<20||transcription.length>45000)throw Error('Eksiksiz, 20-45000 karakterlik anonim metin dökümü gerekli.');
 if(/\u0000/.test(transcription))throw Error('Geçersiz metin karakteri.');
 const expected=source.richItems.map(item=>item.id);
 if(!Array.isArray(acknowledgedIds)||acknowledgedIds.length!==expected.length||new Set(acknowledgedIds).size!==expected.length||!expected.every(id=>acknowledgedIds.includes(id)))throw Error('Her karmaşık öğe öğretmen tarafından kaynakla karşılaştırılarak ayrıca işaretlenmelidir.');
 const converted=previewSourceExam({filename:'ogretmen-kontrollu-aktarim.txt',base64:Buffer.from(transcription,'utf8').toString('base64')});
 if(converted.blocked)throw Error('Manuel döküm geçersiz: '+converted.blocking.join('; '));
 // Never auto-attest equivalence or approval, even when the teacher checked each item.
 return {...converted,format:'docx-manual',filename,sourceSha256:source.sourceSha256,
  transcriptionSha256:createHash('sha256').update(Buffer.from(transcription,'utf8')).digest('hex'),
  richItems:source.richItems,manualEligible:true,
  warnings:['Bu otomatik bir dönüştürme değildir. Orijinal DOCX tablo/denklem/görselleri öğretmen tarafından yeniden yazıldı; akademik ve erişilebilirlik eşdeğerliği henüz onaylanmadı.',...converted.warnings],
  notice:'Manuel metin, kaynak öğeler ayrı işaretlenerek taslağa dönüştürülür; bağımsız akademik onay ve erişilebilirlik incelemesi zorunludur.'};
}
