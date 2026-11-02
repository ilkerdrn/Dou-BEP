/**
 * BEP Sınav Atölyesi — rule-based accessible examination core.
 * No diagnostic inference, network or learner personal data is required.
 */
import {normalizeSupportPlan} from './support-plan.mjs';
import {normalizeBepGoals} from './bep-goals.mjs';
import {normalizeEvidence,normalizeGoalAttestations} from './pedagogy-review.mjs';
import {activePrompt,presentationMode} from './presentation-variants.mjs';
import {normalizeQuestionAccess,questionAccess} from './question-access.mjs';
export const VERSION = '2.81.0';
export const TYPES = { choice: 'Çoktan seçmeli', short: 'Kısa yanıt', truefalse: 'Doğru / Yanlış', matching: 'Eşleştirme' };
export const DEFAULT_ADAPTATIONS = Object.freeze({ fontSize: 18, lineSpacing: 1.65, highContrast: false, simpleInstructions: false, onePerPage: false, largerAnswerArea: true, visualCues: false, uppercaseHeadings: false, institutionalHeader: false });

/** Teacher-selected layout presets: never infer supports from diagnosis. */
export const DISPLAY_PRESETS = Object.freeze({
 standard:{label:'Dengeli',subtitle:'Standart ve ferah',settings:{fontSize:18,lineSpacing:1.65,highContrast:false,onePerPage:false,largerAnswerArea:true}},
 readable:{label:'Geniş Okuma',subtitle:'22 punto · rahat satır',settings:{fontSize:22,lineSpacing:1.9,highContrast:false,onePerPage:false,largerAnswerArea:true}},
 focus:{label:'Odaklanma',subtitle:'Her sayfada bir soru',settings:{fontSize:20,lineSpacing:1.9,highContrast:false,onePerPage:true,largerAnswerArea:true}},
 contrast:{label:'Yüksek Kontrast',subtitle:'Keskin çizgi ve metin',settings:{fontSize:20,lineSpacing:1.65,highContrast:true,onePerPage:false,largerAnswerArea:true}}
});
export function applyDisplayPreset(exam,presetId){
 const preset=DISPLAY_PRESETS[presetId];if(!preset)throw new Error('Geçersiz görünüm profili.');
 return {...exam,adaptations:{...exam.adaptations,...preset.settings}};
}
export function safeVisualDots(raw){
 const dots=raw&&typeof raw==='object'?raw:{};
 const normalize=(x)=>{const n=Number(x);return Number.isInteger(n)&&n>=0&&n<=12?n:0;};
 return {groupA:normalize(dots.groupA),groupB:normalize(dots.groupB)};
}
const clone = (v) => JSON.parse(JSON.stringify(v));
const uid = () => `soru-${Math.random().toString(36).slice(2, 10)}`;
export const starterQuestion = (type='choice') => ({
  id: uid(), goalId:'', type, prompt: '', simplifiedPrompt: '', presentationMode:'inherit', objective: '', points: 10,
  options: type === 'choice' ? ['Seçenek 1','Seçenek 2','Seçenek 3'] : [],
  answer: '',
  pairs: type === 'matching' ? [{left:'',right:''},{left:'',right:''}] : [],
  visualNote:'', visualDots:{groupA:0,groupB:0}, visualStyle:'dot', visualAltText:'', visualMode:'shapes',numberLineStart:0,numberLineEnd:10, teacherNote:'', provenance:null, equivalenceReview:normalizeEvidence(), access:normalizeQuestionAccess()
});
export function createDemo() {
 return {
  version: VERSION,
  title:'Toplama ve Çıkarma — Kısa Değerlendirme', subject:'Matematik', grade:'2. Sınıf', duration:30,
  profile:'Örnek Uyarlama Profili A',
  objective:'20 içinde toplama ve çıkarma işlemlerini yapabilme',
  instruction:'Soruları dikkatlice oku. Doğru yanıtı işaretle veya boşluğa yaz.',
  adaptations:{...DEFAULT_ADAPTATIONS, fontSize:20, largerAnswerArea:true},
  questions:[
    {id:'demo-1',type:'choice',prompt:'5 + 3 işleminin sonucu kaçtır?', simplifiedPrompt:'5 + 3 = ?', objective:'20 içinde toplama',points:20,options:['6','8','9'],answer:'8',pairs:[],visualNote:'5 nesneye 3 nesne daha eklenir.',visualDots:{groupA:5,groupB:3},teacherNote:'Somut materyalle gösterim yalnızca BEP kapsamında uygunsa kullanılmalı.'},
    {id:'demo-2',type:'choice',prompt:'10 − 4 işleminin sonucu kaçtır?',simplifiedPrompt:'10 − 4 = ?',objective:'20 içinde çıkarma',points:20,options:['6','7','8'],answer:'6',pairs:[],visualNote:'10 nesneden 4 tanesi ayrılır.',visualDots:{groupA:0,groupB:0},teacherNote:''},
    {id:'demo-3',type:'short',prompt:'7 + 2 = ?',simplifiedPrompt:'7 + 2 = ?',objective:'20 içinde toplama',points:20,options:[],answer:'9',pairs:[],visualNote:'',visualDots:{groupA:0,groupB:0},teacherNote:''},
    {id:'demo-4',type:'truefalse',prompt:'4 + 4 = 8',simplifiedPrompt:'4 + 4 = 8',objective:'20 içinde toplama',points:20,options:[],answer:'Doğru',pairs:[],visualNote:'',visualDots:{groupA:0,groupB:0},teacherNote:''},
    {id:'demo-5',type:'matching',prompt:'İşlemleri uygun sonuçlarla eşleştir.',simplifiedPrompt:'İşlem ve sonucu eşleştir.',objective:'20 içinde toplama ve çıkarma',points:20,options:[],answer:'',pairs:[{left:'2 + 3',right:'5'},{left:'8 − 2',right:'6'}],visualNote:'',visualDots:{groupA:0,groupB:0},teacherNote:''}
  ]
 };
}
export function validateExam(exam) {
 const issues=[];
 if(!exam || typeof exam!=='object') return [{level:'error',text:'Sınav verisi geçersiz.'}];
 if(!String(exam.title||'').trim()) issues.push({level:'error',text:'Sınav başlığı gerekli.'});
 if(!String(exam.objective||'').trim()) issues.push({level:'warning',text:'Genel BEP hedefi henüz belirtilmedi.'});
 if(!Array.isArray(exam.questions) || !exam.questions.length) issues.push({level:'error',text:'En az bir soru ekleyin.'});
 (Array.isArray(exam.questions)?exam.questions:[]).forEach((q,i)=>{
  const prefix=`${i+1}. soru`;
  if(!String(q.prompt||'').trim()) issues.push({level:'error',text:`${prefix}: Soru metni boş.`});
  if(!Number.isFinite(Number(q.points))||Number(q.points)<=0) issues.push({level:'error',text:`${prefix}: Puan sıfırdan büyük olmalı.`});
  if(!String(q.objective||'').trim()) issues.push({level:'warning',text:`${prefix}: Kazanım ilişkisi yazılmadı.`});
  if(q.type==='choice'){
   const opts=Array.isArray(q.options)?q.options:[];
   if(opts.length<2||opts.some(o=>!String(o).trim())) issues.push({level:'error',text:`${prefix}: En az iki dolu seçenek gerekli.`});
   if(new Set(opts.map(s=>String(s).trim().toLocaleLowerCase('tr'))).size !== opts.length) issues.push({level:'error',text:`${prefix}: Aynı yanıt seçeneği birden fazla kullanılamaz.`});
   if(!opts.includes(q.answer)) issues.push({level:'error',text:`${prefix}: Geçerli bir doğru yanıt seçin.`});
  }
  if(q.type==='truefalse'&&!['Doğru','Yanlış'].includes(q.answer)) issues.push({level:'error',text:`${prefix}: Doğru/Yanlış yanıtını seçin.`});
  if(q.type==='short'&&!String(q.answer||'').trim()) issues.push({level:'warning',text:`${prefix}: Örnek yanıt eksik.`});
  if(q.type==='matching'&&(!Array.isArray(q.pairs)||q.pairs.length<2||q.pairs.some(p=>!String(p.left||'').trim()||!String(p.right||'').trim()))) issues.push({level:'error',text:`${prefix}: En az iki dolu eşleştirme çifti gerekli.`});
  if(q.type==='matching'&&Array.isArray(q.pairs)&&new Set(q.pairs.map(p=>String(p.right||'').trim())).size!==q.pairs.length)issues.push({level:'error',text:`${prefix}: Eşleştirme yanıtları birbirinden farklı olmalı.`});
  if(q.provenance?.kind==='local-template' && q.provenance.reviewed!==true)issues.push({level:'error',text:`${prefix}: Taslak öğretmen tarafından incelenip onaylanmadı.`});
  if(q.provenance?.kind==='source-import' && q.provenance.reviewed!==true)issues.push({level:'error',text:`${prefix}: Kaynak belgeyle soru, şıklar, yanıt ve puan karşılaştırması henüz onaylanmadı.`});
  if(exam.adaptations?.simpleInstructions && q.presentationMode!=='standard' && !String(q.simplifiedPrompt||'').trim()) issues.push({level:'warning',text:`${prefix}: Sade yönerge seçili fakat alternatif metin yazılmadı; asıl soru gösterilecek.`});
 });
 return issues;
}
export function totalPoints(exam){ return (exam.questions||[]).reduce((sum,q)=>sum+(Number(q.points)||0),0); }
export function escapeHtml(v){ return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function escapeXml(v){ return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])); }
export function formatPrompt(q,exam){return activePrompt(q,exam);}
export function isSafeExam(data){
 if(!data||typeof data!=='object'||!Array.isArray(data.questions)||data.questions.length>150) return false;
 if(typeof data.title!=='string'||data.title.length>250 || typeof data.subject!=='string') return false;
 if(data.questions.some(q=> !q||!Object.keys(TYPES).includes(q.type)||typeof q.prompt!=='string'||q.prompt.length>5000|| (q.options||[]).length>12 || (q.pairs||[]).length>20))return false;
 return true;
}
export function normalizeExam(raw){
 if(!isSafeExam(raw))throw new Error('Dosya beklenen sınav biçiminde değil.');
 const a=Object.fromEntries(Object.entries(DEFAULT_ADAPTATIONS).map(([key,defaultValue])=>[key,raw.adaptations?.[key]??defaultValue]));
 a.fontSize=([16,18,20,22,24].includes(Number(a.fontSize))?Number(a.fontSize):18);
 a.lineSpacing=([1.45,1.65,1.9,2.1].includes(Number(a.lineSpacing))?Number(a.lineSpacing):1.65);
 for(const key of Object.keys(DEFAULT_ADAPTATIONS).filter(k=>typeof DEFAULT_ADAPTATIONS[k]==='boolean'))a[key]=a[key]===true;
 return {
  version: VERSION,title:String(raw.title).slice(0,250),subject:String(raw.subject).slice(0,100),grade:String(raw.grade||'').slice(0,80),
  duration:Math.min(300,Math.max(1,Number(raw.duration)||30)),profile:String(raw.profile||'').slice(0,100),
  objective:String(raw.objective||'').slice(0,2000),instruction:String(raw.instruction||'').slice(0,2000),adaptations:a,supportPlan:normalizeSupportPlan(raw.supportPlan),bepGoals:normalizeBepGoals(raw.bepGoals),reviewPolicy:raw.reviewPolicy==='guided'?'guided':'legacy',goalAttestations:normalizeGoalAttestations(raw.goalAttestations),
  questions:raw.questions.map(q=>({id:String(q.id||uid()).slice(0,64),type:q.type,goalId:String(q.goalId||'').slice(0,20),prompt:String(q.prompt||'').slice(0,5000),simplifiedPrompt:String(q.simplifiedPrompt||'').slice(0,5000),presentationMode:presentationMode(q),objective:String(q.objective||'').slice(0,500),points:Math.max(0,Math.min(1000,Number(q.points)||0)),options:(q.options||[]).map(s=>String(s).slice(0,500)).slice(0,12),answer:String(q.answer||'').slice(0,2000),pairs:(q.pairs||[]).map(p=>({left:String(p.left||'').slice(0,500),right:String(p.right||'').slice(0,500)})).slice(0,20),visualNote:String(q.visualNote||'').slice(0,1500),visualDots:safeVisualDots(q.visualDots),visualStyle:['dot','square','triangle','star'].includes(q.visualStyle)?q.visualStyle:'dot',visualAltText:String(q.visualAltText||'').slice(0,200),visualMode:q.visualMode==='numberline'?'numberline':'shapes',numberLineStart:Number.isInteger(Number(q.numberLineStart))?Number(q.numberLineStart):0,numberLineEnd:Number.isInteger(Number(q.numberLineEnd))?Number(q.numberLineEnd):10,teacherNote:String(q.teacherNote||'').slice(0,1500),access:normalizeQuestionAccess(q.access),equivalenceReview:normalizeEvidence(q.equivalenceReview),provenance:q.provenance&&typeof q.provenance==='object'?{kind:String(q.provenance.kind||'').slice(0,50),objectiveId:String(q.provenance.objectiveId||'').slice(0,60),source:String(q.provenance.source||'').slice(0,100),sourceSha256:/^[0-9a-f]{64}$/i.test(q.provenance.sourceSha256||'')?q.provenance.sourceSha256.toLowerCase():'',transcriptionSha256:/^[0-9a-f]{64}$/i.test(q.provenance.transcriptionSha256||'')?q.provenance.transcriptionSha256.toLowerCase():'',reviewed:q.provenance.reviewed===true}:null}))
 };
}
export function questionHtml(q,i,exam,answerKey=false){
 const a=exam.adaptations;
 const access=questionAccess(q);
 let html=`<section class="paper-question ${a.onePerPage?'separate-page':''} ${access.largeTargets?'large-target-paper':''}"><h2 class="paper-question-header">Soru ${i+1}<span>${escapeHtml(q.points)} puan</span></h2>${access.writtenCue.trim()?`<p class="paper-access-cue"><strong>Ek yönerge:</strong> ${escapeHtml(access.writtenCue)}</p>`:''}<p class="paper-prompt">${escapeHtml(formatPrompt(q,exam))}</p>`;
 if(!answerKey){
  if(a.visualCues && q.visualNote?.trim()) html+=`<div class="visual-note"><span aria-hidden="true">◈</span> ${escapeHtml(q.visualNote)}</div>`;
  const dots=safeVisualDots(q.visualDots);
  if(a.visualCues && q.visualMode==='numberline'){
   const start=Number(q.numberLineStart??0),end=Number(q.numberLineEnd??10);
   if(Number.isInteger(start)&&Number.isInteger(end)&&start>=0&&end<=30&&end>start&&end-start<=12){
    const alt=q.visualAltText?.trim()||`${start} ile ${end} arasındaki sayı doğrusu`;
    html+=`<div class="numberline" role="img" aria-label="${escapeHtml(alt)}">${Array.from({length:end-start+1},(_,j)=>`<div class="numberline-tick"><span class="tick-mark"></span><span>${start+j}</span></div>`).join('')}</div>`;
   }
  }
  if(a.visualCues && q.visualMode!=='numberline'&&(dots.groupA||dots.groupB)){
   const style=['dot','square','triangle','star'].includes(q.visualStyle)?q.visualStyle:'dot';
   const shapeNames={dot:'daire',square:'kare',triangle:'üçgen',star:'yıldız'};
   const alt=q.visualAltText?.trim()||`Birinci grupta ${dots.groupA}, ikinci grupta ${dots.groupB} ${shapeNames[style]}`;
   html+=`<div class="visual-dot-groups" role="img" aria-label="${escapeHtml(alt)}">${[dots.groupA,dots.groupB].filter(n=>n).map((n)=>`<div class="visual-dot-set"><span class="dot-count">${n} ${shapeNames[style]}</span><div class="visual-dot-row">${Array.from({length:n},()=>`<span class="visual-dot visual-${style}" aria-hidden="true">${style==='star'?'★':''}</span>`).join('')}</div></div>`).join('')}</div>`;
  }
  if(q.type==='choice')html+=`<div class="paper-options">${(q.options||[]).map((o,j)=>`<div class="paper-option"><span class="option-marker">${String.fromCharCode(65+j)}</span><span>${escapeHtml(o)}</span></div>`).join('')}</div>`;
  if(q.type==='short')html+=`<div class="paper-answer-space ${a.largerAnswerArea?'large':''}"></div>`;
  if(q.type==='truefalse')html+=`<div class="paper-options"><div class="paper-option"><span class="option-marker">A</span>Doğru</div><div class="paper-option"><span class="option-marker">B</span>Yanlış</div></div>`;
  if(q.type==='matching')html+=`<div class="paper-matching"><div><b>İşlemler</b>${(q.pairs||[]).map((p,j)=>`<p>${j+1}. ${escapeHtml(p.left)} &nbsp; ( ____ )</p>`).join('')}</div><div><b>Yanıtlar</b>${[...(q.pairs||[])].reverse().map((p,j)=>`<p>${String.fromCharCode(65+j)}. ${escapeHtml(p.right)}</p>`).join('')}</div></div>`;
 } else {
  if(q.type==='matching')html+=`<p class="answer-text">${(q.pairs||[]).map((p,j)=>`${j+1} → ${String.fromCharCode(65+q.pairs.length-1-j)} (${escapeHtml(p.left)} = ${escapeHtml(p.right)})`).join(' • ')}</p>`;
  else html+=`<p class="answer-text"><b>Yanıt:</b> ${escapeHtml(q.answer||'Öğretmen tarafından değerlendirilecek')}</p>`;
  if(q.teacherNote?.trim())html+=`<p class="teacher-note"><b>Öğretmen notu:</b> ${escapeHtml(q.teacherNote)}</p>`;
 }
 return html+'</section>';
}
export function paperBody(exam,answerKey=false){
 const a=exam.adaptations;
 return `<article class="paper ${a.highContrast?'paper-highcontrast':''} ${a.uppercaseHeadings?'upper-headings':''}" style="--paper-font:${a.fontSize}pt;--paper-leading:${a.lineSpacing}">
 <header class="paper-header">${a.institutionalHeader?`<div class="institutional-paper-head"><strong>DOĞUŞ ÜNİVERSİTESİ</strong><span>EĞİTSEL DEĞERLENDİRME · TASLAK</span></div>`:''}<div class="paper-eyebrow">${answerKey?'ÖĞRETMEN KOPYASI • CEVAP ANAHTARI':'SINAV KAĞIDI'}</div><h1>${escapeHtml(exam.title)}</h1><p>${escapeHtml(exam.subject)} · ${escapeHtml(exam.grade)}</p></header>
 ${answerKey?'':`<div class="paper-meta"><div>Adı Soyadı: <span class="blank-line"></span></div><div>Tarih: <span class="blank-line"></span></div><div>Süre: <b>${escapeHtml(exam.duration)} dakika</b></div><div>Toplam: <b>${totalPoints(exam)} puan</b></div></div>`}
 ${exam.instruction && !answerKey?`<div class="paper-instructions"><b>Yönerge:</b> ${escapeHtml(exam.instruction)}</div>`:''}
 <div class="paper-questions">${(exam.questions||[]).map((q,i)=>questionHtml(q,i,exam,answerKey)).join('')}</div>
 <footer class="paper-footer">${answerKey?'Öğretmen tarafından kontrol edilmiştir.':'Başarılar.'}</footer></article>`;
}
export const printCss = `
*{box-sizing:border-box}body{margin:0;background:#e9edf3;font-family:Arial,Helvetica,sans-serif;color:#17233b}
.paper{width:210mm;min-height:297mm;background:white;margin:20px auto;padding:19mm 17mm;box-shadow:0 12px 35px #0002;color:#17233b;font-size:var(--paper-font,18px);line-height:var(--paper-leading,1.65)}
.paper.paper-highcontrast{color:#000}.paper.upper-headings h1,.paper.upper-headings .paper-question-header{text-transform:uppercase}
.institutional-paper-head{display:flex;justify-content:space-between;align-items:center;gap:9px;padding:0 0 15px;margin-bottom:22px;border-bottom:3px solid #c50e1f;font-size:.58em;letter-spacing:.045em;color:#252525}.institutional-paper-head span{color:#687080;font-size:.85em}.paper-highcontrast .institutional-paper-head{border-bottom-color:#000}.visual-dot-groups{display:flex;gap:18px;flex-wrap:wrap;margin:9px 0 18px}.visual-dot-set{border:1px solid #d1d5db;padding:10px 12px;border-radius:8px;flex:1;min-width:100px}.dot-count{font-size:.68em;display:block;margin-bottom:7px}.visual-dot-row{display:flex;gap:7px;flex-wrap:wrap}.visual-dot{width:18px;height:18px;border-radius:50%;border:2px solid #1f2937;display:block;background:white}.visual-square{border-radius:2px}.visual-triangle{border:0;border-radius:0;background:transparent;width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-bottom:19px solid #17233b}.visual-star{border:0;background:transparent;border-radius:0;font-family:Arial,sans-serif;font-size:25px;font-weight:bold;line-height:17px;width:25px;height:25px;text-align:center}.paper-header{text-align:center;padding-bottom:15px;border-bottom:2px solid currentColor;margin-bottom:18px}.paper-header h1{font-size:1.38em;line-height:1.35;margin:10px 0 4px;font-weight:800}.paper-header p{font-size:.8em;margin:0}.paper-eyebrow{font-size:.58em;font-weight:bold;letter-spacing:1.5px}
.paper-meta{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;font-size:.77em;margin-bottom:16px}.blank-line{display:inline-block;border-bottom:1px solid #999;width:105px;height:17px}
.paper-instructions{padding:12px 15px;background:#f3f5f9;border-left:3px solid #8993b1;margin:0 0 23px;font-size:.8em}.paper-highcontrast .paper-instructions{background:#fff;border:2px solid #000}
.paper-access-cue{font-size:.83em;padding:9px 12px;border-left:3px solid #c50e1f;background:#f7f7f7}.large-target-paper .paper-option{min-height:58px;padding-top:12px;padding-bottom:12px}.paper-question{padding:0 0 20px;margin:0 0 20px;border-bottom:1px solid #d4dae4;break-inside:avoid;page-break-inside:avoid}.paper-question:last-child{border:0}.paper-question.separate-page:not(:first-child){break-before:page;page-break-before:always;padding-top:10mm}
.paper-question-header{display:flex;justify-content:space-between;font-size:.82em;margin:0;font-weight:700}.paper-question-header span{font-size:.8em;color:#667085}.paper-highcontrast .paper-question-header span{color:#000}
.paper-prompt{white-space:pre-wrap;margin:10px 0 16px;overflow-wrap:anywhere}.paper-options{display:grid;gap:9px}.paper-option{display:flex;align-items:flex-start;gap:12px}.option-marker{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;width:29px;height:29px;border:1.5px solid currentColor;border-radius:7px;font-weight:bold;font-size:.8em}.paper-answer-space{height:45px;border-bottom:1px solid #777}.paper-answer-space.large{height:88px}.visual-note{border:1px solid #a5b1c9;border-radius:7px;padding:10px;margin:7px 0 15px;font-size:.78em}.paper-highcontrast .visual-note{border-color:#000}.paper-matching{display:grid;grid-template-columns:1fr 1fr;gap:24px;font-size:.9em}.paper-matching p{margin:12px 0}.answer-text{font-weight:500;margin:11px 0}.teacher-note{font-size:.78em;color:#555}.numberline{display:flex;align-items:center;justify-content:space-between;margin:20px 0 23px;border-top:3px solid currentColor;gap:0}.numberline-tick{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:.66em;font-weight:bold}.numberline-tick:first-child{align-items:flex-start}.numberline-tick:last-child{align-items:flex-end}.tick-mark{display:block;width:2px;height:13px;background:currentColor;margin-top:-2px;margin-bottom:7px}.paper-footer{margin-top:15px;border-top:1px solid #bac3d1;padding-top:10px;text-align:center;font-size:.65em;color:#777}
@page{size:A4;margin:0}@media print{html,body{width:210mm!important;margin:0!important;padding:0!important;background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.paper{margin:0!important;box-shadow:none!important;width:210mm!important;min-height:0!important}}
`;
export function printableHtml(exam,answerKey=false){return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>${escapeHtml(exam.title)}${answerKey?' — Cevap Anahtarı':''}</title><style>${printCss}</style></head><body>${paperBody(exam,answerKey)}</body></html>`;}

// Produce a real, editable OOXML .docx ZIP, without a package dependency or remote service.
function wordText(s,props=''){
 const pieces=String(s).replace(/\r\n?/g,'\n').split(/(\n|\t)/);
 const body=pieces.map(piece=>piece==='\n'?'<w:br/>':piece==='\t'?'<w:tab/>':`<w:t xml:space="preserve">${escapeXml(piece)}</w:t>`).join('');
 return `<w:r>${props?`<w:rPr>${props}</w:rPr>`:''}${body}</w:r>`;
}
function p(s,opts={}) {const pp=opts.breakBefore?'<w:pageBreakBefore/>':'';const style=opts.style?`<w:pStyle w:val="${opts.style}"/>`:'';return `<w:p><w:pPr>${style}<w:spacing w:before="100" w:after="120" w:line="${opts.line||360}" w:lineRule="auto"/>${pp}</w:pPr>${wordText(s,opts.bold?'<w:b/>':'')}${opts.extra||''}</w:p>`;}
function wordXml(exam,key,candidateCode=''){
 const line=Math.round((exam.adaptations?.lineSpacing||1.65)*240);
 const chunks=[...(exam.adaptations?.institutionalHeader?[p('DOĞUŞ ÜNİVERSİTESİ  •  EĞİTSEL DEĞERLENDİRME TASLAĞI',{bold:true})]:[]),p(key?'CEVAP ANAHTARI • ÖĞRETMEN KOPYASI':'SINAV KAĞIDI',{bold:true}),p(exam.title,{bold:true,style:'Heading1'}),p(`${exam.subject} • ${exam.grade}`,{bold:true})];
 if(candidateCode&&!key)chunks.push(p(`Anonim sınav kodu: ${candidateCode}`,{bold:true}));
 if(!key){chunks.push(p('Adı Soyadı: ____________________'));chunks.push(p('Tarih: ____________________'));
 chunks.push(p(`Süre: ${exam.duration} dakika     Toplam: ${totalPoints(exam)} puan`));
 chunks.push(p(`Yönerge: ${exam.instruction}`));}
 (exam.questions||[]).forEach((q,i)=>{
  const qStart=chunks.length;
  const pb=!!(exam.adaptations?.onePerPage&&i>0);
  chunks.push(p(`Soru ${i+1} (${q.points} puan)`,{bold:true,breakBefore:pb,style:'Heading2'}));
  const access=questionAccess(q);
  if(access.writtenCue.trim())chunks.push(p(`Ek yönerge: ${access.writtenCue}`,{line}));
  chunks.push(p(formatPrompt(q,exam),{line}));
  if(key){if(q.type==='matching')q.pairs.forEach((pair,j)=>chunks.push(p(`${j+1} → ${String.fromCharCode(65+q.pairs.length-1-j)} (${pair.left} = ${pair.right})`)));
  else chunks.push(p(`Doğru yanıt: ${q.answer||'Öğretmen değerlendirmesi'}`,{bold:true}));
  if(q.teacherNote)chunks.push(p(`Öğretmen notu: ${q.teacherNote}`));}
  else if(q.type==='choice'){q.options.forEach((o,j)=>chunks.push(p(`${String.fromCharCode(65+j)})  ${o}`,{line})));}
  else if(q.type==='truefalse'){chunks.push(p('A)  Doğru     B)  Yanlış',{line}));}
  else if(q.type==='matching'){q.pairs.forEach((pair,j)=>chunks.push(p(`${j+1}. ${pair.left}   (____)`,{line})));[...q.pairs].reverse().forEach((pair,j)=>chunks.push(p(`${String.fromCharCode(65+j)}) ${pair.right}`,{line})));}
  else{chunks.push(p('____________________________________'));if(exam.adaptations?.largerAnswerArea)chunks.push(p('____________________________________'));}
  if(!key&&exam.adaptations?.visualCues&&q.visualNote)chunks.push(p(`Görsel/somut destek açıklaması: ${q.visualNote}`));
  const dots=safeVisualDots(q.visualDots);
  if(!key&&exam.adaptations?.visualCues&&q.visualMode==='numberline'){
   const start=Number(q.numberLineStart??0),end=Number(q.numberLineEnd??10);
   if(Number.isInteger(start)&&Number.isInteger(end)&&start>=0&&end<=30&&end>start&&end-start<=12)chunks.push(p(`Sayı doğrusu (${start}–${end}): ${Array.from({length:end-start+1},(_,j)=>start+j).join('  —  ')}`));
   if(q.visualAltText)chunks.push(p(`Görsel betimlemesi: ${q.visualAltText}`));
  }
  if(!key&&exam.adaptations?.visualCues&&q.visualMode!=='numberline'&&(dots.groupA||dots.groupB)){
   const symbol={dot:'●',square:'■',triangle:'▲',star:'★'}[q.visualStyle]||'●';
   if(dots.groupA)chunks.push(p(`Grup 1 (${dots.groupA} nesne): ${`${symbol} `.repeat(dots.groupA)}`));
   if(dots.groupB)chunks.push(p(`Grup 2 (${dots.groupB} nesne): ${`${symbol} `.repeat(dots.groupB)}`));
   if(q.visualAltText)chunks.push(p(`Görsel betimlemesi: ${q.visualAltText}`));
  }
  // Keep each short exam question with its options/answer lines, rather than orphaning choices on the next page.
  for(let j=qStart;j<Math.min(qStart+2,chunks.length-1);j++)chunks[j]=chunks[j].replace('<w:pPr>','<w:pPr><w:keepNext/>');
 });
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${chunks.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}
function crc32(bytes){let crc=-1;for(const b of bytes){crc^=b;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^(-1))>>>0;}
function joinBytes(arrays){const out=new Uint8Array(arrays.reduce((s,x)=>s+x.length,0));let at=0;for(const a of arrays){out.set(a,at);at+=a.length;}return out;}
export function zipStore(entries){
 const enc=new TextEncoder(),locals=[],centrals=[];let offset=0;
 for(const [name,contents] of Object.entries(entries)){
  const n=enc.encode(name),body=contents instanceof Uint8Array?contents:enc.encode(contents),crc=crc32(body);
  const local=new Uint8Array(30+n.length),dv=new DataView(local.buffer);
  dv.setUint32(0,0x04034b50,true);dv.setUint16(4,20,true);dv.setUint16(6,0x0800,true);
  dv.setUint16(8,0,true);dv.setUint32(14,crc,true);dv.setUint32(18,body.length,true);dv.setUint32(22,body.length,true);dv.setUint16(26,n.length,true);local.set(n,30);
  locals.push(local,body);
  const cen=new Uint8Array(46+n.length),cv=new DataView(cen.buffer);
  cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);cv.setUint16(10,0,true);
  cv.setUint32(16,crc,true);cv.setUint32(20,body.length,true);cv.setUint32(24,body.length,true);cv.setUint16(28,n.length,true);cv.setUint32(42,offset,true);cen.set(n,46);centrals.push(cen);
  offset+=local.length+body.length;
 }
 const central=joinBytes(centrals),end=new Uint8Array(22),ed=new DataView(end.buffer),count=Object.keys(entries).length;
 ed.setUint32(0,0x06054b50,true);ed.setUint16(8,count,true);ed.setUint16(10,count,true);ed.setUint32(12,central.length,true);ed.setUint32(16,offset,true);
 return joinBytes([...locals,central,end]);
}
export function generateDocx(exam,answerKey=false,candidateCode=''){
 const pointSize=Math.max(12,Math.min(30,Number(exam.adaptations?.fontSize)||18));
 const stylesXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="${Math.round(pointSize*2)}"/><w:szCs w:val="${Math.round(pointSize*2)}"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:outlineLvl w:val="0"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:outlineLvl w:val="1"/></w:pPr></w:style></w:styles>`;
 return zipStore({
  '[Content_Types].xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
  '_rels/.rels':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  'word/document.xml':wordXml(exam,answerKey,candidateCode),
  'word/styles.xml':stylesXml,
  'word/_rels/document.xml.rels':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
 });
}
export const slugify=(name)=>String(name||'sinav').toLocaleLowerCase('tr').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[ıİ]/g,'i').replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'sinav';
export function copyExam(exam){return clone(exam);}
