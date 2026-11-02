/**
 * v2.12: Closed, licence-free visual teaching materials made of the existing
 * print renderer's geometric shapes and number lines.  No uploaded images,
 * third-party assets, learner profiles, AI, remote network calls or diagnoses.
 */
const shapes={dot:'daire',square:'kare',triangle:'üçgen',star:'yıldız'};
const presets=[
 {id:'one-group-dots',label:'Tek grup · 5 daire',category:'shapes',style:'dot',a:5,b:0,help:'Tek gruptaki nesneleri sayma'},
 {id:'two-groups-dots',label:'İki grup · 3 ve 2 daire',category:'shapes',style:'dot',a:3,b:2,help:'İki nesne grubunu karşılaştırma'},
 {id:'compare-squares',label:'İki grup · 4 ve 6 kare',category:'shapes',style:'square',a:4,b:6,help:'İki grubun çokluğunu karşılaştırma'},
 {id:'triangles',label:'Tek grup · 7 üçgen',category:'shapes',style:'triangle',a:7,b:0,help:'Tek bir grubun nesnelerini sayma'},
 {id:'stars',label:'İki grup · 2 ve 4 yıldız',category:'shapes',style:'star',a:2,b:4,help:'Grupları ayırt etme ve sayma'},
 {id:'equal-groups',label:'Eşit gruplar · 4 ve 4 kare',category:'shapes',style:'square',a:4,b:4,help:'Eşit sayıdaki iki grubu görselleştirme'},
 {id:'ten-dots',label:'On nesne · 10 daire',category:'shapes',style:'dot',a:10,b:0,help:'Onluğa kadar tek grupta sayma'},
 {id:'line-zero-five',label:'Sayı doğrusu · 0–5',category:'numberline',start:0,end:5,help:'0 ile 5 arası işaretler'},
 {id:'line-zero-ten',label:'Sayı doğrusu · 0–10',category:'numberline',start:0,end:10,help:'0 ile 10 arası işaretler'},
 {id:'line-ten-twenty',label:'Sayı doğrusu · 10–20',category:'numberline',start:10,end:20,help:'10 ile 20 arası işaretler'},
 {id:'line-twenty-thirty',label:'Sayı doğrusu · 20–30',category:'numberline',start:20,end:30,help:'20 ile 30 arası işaretler'}
];
export const VISUAL_MATERIALS=Object.freeze(presets.map(p=>Object.freeze({...p})));
export function findVisualMaterials({term='',category='all'}={}){
 if(!['all','shapes','numberline'].includes(category))throw Error('Geçersiz görsel filtre.');
 const search=String(term).trim().toLocaleLowerCase('tr-TR').slice(0,80);
 return VISUAL_MATERIALS.filter(p=>(category==='all'||p.category===category)&&(!search||`${p.label} ${p.help}`.toLocaleLowerCase('tr-TR').includes(search)));
}
export function visualMaterial(id){return VISUAL_MATERIALS.find(p=>p.id===id)||null;}
export function materialDescription(preset){
 if(preset.category==='numberline')return `${preset.start} ile ${preset.end} arasındaki sayı doğrusu, tam sayı işaretleri`;
 if(!shapes[preset.style])throw Error('Geçersiz şekil.');
 return preset.b?`Birinci grupta ${preset.a}, ikinci grupta ${preset.b} ${shapes[preset.style]}`:`Bir grupta ${preset.a} ${shapes[preset.style]}`;
}
export function visualMaterialMarkup(id){
 const p=visualMaterial(id);if(!p)throw Error('Bilinmeyen görsel materyal.');
 const description=materialDescription(p);
 if(p.category==='numberline')return `<div class="visual-material-line" role="img" aria-label="${description}">${Array.from({length:p.end-p.start+1},(_,i)=>`<span><i aria-hidden="true"></i>${p.start+i}</span>`).join('')}</div>`;
 const item=(n)=>`<div class="visual-material-group"><small>${n} ${shapes[p.style]}</small><div class="visual-material-symbols">${Array.from({length:n},()=>`<span class="visual-material-symbol visual-${p.style}" aria-hidden="true">${p.style==='star'?'★':''}</span>`).join('')}</div></div>`;
 return `<div class="visual-material-shapes" role="img" aria-label="${description}">${item(p.a)}${p.b?item(p.b):''}</div>`;
}
/** Change only visual presentation fields. Preserve goal, answer, prompt, score and ID. */
export function applyVisualMaterial(question,id){
 if(!question||typeof question!=='object'||Array.isArray(question))throw Error('Soru seçimi geçersiz.');
 const p=visualMaterial(id);if(!p)throw Error('Bilinmeyen görsel materyal.');
 const next={...question,visualAltText:materialDescription(p),visualNote:'',
  // A teacher must explicitly re-review even when the rest of the question is unchanged.
  equivalenceReview:{checks:{objective:false,answer:false,demand:false,access:false},fingerprint:''},
  provenance:question.provenance?{...question.provenance,reviewed:false}:null};
 if(p.category==='shapes'){
  Object.assign(next,{visualMode:'shapes',visualStyle:p.style,visualDots:{groupA:p.a,groupB:p.b}});
 }else{
  Object.assign(next,{visualMode:'numberline',numberLineStart:p.start,numberLineEnd:p.end,visualDots:{groupA:0,groupB:0}});
 }
 return next;
}
