/** DOU BEP v2.32 — conservative academic prompt parser for the local PDF pilot.
 * No HTML, LaTeX, Office objects, images, OCR, or auto-interpretation.
 * Tables are linearly labelled (NOT a claim of PDF/UA table navigation).
 */
import {parseReviewedAlternative} from './pdf-reviewed-alternatives.mjs';
const clean=s=>String(s??'').normalize('NFC').replace(/\r\n?/g,'\n');
const hazardous=/(?:!\[[^\]]*\]\([^)]*\)|<\s*(?:img|table|svg|math)\b|\\(?:begin|frac|sqrt|sum|int)\b|\$\$|\[\[(?:image|figure)\]\])/i;
const pipeline=/^\|(?:[^|]*\|){2,}$/;
const trimCell=v=>v.trim();
function parseRow(line){
 if(!pipeline.test(line)||line.includes('\\|'))throw Error('Tablo satırları açık | sütun ayırıcılarıyla yazılmalı.');
 const parts=line.slice(1,-1).split('|').map(trimCell);
 if(parts.length<2||parts.length>6||parts.some(p=>!p||p.length>120||hazardous.test(p)))throw Error('Tablo sütunları boş veya desteklenmeyen içerik taşıyor.');
 return parts;
}
const isRule=line=>/^\|(?:\s*:?-{3,}:?\s*\|){2,6}$/.test(line);
export function parseAcademicPrompt(input){
 const source=clean(input);if(source.length>30000)throw Error('PDF için soru metni uzunluk sınırı aşıldı.');
 const rows=source.split('\n'),out=[];let normal=[];let codeLines=0;
 const flush=()=>{if(normal.length){const text=normal.join('\n').trim();if(text)out.push({tag:'P',text});normal=[];}};
 for(let i=0;i<rows.length;){
  const line=rows[i];
  if(/^:::(?:denklem|gorsel|görsel)$/.test(line.trim())){
   flush();const parsed=parseReviewedAlternative(rows,i);out.push(...parsed.blocks);i=parsed.next;continue;
  }
  if(line.trim().startsWith(':::'))throw Error('Bilinmeyen veya kapanmamış PDF alternatif işaretleyicisi.');
  if(/^\s*```/.test(line)){
   flush();const match=/^```([a-zA-Z0-9_+.#-]{0,32})\s*$/.exec(line);
   if(!match)throw Error('Kod başlangıcı geçersiz; ```dil biçimini kullanın.');
   i++;const lines=[];
   for(;i<rows.length&&!/^```\s*$/.test(rows[i]);i++){
    if(/^\s*```/.test(rows[i]))throw Error('İç içe veya hatalı kod sınırı.');
    const normalized=rows[i].replace(/\t/g,'    ');
    if([...normalized].length>160||/\p{Cc}/u.test(normalized))throw Error('PDF kod satırı desteklenen sınırı aşıyor.');
    lines.push(normalized);codeLines++;
    if(lines.length>100||codeLines>200)throw Error('PDF kod satırı sayısı aşıldı.');
   }
   if(i===rows.length)throw Error('Kapanmamış kod bloğu; PDF üretimi durduruldu.');
   i++;if(!lines.length)throw Error('Boş kod bloğu kullanılamaz.');
   out.push({tag:'P',kind:'code',text:lines.join('\n'),language:match[1]||'kod'});
   continue;
  }
  if(line.trim().startsWith('|')&&line.trim().endsWith('|')){
   flush();const header=parseRow(line.trim());
   if(i+1>=rows.length||!isRule(rows[i+1].trim()))throw Error('Metin tablosunda | --- | --- | başlık ayırıcı satırı bulunmalı.');
   if(parseRow(rows[i+1].trim().replace(/:/g,'').replace(/-/g,'x')).length!==header.length)throw Error('Tablo başlık ayırıcı sütun sayısı hatalı.');
   i+=2;const values=[];
   while(i<rows.length&&rows[i].trim().startsWith('|')){
    const cols=parseRow(rows[i].trim());if(cols.length!==header.length)throw Error('Tablo satırındaki sütun sayısı başlıkla eşleşmiyor.');
    values.push(cols);i++;if(values.length>30)throw Error('PDF tablosu en fazla 30 satır olabilir.');
   }
   if(!values.length)throw Error('Tablo başlığı var ama veri satırı yok.');
   out.push({tag:'P',kind:'table-label',text:`Tablo. Sütunlar: ${header.join('; ')}`} );
   for(const [idx,cells] of values.entries())out.push({tag:'P',kind:'table-row',text:`Satır ${idx+1}. `+header.map((h,j)=>`${h}: ${cells[j]}`).join('; ')});
   continue;
  }
  if(hazardous.test(line)||/^[ \t]{2,}\S/.test(line)||line.includes('```'))throw Error('Görsel, tablo, matematik veya işaretlenmemiş kod öğesi PDF pilotunda desteklenmiyor.');
  normal.push(line);i++;
 }
 flush();return out;
}
