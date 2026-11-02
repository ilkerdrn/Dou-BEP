import {STARTER_OBJECTIVES,findObjectives,objectiveById,makeProposal,proposalAudit} from './library.mjs';
import {parseCatalog,mergeObjectives,objectivesCsv,objectivesTemplate,sanitizeObjectives} from './catalog.mjs';
import {reviewExam,projectBackup,inspectProject} from './quality.mjs';
import {SUPPORT_OPTIONS,createAssessment,isCompatible,normaliseAssessment,evaluationSummary,evaluationCsv,evaluationPrintable} from './assessment.mjs';
import {makeSnapshot,keepSnapshots,safeSnapshotList} from './snapshots.mjs';
import {aggregateAssessments,groupCsv,groupPrintable} from './group-report.mjs';
import {RUBRIC_LEVELS,criteriaFor,rubricPoints} from './rubrics.mjs';
import {MAX_EXAM_TEMPLATES,MAX_RUBRIC_TEMPLATES,createExamTemplate,sanitizeExamTemplates,openExamTemplate,makeCustomRubric,sanitizeCustomRubrics,importLibraryJson,exportLibraryJson} from './template-library.mjs';
import {PERMISSIONS,ROLE_LABELS,roleCan,roleMatrix} from './roles.mjs';
import {VERSION,TYPES,DEFAULT_ADAPTATIONS,createDemo,starterQuestion,DISPLAY_PRESETS,applyDisplayPreset,normalizeExam,validateExam,totalPoints,escapeHtml,formatPrompt,paperBody,printCss,printableHtml,generateDocx,slugify,copyExam} from './core.mjs';

