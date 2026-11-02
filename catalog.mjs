/** Locally supplied curriculum objectives. No assertion of official verification. */
const FIELDS=['id','subject','grade','domain','title','description','source'];
const ALIASES={
 id:['id','kod','kazanım kodu','kazanim kodu','hedef kodu'],subject:['subject','ders'],grade:['grade','sınıf','sinif','kademe'],
 domain:['domain','alan','öğrenme alanı','ogrenme alani'],title:['title','başlık','baslik','kazanım','kazanim','hedef'],
 description:['description','açıklama','aciklama','hedef açıklaması','hedef aciklamasi'],source:['source','kaynak']
};
const normalizeHeader=s=>String(s??'').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g,' ');
const clean=(v,n=240)=>String(v??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim().slice(0,n);
export const MAX_OBJECTIVES=500;
export const MAX_CATALOG_BYTES=256*1024;
function parseRows(input){
 const text=String(input||'').replace(/^\uFEFF/,'');
 if(!text.trim())throw new Error('Dosya boş.');
 const header=text.split(/\r?\n/,1)[0];
 const counts={',':(header.match(/,/g)||[]).length,';':(header.match(/;/g)||[]).length,'\t':(header.match(/\t/g)||[]).length};
 const delimiter=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
 if(!counts[delimiter])throw new Error('CSV sütunları bulunamadı.');
 const rows=[];let row=[],value='',quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(ch==='"'){
   if(quoted&&text[i+1]==='"'){value+='"';i++;}
   else if(!value||quoted)quoted=!quoted;
   else value+='"';
  } else if(ch===delimiter&&!quoted){row.push(value);value='';}
  else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(value);value='';if(row.some(x=>x.trim()))rows.push(row);row=[];}
  else value+=ch;
 }
 if(quoted)throw new Error('CSV tırnak işaretleri kapanmamış.');
 row.push(value);if(row.some(x=>x.trim()))rows.push(row);
 if(rows.length>MAX_OBJECTIVES+1)throw new Error(`En fazla ${MAX_OBJECTIVES} kazanım içe aktarılabilir.`);
 return rows;
}
export function sanitizeObjectives(items){
 if(!Array.isArray(items)||items.length>MAX_OBJECTIVES)throw new Error('Kazanım listesi geçersiz veya çok büyük.');
 const seen=new Set();return items.map((o,i)=>{
  if(!o||typeof o!=='object'||Array.isArray(o))throw new Error(`${i+1}. kazanım biçimi geçersiz.`);
  const entry={id:clean(o.id,70),subject:clean(o.subject,70),grade:clean(o.grade,60),domain:clean(o.domain,100),title:clean(o.title,180),description:clean(o.description,700),source:clean(o.source||'Öğretmen/kullanıcı tarafından sağlandı',180)};
  if(!entry.id||!entry.subject||!entry.grade||!entry.title||!entry.description)throw new Error(`${i+1}. kazanımda kod, ders, sınıf, başlık ve açıklama gerekli.`);
  if(!/^[\p{L}\p{N}._\- ]+$/u.test(entry.id))throw new Error(`${i+1}. kazanım kodunda geçersiz karakter var.`);
  const k=entry.id.toLocaleLowerCase('tr-TR');if(seen.has(k))throw new Error(`Tekrarlanan kazanım kodu: ${entry.id}`);seen.add(k);
  return entry;
 });
}
export function parseCatalog(text,filename='liste.csv'){
 if(new TextEncoder().encode(String(text)).length>MAX_CATALOG_BYTES)throw new Error('Kazanım dosyası 256 KB sınırını aşıyor.');
 if(/\.json$/i.test(filename)){
  const parsed=JSON.parse(String(text).replace(/^\uFEFF/,''));
  return sanitizeObjectives(Array.isArray(parsed)?parsed:parsed?.objectives);
 }
 const rows=parseRows(text);const head=rows.shift().map(normalizeHeader);
 const positions=Object.fromEntries(FIELDS.map(field=>[field,head.findIndex(h=>ALIASES[field].includes(h))]));
 if(['id','subject','grade','title','description'].some(k=>positions[k]<0))throw new Error('CSV başlıkları: kod/id, ders/subject, sınıf/grade, başlık/title, açıklama/description gerekli.');
 return sanitizeObjectives(rows.map(row=>Object.fromEntries(FIELDS.map(k=>[k,positions[k]>=0?row[positions[k]]:'']))));
}
export function mergeObjectives(existing,incoming){
 const prior=sanitizeObjectives(existing),next=sanitizeObjectives(incoming),map=new Map(prior.map(o=>[o.id.toLocaleLowerCase('tr-TR'),o]));
 for(const item of next)map.set(item.id.toLocaleLowerCase('tr-TR'),item);
 if(map.size>MAX_OBJECTIVES)throw new Error('Toplam kazanım limiti aşıldı.');
 return [...map.values()];
}
function quoteCsv(s){const t=String(s??'');return /[",;\n\r]/.test(t)?`"${t.replace(/"/g,'""')}"`:t;}
export function objectivesCsv(entries){return '\uFEFF'+[FIELDS.join(';'),...sanitizeObjectives(entries).map(o=>FIELDS.map(k=>quoteCsv(o[k])).join(';'))].join('\r\n');}
export function objectivesTemplate(){return objectivesCsv([{id:'KURUM-ORNEK-001',subject:'Matematik',grade:'2. Sınıf',domain:'Sayılar',title:'Örnek hedef',description:'Ölçülebilir ve öğretmen tarafından yazılmış hedef açıklaması.',source:'Öğretmen tarafından sağlandı'}]);}
