/**
 * DOU BEP offline PDF accessibility *indicators* preflight.
 * A PDF structural text scan is not a PDF/UA, WCAG, or AT compatibility validator.
 * Never returns document text, file name/path, author metadata or content excerpts.
 * It is intentionally NOT used as a release gate for real learner material.
 */
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const LIMIT=24*1024*1024;
function blankReport(){return {format:'DOU-BEP-PDF-PREFLIGHT-1',scope:'offline-indicators-only',
  pdfUaVerified:false,wcagVerified:false,screenReaderTested:false,
  manualExpertReviewRequired:true,checks:[],warnings:[],
  notice:'Yalnız çevrimdışı, sınırlı PDF yapı işaretleri taramasıdır. PDF/UA, WCAG ya da erişilebilirlik sertifikası değildir.'};}
const c=(report,id,state,meaning)=>report.checks.push({id,state,meaning});
function parseIndirectObjects(source){
 // Exclude stream bodies from lightweight scans to reduce trivial marker spoofing.
 // Not a full PDF parser: object streams, hybrid xrefs and incremental updates may be opaque.
 const withoutStreams=source.replace(/\bstream\r?\n[\s\S]*?\r?\nendstream\b/g,'stream\n[content-omitted]\nendstream');
 const found=new Map();
 for(const match of withoutStreams.matchAll(/(?:^|[\r\n])\s*(\d{1,9})\s+(\d{1,5})\s+obj\b([\s\S]*?)\bendobj\b/g)){
  found.set(`${match[1]} ${match[2]}`,match[3]);
 }
 return found;
}
export function preflightPdf(bytes){
 const result=blankReport();
 if(!Buffer.isBuffer(bytes))throw new TypeError('PDF bytes Buffer olmalı.');
 if(!bytes.length||bytes.length>LIMIT)throw new Error('PDF dosyası 1 bayt ile 24 MiB arasında olmalı.');
 const data=bytes.toString('latin1');
 if(!/^%PDF-(?:1\.[0-7]|2\.0)\b/.test(data.slice(0,12)))throw new Error('Geçerli PDF başlığı bulunamadı.');
 const hasEnd=/%%EOF(?:\s|$)/.test(data.slice(-2048));
 c(result,'pdf-envelope',hasEnd?'observed':'missing','PDF başlığı ve dosya sonu işareti');
 const objects=parseIndirectObjects(data);
 const catalog=[...objects.values()].reverse().find(s=>/\/Type\s*\/Catalog\b/.test(s))||'';
 const actualRef=(input)=>{const m=String(input).match(/(\d{1,9})\s+(\d{1,5})\s+R\b/);return m?objects.get(`${m[1]} ${m[2]}`):undefined;};
 const treeRef=catalog.match(/\/StructTreeRoot\s+(\d{1,9}\s+\d{1,5}\s+R)/);
 const tree=treeRef?actualRef(treeRef[1]):undefined;
 const hasTree=Boolean(tree&&/\/Type\s*\/StructTreeRoot\b/.test(tree));
 c(result,'structure-tree',hasTree?'observed':'not-verified','Katalogdan çözülmüş yapısal etiket ağacı (kısmi işaret)');
 const markRef=catalog.match(/\/MarkInfo\s+(\d{1,9}\s+\d{1,5}\s+R)/);
 const markedInfo=markRef?actualRef(markRef[1]):(catalog.match(/\/MarkInfo\s*(<<[\s\S]*?>>)/)||[])[1];
 const marked=Boolean(markedInfo&&/\/Marked\s+true\b/.test(markedInfo));
 c(result,'marked',marked?'observed':'not-verified','Katalogdan çözümlenen Marked=true işareti');
 const lang=(catalog.match(/\/Lang\s*\(([^()]{1,32})\)/)||[])[1]||'';
 const isTurkish=/^tr(?:-TR)?$/i.test(lang);
 c(result,'document-language',isTurkish?'observed':'not-verified','Katalog Türkçe belge dili (tr veya tr-TR)');
 const unicode=[...objects.values()].some(s=>/\/ToUnicode\s+\d{1,9}\s+\d{1,5}\s+R\b/.test(s));
 c(result,'unicode-map',unicode?'indicator-only':'not-verified','En az bir Unicode karakter eşleme işareti (tüm fontları kanıtlamaz)');
 const encrypted=/(?:\btrailer\s*<<[\s\S]{0,2000}?\/Encrypt\b|\/Type\s*\/Encrypt\b)/.test(data);
 c(result,'encryption',encrypted?'review-required':'not-observed','Şifreleme nedeniyle erişilebilirlik/inceleme kısıtları olabilir');
 const xmp=/(?:pdfuaid:part|<pdfuaid:part>)/i.test(data);
 c(result,'pdfua-declaration',xmp?'unverified-claim':'not-observed','Varsa PDF/UA metadata beyanı; uygunluk kanıtı değildir');
 if(!hasEnd)result.warnings.push('PDF sonlandırma işareti doğrulanamadı.');
 if(!catalog)result.warnings.push('PDF katalog yapısı çözümlenemedi; nesne akışları veya sıkıştırma olabilir.');
 if(!hasTree||!marked)result.warnings.push('Etiketli PDF yapısı doğrulanamadı; yerel erişilebilir PDF dışa aktarımı ve uzman denetimi gerekli.');
 if(!isTurkish)result.warnings.push('Türkçe belge dili işareti doğrulanamadı.');
 if(!unicode)result.warnings.push('Karakterlerin erişilebilir Unicode eşlemesi doğrulanamadı.');
 if(encrypted)result.warnings.push('Şifreleme işaretleri bulundu; izinler ve erişilebilirlik uzman tarafından incelenmeli.');
 result.indicatorSummary={observed:result.checks.filter(x=>x.state==='observed').length,
   total:result.checks.length, readyForCertification:false};
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2);
 if(!(args.length===1||args.length===3&&args[1]==='--report')||!args[0]||extname(args[0]).toLowerCase()!=='.pdf'||args.length===3&&extname(args[2]).toLowerCase()!=='.json'){
  console.error('Kullanım: npm run pdf:preflight -- <belge.pdf> [--report <yeni-rapor.json>]');process.exitCode=2;
 }else try{
  const info=statSync(resolve(args[0]));
  if(!info.isFile()||info.size<=0||info.size>LIMIT)throw Error('pdf size');
  const result=preflightPdf(readFileSync(resolve(args[0])));
  if(args.length===3)writeFileSync(resolve(args[2]),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  if(result.checks.some(item=>item.state==='missing'))process.exitCode=1;
 }catch(error){
  // Deliberately avoid exposing file paths, content or metadata in errors.
  console.error('PDF okunamadı ya da rapor güvenli biçimde oluşturulamadı.');process.exitCode=1;
 }
}