const STEPS = [
 {id:'general',label:'Sınav bilgileri',help:'Ders, kademe ve hedefleri tanımlayın.'},
 {id:'adaptations',label:'Erişilebilirlik',help:'Bireysel ihtiyaçlara uygun sunumu belirleyin.'},
 {id:'questions',label:'Soru editörü',help:'Soruları ve cevap anahtarını hazırlayın.'},
 {id:'preview',label:'Önizleme ve çıktı',help:'İnceleyin, öğretmen onayı verin ve dışa aktarın.'},
 {id:'assessment',label:'Değerlendirme',help:'Anonim bir oturum için puanları, destekleri ve gözlemleri kaydedin.'},
 {id:'institution',label:'Kurumsal yetkiler',help:'Kurumsal rol ve izin tasarımını inceleyin (demo; gerçek hesap yönetimi değildir).'}
];
const icons = {
 check:'<path d="m5 12 4 4L19 6"/>', plus:'<path d="M12 5v14M5 12h14"/>',
 file:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
 download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3"/>',
 print:'<path d="M6 9V3h12v6M6 18H4V9h16v9h-2M6 15h12v6H6z"/>',
 arrow:'<path d="m5 12 14 0m-6-6 6 6-6 6"/>',
 back:'<path d="m19 12-14 0m6-6-6 6 6 6"/>',
 eye:'<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 trash:'<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6M10 10v7m4-7v7"/>',
 up:'<path d="M12 20V4m-6 6 6-6 6 6"/>', down:'<path d="M12 4v16m6-6-6 6-6-6"/>',
 copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
 edit:'<path d="m4 20 4.7-1 11-11a2 2 0 0 0-3-3l-11 11L4 20Z"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>',
 shield:'<path d="m12 2 8 4v6c0 5-4 8-8 10-4-2-8-5-8-10V6l8-4Z"/><path d="m9 12 2 2 4-4"/>',
 alert:'<path d="m12 3 10 18H2L12 3Zm0 7v4m0 4h.01"/>',
 chevron:'<path d="m6 9 6 6 6-6"/>',
 restart:'<path d="M3 12a9 9 0 1 0 3-7m-3-2v6h6"/>',
 upload:'<path d="M12 17V4m-5 5 5-5 5 5M4 17v4h16v-4"/>',
 sparkle:'<path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2L12 2Z"/>',
 book:'<path d="M4 4h7a3 3 0 0 1 3 3v13H7a3 3 0 0 0-3 2V4Zm16 0h-4a3 3 0 0 0-3 3"/>'
};
const icon = (name,size=16) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.file}</svg>`;
const saved = (()=>{try{const d=sessionStorage.getItem('bep-exam-draft-v1');return d?normalizeExam(JSON.parse(d)):null;}catch{return null;}})();
const readTheme=()=>{try{return sessionStorage.getItem('bep-theme-v2')==='dark'?'dark':'light';}catch{return 'light';}};
const savedObjectives=(()=>{try{return sanitizeObjectives(JSON.parse(sessionStorage.getItem('bep-objectives-v04')||'[]'));}catch{return [];}})();
const priorExam=saved||createDemo();
const savedSessions=(()=>{try{const items=JSON.parse(sessionStorage.getItem('bep-assessments-v05')||'[]');return Array.isArray(items)?items.slice(0,20).filter(a=>a&&a.format==='bep-evaluation'&&JSON.stringify(a).length<100000):[];}catch{return [];}})();
const savedExamTemplates=(()=>{try{return sanitizeExamTemplates(JSON.parse(sessionStorage.getItem('bep-exam-templates-v08')||'[]'),normalizeExam);}catch{return [];}})();
const savedRubricTemplates=(()=>{try{return sanitizeCustomRubrics(JSON.parse(sessionStorage.getItem('bep-rubric-templates-v08')||'[]'));}catch{return [];}})();
const savedSnapshots=(()=>{try{return safeSnapshotList(JSON.parse(sessionStorage.getItem('bep-snapshots-v05')||'[]'),normalizeExam,sanitizeObjectives);}catch{return [];}})();
const state={exam:priorExam,objectives:savedObjectives,step:'general',editing:0,answerKey:false,approved:false,toast:'',theme:readTheme(),objectiveTerm:'',selectedObjective:'',proposal:null,proposalChecked:false,proposalVariant:0,
 assessments:savedSessions,activeAssessmentId:savedSessions[0]?.id||'',snapshots:savedSnapshots,institutionRole:'teacher',examTemplates:savedExamTemplates,rubricTemplates:savedRubricTemplates,rubricDraft:{name:'',questionType:'short',criteria:[{label:'Çözüm yaklaşımı',weight:40},{label:'Yanıt doğruluğu',weight:60}]} };
function activeAssessment(){return state.assessments.find(a=>a.id===state.activeAssessmentId)||null;}
function rememberAssessments(){try{sessionStorage.setItem('bep-assessments-v05',JSON.stringify(state.assessments));}catch{notify('Değerlendirme kaydı saklanamadı. JSON çıktısını alın.');}}
function rememberTemplateLibraries(){try{sessionStorage.setItem('bep-exam-templates-v08',JSON.stringify(state.examTemplates));sessionStorage.setItem('bep-rubric-templates-v08',JSON.stringify(state.rubricTemplates));}catch{notify('Şablon kütüphanesi kaydedilemedi; JSON yedeği indirin.');}}
function rememberSnapshots(){try{sessionStorage.setItem('bep-snapshots-v05',JSON.stringify(state.snapshots));}catch{notify('Taslak sürümleri saklanamadı. Proje yedeğini indirin.');}}
function allObjectives(){return [...STARTER_OBJECTIVES.filter(o=>!state.objectives.some(c=>c.id.toLocaleLowerCase('tr-TR')===o.id.toLocaleLowerCase('tr-TR'))),...state.objectives];}
function rememberObjectives(){try{sessionStorage.setItem('bep-objectives-v04',JSON.stringify(state.objectives));}catch{notify('Kazanım kütüphanesi geçici olarak kaydedilemedi; proje yedeği oluşturun.');}}
const safe=(s)=>escapeHtml(s??'');
const root=document.getElementById('app');
function notify(s){let x=document.getElementById('toast');if(!x){x=document.createElement('div');x.id='toast';x.className='toast';x.role='status';document.body.appendChild(x);}x.textContent=s;clearTimeout(notify.t);notify.t=setTimeout(()=>x.remove(),4200);}
function remember(){try{sessionStorage.setItem('bep-exam-draft-v1',JSON.stringify(state.exam));}catch{notify('Tarayıcı geçici kaydı kullanılamıyor. Taslağı JSON olarak dışa aktarın.');}}
function changed(){state.approved=false;remember();refreshSide();}
function stepIndex(){return STEPS.findIndex(s=>s.id===state.step);}
function btn(label,action,cls='btn-secondary',extra=''){return `<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${label}</button>`;}
function field(label,name,val,{full=false,type='text',placeholder='',small='',choices=null,rows=3}={}){
 const id=`field-${name}`;const value=safe(val);let ctrl='';
 if(choices){ctrl=`<select id="${id}" data-exam-field="${name}">${choices.map(c=>`<option value="${safe(c)}" ${String(c)===String(val)?'selected':''}>${safe(c)}</option>`).join('')}</select>`;}
 else if(type==='textarea'){ctrl=`<textarea rows="${rows}" id="${id}" data-exam-field="${name}" placeholder="${safe(placeholder)}">${value}</textarea>`;}
 else {ctrl=`<input id="${id}" data-exam-field="${name}" type="${type}" ${type==='number'?'min="1" max="300"':''} value="${value}" placeholder="${safe(placeholder)}" />`;}
 return `<div class="field ${full?'full':''}"><label for="${id}">${safe(label)}</label>${ctrl}${small?`<small>${small}</small>`:''}</div>`;
}
function renderGeneral(){const e=state.exam;return `<div class="card"><div class="card-heading"><h2>Temel sınav bilgileri</h2><small>01 / 06</small></div><div class="card-body">
 <div class="section-kicker">Sınav kimliği</div><div class="form-grid">
 ${field('Sınav başlığı','title',e.title,{full:true,placeholder:'Örn. Doğal Sayılarda Toplama — Kısa Değerlendirme'})}
 ${field('Ders','subject',e.subject,{choices:['Matematik','Türkçe','Hayat Bilgisi','Fen Bilimleri','Sosyal Bilgiler','İngilizce','Diğer']})}
 ${field('Sınıf / kademe','grade',e.grade,{choices:['Okul Öncesi','1. Sınıf','2. Sınıf','3. Sınıf','4. Sınıf','5. Sınıf','6. Sınıf','7. Sınıf','8. Sınıf','Lise','Diğer']})}
 ${field('Sınav süresi (dakika)','duration',e.duration,{type:'number',small:'Süre uyarlaması gerektiğinde öğretmen tarafından belirlenir.'})}
 ${field('Uyarlama profili (anonim)','profile',e.profile,{placeholder:'Örn. Profil A',small:'Gerçek öğrenci adı, T.C. kimlik numarası veya tanı bilgisi girmeyin.'})}
 </div><div class="divider"></div><div class="section-kicker">Kazanım ve yönergeler</div><div class="form-grid">
 ${field('BEP hedefi / ölçülecek kazanım','objective',e.objective,{type:'textarea',full:true,rows:3,small:'Sınavın hangi beceriyi değerlendirdiğini açıkça tanımlayın.'})}
 ${field('Öğrenciye gösterilecek genel yönerge','instruction',e.instruction,{type:'textarea',full:true,rows:3})}
 </div><div class="divider"></div>${renderSnapshotPanel()}<div class="divider"></div>${renderExamTemplates()}<div class="divider"></div>${renderObjectiveLibrary()}<div class="divider"></div><div class="panel-note">${icon('shield',19)}<span><b>Öğretmen sorumluluğu:</b> Öğrencinin BEP hedefi, gerçek performansı ve bireysel uyarlama kararları öğretmen/ilgili ekip tarafından belirlenir. Bu araç tanı koymaz ve otomatik pedagojik karar vermez.</span></div>
 </div><div class="foot-actions">${btn('Uyarlamaları seç '+icon('arrow',15),'next','btn-primary')}</div></div>`;}

function renderSnapshotPanel(){return `<div class="section-kicker">Sınav sürümleri <span class="counter">Sekme açıkken saklanır · ${state.snapshots.length}/8</span></div>
 <div class="inline-hint">${icon('shield',15)} Bu sürümler <b>yalnızca bu tarayıcı sekmesinde</b> tutulur; kalıcı arşiv için proje yedeği indirin. Kimlik veya sağlık bilgisi yazmayın.</div>
 <div class="snapshot-actions">${btn(icon('check',14)+' Mevcut sürümü kaydet','saveSnapshot','btn-soft btn-small')}${state.snapshots.length?`<div class="field"><label class="screen-reader-only" for="snapshotPicker">Kaydedilen sürüm</label><select id="snapshotPicker">${state.snapshots.map(x=>`<option value="${safe(x.id)}">${safe(x.label)} · ${safe(x.savedAt.slice(0,16).replace('T',' '))}</option>`).join('')}</select></div>${btn('Sürümü aç','restoreSnapshot','btn-secondary btn-small')}${btn('Sürümü sil','deleteSnapshot','btn-secondary btn-small')}`:''}</div>`;}
function renderExamTemplates(){
 return `<section class="template-panel" aria-labelledby="examTemplatesTitle"><div class="template-title"><div><div class="section-kicker">TEKRAR KULLANILABİLİR ŞABLONLAR</div><h3 id="examTemplatesTitle">Sınav şablon kütüphanesi</h3></div><span class="counter">${state.examTemplates.length}/${MAX_EXAM_TEMPLATES}</span></div>
 <p class="template-help">Şablonlar yalnızca açık tarayıcı sekmesinde tutulur. Öğrenci profili ve soru gözlem notları şablona aktarılmaz. Şablon açıldığında öğretmen onayı yeniden gerekir.</p>
 <div class="template-create"><div class="field"><label for="examTemplateName">Şablon adı</label><input id="examTemplateName" maxlength="90" value="${safe(state.exam.title+' şablonu')}" /></div>${btn(icon('plus',14)+' Şablon oluştur','saveExamTemplate','btn-soft btn-small',state.examTemplates.length>=MAX_EXAM_TEMPLATES?'disabled':'')}</div>
 ${state.examTemplates.length?`<div class="template-open"><div class="field"><label for="examTemplateSelect">Kayıtlı sınav şablonları</label><select id="examTemplateSelect">${state.examTemplates.map(t=>`<option value="${safe(t.id)}">${safe(t.name)} · ${safe(t.exam.subject)} · ${safe(t.exam.grade)}</option>`).join('')}</select></div>${btn('Sınava uygula','applyExamTemplate','btn-primary btn-small')}${btn('Sil','removeExamTemplate','btn-secondary btn-small')}</div>`:'<p class="template-empty">Henüz kaydedilmiş sınav şablonu bulunmuyor.</p>'}
 <div class="template-actions">${btn(icon('download',14)+' Kütüphaneyi JSON indir','exportTemplateLibrary','btn-secondary btn-small')}${btn(icon('upload',14)+' Kütüphaneyi içe aktar','importTemplateLibrary','btn-secondary btn-small')}</div>
 <p class="template-disclaimer">Paylaşım, rol yetkisi veya kurumsal arşiv değildir. İndirilen JSON dosyalarını yalnızca anonim içeriklerle kullanın.</p></section>`;
}
function renderRubricBuilder(){const d=state.rubricDraft, sum=d.criteria.reduce((n,c)=>n+(Number(c.weight)||0),0);
 return `<section class="template-panel rubric-builder" aria-labelledby="rubricBuilderTitle"><div class="template-title"><div><div class="section-kicker">ÖĞRETMEN RUBRİK ATÖLYESİ</div><h3 id="rubricBuilderTitle">Özel puanlama rubriği hazırla</h3></div><span class="counter">${state.rubricTemplates.length}/${MAX_RUBRIC_TEMPLATES}</span></div>
 <p class="template-help">1–6 ölçüt, ağırlık toplamı %100. Düzeyler 0–4 arasında öğretmen gözlemiyle işaretlenir. Bunlar öğretmene ait örnek ölçütlerdir, standartlaştırılmış ölçek değildir.</p>
 <div class="template-create rubric-name-row"><div class="field"><label for="rubricDraftName">Rubrik adı</label><input id="rubricDraftName" data-rubric-draft="name" maxlength="90" value="${safe(d.name)}" placeholder="Örn. Problem çözme gözlemi" /></div><div class="field"><label for="rubricDraftType">Soru türü</label><select id="rubricDraftType" data-rubric-draft="questionType">${Object.entries(TYPES).map(([value,label])=>`<option value="${value}" ${d.questionType===value?'selected':''}>${safe(label)}</option>`).join('')}</select></div></div>
 <div class="criteria-draft">${d.criteria.map((c,i)=>`<div class="draft-criterion"><span class="criterion-index">${i+1}</span><div class="field"><label for="rubricLabel${i}">Ölçüt açıklaması</label><input id="rubricLabel${i}" data-criterion-index="${i}" data-criterion-field="label" maxlength="95" value="${safe(c.label)}" placeholder="Gözlenen davranış" /></div><div class="field"><label for="rubricWeight${i}">Ağırlık (%)</label><input id="rubricWeight${i}" data-criterion-index="${i}" data-criterion-field="weight" type="number" min="1" max="100" step="1" value="${safe(c.weight)}" /></div>${btn(icon('trash',14)+' Sil','removeRubricCriterion','btn-secondary btn-small',`data-i="${i}" ${d.criteria.length<=1?'disabled':''}`)}</div>`).join('')}</div>
 <div class="rubric-draft-footer"><strong id="rubricWeightTotal" class="${sum===100?'weight-good':'weight-bad'}">Toplam: %${sum}</strong><div>${btn(icon('plus',14)+' Ölçüt ekle','addRubricCriterion','btn-secondary btn-small',d.criteria.length>=6?'disabled':'')}${btn(icon('check',14)+' Rubriği kaydet','saveRubricTemplate','btn-primary btn-small',state.rubricTemplates.length>=MAX_RUBRIC_TEMPLATES?'disabled':'')}</div></div>
 ${state.rubricTemplates.length?`<div class="rubric-saved"><b>Kayıtlı rubrikler</b>${state.rubricTemplates.map(t=>`<div class="rubric-saved-row"><div><strong>${safe(t.name)}</strong><small>${safe(TYPES[t.questionType])} · ${t.criteria.length} ölçüt</small></div>${btn('Düzenleme kopyası','copyRubricDraft','btn-soft btn-small',`data-template-id="${safe(t.id)}"`)}${btn('Sil','deleteRubricTemplate','btn-secondary btn-small',`data-template-id="${safe(t.id)}"`)}</div>`).join('')}</div>`:''}
 </section>`;
}
function renderGroupAnalysis(exam,sessions,ready){
 const report=aggregateAssessments(exam,sessions),available=report.compatible>0,exportAllowed=ready&&available;
 const pct=value=>value===null?'—':`${value.toLocaleString('tr-TR')}%`;
 return `<section class="group-panel" aria-labelledby="groupTitle"><div class="group-heading"><div><div class="section-kicker">TOPLU KAZANIM ANALİZİ · v0.8</div><h3 id="groupTitle">Anonim değerlendirme görünümü</h3><p>Aynı sınav sürümüne ait oturumları birlikte inceleyin. Bu bir pedagojik yeterlik/başarı kararı değildir.</p></div><span class="group-label">Öğretmen analizi</span></div>
 <div class="group-stats" role="group" aria-label="Anonim oturumların betimsel özeti">
 <div><strong>${report.compatible}</strong><span>Uyumlu oturum</span></div>
 <div><strong>${report.assessed}<small> / ${report.assessed+report.unassessed}</small></strong><span>Puan girilen soru kaydı</span></div>
 <div><strong>${pct(report.ratio)}</strong><span>Değerlendirilen puanların oranı</span></div></div>
 ${report.mixedScoringMethods?`<p class="group-warning">${icon('alert',16)} Farklı puanlama yöntemleri kullanılmış. Oranları yorumlamadan önce öğretmen karşılaştırılabilirliği incelemelidir.</p>`:''}
 ${report.excluded?`<p class="group-warning" role="status">${icon('alert',16)} ${report.excluded} uyumsuz / geçersiz oturum analize alınmadı. Sınav sürümünü kontrol edin.</p>`:''}
 ${available?`<div class="group-table-wrap"><table class="group-table"><thead><tr><th scope="col">Kazanım</th><th scope="col">Değerlendirilen kayıt</th><th scope="col">İşlenen puan</th><th scope="col">Betimsel oran</th></tr></thead><tbody>${report.objectives.map(o=>`<tr><th scope="row">${safe(o.objective)}<small>${o.sessionsWithEvidence} oturumda veri var</small></th><td>${o.assessed}/${o.assessed+o.unassessed}</td><td>${o.awarded}/${o.assessedMax}</td><td><span class="group-ratio">${pct(o.ratio)}</span><progress aria-label="${safe(o.objective)} için puanı girilmiş kayıt kapsamı" value="${o.responseCoverage??0}" max="100">${pct(o.responseCoverage)}</progress><small>İşlenen soru kapsamı: ${pct(o.responseCoverage)}</small></td></tr>`).join('')}</tbody></table></div>`:
 `<div class="group-empty">Henüz bu sınava ait uyumlu anonim değerlendirme yok. Önce yukarıdan yeni oturum açarak puanları kaydedin.</div>`}
 <p class="group-help">Oran = girilen puan / puanı girilmiş soruların azami puanı. Eksik sorular sıfır puan değildir. Kayıtlardan öğrenci sıralaması veya tanı çıkarılmaz.</p>
 <div class="group-actions">${btn(icon('download',14)+' Toplu CSV raporu','exportGroupCsv','btn-secondary btn-small',exportAllowed?'':'disabled')}${btn(icon('print',14)+' Toplu raporu yazdır / PDF','printGroup','btn-primary btn-small',exportAllowed?'':'disabled')}</div>
 ${!ready?'<p class="eval-caption">Raporu dışa aktarmak için 4. adımdan sınavı öğretmen olarak onaylayın.</p>':''}
 </section>`;
}
function rubricEditor(q,e,i){
 const mode=e.scoringMode||'manual',ratings=e.rubricRatings||{},chosen=e.rubricTemplate||null,custom=state.rubricTemplates.filter(t=>t.questionType===q.type),selectedRubric=chosen?.id||'';
 return `<div class="rubric-wrap"><div class="rubric-header"><label for="scoring-${i}">Puanlama yöntemi</label><select id="scoring-${i}" data-eval-index="${i}" data-eval-field="scoringMode"><option value="manual" ${mode==='manual'?'selected':''}>Öğretmen puanı (elle)</option><option value="rubric" ${mode==='rubric'?'selected':''}>Ölçütlü rubrik (örnek)</option></select></div>
 ${mode==='rubric'?`<div class="rubric-template-select"><label for="rubricTemplate-${i}">Rubrik şablonu</label><select id="rubricTemplate-${i}" data-rubric-template-index="${i}"><option value="" ${!selectedRubric?'selected':''}>Varsayılan örnek rubrik</option>${custom.map(t=>`<option value="${safe(t.id)}" ${selectedRubric===t.id?'selected':''}>${safe(t.name)}</option>`).join('')}${chosen&&!custom.some(t=>t.id===chosen.id)?`<option value="${safe(chosen.id)}" selected>Bu oturumda kullanılan eski rubrik</option>`:''}</select></div><div class="rubric-description">Örnek rubrik; BEP, ölçme amacı ve öğrenciye göre öğretmen tarafından doğrulanmalıdır. Bir ölçüt boşsa soru değerlendirilmemiş sayılır.</div><div class="rubric-criteria">${criteriaFor(q.type,chosen).map(c=>`<label class="rubric-criterion"><span><b>${safe(c.label)}</b><small>Ağırlık: %${c.weight}</small></span><select data-rubric-index="${i}" data-rubric-criterion="${c.id}" aria-label="${safe(c.label)} için gözlem düzeyi"><option value="">Henüz gözlenmedi / puanlanmadı</option>${RUBRIC_LEVELS.map(l=>`<option value="${l.value}" ${ratings[c.id]===l.value?'selected':''}>${safe(l.label)}</option>`).join('')}</select></label>`).join('')}</div><p class="rubric-total">Hesaplanan puan: <b>${e.pointsAwarded===null?'Değerlendirilmedi':e.pointsAwarded+' / '+q.points}</b></p>`:''}
 </div>`;
}
function renderInstitution(){const selected=state.institutionRole||'teacher',matrix=roleMatrix();
 return `<div class="card"><div class="card-heading"><h2>Kurumsal rol ve yetki tasarımı</h2><small>06 / 06</small></div><div class="card-body">
 <div class="panel-note">${icon('shield',18)}<span><b>Planlama / önizleme:</b> Bu ekran yalnızca rol ve izinlerin nasıl çalışacağını gösterir. Gerçek oturum açma, hesap oluşturma, sunucu tarafı yetkilendirme veya kurumlar arası izolasyon henüz <b>uygulanmadı</b>. Seçilen rol diğer sayfalardaki eylemleri güvenli biçimde sınırlandırmaz. Gerçek öğrenci bilgisi kullanmayın.</span></div>
 <div class="institution-cards"><div><span>Tanımlanan roller</span><strong>${matrix.length}</strong></div><div><span>İzin türü</span><strong>${PERMISSIONS.length}</strong></div><div><span>Kimlik doğrulama</span><strong>Yok · Demo</strong></div></div>
 <label class="field role-pick"><span>Rolü önizle</span><select id="institutionRole">${Object.entries(ROLE_LABELS).map(([r,label])=>`<option value="${r}" ${selected===r?'selected':''}>${safe(label)}</option>`).join('')}</select></label>
 <div class="institution-selected"><h3>${safe(ROLE_LABELS[selected])}</h3><p>Bu rol için ileride sunucuda uygulanması planlanan izinler:</p><div class="role-permissions">${PERMISSIONS.map(([id,label])=>`<span class="permission-chip ${roleCan(selected,id)?'granted':'denied'}">${roleCan(selected,id)?'✓':'—'} ${safe(label)}</span>`).join('')}</div></div>
 <div class="institution-table-scroll"><table class="institution-table"><caption>Taslak izin matrisi — uygulanan güvenlik kontrolü değildir</caption><thead><tr><th scope="col">Rol</th>${PERMISSIONS.map(([id,label])=>`<th scope="col" title="${safe(label)}">${safe(label)}</th>`).join('')}</tr></thead><tbody>${matrix.map(r=>`<tr><th scope="row">${safe(r.label)}</th>${r.permissions.map(v=>`<td aria-label="${v?'Planlanan izin var':'Planlanan izin yok'}">${v?'✓':'—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
 <div class="institution-steps"><strong>Üretim ortamına geçmeden tamamlanması gerekenler</strong><ol><li>Kurumsal SSO/OIDC, çok faktörlü kimlik doğrulama ve güvenli oturum yönetimi</li><li>Sunucu tarafında rol ve kaynak düzeyinde yetki denetimi; kurum (tenant) izolasyonu</li><li>Şifreleme, denetim kayıtları, yedekleme, saklama/imha ve KVKK değerlendirmesi</li><li>Eğitimci ve özel eğitim uzmanlarının rubrikleri doğrulaması, erişilebilirlik testleri</li></ol></div>
 </div><div class="foot-actions">${btn(icon('back',14)+' Değerlendirmeye dön','prev','btn-secondary')}</div></div>`;
}
function renderAssessment(){
 const exam=state.exam,selected=activeAssessment(),compatible=selected&&isCompatible(exam,selected),sum=selected?evaluationSummary(exam,selected):null,ready=state.approved&&reviewExam(exam).errorCount===0;
 return `<div class="card"><div class="card-heading"><h2>Öğretmen değerlendirme kayıtları</h2><small>05 / 06</small></div><div class="card-body">
 <div class="panel-note">${icon('shield',19)}<span><b>Anonim çalışma:</b> Gerçek öğrenci adı, tanı, kimlik numarası veya özel nitelikli bilgi yazmayın. Puanları öğretmen girer; sistem başarı tanısı veya BEP kararı vermez. Veriler yalnızca bu sekmede tutulur.</span></div>
 ${renderRubricBuilder()}<div class="eval-toolbar"><div class="field"><label for="assessmentSelect">Değerlendirme oturumu</label><select id="assessmentSelect"><option value="">Oturum seçin</option>${state.assessments.map(a=>`<option value="${safe(a.id)}" ${a.id===state.activeAssessmentId?'selected':''}>${safe(a.code)}${a.fingerprint===undefined?'':' · '+safe(a.createdAt.slice(0,10))}</option>`).join('')}</select></div>${btn(icon('plus',14)+' Yeni anonim oturum','newAssessment','btn-primary btn-small')}</div>
 ${selected&&!compatible?`<div class="eval-mismatch">${icon('alert',19)} <div><strong>Sınav, bu değerlendirme kaydından sonra değişmiş.</strong><p>Yanlış soruyla yanlış puanı eşleştirmemek için bu kayıt düzenlenemez. Eski sınav sürümünü geri yükleyin veya yeni anonim oturum oluşturun.</p></div></div>`:''}
 ${!selected?`<div class="eval-empty">${icon('file',30)}<h3>Henüz değerlendirme kaydı yok</h3><p>Sınav sonrası kazanım bazında gelişimi izlemek için anonim bir oturum oluşturun.</p></div>`:!compatible?'':`
 <div class="form-grid" style="margin-top:18px"><div class="field full"><label for="evalCode">Anonim oturum kodu</label><input id="evalCode" data-eval-global="code" value="${safe(selected.code)}" maxlength="70" placeholder="Örnek: Uygulama A / 1. deneme"/><small>Gerçek öğrenci adı veya öğrenci numarası kullanmayın.</small></div></div>
 <div class="eval-stats"><div><strong>${sum.assessed}<small> / ${exam.questions.length}</small></strong><span>Değerlendirilen soru</span></div><div><strong>${sum.awarded} <small> / ${sum.assessedMax}</small></strong><span>İşlenen puan</span></div><div><strong>${sum.ratio===null?'—':sum.ratio+'%'}</strong><span>Değerlendirilen puanların oranı</span></div></div>
 <div class="eval-caption">Değerlendirilmemiş sorular 0 puan sayılmaz. Oran yalnızca puanı girilmiş sorulardan hesaplanır.</div>
 <div class="section-kicker">Soru bazlı değerlendirme</div>
 <div class="eval-questions">${exam.questions.map((q,i)=>{const e=selected.entries[i];return `<div class="eval-question"><div class="eval-qhead"><span class="eval-qnum">${i+1}</span><div><strong>${safe(q.prompt)}</strong><small>${safe(q.objective||'Kazanım belirtilmedi')}</small></div><b>${q.points} puan</b></div>${rubricEditor(q,e,i)}<div class="eval-entry-grid"><div class="field"><label for="score-${i}">${e.scoringMode==='rubric'?'Rubrikten hesaplanan puan':'Verilen puan'}</label><input type="number" id="score-${i}" data-eval-index="${i}" data-eval-field="pointsAwarded" ${e.scoringMode==='rubric'?'readonly aria-readonly="true"':''} min="0" max="${safe(q.points)}" step="0.01" placeholder="Değerlendirilmedi" value="${e.pointsAwarded===null?'':safe(e.pointsAwarded)}"/><small>0 puan için 0 yazın. Boş alan değerlendirilmedi demektir.</small></div><div class="field"><label for="support-${i}">Uygulama sırasında kullanılan destek</label><select id="support-${i}" data-eval-index="${i}" data-eval-field="support">${SUPPORT_OPTIONS.map(([key,label])=>`<option value="${key}" ${key===e.support?'selected':''}>${label}</option>`).join('')}</select></div><div class="field full"><label for="observation-${i}">Öğretmen gözlemi</label><textarea id="observation-${i}" data-eval-index="${i}" data-eval-field="observation" maxlength="500" rows="2" placeholder="Sadece eğitsel gözlem; tanı ve kimlik bilgisi yazmayın.">${safe(e.observation)}</textarea></div></div></div>`;}).join('')}</div>
 <div class="section-kicker" style="margin-top:22px">Kazanım özeti</div><div class="eval-coverage">${sum.coverage.map(c=>`<div class="eval-coverage-row"><span>${safe(c.objective)}<small>${c.assessed}/${c.questionCount} soru değerlendirildi</small></span><b>${c.ratio===null?'—':c.ratio+'%'}</b></div>`).join('')}</div>
 <div class="field full" style="margin-top:18px"><label for="evalOverall">Genel öğretmen değerlendirme notu</label><textarea id="evalOverall" data-eval-global="overallNote" maxlength="800" rows="3" placeholder="Bir sonraki uygulamada gözlenecek eğitimsel hedefler...">${safe(selected.overallNote)}</textarea></div>
 <div class="eval-actions">${btn(icon('download',14)+' CSV raporu','exportEvaluationCsv','btn-secondary btn-small',ready?'':'disabled')}${btn(icon('download',14)+' JSON kayıt','exportEvaluationJson','btn-soft btn-small')}${btn(icon('print',14)+' Raporu yazdır / PDF','printEvaluation','btn-primary btn-small',ready?'':'disabled')}${btn(icon('trash',14)+' Oturumu sil','deleteAssessment','btn-secondary btn-small')}</div>
 ${!ready?'<p class="eval-caption">Rapor yazdırmak ve CSV almak için sınavın hatasız olduğundan emin olup 4. adımda öğretmen onayı verin.</p>':''}
 `}
 ${renderGroupAnalysis(exam,state.assessments,ready)}
 <div class="divider"></div><div class="eval-actions">${btn(icon('upload',14)+' Değerlendirme JSON aç','importEvaluation','btn-secondary btn-small')}${btn('Sınav önizlemesine dön','goPreview','btn-soft btn-small')}${btn('Kurumsal yetkiler '+icon('arrow',14),'showInstitution','btn-secondary btn-small')}</div>
 </div></div>`;
}

function renderObjectiveLibrary(){
 const list=findObjectives({subject:state.exam.subject,grade:state.exam.grade,term:state.objectiveTerm},allObjectives());
 return `<div class="section-kicker">Kazanım kütüphanesi <span class="counter">${state.objectives.length} kuruma/öğretmene ait · ${STARTER_OBJECTIVES.length} örnek</span></div>
 <div class="library-search"><label class="field"><span class="screen-reader-only">Kazanım ara</span><input id="objectiveSearch" value="${safe(state.objectiveTerm)}" placeholder="Kazanım ara: toplama, bilgi..." /></label><span>${list.length} örnek amaç</span></div>
 <div class="objective-list">${list.length?list.map(o=>`<label class="objective-option"><input type="radio" name="objectiveLibrary" value="${safe(o.id)}" ${state.selectedObjective===o.id?'checked':''}/><span><strong>${safe(o.title)}</strong><small>${safe(o.description)}</small><em>${safe(o.id)} · ${safe(o.domain)} · ${safe(o.source)}</em></span></label>`).join(''):'<div class="empty-library">Bu ders ve sınıf için örnek yok. Hedefi üstte kendiniz yazabilirsiniz.</div>'}</div>
 <div class="library-actions">${btn('Seçili hedefi BEP alanına aktar','applyObjective','btn-soft',`${!list.some(o=>o.id===state.selectedObjective)?'disabled':''}`)}${btn(icon('upload',14)+' CSV/JSON içe aktar','importObjectives','btn-secondary btn-small')}${btn(icon('download',14)+' Kütüphane CSV','exportObjectives','btn-secondary btn-small')}${btn('Örnek CSV şablonu','templateObjectives','btn-link btn-small')}</div><div class="mini-disclaimer" style="margin:10px 0 0">Kazanımların doğruluğu ve kullanım hakkı dosyayı sağlayan öğretmen/kuruma aittir. Dosya MEB onaylıymış gibi etiketlenmez; resmî kodlar ayrıca doğrulanmalıdır.</div>`;
}
const toggles=[
 ['institutionalHeader','Kurumsal belge başlığı (isteğe bağlı)','DOU adı yalnızca onaylanmış kurum içi kullanım için çıktıya eklenir.'],
 ['highContrast','Yüksek kontrast','Renk ayrımına dayanmayan, belirgin metin ve kenarlıklar.'],
 ['simpleInstructions','Sade yönerge varyantı','Her soru için öğretmenin yazdığı alternatif kısa metni kullanır.'],
 ['onePerPage','Her sayfada bir soru','Basılı sınavda dikkat dağıtıcı unsurları azaltmak için.'],
 ['largerAnswerArea','Geniş cevap alanı','Kısa yanıt soruları için daha büyük yazma alanı.'],
 ['visualCues','Açıklayıcı görsel/somut destek notu','Öğretmenin hazırladığı destek açıklamasını gösterir.'],
 ['uppercaseHeadings','Büyük harfli başlıklar','Yalnızca sınav başlıklarını büyük harfe çevirir.']
];
function renderAdaptations(){const a=state.exam.adaptations;return `<div class="card"><div class="card-heading"><h2>Erişilebilir sınav uyarlamaları</h2><small>02 / 06</small></div><div class="card-body">
 <div class="section-kicker">Hızlı görünüm profilleri <span class="counter">Öğretmen seçimiyle uygulanır</span></div>
 <div class="preset-grid">${Object.entries(DISPLAY_PRESETS).map(([id,p])=>`<button type="button" class="preset-card" data-action="preset" data-preset="${id}"><span class="preset-symbol">${id==='standard'?'Aa':id==='readable'?'A+':id==='focus'?'01':'◐'}</span><strong>${p.label}</strong><small>${p.subtitle}</small></button>`).join('')}</div>
 <div class="divider"></div><div class="section-kicker">Ayrıntılı okunabilirlik ayarları</div><div class="form-grid">
 <div class="field"><label for="fontSize">Yazı boyutu</label><select id="fontSize" data-adaptation="fontSize">${[16,18,20,22,24].map(n=>`<option value="${n}" ${a.fontSize===n?'selected':''}>${n} punto (ekran/çıktı ölçeği)</option>`).join('')}</select><small>Word/PDF çıktı görünümünü etkiler.</small></div>
 <div class="field"><label for="lineSpacing">Satır aralığı</label><select id="lineSpacing" data-adaptation="lineSpacing">${[1.45,1.65,1.9,2.1].map(n=>`<option value="${n}" ${a.lineSpacing===n?'selected':''}>${n.toFixed(2).replace('.',',')} satır</option>`).join('')}</select><small>Öğrencinin okunabilirlik ihtiyacına göre seçin.</small></div>
 </div><div class="divider"></div><div class="section-kicker">Destekler</div><div class="adaptation-grid">${toggles.map(([key,title,desc])=>`<label class="adaptation"><input type="checkbox" data-adaptation="${key}" ${a[key]?'checked':''}/><span><strong>${title}</strong><small>${desc}</small></span></label>`).join('')}</div>
 <div class="divider"></div><div class="warning-hint">${icon('alert',16)} <b>Önemli:</b> Seçenek sayısını, kazanımın güçlüğünü veya doğru yanıtı otomatik azaltmıyoruz. Böyle bir değişikliğin ölçtüğü beceriye etkisi öğretmen tarafından ayrıca değerlendirilmelidir. Sesli okuma da her sınav türünde uygun olmayabilir.</div>
 </div><div class="foot-actions">${btn(icon('back',14)+' Geri','prev')}${btn('Soruları düzenle '+icon('arrow',14),'next','btn-primary')}</div></div>`;}
function qfield(i,key,label,value,{type='text',full=false,rows=3,small=''}={}){
 const id=`q${i}-${key}`;let input=type==='textarea'?`<textarea id="${id}" data-q-index="${i}" data-q-field="${key}" rows="${rows}">${safe(value)}</textarea>`:`<input id="${id}" data-q-index="${i}" data-q-field="${key}" value="${safe(value)}" type="${type}" ${type==='number'?'min="1" max="1000"':''}/>`;
 return `<div class="field ${full?'full':''}"><label for="${id}">${label}</label>${input}${small?`<small>${small}</small>`:''}</div>`;
}
function optionsEditor(q,i){
 if(q.type==='choice')return `<div class="divider"></div><div class="section-kicker">Yanıt seçenekleri <span class="counter">Doğru yanıtı işaretleyin</span></div><div class="options-editor">${q.options.map((opt,j)=>`<div class="option-row"><span class="option-key">${String.fromCharCode(65+j)}</span><input type="text" aria-label="${String.fromCharCode(65+j)} seçeneği" data-option-index="${j}" data-q-index="${i}" value="${safe(opt)}"/><label class="option-answer"><input aria-label="Doğru yanıt ${String.fromCharCode(65+j)}" type="radio" name="answer-${i}" data-answer-option="${j}" data-q-index="${i}" ${q.answer===opt?'checked':''}/> Doğru</label><button class="icon-btn danger" type="button" data-action="removeOption" data-i="${i}" data-j="${j}" title="Seçeneği sil" ${q.options.length<=2?'disabled':''}>${icon('trash',14)}</button></div>`).join('')}</div><div style="margin-top:10px">${btn(icon('plus',14)+' Seçenek ekle','addOption','btn-soft btn-small',`data-i="${i}" ${q.options.length>=6?'disabled':''}`)}</div>`;
 if(q.type==='short')return `<div class="divider"></div>${qfield(i,'answer','Örnek / beklenen yanıt',q.answer,{full:true,small:'Puanlama için örnek yanıt girin.'})}`;
 if(q.type==='truefalse')return `<div class="divider"></div><div class="field"><label for="ans-${i}">Doğru yanıt</label><select id="ans-${i}" data-q-index="${i}" data-q-field="answer"><option value="" ${!q.answer?'selected':''}>Yanıt seçin</option><option ${q.answer==='Doğru'?'selected':''}>Doğru</option><option ${q.answer==='Yanlış'?'selected':''}>Yanlış</option></select></div>`;
 if(q.type==='matching')return `<div class="divider"></div><div class="section-kicker">Eşleştirme çiftleri</div><div class="options-editor">${q.pairs.map((pair,j)=>`<div class="pair-row"><input aria-label="${j+1} sol ifade" data-q-index="${i}" data-pair-index="${j}" data-pair-field="left" value="${safe(pair.left)}" placeholder="Sol ifade"/><span>→</span><input aria-label="${j+1} sağ ifade" data-q-index="${i}" data-pair-index="${j}" data-pair-field="right" value="${safe(pair.right)}" placeholder="Doğru eş"/><button type="button" class="icon-btn danger" data-action="removePair" data-i="${i}" data-j="${j}" ${q.pairs.length<=2?'disabled':''} title="Çifti sil">${icon('trash',14)}</button></div>`).join('')}</div><div style="margin-top:10px">${btn(icon('plus',14)+' Eşleştirme çifti','addPair','btn-soft btn-small',`data-i="${i}" ${q.pairs.length>=12?'disabled':''}`)}</div>`;
 return '';
}
function questionCard(q,i){const open=state.editing===i;return `<div class="question-item"><div class="question-head"><span class="question-type">${TYPES[q.type]}</span><div class="question-head-main"><strong>${i+1}. ${safe(q.prompt||'Yeni soru')}</strong><p>${safe(q.objective||'Kazanım tanımlanmadı')} · ${safe(q.points)} puan</p></div><div class="question-head-actions">
 <button type="button" class="icon-btn" title="Yukarı taşı" aria-label="Soruyu yukarı taşı" data-action="up" data-i="${i}" ${i===0?'disabled':''}>${icon('up',16)}</button>
 <button type="button" class="icon-btn" title="Aşağı taşı" aria-label="Soruyu aşağı taşı" data-action="down" data-i="${i}" ${i===state.exam.questions.length-1?'disabled':''}>${icon('down',16)}</button>
 <button type="button" class="icon-btn" title="Çoğalt" aria-label="Soruyu çoğalt" data-action="duplicate" data-i="${i}">${icon('copy',16)}</button>
 <button type="button" class="icon-btn danger" title="Sil" aria-label="Soruyu sil" data-action="remove" data-i="${i}">${icon('trash',16)}</button>
 <button type="button" class="btn btn-small ${open?'btn-soft':'btn-secondary'}" data-action="edit" data-i="${i}" aria-expanded="${open}">${icon('edit',14)} ${open?'Kapat':'Düzenle'}</button>
 </div></div>${open?`<div class="question-editor"><div class="form-grid">
 ${qfield(i,'prompt','Soru metni',q.prompt,{type:'textarea',full:true,rows:2})}
 ${qfield(i,'simplifiedPrompt','Alternatif sade soru metni',q.simplifiedPrompt,{type:'textarea',full:true,rows:2,small:'Yalnızca sade yönerge uyarlaması seçilirse kullanılır; kazanımın anlamını değiştirmemelidir.'})}
 ${qfield(i,'objective','İlgili BEP kazanımı',q.objective,{full:true})}
 ${qfield(i,'points','Puan',q.points,{type:'number'})}
 ${qfield(i,'visualNote','Görsel / somut destek açıklaması',q.visualNote,{full:true,small:'Destek etkinse açıklama öğrenci nüshasına eklenir.'})}
 <div class="field"><label for="visual-style-${i}">Görsel şekil</label><select id="visual-style-${i}" data-q-index="${i}" data-q-field="visualStyle">${[['dot','Daire'],['square','Kare'],['triangle','Üçgen'],['star','Yıldız']].map(([v,l])=>`<option value="${v}" ${q.visualStyle===v?'selected':''}>${l}</option>`).join('')}</select></div>
 ${qfield(i,'visualAltText','Görsel için alternatif metin',q.visualAltText,{full:false,small:'Ekran okuyucu ile kullanılacak açıklama.'})}
   <div class="field"><label for="v-mode-${i}">Görsel destek türü</label><select id="v-mode-${i}" data-q-index="${i}" data-q-field="visualMode"><option value="shapes" ${q.visualMode!=='numberline'?'selected':''}>Şekil / nesne grupları</option><option value="numberline" ${q.visualMode==='numberline'?'selected':''}>Sayı doğrusu</option></select><small>Sayı doğrusu öğretmen tarafından seçilir; her kazanım için uygun değildir.</small></div>
   <div class="field"><label>Sayı doğrusu uçları (0–30)</label><div class="dots-controls"><input aria-label="Sayı doğrusu başlangıç sayısı" type="number" min="0" max="30" data-q-index="${i}" data-q-field="numberLineStart" value="${safe(q.numberLineStart??0)}"/><input aria-label="Sayı doğrusu bitiş sayısı" type="number" min="0" max="30" data-q-index="${i}" data-q-field="numberLineEnd" value="${safe(q.numberLineEnd??10)}"/></div><small>En çok 12 aralık. Sayıların öğrencinin sorusunu istemeden çözmemesine dikkat edin.</small></div>
 <div class="field full"><label>Somut nokta grupları (isteğe bağlı)</label><div class="dots-controls"><label>Birinci grup <input aria-label="Birinci nesne grubu sayısı" type="number" min="0" max="12" data-q-index="${i}" data-visual-dot="groupA" value="${q.visualDots?.groupA||0}" /></label><label>İkinci grup <input aria-label="İkinci nesne grubu sayısı" type="number" min="0" max="12" data-q-index="${i}" data-visual-dot="groupB" value="${q.visualDots?.groupB||0}" /></label></div><small>0–12 arası simge oluşturur. Yalnızca “Görsel destek” açıksa öğrenci çıktısında görünür. Öğretmen kazanım uygunluğunu kontrol etmelidir.</small></div>
 ${qfield(i,'teacherNote','Öğretmen değerlendirme notu',q.teacherNote,{type:'textarea',full:true,rows:2,small:'Yalnızca cevap anahtarında görünür.'})}
 </div>${optionsEditor(q,i)}${q.provenance?.kind==='local-template'?`<div class="draft-review-hint"><span>${q.provenance.reviewed?'✓ İncelenmiş taslak':'Düzenleme sonrası yeniden öğretmen incelemesi gerekiyor.'}</span>${btn(icon('check',14)+' Bu soruyu yeniden onayla','reviewQuestion','btn-soft btn-small',`data-i="${i}"`)}</div>`:''}<div class="editor-footer"><small>Soru kaydı geçici olarak bu tarayıcı sekmesinde tutulur.</small>${btn('Düzenlemeyi kapat '+icon('check',13),'closeEdit','btn-primary btn-small')}</div></div>`:''}</div>`;}
function renderProposalPanel(){
 const o=findObjectives({subject:state.exam.subject,grade:state.exam.grade},STARTER_OBJECTIVES);
 const selected=o.some(x=>x.id===state.selectedObjective)?state.selectedObjective:o[0]?.id||'';
 const draft=state.proposal;
 return `<section class="proposal-panel"><div class="proposal-heading"><div><span class="section-kicker">ÖĞRETMEN DENETİMLİ TASLAK ATÖLYESİ</span><h3>Soru önerisi oluştur ve incele</h3><p>Öneriler cihazda çalışan örnek kural şablonlarından gelir; harici yapay zekâ çağrısı yapılmaz.</p></div><span class="proposal-label">YEREL TASLAK MOTORU</span></div>
 <div class="proposal-tools"><label class="field"><span>Örnek amaç</span><select id="proposalObjective">${o.length?o.map(x=>`<option value="${safe(x.id)}" ${x.id===selected?'selected':''}>${safe(x.title)} · ${safe(x.id)}</option>`).join(''):'<option value="">Bu ders/sınıf için taslak yok</option>'}</select></label><label class="field"><span>Varyant</span><select id="proposalVariant">${Array.from({length:6},(_,i)=>`<option value="${i}" ${i===state.proposalVariant?'selected':''}>Örnek ${i+1}</option>`).join('')}</select></label>${btn(icon('sparkle',14)+' Taslak öner','makeProposal','btn-primary',`${!o.length?'disabled':''}`)}</div>
 ${draft?`<div class="draft-card"><div class="draft-kicker">KAYDEDİLMEMİŞ ÖNERİ · ${safe(draft.provenance.objectiveId)}</div><div class="draft-question"><strong>${safe(draft.prompt)}</strong><div class="draft-options">${draft.options.map((v,i)=>`<span><b>${String.fromCharCode(65+i)}.</b> ${safe(v)}</span>`).join('')}</div></div><div class="draft-meta"><span><b>Beklenen yanıt:</b> ${safe(draft.answer)}</span><span><b>Kazanım:</b> ${safe(draft.objective)}</span></div><label class="draft-check"><input id="proposalApproval" type="checkbox" ${state.proposalChecked?'checked':''}/><span>Bu sorunun kazanıma uygunluğunu, seçeneklerini, doğru yanıtını ve öğrenci için gerekli desteği inceledim. Öneriyi düzenlenebilir taslak olarak eklemeyi onaylıyorum.</span></label><div class="draft-actions">${btn('Öneriyi iptal et','discardProposal','btn-secondary btn-small')}${btn(icon('check',14)+' Sorulara ekle','acceptProposal','btn-primary btn-small',`${!state.proposalChecked||!proposalAudit(draft).ok?'disabled':''}`)}</div></div>`:''}
 <div class="mini-disclaimer">Bu kütüphane örnektir; resmî program aktarımı veya yapay zekâ ile özgün soru üretimi iddiası taşımaz. Soru öncesi ve çıktıda öğretmen incelemesi zorunludur.</div></section>`;
}
function renderQuestions(){const e=state.exam;return `<div class="card"><div class="card-heading"><h2>Soru bankası ve düzenleme</h2><small>03 / 06</small></div><div class="card-body">
 <div class="toolbar"><div><span class="toolbar-title">Sınav soruları</span> <span class="counter">${e.questions.length} soru · ${totalPoints(e)} puan</span></div><div class="toolbar-right"><div class="field"><label class="screen-reader-only" for="newQuestionType">Yeni soru türü</label><select id="newQuestionType"><option value="choice">Çoktan seçmeli</option><option value="short">Kısa yanıt</option><option value="truefalse">Doğru / Yanlış</option><option value="matching">Eşleştirme</option></select></div>${btn(icon('plus',15)+' Yeni soru','add','btn-primary')}</div></div>
 ${renderProposalPanel()}
 <div class="inline-hint">${icon('book',15)} Soru metnini, seçenekleri ve cevap anahtarını burada düzenleyin. BEP kazanımını her soruyla ayrı ilişkilendirin.</div>
 ${e.questions.length?e.questions.map(questionCard).join(''):`<div class="empty-state"><div class="circle">${icon('file',24)}</div><b>Henüz soru bulunmuyor</b><p>İlk soruyu yukarıdaki menüden ekleyin.</p></div>`}
 </div><div class="foot-actions">${btn(icon('back',14)+' Geri','prev')}${btn('Önizle '+icon('arrow',14),'next','btn-primary')}</div></div>`;}
function renderPreview(){const e=state.exam;const review=reviewExam(e);const issues=review.issues;const errors=issues.filter(x=>x.level==='error');return `<div class="card"><div class="card-heading"><h2>Son kontrol ve A4 önizleme</h2><small>04 / 06</small></div><div class="card-body"><div class="toolbar"><div class="select-row"><span class="field-label">Gösterim:</span><button type="button" class="btn btn-small ${!state.answerKey?'btn-primary':'btn-secondary'}" data-action="studentView">Öğrenci sınavı</button><button type="button" class="btn btn-small ${state.answerKey?'btn-primary':'btn-secondary'}" data-action="answerView">Cevap anahtarı</button></div></div>
 <div class="preview-alert">${icon('eye',16)} Bu sayfa A4 çıktı görünümünü yaklaşık gösterir. PDF çıktısında tarayıcının yazdırma penceresinden <b>PDF olarak kaydet</b> seçin. Eşleştirme ve çoktan seçmeli soruları öğretmen kontrol etmelidir.</div>
 <div class="field" style="margin-bottom:15px"><label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer"><input type="checkbox" id="approval" style="margin:2px 0 0;width:17px;min-height:17px;accent-color:#c50e1f" ${state.approved?'checked':''}/><span><b>Öğretmen kontrolü yapıldı.</b><br/><small>Hedef, soru doğruluğu, uygun uyarlama ve cevap anahtarını kontrol ettim.</small></span></label></div>
 <div class="quality-panel"><div class="quality-head"><div><b>Kalite ve kazanım izleme raporu</b><small>Otomatik biçimsel kontroller; pedagojik doğruluk kararı değildir</small></div><span class="quality-status">${review.errorCount} hata · ${review.warningCount} uyarı</span></div><div class="quality-objectives">${review.coverage.length?review.coverage.map(x=>`<div class="coverage-row"><span>${safe(x.objective)}</span><b>${x.count} soru</b></div>`).join(''):'<p>Kazanım eşleştirmesi yok.</p>'}</div>${issues.filter(x=>x.level!=='info').slice(0,12).map(x=>`<p class="quality-issue ${x.level}">${x.level==='error'?'DÜZELT':'GÖZDEN GEÇİR'} · ${safe(x.text)}</p>`).join('')}<div class="quality-actions">${btn(icon('download',14)+' Raporu JSON al','reviewJson','btn-secondary btn-small')}</div></div>
 </div><div class="preview-wrap"><div class="preview-sheet"><style>${printCss.replace(/@page\{[^}]+\}/g,'').replace(/@media print\{[\s\S]*/, '')}</style>${paperBody(e,state.answerKey)}</div></div>
 <div class="foot-actions">${btn(icon('back',14)+' Sorulara dön','prev')}${btn(icon('print',15)+' Yazdır / PDF','print','btn-primary',`${!state.approved||errors.length?'disabled':''}`)}${btn(icon('download',15)+' Word (.docx)','word','btn-soft',`${!state.approved||errors.length?'disabled':''}`)}${btn('Değerlendirmeye geç '+icon('arrow',14),'next','btn-secondary')}</div></div>`;}
function checks(){const e=state.exam;const issues=reviewExam(e).issues;return [
 {good:Boolean(e.title.trim()&&e.subject.trim()),text:'Sınav bilgileri girildi'},
 {good:Boolean(e.objective.trim()),text:'BEP hedefi tanımlandı'},
 {good:Boolean(e.questions.length),text:`${e.questions.length} soru hazırlandı`},
 {good:!issues.some(x=>x.level==='error'),text:'Zorunlu cevap kontrolleri'},
 {good:state.approved,text:'Öğretmen onayı verildi'}
];}
function sidebar(){const issues=reviewExam(state.exam).issues,checksList=checks(),n=checksList.filter(c=>c.good).length;
 return `<div class="card side-card"><div class="card-heading"><h2>Sınav durumu</h2><small>${n}/5</small></div><div class="card-body">
 <div class="stat-grid"><div class="stat"><strong>${state.exam.questions.length}</strong><span>Soru</span></div><div class="stat"><strong>${totalPoints(state.exam)}</strong><span>Toplam puan</span></div><div class="stat"><strong>${state.exam.duration}</strong><span>Dakika</span></div></div>
 <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${n}" aria-label="Sınav tamamlanma durumu"><span style="width:${n*20}%"></span></div>
 <div class="side-heading">Hazırlık kontrolü</div>${checksList.map(c=>`<div class="checkitem"><span class="checkmark ${c.good?'':'warn'}">${c.good?'✓':'!'}</span><span>${safe(c.text)}</span></div>`).join('')}
 ${issues.slice(0,5).map(x=>`<div class="issue ${x.level}">${icon(x.level==='error'?'alert':'book',13)} ${safe(x.text)}</div>`).join('')}
 ${issues.length>5?`<p class="issue">…ve ${issues.length-5} ek uyarı.</p>`:''}${state.assessments.length?`<div class="issue">${icon('book',13)} ${state.assessments.length} anonim değerlendirme oturumu</div>`:''}
 <hr class="side-divider"/><div class="side-heading">Taslak işlemleri</div><div class="side-actions">${btn(icon('download',14)+' Proje yedeği','saveProject','btn-secondary btn-small')}${btn(icon('upload',14)+' Proje aç','loadJson','btn-secondary btn-small')}</div>
 <div style="margin-top:10px">${btn(icon('check',14)+' Sürüm kaydet','saveSnapshot','btn-soft btn-small')}</div><div style="margin-top:12px">${btn(icon('restart',14)+' Örnek sınava sıfırla','reset','btn-secondary btn-small')}</div>
 <div class="issue"><b>Gizlilik:</b> Dış servis kullanılmaz. Gerçek öğrenci/sağlık bilgileri girmeyin. Sınav ve özel kazanımlar sekme oturumunda tutulur; yedekler indirilen cihazda korunmalıdır.</div>
 </div></div>`;}
function render(){const s=STEPS[stepIndex()],mainContent={general:renderGeneral,adaptations:renderAdaptations,questions:renderQuestions,preview:renderPreview,assessment:renderAssessment,institution:renderInstitution}[state.step]();root.innerHTML=`<div class="app-shell ${state.theme==='dark'?'theme-dark':''}"><aside class="sidebar"><div class="brand"><div class="brand-logo" aria-hidden="true"><span>DOU</span><i></i></div><div class="brand-copy"><small>DOĞUŞ ÜNİVERSİTESİ</small><strong>BEP Sınav<br/>Atölyesi</strong><small>ÖLÇME & DEĞERLENDİRME</small></div></div><div class="nav-label">ÇALIŞMA ALANI</div><div class="sidebar-appname"><span class="sidebar-app-icon">${icon('file',16)}</span><span class="nav-text">Sınav tasarımcısı</span></div><div class="nav-label">SINAV ADIMLARI</div><nav aria-label="Sınav hazırlama adımları">${STEPS.map((step,i)=>`<button type="button" data-action="goto" data-step="${step.id}" class="nav-button ${step.id===state.step?'active':''}" aria-current="${step.id===state.step?'step':'false'}"><span class="nav-number">${i+1}</span><span class="nav-text">${step.label}</span></button>`).join('')}</nav><div class="sidebar-bottom"><a class="institution-link" href="/kurum">↗ Kurumsal çalışma alanı</a><small>${icon('shield',13)} YEREL PROTOTİP · HASSAS VERİ GİRMEYİN</small><div class="sidebar-notice">Öğrenci tanısı kaydedilmez. Eğitsel desteklere <b>öğretmen karar verir.</b></div><div class="side-version"><span>DOU kurumsal tema</span><span>v${VERSION}</span></div></div></aside>
 <main class="main"><header class="topbar"><div class="topbar-left"><div class="topbar-title"><span>ÖLÇME & DEĞERLENDİRME <b class="breadcrumb-slash">/</b> SINAV TASARIMCISI</span><strong title="${safe(state.exam.title)}">${safe(state.exam.title)}</strong></div></div><div class="topbar-actions"><button class="theme-toggle" type="button" data-action="theme" title="Açık/koyu görünüm" aria-label="Açık veya koyu temaya geç">${state.theme==='dark'?'☀':'☾'}</button>${btn(icon('eye',15)+' Önizleme','goPreview','btn-secondary small-hide')}${btn(icon('download',14)+' Yedek al','saveProject','btn-primary')}</div></header>
 <div class="content"><div class="enterprise-banner"><div><span class="banner-tag">DOU INCLUSIVE ASSESSMENT</span><strong>Kapsayıcı ölçme, bireysel uyarlama.</strong><p>BEP hedeflerine dayalı öğretmen kontrollü sınav tasarımı</p></div><div class="banner-circle">${icon('book',28)}</div></div><div class="intro"><div><div class="eyebrow"><span class="red-line"></span> SINAV OLUŞTURMA AKIŞI · ${String(stepIndex()+1).padStart(2,'0')} / 06</div><h1>${s.label}</h1><p>${s.help}</p></div><div class="status-badge"><span class="status-dot"></span> Yerel prototip · Kişisel veri girmeyin</div></div>
 <div class="workspace"><div>${mainContent}</div><div id="sideStats">${sidebar()}</div></div></div></main></div><input id="jsonFileInput" type="file" accept="application/json,.json" style="display:none"/><input id="objectivesFileInput" type="file" accept=".csv,.json,text/csv,application/json" style="display:none"/><input id="templateLibraryFileInput" type="file" accept=".json,application/json" style="display:none"/><input id="evaluationFileInput" type="file" accept=".json,application/json" style="display:none"/>`;
}
function refreshSide(){const el=document.getElementById('sideStats');if(el)el.innerHTML=sidebar();const approval=document.getElementById('approval');if(approval)approval.checked=state.approved;}
function findEl(target,selector){return target?.closest?.(selector);}
function download(bytes,mime,name){const blob=new Blob([bytes],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);}
function printExam(){const issues=reviewExam(state.exam).issues.filter(x=>x.level==='error');if(issues.length||!state.approved){notify('Önce hataları düzeltin ve öğretmen onayı verin.');return;}
 const page=window.open('','_blank');if(!page){notify('Tarayıcı açılır pencereyi engelledi. Bu site için izin verin.');return;}
 page.document.open();page.document.write(printableHtml(state.exam,state.answerKey));page.document.close();page.focus();setTimeout(()=>page.print(),200);
}
function exportWord(){if(!state.approved||reviewExam(state.exam).errorCount>0){notify('Önce hataları düzeltin ve öğretmen onayı verin.');return;}
 const out=generateDocx(state.exam,state.answerKey),base=slugify(state.exam.title)+(state.answerKey?'-cevap-anahtari':'-ogrenci-sinavi')+'.docx';
 download(out,'application/vnd.openxmlformats-officedocument.wordprocessingml.document',base);notify('Düzenlenebilir Word belgesi oluşturuldu.');}
function clickAction(button){const action=button.dataset.action,i=Number(button.dataset.i),j=Number(button.dataset.j),q=state.exam.questions;
 switch(action){
 case 'saveExamTemplate':{try{if(state.examTemplates.length>=MAX_EXAM_TEMPLATES)throw new Error('Şablon sınırına ulaşıldı.');const name=document.getElementById('examTemplateName')?.value||'';const t=createExamTemplate(state.exam,name,normalizeExam,`exam-${Date.now()}-${Math.random().toString(36).slice(2,7)}`);state.examTemplates.unshift(t);rememberTemplateLibraries();render();notify('Anonim sınav şablonu kaydedildi.');}catch(err){notify(err.message);}break;}
 case 'applyExamTemplate':{const id=document.getElementById('examTemplateSelect')?.value,t=state.examTemplates.find(x=>x.id===id);if(!t){notify('Önce şablon seçin.');break;}if(!window.confirm('Şablon mevcut sınavın yerini alsın mı? Değerlendirme oturumları farklı sınava uyumsuz olabilir.'))break;state.exam=openExamTemplate(t,normalizeExam);state.approved=false;state.editing=-1;state.step='general';remember();render();notify('Şablon yeni taslağa uygulandı. Öğretmen kontrolü yeniden gerekli.');break;}
 case 'removeExamTemplate':{const id=document.getElementById('examTemplateSelect')?.value;if(!window.confirm('Seçili sınav şablonunu silmek istiyor musunuz?'))break;state.examTemplates=state.examTemplates.filter(t=>t.id!==id);rememberTemplateLibraries();render();break;}
 case 'exportTemplateLibrary':download(exportLibraryJson(state.examTemplates,state.rubricTemplates),'application/json','bep-anonim-ogretmen-sablonlari.json');notify('Anonim şablon kütüphanesi indirildi.');break;
 case 'importTemplateLibrary':document.getElementById('templateLibraryFileInput')?.click();break;
 case 'addRubricCriterion':if(state.rubricDraft.criteria.length<6){state.rubricDraft.criteria.push({label:'',weight:0});render();}break;
 case 'removeRubricCriterion':if(state.rubricDraft.criteria.length>1){state.rubricDraft.criteria.splice(i,1);render();}break;
 case 'saveRubricTemplate':{try{if(state.rubricTemplates.length>=MAX_RUBRIC_TEMPLATES)throw new Error('Rubrik şablon sınırı doldu.');const t=makeCustomRubric(state.rubricDraft,`rubrik-${Date.now()}-${Math.random().toString(36).slice(2,6)}`);state.rubricTemplates.unshift(t);rememberTemplateLibraries();render();notify('Rubrik kaydedildi. Uygulamak için soru puanlama alanından seçin.');}catch(err){notify(err.message);}break;}
 case 'copyRubricDraft':{const t=state.rubricTemplates.find(x=>x.id===button.dataset.templateId);if(t){state.rubricDraft={name:t.name+' kopyası',questionType:t.questionType,criteria:t.criteria.map(c=>({label:c.label,weight:c.weight}))};render();notify('Ölçütleri düzenleyip yeni sürüm olarak kaydedin. Eski oturumlar değişmez.');}break;}
 case 'deleteRubricTemplate':{const id=button.dataset.templateId;if(!window.confirm('Kütüphanedeki rubrik silinsin mi? Önceden yapılmış değerlendirmeler etkilenmez.'))break;state.rubricTemplates=state.rubricTemplates.filter(t=>t.id!==id);rememberTemplateLibraries();render();break;}
 case 'applyObjective':{const o=objectiveById(state.selectedObjective,allObjectives());if(!o){notify('Önce kazanım seçin.');break;}state.exam.objective=o.description;changed();render();notify('Örnek hedef BEP alanına aktarıldı; öğretmen düzenleyebilir.');break;}
 case 'makeProposal':{const selected=document.getElementById('proposalObjective')?.value;const variant=Number(document.getElementById('proposalVariant')?.value||0);try{state.proposal=makeProposal(selected,variant);state.proposalChecked=false;state.proposalVariant=variant;render();notify('Öneri hazır. Kaydetmek için inceleme ve onay gerekiyor.');}catch(error){notify(error.message);}break;}
 case 'discardProposal':state.proposal=null;state.proposalChecked=false;render();break;
 case 'acceptProposal':{const p=state.proposal;if(!p||!state.proposalChecked||!proposalAudit(p).ok){notify('Taslak için öğretmen onayı gerekiyor.');break;}const cp=copyExam(p);cp.id='onerilen-'+Date.now();cp.provenance.reviewed=true;state.exam.questions.push(cp);state.editing=state.exam.questions.length-1;state.proposal=null;state.proposalChecked=false;changed();render();notify('İncelenen taslak sorulara eklendi. Düzenleyebilirsiniz.');break;}
 case 'theme':state.theme=state.theme==='light'?'dark':'light';try{sessionStorage.setItem('bep-theme-v2',state.theme);}catch{}render();break;
 case 'preset':state.exam=applyDisplayPreset(state.exam,button.dataset.preset);changed();render();notify('Görünüm profili uygulandı; diğer eğitsel kararlar korunur.');break;
 case 'goto':state.step=button.dataset.step;render();break;
 case 'next':state.step=STEPS[Math.min(STEPS.length-1,stepIndex()+1)].id;render();break;
 case 'prev':state.step=STEPS[Math.max(0,stepIndex()-1)].id;render();break;
 case 'goPreview':state.step='preview';render();break;
 case 'studentView':state.answerKey=false;render();break;
 case 'answerView':state.answerKey=true;render();break;
 case 'edit':state.editing=state.editing===i?-1:i;render();break;
 case 'closeEdit':state.editing=-1;render();break;
 case 'add':q.push(starterQuestion(document.getElementById('newQuestionType')?.value||'choice'));state.editing=q.length-1;changed();render();break;
 case 'remove':if(window.confirm(`${i+1}. soruyu silmek istiyor musunuz?`)){q.splice(i,1);state.editing=-1;changed();render();}break;
 case 'duplicate':{const cp=copyExam(q[i]);cp.id='copy-'+Date.now()+'-'+i;q.splice(i+1,0,cp);state.editing=i+1;changed();render();break;}
 case 'up':if(i>0){[q[i],q[i-1]]=[q[i-1],q[i]];state.editing=i-1;changed();render();}break;
 case 'down':if(i<q.length-1){[q[i],q[i+1]]=[q[i+1],q[i]];state.editing=i+1;changed();render();}break;
 case 'addOption':if(q[i].options.length<6){q[i].options.push(`Seçenek ${q[i].options.length+1}`);unreview(q[i]);changed();render();}break;
 case 'removeOption':if(q[i].options.length>2){const removed=q[i].options.splice(j,1)[0];if(q[i].answer===removed)q[i].answer='';unreview(q[i]);changed();render();}break;
 case 'addPair':if(q[i].pairs.length<12){q[i].pairs.push({left:'',right:''});unreview(q[i]);changed();render();}break;
 case 'removePair':if(q[i].pairs.length>2){q[i].pairs.splice(j,1);unreview(q[i]);changed();render();}break;
 case 'saveSnapshot':{try{state.snapshots=keepSnapshots(state.snapshots,makeSnapshot(state.exam,state.objectives));rememberSnapshots();render();notify('Sürüm sekme oturumuna kaydedildi; kalıcı yedek için JSON indirin.');}catch(err){notify(err.message);}break;}
 case 'restoreSnapshot':{const id=document.getElementById('snapshotPicker')?.value,selected=state.snapshots.find(s=>s.id===id);if(!selected){notify('Sürüm seçilemedi.');break;}if(!window.confirm('Seçili sınav sürümü mevcut çalışmanın yerini alsın mı?'))break;state.exam=normalizeExam(selected.exam);state.objectives=sanitizeObjectives(selected.objectives);rememberObjectives();state.approved=false;state.editing=-1;remember();render();notify('Kaydedilen sürüm açıldı; öğretmen onayı yeniden gerekli.');break;}
 case 'deleteSnapshot':{const id=document.getElementById('snapshotPicker')?.value;if(!id||!window.confirm('Seçili sürüm kaydı silinsin mi?'))break;state.snapshots=state.snapshots.filter(s=>s.id!==id);rememberSnapshots();render();break;}
 case 'showInstitution':state.step='institution';render();break;
 case 'newAssessment':{if(state.assessments.length>=20){notify('20 oturum sınırına ulaşıldı. JSON olarak kaydedip eski oturumları silin.');break;}const assessment=createAssessment(state.exam,{code:`Anonim Oturum ${state.assessments.length+1}`});state.assessments.unshift(assessment);state.activeAssessmentId=assessment.id;rememberAssessments();render();notify('Anonim değerlendirme oturumu açıldı.');break;}
 case 'deleteAssessment':{const a=activeAssessment();if(!a||!window.confirm('Bu oturumdaki puanlar ve gözlemler silinsin mi?'))break;state.assessments=state.assessments.filter(x=>x.id!==a.id);state.activeAssessmentId=state.assessments[0]?.id||'';rememberAssessments();render();break;}
 case 'exportEvaluationJson':{const a=activeAssessment();if(!a||!isCompatible(state.exam,a)){notify('Önce eşleşen bir değerlendirme oturumu seçin.');break;}download(JSON.stringify(normaliseAssessment(a,state.exam),null,2),'application/json',slugify(state.exam.title)+'-anonim-degerlendirme.json');notify('Değerlendirme dosyası cihazınıza kaydedildi.');break;}
 case 'exportEvaluationCsv':{const a=activeAssessment();if(!a||!isCompatible(state.exam,a)||!state.approved||reviewExam(state.exam).errorCount){notify('Sınav onayı ve geçerli oturum gerekli.');break;}download(evaluationCsv(state.exam,a),'text/csv;charset=utf-8',slugify(state.exam.title)+'-degerlendirme.csv');break;}
 case 'printEvaluation':{const a=activeAssessment();if(!a||!isCompatible(state.exam,a)||!state.approved||reviewExam(state.exam).errorCount){notify('Sınav onayı ve geçerli oturum gerekli.');break;}const page=window.open('','_blank');if(!page){notify('Tarayıcı açılır pencereyi engelledi.');break;}page.document.open();page.document.write(evaluationPrintable(state.exam,a));page.document.close();page.focus();setTimeout(()=>page.print(),200);break;}
 case 'exportGroupCsv':{const group=aggregateAssessments(state.exam,state.assessments);if(!state.approved||reviewExam(state.exam).errorCount||!group.compatible){notify('Onaylı sınav ve uyumlu anonim oturumlar gerekli.');break;}
  download(groupCsv(state.exam,state.assessments),'text/csv;charset=utf-8',slugify(state.exam.title)+'-toplu-kazanim-analizi.csv');notify('Toplu anonim kazanım raporu kaydedildi.');break;}
 case 'printGroup':{const group=aggregateAssessments(state.exam,state.assessments);if(!state.approved||reviewExam(state.exam).errorCount||!group.compatible){notify('Onaylı sınav ve uyumlu anonim oturumlar gerekli.');break;}
  const page=window.open('','_blank');if(!page){notify('Tarayıcı açılır pencereyi engelledi.');break;}
  page.document.open();page.document.write(groupPrintable(state.exam,state.assessments));page.document.close();page.focus();setTimeout(()=>page.print(),200);break;}
 case 'importEvaluation':document.getElementById('evaluationFileInput')?.click();break;
 case 'reset':if(window.confirm('Mevcut taslak yerine örnek sınav yüklensin mi?')){state.exam=createDemo();state.step='general';state.editing=0;changed();render();notify('Örnek sınav yeniden yüklendi.');}break;
 case 'print':printExam();break;
 case 'word':exportWord();break;
 case 'saveJson':download(JSON.stringify(state.exam,null,2),'application/json',slugify(state.exam.title)+'.json');notify('JSON taslağı kaydedildi.');break;
 case 'saveProject':download(JSON.stringify(projectBackup(state.exam,state.objectives),null,2),'application/json',slugify(state.exam.title)+'-proje-yedegi.json');notify('Sınav ve kazanımları içeren anonim proje yedeği hazır.');break;
 case 'importObjectives':document.getElementById('objectivesFileInput')?.click();break;
 case 'exportObjectives':download(objectivesCsv(state.objectives),'text/csv;charset=utf-8','bep-ozel-kazanimlar.csv');notify('Eklediğiniz kazanımlar CSV olarak kaydedildi.');break;
 case 'templateObjectives':download(objectivesTemplate(),'text/csv;charset=utf-8','bep-kazanim-sablonu.csv');break;
 case 'reviewJson':download(JSON.stringify({examTitle:state.exam.title,created:new Date().toISOString(),review:reviewExam(state.exam),disclaimer:'Otomatik biçimsel rapor; pedagojik uygunluk öğretmene aittir.'},null,2),'application/json',slugify(state.exam.title)+'-kalite-raporu.json');break;
 case 'reviewQuestion':{const current=q[i];if(current?.provenance?.kind==='local-template'){current.provenance.reviewed=true;changed();render();notify('Soru yeniden gözden geçirildi olarak işaretlendi.');}break;}
 case 'loadJson':document.getElementById('jsonFileInput')?.click();break;
 }
}
root.addEventListener('click',ev=>{const b=findEl(ev.target,'[data-action]');if(b&&!b.disabled)clickAction(b);});
function unreview(q){if(q?.provenance?.kind==='local-template')q.provenance.reviewed=false;}
function fieldChanged(el){const e=state.exam;
 if(el.dataset.examField){const key=el.dataset.examField;e[key]=key==='duration'?Math.max(1,Math.min(300,Number(el.value)||1)):el.value;if(key==='subject'||key==='grade'){state.proposal=null;state.proposalChecked=false;state.selectedObjective='';}changed();}
 else if(el.dataset.adaptation){const key=el.dataset.adaptation;e.adaptations[key]=el.type==='checkbox'?el.checked:key==='fontSize'||key==='lineSpacing'?Number(el.value):el.value;changed();}
 else if(el.dataset.qField){const q=e.questions[Number(el.dataset.qIndex)];q[el.dataset.qField]=['points','numberLineStart','numberLineEnd'].includes(el.dataset.qField)?Number(el.value):el.value;unreview(q);changed();}
 else if(el.dataset.optionIndex!==undefined){const q=e.questions[Number(el.dataset.qIndex)],index=Number(el.dataset.optionIndex),old=q.options[index];q.options[index]=el.value;if(q.answer===old)q.answer=el.value;unreview(q);changed();}
 else if(el.dataset.answerOption!==undefined){const q=e.questions[Number(el.dataset.qIndex)];q.answer=q.options[Number(el.dataset.answerOption)];unreview(q);changed();}
 else if(el.dataset.visualDot){const q=e.questions[Number(el.dataset.qIndex)];if(!q.visualDots)q.visualDots={groupA:0,groupB:0};q.visualDots[el.dataset.visualDot]=Math.max(0,Math.min(12,Math.round(Number(el.value)||0)));unreview(q);changed();}
 else if(el.dataset.pairField){const q=e.questions[Number(el.dataset.qIndex)];q.pairs[Number(el.dataset.pairIndex)][el.dataset.pairField]=el.value;unreview(q);changed();}
 else if(el.id==='approval'){state.approved=el.checked;render();}
}
root.addEventListener('input',ev=>{const el=ev.target;
 if(el.dataset.rubricDraft){state.rubricDraft[el.dataset.rubricDraft]=el.value;return;}
 if(el.dataset.criterionIndex!==undefined){const i=Number(el.dataset.criterionIndex),c=state.rubricDraft.criteria[i];if(c){c[el.dataset.criterionField]=el.dataset.criterionField==='weight'?Number(el.value):el.value;const sum=state.rubricDraft.criteria.reduce((n,x)=>n+(Number(x.weight)||0),0),node=document.getElementById('rubricWeightTotal');if(node){node.textContent='Toplam: %'+sum;node.className=sum===100?'weight-good':'weight-bad';}}return;}
 if(el.id==='objectiveSearch'){const pos=el.selectionStart??el.value.length;state.objectiveTerm=el.value;const node=document.querySelector('.objective-list');const next=findObjectives({subject:state.exam.subject,grade:state.exam.grade,term:state.objectiveTerm},allObjectives());if(node)node.innerHTML=next.length?next.map(o=>`<label class="objective-option"><input type="radio" name="objectiveLibrary" value="${safe(o.id)}" ${state.selectedObjective===o.id?'checked':''}/><span><strong>${safe(o.title)}</strong><small>${safe(o.description)}</small><em>${safe(o.id)} · ${safe(o.domain)} · ${safe(o.source)}</em></span></label>`).join(''):'<div class="empty-library">Eşleşme bulunamadı.</div>';return;}
 if(el.matches('[data-exam-field],[data-q-field],[data-option-index],[data-pair-field],[data-visual-dot]'))fieldChanged(el);});
root.addEventListener('change',async ev=>{
 const el=ev.target;
 if(el.id==='institutionRole'){if(Object.hasOwn(ROLE_LABELS,el.value))state.institutionRole=el.value;render();return;}
 if(el.matches('[data-rubric-template-index]')){const a=activeAssessment(),i=Number(el.dataset.rubricTemplateIndex),q=state.exam.questions[i];if(!a||!isCompatible(state.exam,a)||!q){render();return;}const value=el.value,t=state.rubricTemplates.find(t=>t.id===value);if(value&&(!t||t.questionType!==q.type)&&a.entries[i].rubricTemplate?.id!==value){notify('Rubrik bu soru türüyle uyumsuz.');render();return;}a.entries[i].rubricTemplate=value?(t?JSON.parse(JSON.stringify(t)):a.entries[i].rubricTemplate):null;a.entries[i].rubricRatings={};a.entries[i].pointsAwarded=null;rememberAssessments();render();notify('Rubrik değişti; yeni puanlama yapılmalıdır.');return;}
 if(el.id==='assessmentSelect'){state.activeAssessmentId=el.value;render();return;}
 if(el.matches('[data-rubric-index]')){
  const a=activeAssessment();if(!a||!isCompatible(state.exam,a)){notify('Uyumlu oturum gerekli.');render();return;}
  const i=Number(el.dataset.rubricIndex),entry=a.entries[i],q=state.exam.questions[i];if(!entry||!q||entry.scoringMode!=='rubric'){render();return;}
  if(!criteriaFor(q.type,entry.rubricTemplate).some(c=>c.id===el.dataset.rubricCriterion)){notify('Rubrik ölçütü geçersiz.');render();return;}
  const level=el.value===''?null:Number(el.value);
  if(level!==null&&(!Number.isInteger(level)||level<0||level>4)){render();return;}
  entry.rubricRatings={...(entry.rubricRatings||{}),[el.dataset.rubricCriterion]:level};
  entry.pointsAwarded=rubricPoints(q,entry.rubricRatings,entry.rubricTemplate);
  rememberAssessments();render();return;
 }
 if(el.matches('[data-eval-field],[data-eval-global]')){
  const a=activeAssessment();if(!a||!isCompatible(state.exam,a)){notify('Önce uyumlu değerlendirme oturumu seçin.');render();return;}
  if(el.dataset.evalGlobal){const max=el.dataset.evalGlobal==='code'?70:800;a[el.dataset.evalGlobal]=el.value.slice(0,max);}
  else{const i=Number(el.dataset.evalIndex),key=el.dataset.evalField,entry=a.entries[i],q=state.exam.questions[i];
   if(!entry||!q){render();return;}
   if(key==='scoringMode'){
    if(!['manual','rubric'].includes(el.value)){notify('Puanlama yöntemi geçersiz.');render();return;}
    if(entry.scoringMode!==el.value){entry.scoringMode=el.value;entry.rubricRatings={};entry.pointsAwarded=null;}
   }else if(key==='pointsAwarded'){
    if(entry.scoringMode==='rubric'){notify('Bu puan rubrik ölçütlerinden hesaplanır.');render();return;}
    const val=el.value.trim()===''?null:Number(el.value);
    if(val!==null&&(!Number.isFinite(val)||val<0||val>Number(q.points)||Math.round(val*100)!==val*100)){notify(`Soru ${i+1}: 0–${q.points} arasında en çok iki ondalıklı puan girin.`);render();return;}
    entry.pointsAwarded=val;
   }else if(key==='support'){if(!SUPPORT_OPTIONS.some(([v])=>v===el.value)){notify('Destek türü geçersiz.');render();return;}entry.support=el.value;}
   else if(key==='observation')entry.observation=el.value.slice(0,500);
  }
  rememberAssessments();render();return;
 }
 if(el.id==='templateLibraryFileInput'&&el.files?.length){try{if(el.files[0].size>512*1024)throw new Error('512 KB sınırı aşıldı.');const parsed=importLibraryJson(JSON.parse(await el.files[0].text()),normalizeExam);if(!window.confirm(`İçe aktarılan ${parsed.exams.length} sınav ve ${parsed.rubrics.length} rubrik şablonu mevcut kütüphanenin yerini alsın mı?`))return;state.examTemplates=parsed.exams;state.rubricTemplates=parsed.rubrics;rememberTemplateLibraries();render();notify('Şablon kütüphanesi içe aktarıldı.');}catch(err){notify('Şablon kütüphanesi açılamadı: '+err.message);}return;}
 if(el.id==='evaluationFileInput'&&el.files?.length){try{if(el.files[0].size>256*1024)throw new Error('Dosya 256 KB sınırını aşıyor.');const file=JSON.parse(await el.files[0].text());const a=normaliseAssessment(file,state.exam);state.assessments=state.assessments.filter(x=>x.id!==a.id);state.assessments.unshift(a);state.assessments=state.assessments.slice(0,20);state.activeAssessmentId=a.id;rememberAssessments();state.step='assessment';render();notify('Anonim değerlendirme kaydı açıldı.');}catch(err){notify('Kayıt açılamadı: '+err.message);}return;}
 if(el.name==='objectiveLibrary'){state.selectedObjective=el.value;render();return;}
 if(el.id==='proposalApproval'){state.proposalChecked=el.checked;const b=document.querySelector('[data-action="acceptProposal"]');if(b)b.disabled=!el.checked;return;}
 if(el.id==='proposalObjective'){state.selectedObjective=el.value;state.proposal=null;state.proposalChecked=false;render();return;}
 if(el.id==='proposalVariant'){state.proposalVariant=Number(el.value)||0;return;}
 if(el.id==='objectivesFileInput'&&el.files?.length){try{if(el.files[0].size>256*1024)throw new Error('256 KB sınırı aşıldı.');const file=el.files[0];const incoming=parseCatalog(await file.text(),file.name);state.objectives=mergeObjectives(state.objectives,incoming);rememberObjectives();state.selectedObjective='';render();notify(`${incoming.length} kazanım işlendi. Liste öğretmen tarafından doğrulanmalıdır.`);}catch(err){notify('Kazanım yüklenemedi: '+err.message);}return;}
 if(el.id==='jsonFileInput'&&el.files?.length){try{if(el.files[0].size>1024*1024)throw new Error('1 MB üzerinde dosya açılamaz.');const text=await el.files[0].text();const project=inspectProject(JSON.parse(text),normalizeExam,sanitizeObjectives);state.exam=project.exam;if(project.objectives!==null){state.objectives=project.objectives;rememberObjectives();}state.approved=false;state.editing=-1;state.step='general';remember();render();notify('Anonim sınav taslağı/proje yedeği içe aktarıldı.');}catch(err){notify('Dosya açılamadı: '+err.message);}return;}
 if(el.matches('[data-adaptation],[data-q-field], [data-answer-option], [data-visual-dot]')||el.id==='approval')fieldChanged(el);
});
render();
