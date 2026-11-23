/** v2.91: Terminology profile. Default "school" (MEB/BEP wording) is left untouched. Profile "university" shows
 * higher-education wording (ders öğrenme çıktısı) on administration pages. Hand-written phrase list + a few unambiguous
 * suffix forms only; ambiguous inflections are NOT guessed. Display-only: stored data and APIs are not changed.
 * Profile comes from the server (BEP_TERMINOLOGY=school|university, GET /terminology.json); no browser storage.
 */
const PHRASES=[
 ['BEP kazanımlarını','ders öğrenme çıktılarını'],['BEP kazanımları','ders öğrenme çıktıları'],['BEP kazanım aktarımı','öğrenme çıktısı aktarımı'],
 ['BEP kazanım kataloğu','öğrenme çıktısı kataloğu'],['BEP kazanımı','ders öğrenme çıktısı'],['BEP hedeflerini','ders öğrenme çıktılarını'],
 ['BEP hedefleri','ders öğrenme çıktıları'],['BEP hedefini','ders öğrenme çıktısını'],['BEP hedefi','ders öğrenme çıktısı'],
 ['Kazanımı taslak kaydet','Öğrenme çıktısını taslak kaydet'],['Kazanımı aktarmak','Öğrenme çıktısını aktarmak'],['Katalogdaki kazanımı','Katalogdaki öğrenme çıktısını'],
 ['Bağlanacak kazanım','Bağlanacak öğrenme çıktısı'],['Kazanım kodu','Öğrenme çıktısı kodu'],['Kazanım açıklaması','Öğrenme çıktısı açıklaması'],
 ['Kazanım, soru ve onay','Öğrenme çıktısı, soru ve onay'],['kazanım adayları','öğrenme çıktısı adayları'],['kazanım aktar','öğrenme çıktısı aktar'],
 ['kazanım CSV','öğrenme çıktısı CSV'],['kazanım gözlemi','öğrenme çıktısı gözlemi'],['Sınav kazanımı','Sınav öğrenme çıktısı'],
 ['2. Sınıf','Lisans / Önlisans'],['Sınıf / kademe','Program / düzey'],['Öğretmen onayı','Öğretim elemanı onayı'],['öğretmen onayı','öğretim elemanı onayı'],
 ['Öğretmen kontrollü','Öğretim elemanı kontrollü'],['öğretmen kontrollü','öğretim elemanı kontrollü']
].sort((a,b)=>b[0].length-a[0].length);
// Unambiguous suffix forms of "kazanım" (nominative and clearly marked cases only). "kazanımı" is deliberately excluded.
const SUFFIX=[['kazanımlarını','öğrenme çıktılarını'],['kazanımlarına','öğrenme çıktılarına'],['kazanımların','öğrenme çıktılarının'],['kazanımlarda','öğrenme çıktılarında'],['kazanımlar','öğrenme çıktıları'],['kazanımda','öğrenme çıktısında'],['kazanımdan','öğrenme çıktısından'],['kazanıma','öğrenme çıktısına'],['kazanımın','öğrenme çıktısının'],['kazanım','öğrenme çıktısı']];
const startOfSentence=(text,index)=>{let i=index-1;while(i>=0&&text[i]===' ')i--;return i<0||'.!?:\n'.includes(text[i]);};
const keepCase=(source,target,atStart)=>{const upper=source[0]!==source[0].toLocaleLowerCase('tr-TR');return upper&&atStart?target[0].toLocaleUpperCase('tr-TR')+target.slice(1):target;};
export function replaceTerms(text,profile='university'){
 if(profile!=='university'||!text||typeof text!=='string')return text;
 let out=text;
 for(const [from,to] of PHRASES){
  let at=0;while((at=out.indexOf(from,at))>=0){const rep=keepCase(from,to,startOfSentence(out,at));out=out.slice(0,at)+rep+out.slice(at+from.length);at+=rep.length;}
 }
 for(const [from,to] of SUFFIX){
  const re=new RegExp(`(^|[^\\p{L}])(${from[0]}|${from[0].toLocaleUpperCase('tr-TR')})${from.slice(1)}(?![\\p{L}])`,'gu');
  out=out.replace(re,(m,pre,first,offset)=>{const atStart=startOfSentence(out,offset+pre.length);return pre+keepCase(first+from.slice(1),to,atStart);});
 }
 return out;
}
const SKIP=new Set(['SCRIPT','STYLE','TEXTAREA','CODE','PRE']);
const ATTRS=['placeholder','title','aria-label','alt'];
export function applyTerminology(root,profile='university'){
 if(profile!=='university'||!root)return 0;let n=0;
 const walker=root.ownerDocument.createTreeWalker(root,4);const nodes=[];
 for(let node=walker.nextNode();node;node=walker.nextNode()){if(!SKIP.has(node.parentElement?.tagName))nodes.push(node);}
 for(const node of nodes){const next=replaceTerms(node.nodeValue,profile);if(next!==node.nodeValue){node.nodeValue=next;n++;}}
 for(const el of root.querySelectorAll('*')){if(SKIP.has(el.tagName))continue;for(const a of ATTRS){const v=el.getAttribute?.(a);if(v){const next=replaceTerms(v,profile);if(next!==v){el.setAttribute(a,next);n++;}}}}
 return n;
}
if(typeof document!=='undefined'&&typeof fetch==='function'){
 fetch('/terminology.json',{credentials:'omit',cache:'no-store'}).then(r=>r.ok?r.json():null).then(cfg=>{
  if(!cfg||cfg.profile!=='university')return;
  document.documentElement.dataset.terminology='university';
  const run=()=>applyTerminology(document.body,'university');run();
  let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;run();});}).observe(document.body,{childList:true,subtree:true,characterData:true});
 }).catch(()=>{});
}
