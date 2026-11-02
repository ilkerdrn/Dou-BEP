/** DOU BEP v2.32: dependency-free, LOCAL-only, tagged text PDF pilot.
 * This is not a PDF/UA implementation or a replacement for screen-reader testing.
 * Font files are read from the local host and NEVER packaged in source releases.
 * Embedding is refused when the font OS/2 embedding permissions forbid it.
 */
import {readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {DELIVERY_PROFILES,makeDeliveryVersion} from '../presentation-profiles.mjs';
import {preflightPdf} from '../tools/pdf-preflight.mjs';
import {parseAcademicPrompt} from './pdf-rich-text.mjs';

const FONT_LIMIT=12*1024*1024, PDF_LIMIT=20*1024*1024;
const safeString=v=>String(v??'').normalize('NFC').replace(/[\r\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'');
const hex=b=>Buffer.from(b).toString('hex').toUpperCase();
const pdfHex=s=>'<'+hex(Buffer.from('\uFEFF'+safeString(s),'utf16le').swap16())+'>';
const unicodeHex=s=>'<'+hex(Buffer.from(safeString(s),'utf16le').swap16())+'>'; 
const pdfAscii=s=>'('+String(s).replace(/[\\()]/g,'\\$&').replace(/[\r\n]/g,' ')+')';
function checkedFont(path){
 if(!path||typeof path!=='string')throw Error('Yerel TrueType fontu gerekli. BEP_PDF_FONT_PATH ayarlayın.');
 const stat=statSync(path);if(!stat.isFile()||stat.size<512||stat.size>FONT_LIMIT)throw Error('Font boyutu uygun değil.');
 const b=readFileSync(path);const r16=p=>b.readUInt16BE(p),r32=p=>b.readUInt32BE(p);
 if(b.length<128||r32(0)!==0x00010000)throw Error('Yalnız gömülebilir TrueType (.ttf) desteklenir.');
 const tabs=new Map();const count=r16(4);if(count<5||count>80||12+count*16>b.length)throw Error('Font tablo dizini hatalı.');
 for(let i=0;i<count;i++){const at=12+i*16;const name=b.toString('ascii',at,at+4),offset=r32(at+8),len=r32(at+12);if(offset+len>b.length||offset<12)throw Error('Font tablo boyutu hatalı.');tabs.set(name,{at:offset,len});}
 const tab=(name,needed)=>{const t=tabs.get(name);if(!t||t.len<needed)throw Error(`Font ${name} tablosu eksik.`);return t.at;};
 const os2=tab('OS/2',10),fsType=r16(os2+8);
 if((fsType&0x0002)||(fsType&0x0200))throw Error('Font lisansı PDF içine gömmeye izin vermiyor.');
 const head=tab('head',54),hhea=tab('hhea',36),maxp=tab('maxp',6),hmtx=tab('hmtx',4),cmap=tab('cmap',4);
 const upm=r16(head+18),numGlyphs=r16(maxp+4),numMetrics=r16(hhea+34);if(upm<16||numGlyphs<1||numMetrics<1||numMetrics>numGlyphs||tabs.get('hmtx').len<numMetrics*4)throw Error('Font ölçüleri geçersiz.');
 const tables=[];const subCount=r16(cmap+2);if(subCount>100||4+8*subCount>tabs.get('cmap').len)throw Error('Font cmap bozuk.');
 for(let i=0;i<subCount;i++){const at=cmap+4+i*8,platform=r16(at),encoding=r16(at+2),off=r32(at+4),pos=cmap+off;if(pos+8>b.length)continue;const fmt=r16(pos);if((platform===3&&[1,10].includes(encoding)||platform===0)&&[4,12].includes(fmt))tables.push({pos,fmt,score:fmt===12?2:1});}
 tables.sort((a,b)=>b.score-a.score);if(!tables.length)throw Error('Unicode font eşleme tablosu bulunamadı.');
 function cmap4(p,cp){const segCount=r16(p+6)/2,ends=p+14,starts=ends+segCount*2+2,deltas=starts+segCount*2,offsets=deltas+segCount*2;
  if(segCount>16384||offsets+segCount*2>b.length)return 0;
  let lo=0,hi=segCount-1;while(lo<=hi){const i=(lo+hi)>>1,ending=r16(ends+2*i);if(cp>ending)lo=i+1;else hi=i-1;}
  const i=lo;if(i>=segCount||cp<r16(starts+2*i))return 0;
  const delta=b.readInt16BE(deltas+2*i),range=r16(offsets+2*i);
  if(!range)return (cp+delta)&65535;
  const off=offsets+2*i+range+2*(cp-r16(starts+2*i));if(off+2>b.length)return 0;
  const g=r16(off);return g?(g+delta)&65535:0;
 }
 function cmap12(p,cp){if(p+16>b.length)return 0;const groups=r32(p+12);if(groups>100000||p+16+groups*12>b.length)return 0;let lo=0,hi=groups-1;
  while(lo<=hi){const k=(lo+hi)>>1,at=p+16+k*12,start=r32(at),end=r32(at+4);if(cp<start)hi=k-1;else if(cp>end)lo=k+1;else return r32(at+8)+cp-start;}return 0;
 }
 const cache=new Map();function glyph(cp){if(cache.has(cp))return cache.get(cp);let g=0;for(const item of tables){if(item.fmt===4&&cp<=65535)g=cmap4(item.pos,cp);else if(item.fmt===12)g=cmap12(item.pos,cp);if(g)break;}g=g<numGlyphs?g:0;cache.set(cp,g);return g;}
 function width(g){return r16(hmtx+Math.min(g,numMetrics-1)*4)/upm*1000;}
 return {buffer:b,upm,glyph,width,numGlyphs,ascent:b.readInt16BE(hhea+4)/upm*1000,descent:b.readInt16BE(hhea+6)/upm*1000,
  bbox:[36,38,40,42].map(x=>Math.round(b.readInt16BE(head+x)/upm*1000))};
}
export function findHostPdfFont(){
 const env=process.env.BEP_PDF_FONT_PATH;
 if(env)return env; // if explicitly set, never silently fall back
 const win=process.env.WINDIR||'C:\\Windows';
 const candidates=process.platform==='win32'?[join(win,'Fonts','arial.ttf'),join(win,'Fonts','segoeui.ttf'),join(win,'Fonts','calibri.ttf')]:
  ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf','/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf'];
 for(const path of candidates){try{checkedFont(path);return path;}catch{}}
 return null;
}
/** Optional local monospaced TrueType for source-code questions (no bundled fonts). */
export function findHostPdfCodeFont(){
 const custom=process.env.BEP_PDF_CODE_FONT_PATH;
 if(custom)return custom;
 const win=process.env.WINDIR||'C:\\Windows';
 const candidates=process.platform==='win32'?[join(win,'Fonts','consola.ttf'),join(win,'Fonts','cour.ttf')]:
  ['/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf','/usr/share/fonts/truetype/liberation2/LiberationMono-Regular.ttf'];
 for(const path of candidates){try{const f=checkedFont(path);if(isMono(f))return path;}catch{}}
 return null;
}
function isMono(font){
 const ids=['i','W','0',' '].map(s=>font.glyph(s.codePointAt(0)));
 return ids.every(Boolean)&&Math.max(...ids.map(id=>font.width(id)))-Math.min(...ids.map(id=>font.width(id)))<12;
}
function paragraphs(exam){
 const out=[{tag:'H1',text:safeString(exam.title)},{tag:'P',text:`Ders: ${safeString(exam.subject)} | Süre: ${exam.duration} dakika`}];
 if(exam.instruction)out.push({tag:'P',text:safeString(exam.instruction)});
 for(const [i,q] of exam.questions.entries()){
  const dots=q.visualDots||{};
  if(exam.adaptations?.visualCues&&(Number(dots.groupA)>0||Number(dots.groupB)>0||q.visualMode==='image'))throw Error('Görsel gerektiren soru için metin PDF pilotu desteklenmiyor; Word/HTML kullanın.');
  if(q.access?.audioAllowed===false){} // speech policy does not affect printed academic content
  const prompt=safeString(q.presentationMode==='simplified'&&exam.adaptations?.simpleInstructions&&q.simplifiedPrompt?q.simplifiedPrompt:q.prompt);
  out.push({tag:'H2',text:`Soru ${i+1} (${q.points} puan)`},...parseAcademicPrompt(prompt));
  if(q.type==='choice')for(const [j,opt] of (q.options||[]).entries())out.push({tag:'P',text:`${String.fromCharCode(65+j)}) ${safeString(opt)}`});
  else if(q.type==='truefalse')out.push({tag:'P',text:'Doğru (  )    Yanlış (  )'});
  else if(q.type==='matching'){
   for(const [j,pair] of (q.pairs||[]).entries())out.push({tag:'P',text:`${j+1}. ${safeString(pair.left)}`});
   const right=(q.pairs||[]).map(p=>safeString(p.right));right.push(right.shift());
   for(const [j,value] of right.entries())out.push({tag:'P',text:`${String.fromCharCode(65+j)}) ${value}`});
  } else if(q.type==='short'){out.push({tag:'P',text:'Yanıt: ____________________________'});if(exam.adaptations?.largerAnswerArea)out.push({tag:'P',text:'__________________________________'});}
 }
 return out;
}
function pdfBytes(exam,font,codeFont){
 if(!exam||typeof exam!=='object'||!Array.isArray(exam.questions)||!exam.questions.length||exam.questions.length>150)throw Error('PDF pilotu için geçerli sınav gerekli.');
 const blocks=paragraphs(exam),mapped=new Map(),used=new Set(),codeMapped=new Map(),codeUsed=new Set();
 const hasCode=blocks.some(x=>x.kind==='code');
 if(blocks.length>1200)throw Error('PDF metin bloğu sınırı aşıldı.');
 function encode(s,mode='body'){const active=mode==='code'?codeFont:font, glyphMap=mode==='code'?codeMapped:mapped, glyphUsed=mode==='code'?codeUsed:used;const glyphs=[];for(const char of s){const cp=char.codePointAt(0);const gid=active.glyph(cp);if(!gid||gid>65535)throw Error('Yerel fontta sınav karakteri bulunamadı; eksik PDF üretilmedi.');
  if(glyphMap.has(gid)&&glyphMap.get(gid)!==cp)throw Error('Font eşlemesi belirsiz; PDF üretimi reddedildi.');
  glyphMap.set(gid,cp);glyphUsed.add(gid);glyphs.push(gid);}return Buffer.from(glyphs.flatMap(g=>[g>>>8,g&255]));}
 function textWidth(s,size){let sum=0;for(const ch of s){const gid=font.glyph(ch.codePointAt(0));if(!gid)throw Error('Fontta karakter yok.');sum+=font.width(gid)*size/1000;}return sum;}
 const margin=48,pageW=595,pageH=842,available=pageW-2*margin;
 function wrap(s,size){const result=[];for(const raw of safeString(s).split(/\n/)){let line='';for(const word of raw.split(/\s+/).filter(Boolean)){
  if(textWidth(word,size)>available){if(line){result.push(line);line='';}let piece='';for(const char of word){if(piece&&textWidth(piece+char,size)>available){result.push(piece);piece='';}piece+=char;}line=piece;continue;}
  const tryText=line?line+' '+word:word;if(line&&textWidth(tryText,size)>available){result.push(line);line=word;}else line=tryText;}
  result.push(line||' ');}return result;}
 // Each paragraph becomes one marked-content sequence, never reorders content.
 const pages=[[]];let y=pageH-margin;let questionSeen=false;
 const bodySize=Math.min(24,Math.max(12,Number(exam.adaptations?.fontSize)||18));
 const lineSpacing=Math.min(2.1,Math.max(1.4,Number(exam.adaptations?.lineSpacing)||1.65));
 const fontSize=block=>block.kind==='code'?Math.min(16,Math.max(12,bodySize*.72)):block.tag==='H1'?Math.max(18,bodySize+3):block.tag==='H2'?Math.max(14,bodySize+1):bodySize;
 for(const [index,block] of blocks.entries()){
  if(block.tag==='H2'){
   let until=index+1;while(until<blocks.length&&blocks[until].tag!=='H2')until++;
   const needed=blocks.slice(index,until).reduce((sum,item)=>sum+wrap(item.text,fontSize(item)).length*fontSize(item)*lineSpacing+9,0);
   if((exam.adaptations?.onePerPage&&questionSeen)||(needed<=pageH-margin*2&&y-needed<margin)||(needed>pageH-margin*2&&y-margin<fontSize(block)*lineSpacing*4)){
    if(pages.at(-1).length){pages.push([]);y=pageH-margin;}
   }
   questionSeen=true;
  }
  const size=fontSize(block),step=size*lineSpacing,lines=block.kind==='code'?block.text.split('\n'):wrap(block.text,size),perLine=lines.length*step+9;
  if(block.kind==='code'&&lines.some(line=>[...line].reduce((acc,ch)=>{const id=codeFont.glyph(ch.codePointAt(0));if(!id)throw Error('Kod için yerel fontta karakter bulunamadı.');return acc+codeFont.width(id)*size/1000;},0)>available))throw Error('Kod satırı PDF sayfasına sığmıyor; öğrenciye eksik belge üretilmedi.');
  if(y-perLine<margin&&pages.at(-1).length){pages.push([]);y=pageH-margin;}
  for(let at=0;at<lines.length;){if(y-step<margin){pages.push([]);y=pageH-margin;}
   const chunk=[];while(at<lines.length&&y-step>margin){const line=lines[at++];y-=step;chunk.push({line,y});}
   if(chunk.length)pages.at(-1).push({...block,size,lines:chunk});else throw Error('PDF yerleşimi oluşturulamadı.');}
  y-=9;
 }
 const objects=[null];const alloc=()=>{objects.push(null);return objects.length-1;},set=(id,data)=>{objects[id]=data;};
 const catalog=alloc(),pagesRef=alloc(),struct=alloc(),tree=alloc(),info=alloc(),fontFile=alloc(),descriptor=alloc(),cid=alloc(),unicode=alloc(),fontRef=alloc();
 const codeIds=hasCode?[alloc(),alloc(),alloc(),alloc(),alloc()]:null;
 const pageRefs=pages.map(()=>alloc()),contentRefs=pages.map(()=>alloc()),structRefs=pages.map(page=>page.map(()=>alloc()));
 const stream=(data,dict='')=>{const buf=Buffer.from(data);return Buffer.concat([Buffer.from(`<< /Length ${buf.length}${dict?' '+dict:''} >>\nstream\n`,'ascii'),buf,Buffer.from('\nendstream','ascii')]);};

 const parentKeys=[];const rootChildren=[];
 for(let p=0;p<pages.length;p++){
  const content=[],members=[];
  for(const [i,block] of pages[p].entries()){
   const ref=structRefs[p][i];rootChildren.push(`${ref} 0 R`);members.push(`${ref} 0 R`);
   set(ref,`<< /Type /StructElem /S /${block.tag} /P ${struct} 0 R /Pg ${pageRefs[p]} 0 R /K ${i} >>`);
   // /ActualText on code spans exposes exact indentation and line boundaries
   // instead of relying on PDF viewer heuristics for successive glyph positions.
   const actual=block.kind==='code'?` /ActualText ${pdfHex(block.lines.map(x=>x.line).join('\n'))}`:'';
   content.push(`/${block.tag} <</MCID ${i}${actual}>> BDC`);
   for(const item of block.lines){
    if(block.kind==='code'){
     const bytes=encode(item.line,'code');
     content.push(`BT /F2 ${block.size} Tf 1 0 0 1 ${margin} ${item.y.toFixed(2)} Tm <${hex(bytes)}> Tj ET`);
    }else{const bytes=encode(item.line);content.push(`BT /F1 ${block.size} Tf 1 0 0 1 ${margin} ${item.y.toFixed(2)} Tm <${hex(bytes)}> Tj ET`);}
   }
   content.push('EMC');
  }
  set(contentRefs[p],stream(Buffer.from(content.join('\n')+'\n','ascii')));
  set(pageRefs[p],`<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 ${fontRef} 0 R${hasCode?` /F2 ${codeIds[4]} 0 R`:''} >> >> /StructParents ${p} /Contents ${contentRefs[p]} 0 R >>`);
  parentKeys.push(`${p} [${members.join(' ')}]`);
 }
 function installFont(active,usedGlyphs,unicodeMap,ids,name){
  const [fileRef,descRef,cidRef,unicodeRef,ref]=ids;
  if(unicodeMap.size>20000)throw Error('PDF karakter haritası sınırı aşıldı.');
  set(fileRef,stream(active.buffer,`/Length1 ${active.buffer.length}`));
  set(descRef,`<< /Type /FontDescriptor /FontName /${name} /Flags 32 /FontBBox [${active.bbox.join(' ')}] /ItalicAngle 0 /Ascent ${Math.round(active.ascent)} /Descent ${Math.round(active.descent)} /CapHeight ${Math.round(active.ascent*.73)} /StemV 80 /FontFile2 ${fileRef} 0 R >>`);
  const widths=[...usedGlyphs].sort((a,b)=>a-b).map(g=>`${g} [${Math.round(active.width(g))}]`).join(' ');
  set(cidRef,`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descRef} 0 R /DW 1000 /W [${widths}] /CIDToGIDMap /Identity >>`);
  const lines=[...unicodeMap].sort((a,b)=>a[0]-b[0]).map(([g,cp])=>`<${g.toString(16).padStart(4,'0').toUpperCase()}> ${unicodeHex(String.fromCodePoint(cp))}`);
  const chunks=['/CIDInit /ProcSet findresource begin','12 dict begin','begincmap','/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def','/CMapName /BEPToUnicode def','/CMapType 2 def','1 begincodespacerange','<0000> <FFFF>','endcodespacerange'];
  for(let i=0;i<lines.length;i+=90)chunks.push(`${Math.min(90,lines.length-i)} beginbfchar`,...lines.slice(i,i+90),'endbfchar');
  chunks.push('endcmap','CMapName currentdict /CMap defineresource pop','end','end');
  set(unicodeRef,stream(Buffer.from(chunks.join('\n')+'\n','ascii')));
  set(ref,`<< /Type /Font /Subtype /Type0 /BaseFont /${name} /Encoding /Identity-H /DescendantFonts [${cidRef} 0 R] /ToUnicode ${unicodeRef} 0 R >>`);
 }
 installFont(font,used,mapped,[fontFile,descriptor,cid,unicode,fontRef],'BEPHostFont');
 if(hasCode)installFont(codeFont,codeUsed,codeMapped,codeIds,'BEPHostCodeFont');
 set(tree,`<< /Nums [${parentKeys.join(' ')}] >>`);
 set(struct,`<< /Type /StructTreeRoot /K [${rootChildren.join(' ')}] /ParentTree ${tree} 0 R /ParentTreeNextKey ${pages.length} >>`);
 set(pagesRef,`<< /Type /Pages /Count ${pages.length} /Kids [${pageRefs.map(r=>`${r} 0 R`).join(' ')}] >>`);
 set(catalog,`<< /Type /Catalog /Pages ${pagesRef} 0 R /Lang (tr-TR) /MarkInfo << /Marked true >> /StructTreeRoot ${struct} 0 R /ViewerPreferences << /DisplayDocTitle true >> >>`);
 set(info,`<< /Title ${pdfHex(exam.title)} /Producer (DOU BEP local PDF pilot) >>`);
 const parts=[Buffer.from('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n','latin1')],offsets=[0];let position=parts[0].length;
 for(let i=1;i<objects.length;i++){
  const body=Buffer.isBuffer(objects[i])?objects[i]:Buffer.from(String(objects[i]),'ascii');
  offsets.push(position);const entry=Buffer.concat([Buffer.from(`${i} 0 obj\n`,'ascii'),body,Buffer.from('\nendobj\n','ascii')]);parts.push(entry);position+=entry.length;
 }
 const xref=position;let x=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;
 for(let i=1;i<objects.length;i++)x+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
 x+=`trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
 parts.push(Buffer.from(x,'ascii'));const pdf=Buffer.concat(parts);
 if(pdf.length>PDF_LIMIT)throw Error('PDF en fazla 20 MB olabilir.');
 return pdf;
}
export function createTaggedPdfPilot(exam,{profile='standard',fontPath=findHostPdfFont()}={}){
 if(!Object.hasOwn(DELIVERY_PROFILES,profile))throw Error('Geçersiz erişilebilir sunum profili.');
 const font=checkedFont(fontPath);
 const adjusted=makeDeliveryVersion(exam,profile);
 const needsCode=paragraphs(adjusted).some(x=>x.kind==='code');
 const codeFontPath=needsCode?findHostPdfCodeFont():fontPath;
 if(needsCode&&!codeFontPath)throw Error('Kodlu PDF için yerel eş aralıklı TrueType font gerekli. BEP_PDF_CODE_FONT_PATH ayarlayın.');
 const codeFont=needsCode?checkedFont(codeFontPath):font;
 if(needsCode&&!isMono(codeFont))throw Error('Kod fontu eş aralıklı TrueType olmalı.');
 const pdf=pdfBytes(adjusted,font,codeFont);
 const report=preflightPdf(pdf);
 const alternativeBlocks=paragraphs(adjusted).filter(x=>x.kind==='reviewed-alternative');
 report.humanAuthoredAlternatives={count:alternativeBlocks.length,source:'exam-question-text; server export requires approved revision',manualReviewStillRequired:true};
 for(const id of ['pdf-envelope','structure-tree','marked','document-language']){
  if(report.checks.find(x=>x.id===id)?.state!=='observed')throw Error('PDF yapı ön denetiminde gerekli işaret eksik.');
 }
 if(report.checks.find(x=>x.id==='unicode-map')?.state!=='indicator-only')throw Error('PDF Unicode eşleme işareti doğrulanamadı.');
 return {pdf,report};
}
