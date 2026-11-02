/** Build-time guard for remote resources in explicitly published local UI files.
 * This static check does not replace an OS-level outbound-firewall test.
 */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const remote=/^(?:https?:)?\/\//i;
const patterns=[
 ['external_asset',/<(?:script|img|iframe|source|link)\b[^>]*\b(?:src|href)\s*=\s*["']((?:https?:)?\/\/[^"']+)["']/gi],
 ['css_import',/@import\s+(?:url\(\s*)?["']?((?:https?:)?\/\/[^\s)'";]+)["']?/gi],
 ['css_remote_url',/url\(\s*["']?((?:https?:)?\/\/[^\s)'";]+)["']?\s*\)/gi],
 ['module_remote_import',/\b(?:from\s*|import\s*\(\s*)["']((?:https?:)?\/\/[^"']+)["']/gi],
 ['remote_fetch',/\b(?:fetch|WebSocket|EventSource|sendBeacon)\s*\(\s*["']((?:https?:)?\/\/[^"']+)["']/gi]
];
export function inspectPublishedSource(text,filename){
 const problems=[];
 for(const [kind,re] of patterns){re.lastIndex=0;for(const match of text.matchAll(re)){
  if(remote.test(match[1]))problems.push({file:filename,kind,reference:match[1]});
 }}
 return problems;
}
export function auditLocalAssets(){
 const source=readFileSync(join(root,'server.mjs'),'utf8');
 // The server uses an explicit static allowlist with paths and relative filenames.
 const matches=[...source.matchAll(/^ '\/[^']+':\['([^']+)'/gm)];
 const files=[...new Set(matches.map(x=>x[1]).filter(x=>/\.(?:html|mjs|js|css)$/.test(x)))];
 const problems=[];
 for(const name of files){const absolute=resolve(root,name);
  if(!absolute.startsWith(root+'/')||name.includes('..')){problems.push({file:name,kind:'unsafe_path'});continue;}
  const content=readFileSync(absolute,'utf8');problems.push(...inspectPublishedSource(content,name));
 }
 return {checked:files.length,problems};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=auditLocalAssets();console.log(`Offline runtime static asset check: ${result.checked} dosya, ${result.problems.length} sorun`);
 if(result.problems.length){for(const x of result.problems)console.error(`${x.file}: ${x.kind}: ${x.reference??''}`);process.exitCode=1;}
 else console.log('PASS: Yayınlanan arayüz dosyalarında doğrudan harici kaynak çağrısı bulunamadı.');
 console.log('NOT: Bu statik kontroldür; ağ çıkışını firewall ile ayrıca sınayın.');
}
