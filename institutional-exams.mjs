/** Authenticated institutional exam editor. No sensitive learner data or browser persistence. */
import {makeDeliveryVersion} from './presentation-profiles.mjs';
import {verifyExamDownload} from './exam-download-verify.mjs';
import {deliverySelection,sameDeliverySelection,assertDeliveryReady,deliveryReceipt,deliveryProfileLabel} from './exam-delivery-ux.mjs';
import {prepareQuestionPreview} from './question-preview.mjs';
import {VISUAL_MATERIALS,findVisualMaterials,visualMaterial,visualMaterialMarkup,applyVisualMaterial} from './visual-materials.mjs';
import {createAutosaveManager} from './autosave-manager.mjs';
import {createExamSelection} from './exam-selection.mjs';
import {assertApprovalReady,submitExamApproval} from './exam-approval-transition.mjs';
import {makeRecoveryDocument,parseRecoveryDocument} from './draft-recovery.mjs';
import {createQuestionFrame} from './question-frames.mjs';
import {GUIDED_PATTERNS,guidedPattern,createGuidedQuestion} from './guided-questions.mjs';
import {parseCatalog,objectivesTemplate} from './catalog.mjs';
import {catalogImportRows,filterCatalogEntries} from './catalog-workflow.mjs';
import {REVIEW_CRITERIA,goalFingerprint,questionFingerprint,hasAlternative,confirmGoal,confirmQuestion,worksheetCsv,reviewWorksheet} from './pedagogy-review.mjs';
import {VERSION, DEFAULT_ADAPTATIONS, starterQuestion, normalizeExam, generateDocx, printableHtml, slugify, escapeHtml} from './core.mjs';
import {reviewExam} from './quality.mjs';
import {getExamPreflight,preflightCsv} from './exam-preflight.mjs';
import {questionDraftGuidance} from './question-draft-guidance.mjs';
import {workflowNextAction} from './workflow-next-action.mjs';
import {buildGoalCoverage,goalCoverageCsv} from './goal-coverage.mjs';
import {questionAccess,objectiveCoverage} from './question-access.mjs';
import {variantComparison,inspectQuestionVariant,PRESENTATION_MODES} from './presentation-variants.mjs';
import {auditAudioAccess,generateAccessibleExamHtml} from './accessible-player.mjs';
import {NEED_AREAS,DOMAINS,SUPPORTS,recommendSupports,applySupportPlan,normalizeSupportPlan} from './support-plan.mjs';
const $=id=>document.getElementById(id), esc=escapeHtml;
const state={actor:null,csrf:null,exams:[],current:null,exam:null,dirty:false,busy:false,approvalHistory:null,mp3Available:false,needArea:'',supportDraft:[],domainDraft:'general'};
const has=p=>({admin:['exam.view','exam.edit','exam.approve','exam.export'],coordinator:['exam.view','exam.edit','exam.approve','exam.export'],teacher:['exam.view','exam.edit','exam.approve','exam.export'],reviewer:['exam.view','exam.approve'],observer:['exam.view']}[state.actor?.role]||[]).includes(p);
let previewIndex=0;
function renderTeacherQuestionPreview(){
 const exam=state.exam,selector=$('exam-preview-question'),profile=$('exam-preview-profile');if(!exam||!selector||!profile)return;
 const previousIndex=Number.isInteger(previewIndex)?previewIndex:0;
 previewIndex=Math.max(0,Math.min(previousIndex,(exam.questions?.length||1)-1));
 selector.innerHTML=(exam.questions||[]).map((q,i)=>`<option value="${i}">${i+1}. soru · ${esc(String(q.prompt||'').slice(0,55)||'Boş soru')}</option>`).join('');
 selector.value=String(previewIndex);
 const sheet=$('exam-preview-paper'),comparison=$('exam-preview-comparison'),issues=$('exam-preview-issues'),summary=$('exam-preview-summary');
 if(!exam.questions?.length){sheet.textContent='Henüz soru eklenmedi.';comparison.textContent='';issues.textContent='';summary.textContent='Önizlenecek soru yok.';return;}
 try{
  const snapshot=prepareQuestionPreview(exam,previewIndex,profile.value||'standard');
  sheet.className='teacher-preview-paper paper'+(snapshot.highContrast?' paper-highcontrast':'');
  sheet.style.setProperty('--paper-font',snapshot.fontSize+'pt');sheet.style.setProperty('--paper-leading',String(snapshot.lineSpacing));
  sheet.innerHTML=snapshot.questionMarkup;
  comparison.innerHTML=`<strong>Özgün soru</strong><p>${esc(snapshot.original)||'<em>Boş</em>'}</p><strong>Öğretmenin sadeleştirilmiş metni</strong><p>${esc(snapshot.alternative)||'<em>Yazılmadı</em>'}</p><strong>Öğrenciye seçilen metin</strong><p>${esc(snapshot.active)||'<em>Boş</em>'}</p>`;
  issues.innerHTML=snapshot.problems.length?`<h5>Öğretmen kontrolleri (${snapshot.problems.length})</h5><ul>${snapshot.problems.map(x=>`<li class="${x.level==='error'?'preview-error':'preview-warning'}">${esc(x.text)}</li>`).join('')}</ul>`:'<p>Otomatik önizleme kontrollerinde bulgu yok. Bu, pedagojik onay anlamına gelmez.</p>';
  summary.textContent=`${snapshot.number}. soru · ${snapshot.label} · ${snapshot.fontSize} punto · ${snapshot.problems.length} kontrol bulgusu · Geçici öğretmen önizlemesi`;
 }catch(err){sheet.textContent='Önizleme oluşturulamadı.';comparison.textContent='';issues.textContent='';summary.textContent=err.message;}
}
$('exam-preview-question').addEventListener('change',event=>{previewIndex=Number(event.target.value)||0;renderTeacherQuestionPreview();});
$('exam-preview-profile').addEventListener('change',renderTeacherQuestionPreview);
const newExam=()=>({version:VERSION,title:'Yeni üniversite sınavı',subject:'',grade:'Önlisans / Lisans',duration:30,profile:'',objective:'',instruction:'Soruları dikkatle okuyunuz.',adaptations:{...DEFAULT_ADAPTATIONS, institutionalHeader:true},reviewPolicy:'guided',bepGoals:[],goalAttestations:[],supportPlan:{version:1,domain:'general',selected:[]},questions:[{...starterQuestion('choice'),prompt:'',options:['',''],answer:''}]});
function notice(message,isError=false){$('exam-notice').className=isError?'portal-error':'portal-success';$('exam-notice').textContent=message;}
async function api(path,{method='GET',body}={}){
 const resp=await fetch('/api'+path,{method,credentials:'same-origin',headers:{...(body?{'Content-Type':'application/json'}:{}),...(state.csrf?{'X-CSRF-Token':state.csrf}:{})},body:body?JSON.stringify(body):undefined});
 let result;try{result=await resp.json();}catch{throw Error('Beklenmeyen sunucu yanıtı.');}
 if(!resp.ok)throw Object.assign(Error(result.message||result.error||'İstek tamamlanamadı'),{status:resp.status,code:result.error});return result;
}
function showAutosave(kind,detail){
 const el=$('exam-autosave-state'),recovery=$('exam-autosave-recovery');if(!el)return;
 const labels={new:'Yeni taslak · İlk düzenlemeden sonra otomatik kaydedilecek',idle:'',pending:'Kaydedilmemiş değişiklik var · Otomatik kayıt bekleniyor',saving:'Sunucuya kaydediliyor…',saved:'Tüm değişiklikler sunucuya kaydedildi',conflict:'ÇAKIŞMA: Başka sekmede daha yeni sürüm var. Yerel düzenlemeleriniz korunuyor.',error:'KAYIT BAŞARISIZ: Ağ/oturum kontrolü gerekli. Metin bu sekmede duruyor.'};
 el.textContent=labels[kind]||labels.idle;el.dataset.state=kind;
 recovery.hidden=kind!=='conflict'&&kind!=='error';
 const ribbon=$('workflow-save-state');if(ribbon)ribbon.textContent={new:'Yeni taslak',pending:'Otomatik kayıt bekliyor',saving:'Kaydediliyor',saved:'Sunucuda kayıtlı',conflict:'Sürüm çakışması',error:'Kayıt başarısız'}[kind]||'Sunucuda kayıtlı';
 if(kind==='saved'&&!autosave.hasChanges()){
  state.dirty=false;
  $('exam-status').textContent=state.current?.status==='approved'?'ONAYLI':'TASLAK';
  $('exam-version').textContent=`Sürüm ${state.current?.revision||'?'} · Sunucuda kayıtlı · Onay ayrıca gerekir`;
  $('exam-confirm').checked=false;
  $('exam-save').disabled=!has('exam.edit');
  $('exam-approve').disabled=true;
  renderPreflight();
 }
 if(kind==='conflict'||kind==='error'){$('exam-status').textContent=kind==='conflict'?'ÇAKIŞMA':'KAYIT HATASI';$('exam-version').textContent=detail?.message||'Düzenlemeler mevcut sekmede korunuyor.';}
}
const autosave=createAutosaveManager({
 getDraft:()=>({id:state.current?.id||null,revision:state.current?.revision||null,exam:normalizeExam(state.exam)}),
 persist:async (snapshot,{isCurrent})=>{
  const result=snapshot.id?await api('/exams/'+snapshot.id,{method:'PUT',body:{revision:snapshot.revision,exam:snapshot.exam}}):await api('/exams',{method:'POST',body:{exam:snapshot.exam}});
  // Late responses belong only to the draft they were sent for.
  if(isCurrent()){state.current=result.item;state.approvalHistory=null;refreshList().catch(()=>{});}
  return result.item;
 },
 onEvent:(kind,detail)=>{if(kind!=='idle')showAutosave(kind,detail);},delayMs:2400
});
const examSelection=createExamSelection({
 fetchExam:id=>api('/exams/'+id),
 applyExam:async r=>{
  autosave.reset();state.approvalHistory=null;state.current=r.item;state.exam=normalizeExam(r.item.exam);
  state.needArea='';state.supportDraft=[...(state.exam.supportPlan?.selected||[])];
  state.domainDraft=state.exam.supportPlan?.domain||'general';state.dirty=false;
  $('exam-confirm').checked=false;$('exam-questions').dispatchEvent(new Event('exam-question-reset'));draw();showAutosave('saved');await loadHistory();
 }
});
function draft(){examSelection.invalidate();previewIndex=0;autosave.reset();state.current=null;state.approvalHistory=null;state.exam=newExam();state.needArea='';state.supportDraft=[];state.domainDraft='general';state.dirty=false;$('exam-confirm').checked=false;$('exam-questions').dispatchEvent(new Event('exam-question-reset'));draw();showAutosave('new');}
const field=(key,label,value,tag='input',extra='')=>`<label>${esc(label)}${tag==='textarea'?`<textarea data-field="${key}" rows="${extra||3}">${esc(value)}</textarea>`:`<input data-field="${key}" value="${esc(value)}" ${extra}>`}</label>`;
function qualityQuestionTarget(message){
 const match=/^(\d+)\.\s*soru\s*:/iu.exec(String(message||''));
 if(!match)return null;
 const index=Number(match[1])-1;
 return Number.isSafeInteger(index)&&index>=0&&index<(state.exam?.questions?.length||0)?index:null;
}
function updateQuestionDraftGuidance(){
 if(!state.exam)return;
 const summary=questionDraftGuidance(state.exam),button=$('exam-draft-guidance-go');
 if(!button)return;
 $('exam-draft-guidance-count').textContent=summary.total+' soru · '+summary.incomplete+' zorunlu alan eksik · '+summary.review+' ek inceleme gerekli · '+summary.basicComplete+' temel kontrolü tamam.';
 const next=summary.next;
 button.disabled=!next;
 button.dataset.questionIndex=next?String(next.index):'';
 button.dataset.questionField=next?next.focus:'';
 button.textContent=!next?'Temel alanlar incelendi':next.state==='incomplete'?'İlk eksik soruya git':'İlk incelenecek soruya git';
 const problem=next?.issues.find(i=>i.level==='error')||next?.issues[0];
 $('exam-draft-guidance-detail').textContent=next
  ?'Soru '+next.number+': '+(problem?.text.replace(/^\d+\.\s*soru\s*:\s*/iu,'')||'Temel alanı kontrol edin.')+' Bu rehber taslağı değiştirmez.'
  :'Temel alan uyarısı bulunmadı. Son kontrol, BEP kazanımı ve kurumsal onay ayrıca gereklidir.';
}
$('exam-draft-guidance-go').addEventListener('click',()=>{
 if(!state.exam)return;
 const next=questionDraftGuidance(state.exam).next;
 if(!next)return;
 const stage=document.querySelector('.workflow-nav [data-workflow-target="exam-question-section"]');
 if(stage&&$('exam-editor-card').classList.contains('exam-guided-view'))stage.click();
 const card=$('exam-questions').querySelector('.exam-question[data-qindex="'+next.index+'"]');
 if(!card)return;
 let target=next.focus==='source'?card.querySelector('[data-source-review]'):
  card.querySelector('[data-qkey="'+next.focus+'"]');
 target ||=card.querySelector('[data-qkey="prompt"]')||card;
 for(let parent=target.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
 card.scrollIntoView({behavior:'auto',block:'center'});
 if(!target.matches('input,select,textarea,button'))target.setAttribute('tabindex','-1');
 target.focus({preventScroll:true});
});
function renderQuality(x){
 const report=reviewExam(x),issues=report.issues;
 $('exam-quality').innerHTML=`<strong>Kalite denetimi: ${report.errorCount} hata · ${report.warningCount} uyarı</strong>${issues.slice(0,9).map(q=>{
  const index=qualityQuestionTarget(q.text);
  return `<div class="exam-issue ${q.level}"><p>${esc(q.level==='error'?'Hata':'Uyarı')}: ${esc(q.text)}</p>${index===null?'':`<button type="button" class="portal-btn secondary" data-quality-question="${index}" aria-label="${index+1}. soruyu düzenlemeye git">Soru ${index+1}'e git</button>`}</div>`;
 }).join('')||'<p>Biçimsel hata yok. Pedagojik uygunluğu öğretmen değerlendirir.</p>'}`;
 const audioIssues=auditAudioAccess(x);if(audioIssues.length)$('exam-quality').insertAdjacentHTML('beforeend','<p><b>Sesli sınav için ek kontrol:</b></p>'+audioIssues.map(a=>'<p class="exam-issue error">'+esc(a.text)+'</p>').join(''));
 return report;
}
// Quality findings are presentation-only links. The authoritative audit and
// approval gates remain unchanged; never infer a question from unnumbered text.
$('exam-quality').addEventListener('click',event=>{
 const button=event.target.closest('[data-quality-question]');
 if(!button||!$('exam-quality').contains(button))return;
 const index=Number(button.dataset.qualityQuestion);
 if(!Number.isSafeInteger(index)||index<0||index>=state.exam.questions.length)return;
 const stageButton=document.querySelector('.workflow-nav [data-workflow-target="exam-question-section"]');
 if(stageButton&&$('exam-editor-card').classList.contains('exam-guided-view'))stageButton.click();
 const card=$('exam-questions').querySelector('.exam-question[data-qindex="'+index+'"]');
 if(!card)return;
 const message=button.closest('.exam-issue')?.querySelector('p')?.textContent||'';
 const fieldKey=/puan/i.test(message)?'points':/kazanım/i.test(message)?'objective':/seçenek|şık/i.test(message)?'options':/yanıt|cevap|işlem/i.test(message)?'answer':/sade yönerge|alternatif metin/i.test(message)?'simplifiedPrompt':'prompt';
 const field=card.querySelector('[data-qkey="'+fieldKey+'"]');
 if(field?.closest('details'))field.closest('details').open=true;
 const focusTarget=field||card.querySelector('.exam-q-head strong')||card;
 focusTarget.scrollIntoView({block:'center',behavior:'auto'});
 if(!focusTarget.matches('input,textarea,select,button'))focusTarget.setAttribute('tabindex','-1');
 focusTarget.focus({preventScroll:true});
});
function renderPreflight(){
 const x=state.exam;if(!x)return;
 const report=getExamPreflight(x,{saved:!!state.current,dirty:state.dirty,approved:state.current?.status==='approved'});
 const body=$('exam-preflight-body');if(!body)return;
 const guidance=workflowNextAction(report,{
  canEdit:has('exam.edit'),canApprove:has('exam.approve'),canExport:has('exam.export'),
  saved:!!state.current,dirty:state.dirty,approved:state.current?.status==='approved'
 });
 const nav=$('workflow-next-action');
 if(nav){
  $('workflow-readiness-count').textContent=guidance.complete+' / '+guidance.total;
  $('workflow-next-action-heading').textContent=guidance.title;
  $('workflow-next-action-detail').textContent=guidance.detail;
  nav.dataset.readiness=guidance.state;
  const action=$('workflow-next-action-open');
  action.textContent=guidance.button;
  action.dataset.preflightJump=guidance.target;
  action.disabled=false;
  const labels={done:'Tamamlandı',pending:'Kontrol gerekli',optional:'İsteğe bağlı'};
  document.querySelectorAll('.workflow-nav [data-workflow-target]').forEach((step,index)=>{
   const status=guidance.stepStates[index]||'pending';
   const label=labels[status];
   step.dataset.readiness=status;
   step.dataset.readinessLabel=label;
   step.setAttribute('aria-label',step.textContent.replace(/\s+/g,' ').trim()+' · '+label);
  });
 }
 const nextStage=report.stages.find(step=>!step.done);
 const nextAction=nextStage
  ?`<div class="preflight-next-action"><div><span class="portal-mini-label">SIRADAKİ ADIM</span><strong>${esc(nextStage.title)}</strong><p>${esc(nextStage.detail)}</p></div><button type="button" class="portal-btn primary" data-preflight-jump="${nextStage.target}">Bu aşamayı aç</button></div>`
  :'<div class="preflight-next-action preflight-all-checked"><strong>Hazırlık aşamaları tamamlandı.</strong><p>Son sürümün incelenmesi ve kurum onayı yetkili onaylayıcının sorumluluğundadır.</p></div>';
 body.innerHTML=`${nextAction}<div class="preflight-count"><strong>${report.complete}/${report.total} aşama</strong><span>${report.errors} engelleyici kontrol · ${report.warnings} uyarı</span></div><div class="preflight-progress" aria-label="Tamamlanan iş akışı aşamaları: ${report.complete} / ${report.total}"><span style="width:${report.complete/report.total*100}%"></span></div><div class="preflight-grid">${report.stages.map((step,index)=>`<div class="preflight-tile ${step.done?'preflight-done':'preflight-pending'}"><span class="preflight-n">${String(index+1).padStart(2,'0')} · ${step.done?'Aşama tamamlandı':'İnceleme gerekli'}</span><strong>${esc(step.title)}</strong><p>${esc(step.detail)}</p><button type="button" class="portal-btn secondary" data-preflight-jump="${step.target}">Bu adıma git</button></div>`).join('')}</div><p class="portal-help">${esc(report.notice)} Uyarılar öğretmen tarafından ayrıca incelenmelidir.</p>${report.approvalConflict?'<p class="exam-issue warning" role="status"><strong>Onay ile hazırlık durumu farklı:</strong> Kayıt onaylı görünse de en az bir önceki adım eksik. Bu ekran onayı iptal etmez; yetkili kontrolü gerekir.</p>':''}`;
}
function visitPreflightTarget(id){
 if(!['exam-main-fields','exam-goal-section','exam-question-section','exam-quality','exam-output-section'].includes(id))return;
 const target=document.getElementById(id);if(!target)return;
 // Quality lives in wizard stage 4. First reveal its stage, then any details.
 const stageId=id==='exam-quality'?'exam-question-section':id;
 const stageButton=document.querySelector('.workflow-nav [data-workflow-target="'+stageId+'"]');
 if(stageButton&&document.getElementById('exam-editor-card')?.classList.contains('exam-guided-view')){
  stageButton.click();
 }
 for(let parent=target.parentElement;parent;parent=parent.parentElement){
  if(parent.tagName==='DETAILS')parent.open=true;
 }
 target.scrollIntoView({behavior:'auto',block:'start'});
 const focusTarget=target.querySelector('h2,h3,h4')||target;
 focusTarget.setAttribute('tabindex','-1');
 focusTarget.focus({preventScroll:true});
}
$('exam-preflight-body').addEventListener('click',event=>{
 const btn=event.target.closest('[data-preflight-jump]');
 if(btn)visitPreflightTarget(btn.dataset.preflightJump);
});
$('workflow-next-action-open').addEventListener('click',event=>{
 visitPreflightTarget(event.currentTarget.dataset.preflightJump);
});
$('exam-preflight-export').addEventListener('click',()=>{
 if(!state.exam)return;
 const csv=preflightCsv(getExamPreflight(state.exam,{saved:!!state.current,dirty:state.dirty,approved:state.current?.status==='approved'}));
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='anonim-sinav-hazirlik-kontrolu.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
 notice('Öğretmen hazırlık aşamaları indirildi. İçerik ve kişisel bilgi içermez.');
});
// v2.10 read-only BEP coverage workbench; changes require explicit teacher selection and confirmation.
const goalStatusLabels={covered:'Bağlı · hedef doğrulandı',review:'Hedef doğrulaması gerekli',uncovered:'Soru bağlanmamış',mismatched:'Bağlantı tutarsız'};
const questionStatusLabels={linked:'Bağlı',unlinked:'Bağlantı seçilmedi', 'unknown-goal':'Geçersiz hedef kodu',mismatched:'Kazanım metni hedefle uyuşmuyor'};
function renderGoalMatrix(){
 const exam=state.exam;if(!exam)return;
 const report=buildGoalCoverage(exam),summary=$('exam-goal-matrix-summary'),body=$('exam-goal-matrix-body');
 if(!summary||!body)return;
 summary.textContent=`${report.totalGoals} hedef · ${report.totalQuestions} soru · ${report.linked} doğru bağlı soru · ${report.orphaned} inceleme gerekli soru · ${report.uncovered} kapsanmayan hedef · ${report.verified} güncel hedef doğrulaması`;
 const filter=$('exam-goal-matrix-filter')?.value||'all';
 const keepEditorOpen=body.querySelector('.matrix-question-details')?.open===true;
 const goals=new Map((exam.bepGoals||[]).map(g=>[g.id,g]));
 const shown=report.rows.filter(row=>filter==='all'||row.status===filter);
 const goalRows=shown.length?shown.map(row=>{
  const goal=goals.get(row.id),status=goalStatusLabels[row.status]||'İnceleme gerekli';
  return `<tr><th scope="row"><strong>${esc(row.id)}</strong><small>${row.level==='long'?'Uzun dönemli':'Kısa dönemli'} · ${esc(goal?.text||'')}</small></th><td><span class="matrix-status matrix-${row.status}">${esc(status)}</span></td><td>${row.validQuestionNumbers.length?row.validQuestionNumbers.map(n=>`<button type="button" class="matrix-jump" data-matrix-jump="${n-1}" aria-label="Soru ${n} alanına git">${n}</button>`).join(' '):'—'}<small>${row.questionCount} geçerli / ${row.questionNumbers.length} bağlantı</small></td><td>${row.points} p.</td></tr>`;
 }).join(''):'<tr><td colspan="4">Bu filtrede hedef yok.</td></tr>';
 const qRows=report.questionRows.map(q=>{
  const source=exam.questions[q.number-1]||{};
  const choices=(exam.bepGoals||[]).map(g=>`<option value="${esc(g.id)}" ${g.id===q.goalId?'selected':''}>${esc(g.id)} · ${esc(String(g.text||'').slice(0,95))}</option>`).join('');
  const unknown=q.goalId&&!goals.has(q.goalId)?'<option value="__invalid__" selected disabled>Geçersiz hedef bağlantısı</option>':'';
  const hint=q.suggestions.length===1?' · Kazanım metni bir hedefle aynı; öğretmen seçimi gerekli.':q.suggestions.length>1?' · Birden fazla olası hedef var; öğretmen seçimi gerekli.':'';
  return `<div class="matrix-question"><div class="matrix-question-meta"><strong>Soru ${q.number}</strong><span class="matrix-status ${q.status==='linked'?'matrix-covered':'matrix-mismatched'}">${esc(questionStatusLabels[q.status])}</span><small>${esc(String(source.prompt||'Henüz soru yazılmadı').slice(0,95))}${esc(hint)}</small></div><label class="exam-label">BEP hedefi <select data-matrix-link="${q.number-1}" aria-label="Soru ${q.number} için BEP hedefi" ${!has('exam.edit')||state.busy?'disabled':''}><option value="" ${!q.goalId?'selected':''}>Hedef seçilmedi</option>${unknown}${choices}</select></label><button type="button" class="matrix-jump" data-matrix-jump="${q.number-1}">Soruyu aç</button></div>`;
 }).join('');
 body.innerHTML=`<div class="matrix-table-scroll"><table class="goal-matrix-table"><thead><tr><th scope="col">BEP hedefi</th><th scope="col">Durum</th><th scope="col">Sorular</th><th scope="col">Puan</th></tr></thead><tbody>${goalRows}</tbody></table></div><details class="matrix-question-details"><summary>Soru–hedef bağlantılarını düzenle (${report.totalQuestions} soru)</summary><p class="portal-help">Yalnızca öğretmen seçimiyle bağlantı kurulur. Hedef seçmek sorunun kazanım metnini o hedefle eşitler; sorunun metni, cevabı ve puanı değişmez. Sonrasında sınav yeniden kaydedilir ve onay gerekir.</p>${qRows||'<p class="portal-help">Henüz soru yok.</p>'}</details>`;
 if(keepEditorOpen)body.querySelector('.matrix-question-details').open=true;
}
$('exam-goal-matrix-filter').addEventListener('change',renderGoalMatrix);
$('exam-goal-matrix-body').addEventListener('click',event=>{
 const btn=event.target.closest('[data-matrix-jump]');if(!btn)return;
 const index=Number(btn.dataset.matrixJump);
 if(!Number.isSafeInteger(index)||index<0||index>=state.exam.questions.length)return;
 const card=$('exam-questions').querySelector(`.exam-question[data-qindex="${index}"]`);
 card?.scrollIntoView({behavior:'smooth',block:'center'});
 card?.querySelector('[data-qkey="objective"]')?.focus({preventScroll:true});
});
$('exam-goal-matrix-body').addEventListener('change',event=>{
 const select=event.target.closest('[data-matrix-link]');if(!select||!has('exam.edit')||state.busy)return;
 const index=Number(select.dataset.matrixLink),question=state.exam?.questions[index];
 if(!question||!Number.isSafeInteger(index))return;
 const goal=state.exam.bepGoals.find(g=>g.id===select.value),nextId=goal?.id||'';
 if(question.goalId===nextId){renderGoalMatrix();return;}
 const message=goal?`Soru ${index+1}, ${goal.id} hedefine bağlansın mı? Sorunun kazanım metni seçilen hedefle değişecek; soru, cevap ve puanı aynı kalacak. Önceki sınav onayı geçersiz olacak.`:`Soru ${index+1} hedef bağlantısı kaldırılacak. Soru kazanım metni korunacak, sınav yeniden onay gerektirecek. Devam edilsin mi?`;
 if(!window.confirm(message)){renderGoalMatrix();return;}
 question.goalId=nextId;
 if(goal)question.objective=goal.text;
 // Prior alternative-text verification will fail safely due to questionFingerprint changes.
 touch();draw();notice(`Soru ${index+1} hedef bağlantısı güncellendi. Eşdeğerlik ve doğru cevabı yeniden inceleyin.`);
});
$('exam-goal-matrix-export').addEventListener('click',()=>{
 if(!state.exam)return;
 const csv=goalCoverageCsv(buildGoalCoverage(state.exam));
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='anonim-bep-hedef-soru-kapsami.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1600);
 notice('Yalnızca hedef kodları, soru sıra numaraları, eşleme durumları ve sayısal toplamlar indirildi. Metin ve yanıtlar dışa aktarılmadı.');
});
function drawHistory(){
 const target=$('exam-history');if(!target)return;
 const history=state.approvalHistory;
 if(!state.current){target.textContent='Yeni taslak henüz onay geçmişi içermez.';return;}
 if(!history){target.textContent='Onay geçmişi yükleniyor…';return;}
 if(!history.records.length){target.textContent='Bu sınav için v2.1 kayıtlı onay geçmişi yok. Eski sürüm onayları geriye dönük oluşturulmaz.';return;}
 target.innerHTML=history.records.slice(0,15).map(r=>`<div class="exam-approval-entry"><strong>Sürüm ${r.revision}${r.current?' · Geçerli onay':''}</strong> <span>${esc(new Date(r.approvedAt).toLocaleString('tr-TR'))} · SHA-256: ${esc(r.contentHash.slice(0,12))}…</span></div>`).join('');
}
async function loadHistory(){
 const examId=state.current?.id,revision=state.current?.revision;
 if(!examId){state.approvalHistory=null;drawHistory();return;}
 try{const {history}=await api('/exams/'+examId+'/approval-history');if(state.current?.id!==examId||state.current?.revision!==revision)return;state.approvalHistory=history;drawHistory();}
 catch(error){if(state.current?.id===examId&&state.current?.revision===revision){state.approvalHistory=null;$('exam-history').textContent='Onay geçmişi alınamadı: '+error.message;}}
}
function variantHtml(q,i,exam){
 const result=variantComparison(q,exam),issues=inspectQuestionVariant(q,exam,i);
 const choices=q.type==='choice'?(q.options||[]):q.type==='truefalse'?['Doğru','Yanlış']:[];
 const optionPreview=choices.length?`<p class="variant-options"><b>Ortak seçenekler:</b> ${choices.map((choice,j)=>`${String.fromCharCode(65+j)}) ${esc(choice)}`).join(' · ')}</p>`:'';
 const visualPreview=(exam.adaptations?.visualCues&&String(q.visualAltText||'').trim())?`<p class="variant-options"><b>Görsel betimleme:</b> ${esc(q.visualAltText)}</p>`:'';
 return `<div class="variant-duo"><div class="variant-cell"><span>ÖZGÜN METİN</span><p>${esc(result.original||'Henüz yazılmadı')}</p></div><div class="variant-cell"><span>SADELEŞTİRİLMİŞ METİN</span><p>${esc(result.simplified||'Öğretmen henüz alternatif yazmadı')}</p></div></div>${optionPreview}${visualPreview}<p class="variant-active"><b>Öğrenciye gösterilecek:</b> ${esc(result.active||'—')}</p><p class="variant-warning" role="status">${issues.length?issues.map(v=>esc(v.text)).join(' · '):'Karşılaştırma otomatik pedagojik eşdeğerlik kararı vermez. Kazanımı ve doğru cevabı öğretmen kontrol eder.'}</p>`;
}
function reviewPanelHtml(q,i,exam){if(exam.reviewPolicy!=='guided'||!hasAlternative(q,exam))return '';
 const r=q.equivalenceReview||{},valid=Object.values(r.checks||{}).length===4&&Object.values(r.checks).every(Boolean)&&r.fingerprint===questionFingerprint(q,exam);
 return `<fieldset class="pedagogy-review" data-review-index="${i}"><legend>Soru ${i+1} · ölçme eşdeğerliği öğretmen kontrolü</legend><p class="portal-help">Bu işaretleme pedagojik geçerliliği otomatik kanıtlamaz. Soruyu veya genel sunumu değiştirirseniz onay yeniden istenir.</p>${Object.entries(REVIEW_CRITERIA).map(([key,label])=>`<label class="portal-check"><input type="checkbox" data-review-check="${key}" ${valid?'checked':''} ${!has('exam.edit')?'disabled':''}> ${esc(label)}</label>`).join('')}<button type="button" class="portal-btn secondary" data-review-confirm="${i}" ${!has('exam.edit')?'disabled':''}>Dört kontrolü öğretmen olarak onayla</button><p class="portal-help" role="status">${valid?'Kontrol bu soru sürümü için güncel.':'Kontrol eksik veya soru değişmiş; onay engellenir.'}</p></fieldset>`;
}
function goalPanelHtml(exam){if(exam.reviewPolicy!=='guided')return '<p class="portal-help">Bu eski sınavda v2.2 kapsamlı doğrulama politikası henüz etkin değil. Kaydı geriye dönük otomatik onaylamıyoruz.</p>';
 if(!(exam.bepGoals||[]).length)return '<p class="portal-help">BEP hedef bankası bu taslakta boş; hedefi içe aktarma ekranından ekleyebilirsiniz.</p>';
 return exam.bepGoals.map(g=>{const valid=(exam.goalAttestations||[]).some(x=>x.id===g.id&&x.fingerprint===goalFingerprint(g));return `<div class="goal-review"><strong>${esc(g.id)} · ${g.level==='long'?'Uzun dönemli':'Kısa dönemli'}</strong><p>${esc(g.text)}</p><button type="button" class="portal-btn secondary" data-goal-confirm="${esc(g.id)}" ${!has('exam.edit')?'disabled':''}>${valid?'✓ Hedef doğrulandı':'Hedefi öğretmen olarak doğrula'}</button></div>`;}).join('');}
function accessPanelHtml(q,i){const a=questionAccess(q);return `<section class="exam-access-workbench" aria-label="Soru ${i+1} erişilebilirlik kararları"><h4>Soruya özel erişilebilirlik desteği</h4><label class="exam-label">Ek yazılı yönerge (işitme / anlama desteği)<textarea rows="2" maxlength="280" data-access="writtenCue" data-qindex="${i}">${esc(a.writtenCue)}</textarea></label><label class="portal-check"><input type="checkbox" data-access="largeTargets" data-qindex="${i}" ${a.largeTargets?'checked':''}> Geniş seçim alanları (motor erişilebilirlik)</label><label class="portal-check"><input type="checkbox" data-access="audioAllowed" data-qindex="${i}" ${a.audioAllowed?'checked':''}> Uygulama içi sesli okumaya izin ver</label><small>Bir soru için sesli okumayı kapatmak MP3 tam sınav çıktısını da engeller; ekran okuyucuyu teknik olarak kapatmaz. Öğretmen, BEP hedefini ve ölçülen beceriyi kontrol etmelidir.</small></section>`;}
function refreshVariant(index){const q=state.exam?.questions?.[index],node=$('variant-comparison-'+index);if(q&&node){node.innerHTML=variantHtml(q,index,state.exam);const slot=$('review-slot-'+index);if(slot)slot.innerHTML=reviewPanelHtml(q,index,state.exam);}}
function updateGuidedPreview(){
 const pattern=guidedPattern($('exam-guided-pattern')?.value);
 const target=$('exam-guided-target')?.value||'__exam__';
 const goal=target==='__exam__'?null:(state.exam?.bepGoals||[]).find(g=>g.id===target);
 const objective=goal?.text??state.exam?.objective??'';
 const isValid=typeof objective==='string'&&objective.trim().length>=8&&objective.length<=400&&(target==='__exam__'||!!goal);
 const cap=!!state.exam&&state.exam.questions.length<100;
 $('exam-guided-add').disabled=!has('exam.edit')||state.busy||!pattern||!isValid||!cap;
 $('exam-guided-preview').textContent=!isValid
  ?'Önce 8–400 karakterlik bir genel BEP hedefi yazın veya kayıtlı bir kazanım seçin. Bağlantı otomatik oluşturulmaz.'
  :!cap?'En fazla 100 soru eklenebilir.'
  :`${pattern.category}: ${pattern.hint} İpucu: ${pattern.help}`;
}
function renderGuidedPanel(){
 const pattern=$('exam-guided-pattern'),target=$('exam-guided-target');if(!pattern||!target)return;
 const priorPattern=pattern.value,priorGoal=target.value;
 pattern.innerHTML=GUIDED_PATTERNS.map(p=>`<option value="${esc(p.id)}">${esc(p.label)}</option>`).join('');
 pattern.value=guidedPattern(priorPattern)?priorPattern:GUIDED_PATTERNS[0].id;
 const goals=state.exam?.bepGoals||[];
 target.innerHTML='<option value="__exam__">Sınavın genel BEP hedefi (bağımsız)</option>'+
 goals.map(g=>`<option value="${esc(g.id)}">${esc(g.id)} · ${esc(String(g.text).slice(0,110))}</option>`).join('');
 target.value=priorGoal==='__exam__'||goals.some(g=>g.id===priorGoal)?priorGoal:'__exam__';
 updateGuidedPreview();
}
$('exam-guided-pattern').addEventListener('change',updateGuidedPreview);
$('exam-guided-target').addEventListener('change',updateGuidedPreview);
$('exam-guided-add').addEventListener('click',()=>{
 if(!has('exam.edit')||state.busy||!state.exam||state.exam.questions.length>=100)return;
 const target=$('exam-guided-target').value;
 const goal=target==='__exam__'?null:(state.exam.bepGoals||[]).find(g=>g.id===target);
 if(target!=='__exam__'&&!goal)return notice('Seçilen kazanım artık bulunamıyor; yeniden seçin.',true);
 try{
  const q=createGuidedQuestion($('exam-guided-pattern').value,{objective:goal?.text??state.exam.objective,goalId:goal?.id??''});
  state.exam.questions.push(q);
  touch();draw();
  notice('Boş soru iskeleti eklendi. Soru metni, seçenekler, yanıt, görsel açıklama ve pedagojik uygunluğu öğretmen tamamlamalıdır.');
  const card=$('exam-questions').lastElementChild;
  card?.scrollIntoView({behavior:'smooth',block:'center'});
  card?.querySelector('[data-qkey="prompt"]')?.focus({preventScroll:true});
 }catch(error){notice(error.message,true);updateGuidedPreview();}
});

// v2.12: built-in geometric material gallery; no uploads, browser storage or external assets.
const materialState={id:'two-groups-dots',questionIndex:0,term:'',category:'all'};
function drawVisualMaterials(){
 const select=$('exam-material-question'),gallery=$('exam-material-gallery'),status=$('exam-material-status');
 if(!select||!gallery)return;
 const questions=state.exam?.questions||[];
 materialState.questionIndex=Math.max(0,Math.min(materialState.questionIndex,questions.length-1));
 select.innerHTML=questions.length?questions.map((q,i)=>`<option value="${i}">${i+1}. soru · ${esc(String(q.prompt||'Boş soru').slice(0,60))}</option>`).join(''):'<option value="">Sınavda soru bulunmuyor</option>';
 select.value=questions.length?String(materialState.questionIndex):'';
 const entries=findVisualMaterials({term:materialState.term,category:materialState.category});
 gallery.innerHTML=entries.length?entries.map(p=>`<button type="button" class="visual-material-card ${p.id===materialState.id?'selected':''}" data-material-id="${p.id}" aria-pressed="${p.id===materialState.id}" aria-label="${esc(p.label)} materyalini seç"><span class="visual-material-card-title">${esc(p.label)}</span>${visualMaterialMarkup(p.id)}<span class="visual-material-card-help">${esc(p.help)}</span></button>`).join(''):'<p class="portal-help">Bu filtrede materyal bulunamadı. Farklı bir arama deneyin.</p>';
 const chosen=visualMaterial(materialState.id);
 status.textContent=chosen?`Seçili: ${chosen.label}. ${chosen.help}. Soru veya cevap metni otomatik eklenmez.`:'Materyal seçin.';
 select.disabled=!has('exam.edit')||state.busy||!questions.length;
 $('exam-material-apply').disabled=!has('exam.edit')||state.busy||!questions.length||!chosen;
}
$('exam-material-search').addEventListener('input',event=>{materialState.term=event.target.value.slice(0,80);drawVisualMaterials();});
$('exam-material-category').addEventListener('change',event=>{materialState.category=event.target.value;drawVisualMaterials();});
$('exam-material-question').addEventListener('change',event=>{materialState.questionIndex=Number(event.target.value)||0;});
$('exam-material-gallery').addEventListener('click',event=>{
 const btn=event.target.closest('[data-material-id]');if(!btn||!visualMaterial(btn.dataset.materialId))return;
 materialState.id=btn.dataset.materialId;drawVisualMaterials();
});
$('exam-material-apply').addEventListener('click',()=>{
 if(!has('exam.edit')||state.busy||!state.exam)return notice('Sınav düzenleme yetkisi gerekli.',true);
 const index=materialState.questionIndex,q=state.exam.questions[index],p=visualMaterial(materialState.id);
 if(!q||!p)return notice('Soru ve materyal seçin.',true);
 if(!window.confirm(`${index+1}. soruya “${p.label}” görseli uygulanacak. Mevcut görsel ayarları değişecek, eski soru kontrolleri geçersizleşecek. Soru ve cevap metni korunacak. Devam edilsin mi?`))return;
 state.exam.questions[index]=applyVisualMaterial(q,p.id);
   if(state.exam.questions[index].provenance?.kind==='source-import')state.exam.questions[index].provenance.reviewed=false;
 // Visuals are deliberately not forced on if the teacher switched them off.
 touch();draw();
 notice(`“${p.label}” materyali ${index+1}. soruya eklendi. Görsel açıklamalar ayarını, kazanım uygunluğunu ve eşdeğerliği öğretmen olarak yeniden denetleyin.`);
 $('exam-questions').querySelector(`[data-qindex="${index}"] [data-qkey="visualAltText"]`)?.focus({preventScroll:true});
});
function updateApprovalGuidance(report){
 const role=state.actor?.role;
 const label=role==='reviewer'
  ?'İncelemeci olarak bu sınav sürümünün kazanımlarını, cevap anahtarını ve bireysel uyarlama uygunluğunu gözden geçirdim. Gerçek öğrenci verisi bulunmadığını kontrol ettim.'
  :role==='admin'||role==='coordinator'
   ?'Yetkili kurum onaylayıcısı olarak bu sınav sürümünün kazanımlarını, cevap anahtarını ve bireysel uyarlama uygunluğunu gözden geçirdim. Gerçek öğrenci verisi bulunmadığını kontrol ettim.'
   :'Sınavın kazanımını, cevap anahtarını ve bireysel uyarlama uygunluğunu öğretmen olarak gözden geçirdim. Gerçek öğrenci verisi eklemedim.';
 $('exam-confirm-label').textContent=label;
 const reason=!has('exam.approve')?'Bu hesapta sınav onaylama yetkisi bulunmuyor.'
  :!state.current?'Onay için önce kaydedilmiş bir sınav seçin.'
  :state.current.status==='approved'?'Bu sınav sürümü zaten onaylı.'
  :state.busy||autosave.isSaving()?'Devam eden işlem veya kaydın bitmesini bekleyin.'
  :state.dirty||autosave.hasChanges()||autosave.isBlocked()?'Kaydedilmemiş veya çakışan değişiklikler var.'
  :report.errorCount>0?report.errorCount+' zorunlu kalite kontrol hatası düzeltilmeli.'
  :!$('exam-confirm').checked?'Onay için yukarıdaki gözden geçirme teyidini işaretleyin.'
  :'Bu sınav sürümü onay işlemine hazır. Sunucu son kontrolü ayrıca yapacaktır.';
 $('exam-confirm-hint').textContent=reason;
}
function draw(){if(!state.exam)return;const x=state.exam;
 $('exam-editor-title').textContent=x.title||'Adsız sınav';
 $('exam-status').textContent=!state.current?'YENİ TASLAK':state.dirty?'KAYDEDİLMEDİ':state.current?.status==='approved'?'ONAYLI':'TASLAK';
 drawHistory();
 $('exam-version').textContent=state.current?`Sürüm ${state.current.revision} · ${state.current.status==='approved'?'Kurumsal onay kayıtlı':'Henüz kurumsal onay yok'}${state.dirty?' · Kaydedilmemiş değişiklikler':''}`:'Yeni anonim sınav taslağı';
 $('exam-main-fields').innerHTML=field('title','Sınav başlığı',x.title)+`<div class="exam-two">`+field('subject','Ders',x.subject)+field('grade','Sınıf / kademe',x.grade)+`</div>`+field('duration','Süre (dakika)',x.duration,'input','type="number" min="1" max="300"')+field('objective','BEP hedefi',x.objective,'textarea')+field('instruction','Genel yönerge',x.instruction,'textarea');
 drawSupportPanel();
 $('exam-goal-review').innerHTML=goalPanelHtml(x);
 renderGoalMatrix();
 renderGuidedPanel();
 drawVisualMaterials();
 $('exam-questions').innerHTML=x.questions.map((q,i)=>`<article class="exam-question" data-qindex="${i}"><div class="exam-q-head"><strong>Soru ${i+1}</strong><button type="button" class="portal-btn secondary exam-delete-q" data-delete="${i}">Kaldır</button></div><label class="exam-label">Soru türü<select data-qkey="type" data-qindex="${i}">${Object.entries({choice:'Çoktan seçmeli',short:'Kısa yanıt',truefalse:'Doğru / Yanlış',matching:'Eşleştirme'}).map(([v,l])=>`<option value="${v}" ${q.type===v?'selected':''}>${l}</option>`).join('')}</select></label><label class="exam-label">Soru metni<textarea data-qkey="prompt" data-qindex="${i}" rows="2">${esc(q.prompt)}</textarea></label><details class="portal-help" style="margin:8px 0 16px"><summary>PDF için öğretmen açıklamalı denklem / görsel blokları</summary><p>Yalnız öğretmenin kaynakla karşılaştırdığı metinsel dökümü ekleyin. Gerçek Office denklemi veya görsel otomatik aktarılmaz; belgeyi ayrıca uzmanla değerlendirin. Yeni açıklama kaydedilince sınav tekrar kurumsal onay ister.</p><button type="button" class="btn-secondary btn-small" data-pdf-alt="denklem" data-qindex="${i}">Denklem örneği ekle</button> <button type="button" class="btn-secondary btn-small" data-pdf-alt="gorsel" data-qindex="${i}">Görsel örneği ekle</button></details><div class="exam-two"><label class="exam-label">Kazanım<textarea data-qkey="objective" data-qindex="${i}" rows="2">${esc(q.objective)}</textarea></label><label class="exam-label">Puan<input type="number" min="1" max="1000" data-qkey="points" data-qindex="${i}" value="${q.points}"></label></div><label class="exam-label">Bu soru için kullanılacak metin<select data-qkey="presentationMode" data-qindex="${i}" aria-label="Soru ${i+1} için sunum metni">${Object.entries(PRESENTATION_MODES).map(([k,v])=>`<option value="${k}" ${q.presentationMode===k?'selected':''}>${esc(v)}</option>`).join('')}</select></label><div class="variant-comparison" id="variant-comparison-${i}" role="region" aria-label="Soru ${i+1} metin karşılaştırması">${variantHtml(q,i,x)}</div><div id="review-slot-${i}">${reviewPanelHtml(q,i,x)}</div>${accessPanelHtml(q,i)}${q.provenance?.kind==='source-import'?`<label class="portal-check" style="margin:14px 0;display:flex;gap:10px;align-items:center"><input type="checkbox" data-source-review="${i}" ${q.provenance.reviewed?'checked':''}> Bu sorunun metnini, seçeneklerini, puanını, doğru yanıtını ve erişilebilirliğini özgün belgeyle karşılaştırdım.</label>`:''}${q.type==='choice'?`<label class="exam-label">Seçenekler (her satır bir seçenek)<textarea data-qkey="options" data-qindex="${i}" rows="3">${esc(q.options.join('\n'))}</textarea></label>`:''}${q.type==='matching'?`<label class="exam-label">Eşleştirmeler (her satır: sol = sağ)<textarea data-qkey="pairs" data-qindex="${i}" rows="3">${esc(q.pairs.map(p=>p.left+' = '+p.right).join('\n'))}</textarea></label>`:q.type==='truefalse'?'':''}<label class="exam-label">${q.type==='matching'?'Örnek cevap (isteğe bağlı)':q.type==='truefalse'?'Doğru yanıt: Doğru veya Yanlış':'Doğru yanıt'}<input data-qkey="answer" data-qindex="${i}" value="${esc(q.answer)}" placeholder="${q.type==='choice'?'Seçeneklerden birini aynen yazın':''}"></label><label class="exam-label">Sadeleştirilmiş yönerge (isteğe bağlı)<textarea data-qkey="simplifiedPrompt" data-qindex="${i}" rows="2">${esc(q.simplifiedPrompt||'')}</textarea></label><div class="exam-two"><label class="exam-label">Görsel türü<select data-qkey="visualMode" data-qindex="${i}"><option value="shapes" ${q.visualMode!=='numberline'?'selected':''}>Nesne grubu</option><option value="numberline" ${q.visualMode==='numberline'?'selected':''}>Sayı doğrusu</option></select></label><label class="exam-label">Görsel betimlemesi<input data-qkey="visualAltText" data-qindex="${i}" value="${esc(q.visualAltText||'')}"></label></div>${q.visualMode==='numberline'?`<div class="exam-two"><label class="exam-label">Sayı doğrusu başlangıç<input data-qkey="numberLineStart" data-qindex="${i}" type="number" min="0" max="30" value="${q.numberLineStart??0}"></label><label class="exam-label">Sayı doğrusu bitiş<input data-qkey="numberLineEnd" data-qindex="${i}" type="number" min="1" max="30" value="${q.numberLineEnd??10}"></label></div>`:`<div class="exam-two"><label class="exam-label">Görsel nesne grubu A (0–12)<input data-qkey="visualDotsA" data-qindex="${i}" type="number" min="0" max="12" value="${q.visualDots?.groupA||0}"></label><label class="exam-label">Görsel nesne grubu B (0–12)<input data-qkey="visualDotsB" data-qindex="${i}" type="number" min="0" max="12" value="${q.visualDots?.groupB||0}"></label></div>`}<label class="exam-label">Görsele yönelik kısa açıklama<input data-qkey="visualNote" data-qindex="${i}" value="${esc(q.visualNote||'')}"></label></article>`).join('');
 renderTeacherQuestionPreview();
 updateQuestionDraftGuidance();
 $('exam-adjustments').innerHTML=`<label class="exam-label">Yazı boyutu<select data-adapt="fontSize">${[16,18,20,22,24].map(v=>`<option value="${v}" ${x.adaptations.fontSize===v?'selected':''}>${v} punto</option>`).join('')}</select></label>${[['highContrast','Yüksek kontrast'],['simpleInstructions','Sadeleştirilmiş yönerge'],['onePerPage','Her sayfada bir soru'],['largerAnswerArea','Geniş cevap alanı'],['visualCues','Görsel açıklamalar']].map(([k,label])=>`<label class="portal-check"><input type="checkbox" data-adapt="${k}" ${x.adaptations[k]?'checked':''}> ${label}</label>`).join('')}`;
 const report=renderQuality(x);renderPreflight();const coverage=objectiveCoverage(x);$('exam-objective-coverage').textContent=`Kazanım kapsamı: ${coverage.groups.length} hedef · BEP bankası: ${(x.bepGoals||[]).length} amaç · ${coverage.total} soru · ${coverage.missing} kazanımsız soru. Bu özet ölçme yeterliliğini doğrulamaz.`;
 $('exam-save').disabled=!has('exam.edit')||state.busy;
 $('exam-approve').disabled=!has('exam.approve')||!state.current||state.dirty||state.current.status==='approved'||state.busy||report.errorCount>0||!$('exam-confirm').checked;
 updateApprovalGuidance(report);
 syncDeliveryContext();
 $('exam-word').disabled=!has('exam.export')||!state.current||state.dirty||state.current.status!=='approved'||state.busy;
 $('exam-print').disabled=$('exam-word').disabled;
 $('exam-delivery-word').disabled=$('exam-word').disabled;
 $('exam-delivery-check').disabled=$('exam-word').disabled||deliveryInFlight;
 $('exam-delivery-package').disabled=$('exam-word').disabled||deliveryInFlight;
 $('exam-pdf-pilot').disabled=$('exam-word').disabled||deliveryInFlight;
 $('exam-audio-preview').disabled=state.busy||!state.exam;
 $('exam-audio-export').disabled=$('exam-word').disabled||auditAudioAccess(x).length>0;
 $('exam-audio-mp3').disabled=$('exam-audio-export').disabled||!state.mp3Available||x.questions.some(q=>questionAccess(q).audioAllowed===false);
 $('exam-voice-export').disabled=$('exam-audio-export').disabled||!$('exam-voice-allow').checked;
 $('exam-add-question').disabled=!has('exam.edit')||state.busy;
 if(libraryState.goals.length||libraryState.questions.length)drawLibrary();
 for(const el of $('exam-editor-card').querySelectorAll('[data-field],[data-qkey],[data-access],[data-adapt],[data-delete],[data-source-review]'))el.disabled=!has('exam.edit')||state.busy;
}
function drawSupportPanel(){
 const wrapper=$('exam-support-panel');if(!wrapper||!state.exam)return;
 const selected=state.exam.supportPlan?.selected||[],recommended=recommendSupports(state.needArea);
 const isEditor=has('exam.edit')&&!state.busy;
 const options=(items,chosen)=>Object.entries(items).map(([key,value])=>`<option value="${esc(key)}" ${chosen===key?'selected':''}>${esc(typeof value==='string'?value:value.label)}</option>`).join('');
 const need=NEED_AREAS[state.needArea];
 const snapshot=state.exam.adaptations;
 wrapper.innerHTML=`<div class="support-row"><label class="exam-label">İhtiyaç alanı — yalnızca bu ekranda kullanılır<select id="support-area" ${!isEditor?'disabled':''}><option value="">Alan seçin (zorunlu değil)</option>${options(NEED_AREAS,state.needArea)}</select></label><label class="exam-label">Ölçülen temel beceri<select id="support-domain" ${!isEditor?'disabled':''}>${options(DOMAINS,state.domainDraft)}</select></label></div>
 <div class="support-privacy"><strong>Mahremiyet:</strong> İhtiyaç alanı kaydedilmez. Kurum veritabanına yalnızca öğretmenin seçtiği genel sınav düzenlemeleri ve ölçülen beceri alanı gider.</div>
 ${need?`<p class="support-advice">${esc(need.caution)}</p>`:''}
 <div class="support-actions"><button type="button" id="support-suggest" class="portal-btn secondary" ${!isEditor||!need?'disabled':''}>Bu alana ait önerileri işaretle</button><span class="support-count">Taslak seçim: ${state.supportDraft.length} destek</span></div>
 <div class="support-options">${Object.entries(SUPPORTS).map(([key,v])=>`<label class="support-option ${state.supportDraft.includes(key)?'chosen':''}"><input data-support="${esc(key)}" type="checkbox" ${state.supportDraft.includes(key)?'checked':''} ${!isEditor?'disabled':''}><span><strong>${esc(v.label)}</strong><small>${esc(v.detail)}</small></span>${recommended.includes(key)?'<span class="support-recommended">ÖNERİ</span>':''}</label>`).join('')}</div>
 <div class="support-bottom"><button type="button" class="portal-btn primary" id="support-apply" ${!isEditor?'disabled':''}>Seçimleri sınav düzenine uygula</button><small>Uygulama soru içeriğini, kazanımı, cevap anahtarını veya puanı değiştirmez.</small></div>
 <div class="support-preview"><div><span class="portal-mini-label">CANLI YERLEŞİM ÖZETİ</span><h4>Bu sınavda uygulanan destekler</h4><p>${selected.length?selected.map(v=>`<span class="support-chip">${esc(SUPPORTS[v].label)}</span>`).join(''):'Henüz kaydedilmek üzere uygulanmış özel destek yok.'}</p></div><div class="support-sheet" style="font-size:${Math.min(22,Number(snapshot.fontSize)||18)}px;line-height:${snapshot.lineSpacing||1.65};${snapshot.highContrast?'background:#fff;color:#000;border-color:#000':''}"><small>ÖRNEK GÖRÜNÜM · ${esc(snapshot.fontSize)} PT</small><strong>4 + 3 = ?</strong><div>□ 5 &nbsp; □ 7 &nbsp; □ 9</div><small>${snapshot.onePerPage?'Her soru ayrı sayfada':'Çok sorulu sayfa'} · ${snapshot.largerAnswerArea?'Geniş yanıt alanı':'Standart yanıt alanı'}</small></div></div>`;
}
$('exam-support-panel').addEventListener('change',event=>{
 const el=event.target;if(!has('exam.edit'))return;
 if(el.id==='support-area'){state.needArea=el.value;drawSupportPanel();}
 else if(el.id==='support-domain'){state.domainDraft=el.value;drawSupportPanel();}
 else if(el.dataset.support){state.supportDraft=el.checked?[...new Set([...state.supportDraft,el.dataset.support])]:state.supportDraft.filter(v=>v!==el.dataset.support);drawSupportPanel();}
});
$('exam-support-panel').addEventListener('click',event=>{
 const el=event.target.closest('button');if(!el||!has('exam.edit'))return;
 if(el.id==='support-suggest'){state.supportDraft=[...new Set([...state.supportDraft,...recommendSupports(state.needArea)])];drawSupportPanel();}
 if(el.id==='support-apply'){
  state.exam=applySupportPlan(state.exam,{version:1,domain:state.domainDraft,selected:state.supportDraft});
  touch();draw();notice('Uyarlama seçimleri uygulandı. Kaydedilince sürüme bağlanır; öğretmen onayı gereklidir.');
 }
});
function touch(){examSelection.invalidate();state.dirty=true;state.current&&(state.current={...state.current,status:'draft'});$('exam-confirm').checked=false;syncButtons();autosave.changed();if(state.exam){renderQuality(state.exam);renderPreflight();renderGoalMatrix();updateQuestionDraftGuidance();renderTeacherQuestionPreview();}}
function syncButtons(){ $('exam-status').textContent='KAYDEDİLMEDİ';$('exam-version').textContent='Değişiklikler kısa süre içinde oturumlu sunucuya otomatik kaydedilir.';for(const id of ['exam-approve','exam-word','exam-print','exam-audio-export','exam-audio-mp3','exam-delivery-check','exam-delivery-package','exam-pdf-pilot'])$(id).disabled=true;}
function drawExamList(){
 const query=($('exam-search')?.value||'').trim().toLocaleLowerCase('tr'),filter=$('exam-status-filter')?.value||'all';
 const items=state.exams.filter(x=>(filter==='all'||x.status===filter)&&(!query||x.title.toLocaleLowerCase('tr').includes(query)));
 $('exam-total').textContent=state.exams.length;
 $('exam-approved').textContent=state.exams.filter(x=>x.status==='approved').length;
 $('exam-list-count').textContent=`${items.length} / ${state.exams.length} sınav gösteriliyor. Kopyalar yeniden öğretmen onayı gerektirir.`;
 $('exam-list').innerHTML=items.length?items.map(x=>`<div class="portal-template"><div class="portal-template-icon">▤</div><div class="portal-template-body"><strong>${esc(x.title)}</strong><small>${x.status==='approved'?'Onaylı':'Taslak'} · Sürüm ${x.revision} · ${new Date(x.updatedAt).toLocaleDateString('tr-TR')}</small></div><div class="exam-list-actions"><button type="button" class="portal-mini-action" data-open="${x.id}">Aç</button>${has('exam.edit')?`<button type="button" class="portal-mini-action" data-duplicate="${x.id}" data-revision="${x.revision}" aria-label="${esc(x.title)} sınavını yeni taslak olarak kopyala">Kopyala</button>`:''}</div></div>`).join(''):'<p class="portal-help">'+(state.exams.length?'Aramaya uygun sınav bulunamadı.':'Henüz bir kurumsal sınav kaydı yok.')+'</p>';
}
async function refreshList(){const r=await api('/exams');state.exams=r.items;drawExamList();}
$('exam-search').addEventListener('input',drawExamList);
$('exam-status-filter').addEventListener('change',drawExamList);
async function openExam(id){return examSelection.open(id);}
function applyInput(el){if(!has('exam.edit'))return;const x=state.exam;if(!x)return;
 if(el.dataset.field){const k=el.dataset.field;x[k]=k==='duration'?Math.min(300,Math.max(1,Number(el.value)||1)):el.value;}
 else if(el.dataset.access){const q=x.questions[Number(el.dataset.qindex)];if(!q)return;const k=el.dataset.access;q.access={...questionAccess(q),[k]:el.type==='checkbox'?el.checked:el.value};if(q.provenance?.kind==='source-import')q.provenance.reviewed=false;}
 else if(el.dataset.qkey){const q=x.questions[Number(el.dataset.qindex)],k=el.dataset.qkey;if(!q)return;if(k==='type'){const provenance=q.provenance;Object.assign(q,starterQuestion(el.value),{prompt:q.prompt,objective:q.objective,points:q.points,provenance:provenance?{...provenance,reviewed:false}:null});}
 else if(k==='points')q.points=Number(el.value)||0;
 else if(k==='numberLineStart'||k==='numberLineEnd')q[k]=Number(el.value)||0;
 else if(k==='visualDotsA'||k==='visualDotsB'){q.visualDots={...(q.visualDots||{groupA:0,groupB:0}),[k==='visualDotsA'?'groupA':'groupB']:Math.max(0,Math.min(12,Number(el.value)||0))};}
 else if(k==='options')q.options=el.value.split('\n').map(s=>s.trim()).slice(0,12);
 else if(k==='pairs')q.pairs=el.value.split('\n').slice(0,20).map(s=>{const [left='',...right]=s.split('=');return {left:left.trim(),right:right.join('=').trim()};});
 else q[k]=el.value;
 }
 else if(el.dataset.adapt){const k=el.dataset.adapt;x.adaptations[k]=el.type==='checkbox'?el.checked:k==='fontSize'?Number(el.value):el.value;}
 touch();if(el.dataset.field==='objective')updateGuidedPreview();if(el.dataset.qindex!==undefined)refreshVariant(Number(el.dataset.qindex));
}
$('exam-review-export').addEventListener('click',()=>{if(!state.exam)return;const csv=worksheetCsv(state.exam),blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='anonim-bep-ogretmen-kontrolu.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);notice('Yalnızca hedef/soru numaraları ve kontrol durumları indirildi. Belge pedagojik geçerlilik sertifikası değildir.');});
$('exam-goal-review').addEventListener('click',event=>{const b=event.target.closest('[data-goal-confirm]');if(!b||!has('exam.edit'))return;const g=(state.exam.bepGoals||[]).find(x=>x.id===b.dataset.goalConfirm);if(!g)return;state.exam.goalAttestations=[...(state.exam.goalAttestations||[]).filter(x=>x.id!==g.id),confirmGoal(g)];touch();draw();notice('BEP hedefi doğrulandı. Değişirse kontrol yeniden gerekecek.');});
// v2.3: Separate server-backed library state. No browser storage or learner identities.
const libraryState={goals:[],questions:[],filter:'',subject:'',grade:'',loading:false,importRows:null};
async function refreshLibrary(){
 if(libraryState.loading)return;libraryState.loading=true;
 try{const query=libraryState.filter?'?q='+encodeURIComponent(libraryState.filter):'';
  const [goals,questions]=await Promise.all([api('/library/goals'+query),api('/library/questions'+query)]);
  libraryState.goals=goals.items;libraryState.questions=questions.items;drawLibrary();
 }catch(e){$('exam-library-list').textContent=e.message;}
 finally{libraryState.loading=false;}
}
function drawLibrary(){
 const filteredGoals=filterCatalogEntries(libraryState.goals,{subject:libraryState.subject,grade:libraryState.grade});
 const filteredQuestions=filterCatalogEntries(libraryState.questions,{subject:libraryState.subject,grade:libraryState.grade});
 const updateFilter=(id,key,all)=>{const select=$(id),prev=libraryState[key];select.innerHTML='<option value="">'+all+'</option>'+[...new Set([...libraryState.goals,...libraryState.questions].map(x=>x[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr')).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');select.value=prev;};
 updateFilter('exam-library-subject-filter','subject','Tüm dersler');updateFilter('exam-library-grade-filter','grade','Tüm kademeler');
 const goalSelect=$('exam-library-question-goal'),examQuestion=$('exam-library-question-index');
 const old=goalSelect.value,oldQuestion=examQuestion.value;
 goalSelect.innerHTML='<option value="">Katalog hedefi seçilmedi</option>'+filteredGoals.filter(g=>g.status==='published').map(g=>`<option value="${g.id}">${esc(g.code)} · ${esc(g.statement.slice(0,62))}</option>`).join('');
 if([...goalSelect.options].some(o=>o.value===old))goalSelect.value=old;
 examQuestion.innerHTML=state.exam?.questions?.length?state.exam.questions.map((q,i)=>`<option value="${i}">${i+1}. soru · ${esc(q.prompt.slice(0,70))}</option>`).join(''):'<option value="">Sınavda soru yok</option>';
 if([...examQuestion.options].some(o=>o.value===oldQuestion))examQuestion.value=oldQuestion;
 const canReview=['admin','coordinator','reviewer'].includes(state.actor?.role),canEdit=has('exam.edit');
 $('exam-library-goal-save').disabled=!canEdit;
 $('exam-library-question-save').disabled=!canEdit;
 $('exam-library-list').innerHTML=`<div class="exam-library-columns">
 <section aria-label="BEP kazanım kataloğu"><h4>Kazanımlar (${filteredGoals.length})</h4>${filteredGoals.length?filteredGoals.map(g=>`<div class="exam-library-item" data-library-status="${g.status}"><div><strong>${esc(g.code)} · ${esc(g.statement)}</strong><small>${esc(g.subject)} / ${esc(g.grade)} · Kaynak: ${esc(g.source||'Belirtilmedi (doğrulanmadı)')} · ${g.level==='long'?'Uzun':'Kısa'} dönem · ${g.status==='published'?'Yayımlandı':'Taslak'}</small></div><div class="exam-editor-actions">${g.status==='published'&&canEdit?`<button type="button" class="portal-btn secondary" data-library-add-goal="${g.id}">Hedefi sınava ekle</button>`:''}${g.status==='draft'&&canReview?`<button type="button" class="portal-btn secondary" data-library-publish-goal="${g.id}" data-rev="${g.revision}">Yayımla</button>`:''}</div></div>`).join(''):'<p class="portal-help">Henüz kazanım bulunamadı.</p>'}</section>
 <section aria-label="Onaylı soru bankası"><h4>Sorular (${filteredQuestions.length})</h4>${filteredQuestions.length?filteredQuestions.map(q=>`<div class="exam-library-item" data-library-status="${q.status}"><div><strong>${esc(q.title)}</strong><small>${esc(q.subject)} / ${esc(q.grade)} · ${q.status==='published'?'Yayımlandı':'Taslak'}</small></div><div class="exam-editor-actions">${q.status==='published'&&canEdit?`<button type="button" class="portal-btn secondary" data-library-add-question="${q.id}">Sınava ekle</button>`:''}${q.status==='draft'&&canReview?`<button type="button" class="portal-btn secondary" data-library-publish-question="${q.id}" data-rev="${q.revision}">Kontrol et ve yayımla</button>`:''}</div></div>`).join(''):'<p class="portal-help">Henüz soru bulunamadı.</p>'}</section></div>`;
}
function nextGoalId(){const ids=new Set((state.exam?.bepGoals||[]).map(g=>g.id));for(let i=1;i<=99;i++){const id='H'+String(i).padStart(2,'0');if(!ids.has(id))return id;}throw Error('Sınavda uygun hedef kodu kalmadı.');}
async function addCatalogGoal(id){
 if(!has('exam.edit'))throw Error('Sınava hedef ekleme izniniz yok.');
 const {item:g}=await api('/library/goals/'+id);if(g.status!=='published')throw Error('Yalnız yayımlanmış hedef kullanılabilir.');
 if(g.subject!==state.exam.subject||g.grade!==state.exam.grade)throw Error('Kazanımın dersi ve kademesi sınavla eşleşmeli.');
 let found=state.exam.bepGoals.find(v=>v.text===g.statement&&v.level===g.level);
 if(!found){if(state.exam.bepGoals.length>=30)throw Error('En fazla 30 BEP hedefi eklenebilir.');found={id:nextGoalId(),level:g.level,text:g.statement};state.exam.bepGoals.push(found);}
 touch();draw();drawLibrary();notice(`${g.code} kodlu kazanım taslağa eklendi. Kaynak belgeyle kontrol edip hedef doğrulamasını işaretleyin.`);
 return found;
}
for(const [id,key] of [['exam-library-subject-filter','subject'],['exam-library-grade-filter','grade']])$(id).addEventListener('change',e=>{libraryState[key]=e.target.value;drawLibrary();});
$('exam-catalog-file').addEventListener('change',()=>{libraryState.importRows=null;$('exam-catalog-import').disabled=true;$('exam-catalog-preview-status').textContent='Dosya değişti; yeniden kontrol edin.';});
$('exam-catalog-level').addEventListener('change',()=>{libraryState.importRows=null;$('exam-catalog-import').disabled=true;$('exam-catalog-preview-status').textContent='Amaç türü değişti; yeniden kontrol edin.';});
$('exam-catalog-template').addEventListener('click',()=>{
 const blob=new Blob([objectivesTemplate()],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='anonim-kazanim-sablonu.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
});
$('exam-catalog-preview').addEventListener('click',async()=>{const status=$('exam-catalog-preview-status');libraryState.importRows=null;$('exam-catalog-import').disabled=true;
 try{const file=$('exam-catalog-file').files?.[0];if(!file||!(/\.(csv|json)$/i).test(file.name))throw Error('CSV veya JSON dosyası seçin.');if(file.size>256*1024)throw Error('Dosya en fazla 256 KB olabilir.');
  const entries=parseCatalog(await file.text(),file.name);const rows=catalogImportRows(entries,{level:$('exam-catalog-level').value});
  if(rows.length>40)throw Error('Tek seferde en fazla 40 kazanım aktarın.');
  libraryState.importRows=rows;$('exam-catalog-import').disabled=!has('exam.edit');status.textContent=`${rows.length} kazanım doğrulama kuralları açısından kontrol edildi. İlk kodlar: ${rows.slice(0,4).map(x=>x.code).join(', ')}. İçerik ve kaynağın pedagojik doğruluğunu öğretmen incelemelidir.`;
 }catch(err){status.textContent='Aktarım yapılamıyor: '+err.message;notice(err.message,true);}
});
$('exam-catalog-import').addEventListener('click',async()=>{const status=$('exam-catalog-preview-status');try{
 const rows=libraryState.importRows;if(!rows?.length)throw Error('Önce dosyayı kontrol edin.');
 const result=await api('/library/goals/import',{method:'POST',body:{goals:rows}});libraryState.importRows=null;$('exam-catalog-import').disabled=true;
 status.textContent=`${result.created} kazanım kuruma taslak olarak aktarıldı. İncelemeci yayımlamadan kullanılmaz.`;notice(status.textContent);await refreshLibrary();
 }catch(err){status.textContent='Aktarım başarısız: '+err.message;notice(err.message,true);}
});
$('exam-library-refresh').addEventListener('click',()=>{libraryState.filter=$('exam-library-search').value.trim().slice(0,80);refreshLibrary();});
$('exam-library-search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();libraryState.filter=e.currentTarget.value.trim().slice(0,80);refreshLibrary();}});
$('exam-library-goal-save').addEventListener('click',async()=>{try{
 const goal={code:$('exam-library-goal-code').value,subject:state.exam.subject,grade:state.exam.grade,level:$('exam-library-goal-level').value,statement:$('exam-library-goal-text').value,source:$('exam-library-goal-source').value.trim()||'Öğretmen girdisi (doğrulanmadı)'};
 const {item}=await api('/library/goals',{method:'POST',body:{goal}});notice(`${item.code} kazanımı kütüphaneye taslak olarak kaydedildi. İncelemeci yayımlamalı.`);await refreshLibrary();
 }catch(e){notice(e.message,true);}});
$('exam-library-question-frame').addEventListener('click',async()=>{try{
 const selected=$('exam-library-question-goal').value;
 if(!selected)throw Error('Önce yayımlanmış bir katalog kazanımı seçin.');
 if(state.exam.questions.length>=100)throw Error('Soru sınırına ulaşıldı.');
 const goal=await addCatalogGoal(selected);
 const q=createQuestionFrame($('exam-library-question-type').value,goal.text,goal.id);
 state.exam.questions.push(q);touch();draw();drawLibrary();notice('Kazanıma bağlı boş soru iskeleti eklendi. Metni, yanıtı ve puanı öğretmen doldurup kontrol etmeli.');
 $('exam-questions').lastElementChild?.scrollIntoView({block:'start',behavior:'smooth'});
 }catch(e){notice(e.message,true);}});
$('exam-library-question-save').addEventListener('click',async()=>{try{
 const index=Number($('exam-library-question-index').value),q=state.exam.questions[index];if(!q)throw Error('Sınavdan bir soru seçin.');
 const goalId=$('exam-library-question-goal').value||null;
 const sourceGoal=goalId?libraryState.goals.find(g=>g.id===goalId):null;
 if(sourceGoal&&(sourceGoal.subject!==state.exam.subject||sourceGoal.grade!==state.exam.grade))throw Error('Kazanımın ders ve kademesi uyuşmuyor.');
 const clean={...q,objective:sourceGoal?sourceGoal.statement:q.objective,goalId:'',teacherNote:'',provenance:null};
 const title=$('exam-library-question-title').value.trim()||`Soru ${index+1}: ${q.prompt.slice(0,60)}`;
 const {item}=await api('/library/questions',{method:'POST',body:{item:{title,subject:state.exam.subject,grade:state.exam.grade,goalCatalogId:goalId,question:clean}}});
 notice(`${item.title} taslak kütüphaneye eklendi. İncelemeci kontrol edip yayımlayacak.`);await refreshLibrary();
 }catch(e){notice(e.message,true);}});
$('exam-library-list').addEventListener('click',async e=>{const btn=e.target.closest('button[data-library-add-goal],button[data-library-add-question],button[data-library-publish-goal],button[data-library-publish-question]');if(!btn)return;
 try{btn.disabled=true;
  if(btn.dataset.libraryAddGoal){await addCatalogGoal(btn.dataset.libraryAddGoal);return;}
  if(btn.dataset.libraryAddQuestion){
   if(state.exam.questions.length>=100)throw Error('Sınav için 100 soru sınırı var.');
   const {item}=await api('/library/questions/'+btn.dataset.libraryAddQuestion);if(item.status!=='published')throw Error('Yalnız yayımlanan sorular kullanılabilir.');
   if(item.subject!==state.exam.subject||item.grade!==state.exam.grade)throw Error('Ders ve kademe sınava uymuyor.');
   let g=null;if(item.goalCatalogId)g=await addCatalogGoal(item.goalCatalogId);
   const fresh={...item.question,id:starterQuestion(item.question.type).id,goalId:g?.id||'',objective:g?.text||item.question.objective,teacherNote:'',provenance:null,equivalenceReview:{checks:{objective:false,answer:false,demand:false,access:false},fingerprint:''}};
   state.exam.questions.push(fresh);touch();draw();drawLibrary();notice('Yayımlanmış soru kopyalandı. BEP hedefini ve yanıtı kontrol edip sınavı yeniden kaydedin; eski onay geçersizdir.');return;
  }
  if(btn.dataset.libraryPublishGoal){if(!confirm('Kazanımı kaynak belgeyle karşılaştırdınız mı? Bu işlem yayımlama sorumluluğunu size verir.'))return;
   await api('/library/goals/'+btn.dataset.libraryPublishGoal+'/publish',{method:'POST',body:{revision:Number(btn.dataset.rev)}});notice('Kazanım yayımlandı.');await refreshLibrary();return;}
  if(btn.dataset.libraryPublishQuestion){if(!confirm('Soru kazanımını, doğru cevabını, puanlamayı ve erişilebilirlik etkilerini öğretmen olarak kontrol ettiniz mi?'))return;
   await api('/library/questions/'+btn.dataset.libraryPublishQuestion+'/publish',{method:'POST',body:{revision:Number(btn.dataset.rev)}});notice('Soru yayımlandı.');await refreshLibrary();return;}
 }catch(err){notice(err.message,true);}finally{btn.disabled=false;}
});

// v2.33: templates only, never invents the actual source, mathematical result or alternative text.
const pdfAltTemplates={
 denklem:':::denklem\nKaynak: E = m çarpı c kare\nAçıklama: E enerjisi, kütle ve ışık hızının karesinin çarpımına eşittir.\nKontrol: kaynakla karşılaştırıldı\n:::',
 gorsel:':::gorsel\nKaynak: İki sütunlu karşılaştırma grafiği\nAçıklama: Birinci sütun 12, ikinci sütun 16 birimdir; aradaki fark 4 birimdir.\nKontrol: kaynakla karşılaştırıldı\n:::'
};
$('exam-questions').addEventListener('click',event=>{
 const button=event.target.closest('[data-pdf-alt]');if(!button||!has('exam.edit')||state.busy)return;
 const template=pdfAltTemplates[button.dataset.pdfAlt],index=Number(button.dataset.qindex);
 const target=$('exam-questions').querySelector(`.exam-question[data-qindex="${index}"] [data-qkey="prompt"]`);
 if(!template||!target||!state.exam?.questions[index])return;
 target.value=target.value.replace(/\s*$/,'')+'\n\n'+template;
 target.dispatchEvent(new Event('input',{bubbles:true}));target.focus();
 notice('ÖRNEK eklendi. Kaynağı ve açıklamayı gerçek ders materyaliyle değiştirip doğrulayın; ardından sınavı yeniden onaylatın.');
});
$('exam-questions').addEventListener('click',event=>{const b=event.target.closest('[data-review-confirm]');if(!b||!has('exam.edit'))return;const i=Number(b.dataset.reviewConfirm),q=state.exam?.questions[i],panel=b.closest('[data-review-index]');if(!q||!panel)return;const checks=Object.fromEntries([...panel.querySelectorAll('[data-review-check]')].map(el=>[el.dataset.reviewCheck,el.checked]));try{q.equivalenceReview=confirmQuestion(q,state.exam,checks);touch();draw();notice('Bu soru sürümü için öğretmen kontrolü kayda hazır.');}catch(e){notice(e.message,true);}});
$('exam-main-fields').addEventListener('input' ,ev=>{if(ev.target.dataset.field)applyInput(ev.target);});
$('exam-questions').addEventListener('input',ev=>{if(ev.target.dataset.qkey||ev.target.dataset.access)applyInput(ev.target);});
$('exam-questions').addEventListener('change',ev=>{if(ev.target.dataset.access)applyInput(ev.target);});
$('exam-questions').addEventListener('change',ev=>{
 const key=ev.target.dataset.qkey;
 if(!['type','visualMode'].includes(key))return;
 const index=Number(ev.target.dataset.qindex);
 if(!Number.isInteger(index)||index<0)return;
 draw();
 // The question disclosure is reconstructed by a MutationObserver. Restore
 // focus after its microtask has wrapped optional fields, then reveal details.
 queueMicrotask(()=>{
  const card=$('exam-questions').querySelector(`.exam-question[data-qindex="${index}"]`);
  const target=card?.querySelector(`[data-qkey="${key}"]`);
  if(!target)return;
  for(let parent=target.parentElement;parent;parent=parent.parentElement){
   if(parent.tagName==='DETAILS')parent.open=true;
  }
  target.focus({preventScroll:true});
 });
});
$('exam-adjustments').addEventListener('change',ev=>{if(ev.target.dataset.adapt){applyInput(ev.target);draw();}});
$('exam-questions').addEventListener('change',ev=>{
 if(ev.target.dataset.sourceReview===undefined||!has('exam.edit'))return;
 const q=state.exam?.questions[Number(ev.target.dataset.sourceReview)];if(q?.provenance?.kind!=='source-import')return;
 q.provenance.reviewed=ev.target.checked===true;touch();renderQuality(state.exam);
 notice(q.provenance.reviewed?'Kaynak belgeyle karşılaştırma onayı taslağa eklendi. Soru düzenlenirse onay düşer.':'Kaynak belge kontrol onayı geri alındı.');
});
$('exam-questions').addEventListener('click',ev=>{
 const btn=ev.target.closest('[data-delete]');
 if(!btn||!has('exam.edit')||state.busy)return;
 const index=Number(btn.dataset.delete);
 if(!Number.isInteger(index)||index<0||index>=state.exam.questions.length)return;
 if(!confirm(`Soru ${index+1} kaldırılacak ve taslak değişecek. Devam etmek istiyor musunuz?`))return;
 $('exam-questions').dispatchEvent(new CustomEvent('exam-question-removed',{detail:{index}}));
 state.exam.questions.splice(index,1);touch();draw();
 const cards=$('exam-questions').querySelectorAll('.exam-question');
 const target=cards[Math.min(index,cards.length-1)]?.querySelector('[data-qkey="prompt"]')||$('exam-add-question');
 target.focus({preventScroll:true});
 notice('Soru kaldırıldı. Değişiklikler yeniden kaydedilecektir.');
});
function appendBlankQuestions(count){
 if(!has('exam.edit')||state.busy||!state.exam)return;
 if(!Number.isSafeInteger(count)||count<1||count>10)return;
 if(state.exam.questions.length+count>100)return notice('Sınav en fazla 100 soru içerebilir. Soru sayısını kontrol edin.',true);
 const chosen=count===1?$('exam-quick-question-type').value:'choice';
 if(!['choice','truefalse','matching','short'].includes(chosen))
  return notice('Desteklenen bir soru türü seçin.',true);
 const firstNewIndex=state.exam.questions.length;
 for(let i=0;i<count;i++)state.exam.questions.push(starterQuestion(chosen));
 // Preserve existing draft, autosave, and revision invalidation semantics.
 touch();draw();
 const field=$('exam-questions').querySelector(`.exam-question[data-qindex="${firstNewIndex}"] [data-qkey="prompt"]`);
 field?.focus({preventScroll:true});
 notice(count>1?count+' boş çoktan seçmeli soru eklendi. Metinleri, kazanımları ve yanıtları tamamlayın.':'Yeni soru taslağı eklendi. Önce metni, ardından kazanımı, puanı ve yanıtı kontrol edin.');
}
$('exam-add-question').addEventListener('click',()=>appendBlankQuestions(1));
$('exam-add-ten-questions').addEventListener('click',()=>appendBlankQuestions(10));
$('exam-list').addEventListener('click',async ev=>{
 const btn=ev.target.closest('[data-open],[data-duplicate]');if(!btn)return;
 if(state.busy||autosave.isSaving())return notice('Kayıt işlemi devam ederken sınav değiştirmeyin.',true);
 if(state.dirty&&!confirm('Kaydedilmemiş değişiklikler var. Devam ederseniz bunlar kaybolabilir. Devam edilsin mi?'))return;
 if(btn.dataset.duplicate){
  if(!has('exam.edit'))return;
  if(!confirm('Bu sınavdan bağımsız bir TASLAK oluşturulacak. Kaynak onaylı olsa bile kopya yeniden öğretmen kontrolü ve onayı isteyecek. Devam edilsin mi?'))return;
  state.busy=true;btn.disabled=true;
  try{const r=await api('/exams/'+btn.dataset.duplicate+'/duplicate',{method:'POST',body:{revision:Number(btn.dataset.revision)}});
   await refreshList();if(await openExam(r.item.id))notice('Bağımsız taslak oluşturuldu. İçeriği ve BEP hedefini yeniden inceleyip onaylayın.');
  }catch(err){notice(err.message,true);}finally{state.busy=false;btn.disabled=false;draw();}
 }else{try{if(await openExam(btn.dataset.open))notice('Sınav sürümü açıldı.');}catch(err){notice(err.message,true);}}
});
$('exam-new').addEventListener('click',()=>{if(state.busy)return notice('Devam eden işlem tamamlanmalı.',true);if(autosave.isSaving())return notice('Otomatik kayıt sürüyor.',true);if(state.dirty&&!confirm('Kaydedilmemiş değişiklikleri bırakmak istiyor musunuz?'))return;draft();});
$('exam-refresh').addEventListener('click',()=>refreshList().catch(err=>notice(err.message,true)));
$('exam-confirm').addEventListener('change',()=>{draw();});
$('exam-save').addEventListener('click',async()=>{if(!has('exam.edit')||state.busy)return;
 const checkpoint=examSelection.checkpoint();
 try{const result=await autosave.flush({force:!state.current&&!autosave.hasChanges()});
  if(!checkpoint.isCurrent())return;
  if(result&&!autosave.hasChanges()){state.exam=normalizeExam(result.exam);state.supportDraft=[...(state.exam.supportPlan?.selected||[])];state.domainDraft=state.exam.supportPlan?.domain||'general';draw();showAutosave('saved');}
  notice(autosave.hasChanges()?'Bir sürüm kaydedildi; daha yeni düzenlemeler için otomatik kayıt bekleniyor.':'Değişiklikler kurumsal sunucuya kaydedildi. Öğretmen onayı ayrı işlemdir.');
 }catch(err){if(checkpoint.isCurrent())notice(err.message,true);}
});
$('exam-autosave-export').addEventListener('click',()=>{
 if(!state.exam||!has('exam.edit'))return;
 const payload=makeRecoveryDocument(state.exam);
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='bep-taslak-kurtarma-'+Date.now()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
 notice('Düzenlenmiş taslağın bir kopyası bu bilgisayara indirildi. Dosyayı güvenli saklayın; otomatik sunucu kaydı değildir.');
});
$('exam-autosave-reload').addEventListener('click',async()=>{
 if(!state.current?.id)return notice('Bu taslağın henüz sunucu kaydı yok.',true);
 if(autosave.isSaving())return notice('Devam eden kayıt işlemini tamamlayın.',true);
 if(!confirm('Bu sekmedeki kaydedilmemiş değişiklikler kaybolacak. Gerekirse önce JSON kopyasını indirin. Sunucudaki son sürümü açalım mı?'))return;
 try{if(await openExam(state.current.id))notice('Sunucudaki en son kaydedilmiş sürüm açıldı.');}catch(err){notice(err.message,true);}
});
$('exam-recovery-choose').addEventListener('click',()=>{if(state.busy)return notice('Onay veya başka işlem sürerken kurtarma yapılamaz.',true);if(!has('exam.edit'))return notice('Taslak geri yükleme izniniz yok.',true);$('exam-recovery-file').click();});
$('exam-recovery-file').addEventListener('change',async event=>{
 const file=event.target.files?.[0];event.target.value='';if(!file)return;
 if(state.busy)return notice('İşlem sürerken kurtarma yapılamaz.',true);
 if(autosave.isSaving())return notice('Önce otomatik kayıt tamamlanmalı.',true);
 if(file.size>300000)return notice('Kurtarma dosyası 300 KB sınırını aşıyor.',true);
 try{const exam=parseRecoveryDocument(await file.text());
  if(state.busy)return notice('Onay devam ederken seçilen kurtarma dosyası uygulanmadı.',true);
  if(state.dirty&&!confirm('Bu sekmedeki kaydedilmemiş değişiklikler yeni taslakla değiştirilecek. Devam?'))return;
  if(!confirm('Dosya yalnızca anonim BEP sınavı içermelidir. Yeni bir taslak olarak açıp otomatik kaydetmek istiyor musunuz?'))return;
  examSelection.invalidate();autosave.reset();state.current=null;state.approvalHistory=null;state.exam=exam;state.needArea='';state.supportDraft=[...(exam.supportPlan?.selected||[])];state.domainDraft=exam.supportPlan?.domain||'general';
  state.dirty=true;draw();autosave.changed();
  notice('Yerel JSON taslak yeni sınav olarak açıldı. Sunucuda kayıt tamamlanınca durum çubuğu değişecek.');
 }catch(err){notice('Kurtarma reddedildi: '+err.message,true);}
});
$('exam-resume-last').addEventListener('click',async()=>{
 if(autosave.isSaving())return notice('Kaydetme işlemi sürüyor.',true);
 if(state.dirty&&!confirm('Bu sekmedeki kaydedilmemiş düzenlemeler silinebilir. Devam edilsin mi?'))return;
 const latest=state.exams.find(e=>e.ownerId===state.actor?.id&&e.status==='draft');
 if(!latest)return notice('Bu kullanıcıya ait kaydedilmiş taslak bulunamadı.',true);
 try{if(await openExam(latest.id))notice('Son sunucu taslağı açıldı.');}catch(err){notice(err.message,true);}
});
window.addEventListener('beforeunload',event=>{if(state.dirty||autosave.isSaving()){event.preventDefault();event.returnValue='';}});
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&String(event.key).toLowerCase()==='s'){event.preventDefault();if(has('exam.edit'))$('exam-save').click();}});
$('exam-approve').addEventListener('click',async()=>{
 let checkpoint=null;
 try {
  const {id,revision}=assertApprovalReady({
   id:state.current?.id,revision:state.current?.revision,confirmed:$('exam-confirm').checked,
   dirty:state.dirty,busy:state.busy,allowed:has('exam.approve'),
   saving:autosave.isSaving(),pending:autosave.hasChanges(),blocked:autosave.isBlocked()
  });
  // Invalidate earlier pending exam loads; do not let them switch the subject of approval.
  examSelection.invalidate();checkpoint=examSelection.checkpoint();
  state.busy=true;draw();notice('Sürüm onaya gönderildi; işlem bitene kadar düzenleme kilitlendi.');
  const outcome=await submitExamApproval({
   id,revision,
   request:async (examId,expectedRevision)=>(await api('/exams/'+examId+'/approve',{method:'POST',body:{revision:expectedRevision,confirmed:true}})).item,
   onAccepted:item=>{if(!checkpoint.isCurrent())throw Error('Ekran değişti. Onay durumunu sunucudan yeniden kontrol edin.');state.current=item;},
   refreshList,refreshHistory:loadHistory
  });
  if(checkpoint.isCurrent())notice(outcome.refreshFailed.length
   ?`Sınav sürümü SUNUCUDA ONAYLANDI; ancak ${outcome.refreshFailed.join(' ve ')} görünümü yenilenemedi. Yenile ile yeniden kontrol edin.`
   :'Sınavın bu sürümü sunucuda onaylandı; liste ve onay geçmişi güncellendi.',false);
 }catch(err){if(!checkpoint||checkpoint.isCurrent())notice('Onay tamamlanamadı veya doğrulanamadı: '+err.message,true);}
 finally{state.busy=false;if(!checkpoint||checkpoint.isCurrent())draw();}
});
function saveHtml(out,name){const blob=new Blob([out],{type:'text/html;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
function openPreview(out){const blob=new Blob([out],{type:'text/html;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
let lastDeliverySelectionKey='',lastDeliveryReceipt=null,deliveryInFlight=false;
function currentDeliverySelection(){
 return deliverySelection({id:state.current?.id,revision:state.current?.revision,
  status:state.current?.status,dirty:state.dirty||autosave.hasChanges()||autosave.isSaving()||autosave.isBlocked(),
  profile:$('exam-delivery-profile').value});
}
function deliveryKeyOf(selection){return selection.id+'|'+selection.revision+'|'+selection.profile;}
function clearDeliveryReceipt(){
 lastDeliveryReceipt=null;
 $('exam-delivery-receipt').hidden=true;
 $('exam-delivery-receipt-description').textContent='';
 $('exam-delivery-receipt-sha').textContent='';
}
function syncDeliveryContext(){
 let key='',selection;
 try{selection=currentDeliverySelection();key=deliveryKeyOf(selection);}catch{}
 if(key===lastDeliverySelectionKey)return;
 lastDeliverySelectionKey=key;
 clearDeliveryReceipt();
 $('exam-delivery-status').textContent=selection
  ?'Sürüm '+selection.revision+' · '+deliveryProfileLabel(selection.profile)+' profili seçildi. Dosyayı almadan önce sunucu onayı tekrar doğrulanacak.'
  :'Çıktı için önce kaydedilmiş, onaylı ve değişiklik içermeyen bir sınav sürümü seçin.';
}
async function getDeliveryReadiness(selection){
 const info=await api('/exams/'+selection.id+'/delivery-readiness?profile='+encodeURIComponent(selection.profile));
 const ready=assertDeliveryReady(info,selection);
 if(!sameDeliverySelection(selection,currentDeliverySelection()))
  throw Error('Sınav veya sunum profili bu işlem sırasında değişti. Güncel seçimi tekrar kontrol edin.');
 return ready;
}
function showDeliveryReceipt(receipt){
 lastDeliveryReceipt=receipt;
 $('exam-delivery-receipt-description').textContent=receipt.description;
 $('exam-delivery-receipt-sha').textContent=receipt.sha256;
 $('exam-delivery-receipt').hidden=false;
}
$('exam-delivery-copy-sha').addEventListener('click',async()=>{
 if(!lastDeliveryReceipt)return;
 try{
  await navigator.clipboard.writeText(lastDeliveryReceipt.sha256);
  notice('Dosya SHA-256 özeti kopyalandı.');
 }catch{
  notice('Otomatik kopyalama yapılamadı. Özeti yukarıdan seçip kopyalayabilirsiniz.',true);
 }
});
function downloadVerified(bytes,mime,name){const blob=new Blob([bytes],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
function download(out,name){const blob=new Blob([out],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
async function getApproved(){
 if(!state.current||state.current.status!=='approved'||state.dirty||autosave.hasChanges()||autosave.isSaving()||autosave.isBlocked())
  throw Error('Önce kaydedilmiş ve onaylı sınav sürümünü açın.');
 const id=state.current.id,revision=state.current.revision;
 const r=await api('/exams/'+id+'/export',{method:'POST',body:{}});
 if(r.meta?.id!==id||r.meta?.revision!==revision||r.meta?.status!=='approved'||
    state.current?.id!==id||state.current?.revision!==revision||state.dirty||
    autosave.hasChanges()||autosave.isSaving()||autosave.isBlocked())
  throw Error('Sunucu sürümü değişti. Güncel sınavı yeniden açıp çıktı alın.');
 return r.exam;
}
$('exam-word').addEventListener('click',async()=>{try{const exam=await getApproved();download(generateDocx(exam,false),slugify(exam.title)+'-surum-'+state.current.revision+'-kurumsal.docx');notice('Word belgesi yetkilendirilmiş sunucu sürümünden üretildi.');}catch(err){notice(err.message,true);}});
$('exam-delivery-word').addEventListener('click',async()=>{
 try{const exam=await getApproved();const profile=$('exam-delivery-profile').value;const variant=makeDeliveryVersion(exam,profile);
 download(generateDocx(variant,false),slugify(exam.title)+'-surum-'+state.current.revision+'-'+profile+'-erisebilir.docx');
 notice('Yalnızca biçimi uyarlanmış onaylı sürüm indirildi. Sorular ve cevap anahtarı değiştirilmedi.');
 }catch(err){notice(err.message,true);}
});

// Server-owned ZIP/PDF: new downloads use the selected revision and a fresh
// server check; the browser verifies exact response length, format and SHA-256.
$('exam-delivery-profile').addEventListener('change',syncDeliveryContext);
$('exam-delivery-check').addEventListener('click',async()=>{
 const status=$('exam-delivery-status');
 let selection;
 try{
  if(deliveryInFlight)throw Error('Başka bir çıktı işlemi devam ediyor.');
  selection=currentDeliverySelection();
  status.textContent='Sunucu onay geçmişini ve seçili sürümü kontrol ediyor…';
  const ready=await getDeliveryReadiness(selection);
  status.textContent=`Kontrol uygun · Sürüm ${ready.revision} · ${ready.questionCount} soru · ${deliveryProfileLabel(ready.profile)} profili · ${ready.qualityWarnings} öğretmen uyarısı · ${ready.structuralChecks}/7 yapısal kontrol. Kaynak SHA-256: ${ready.sourceSha256.slice(0,16)}… Gerçek kullanıcı incelemesi yine gerekli.`;
 }catch(err){
  if(!selection||lastDeliverySelectionKey===deliveryKeyOf(selection))
   status.textContent='Kontrol başarısız: '+err.message;
 }
});
async function downloadDelivery(format){
 const status=$('exam-delivery-status');
 if(deliveryInFlight)return notice('Önce devam eden çıktı işlemini tamamlayın.',true);
 let selection;
 try{
  selection=currentDeliverySelection();
  deliveryInFlight=true;
  for(const id of ['exam-delivery-check','exam-delivery-package','exam-pdf-pilot'])$(id).disabled=true;
  status.textContent='Onaylı sürüm ve sunum profili sunucuda tekrar doğrulanıyor…';
  await getDeliveryReadiness(selection);
  status.textContent=format==='pdf'?'Yerel PDF üretiliyor, dosya imzası ve bütünlüğü doğrulanacak…':'Onaylı ZIP paketi üretiliyor, dosya imzası ve bütünlüğü doğrulanacak…';
  const response=await fetch('/api/exams/'+selection.id+'/'+(format==='pdf'?'pdf-pilot':'delivery-package'),{
   method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'Content-Type':'application/json','X-CSRF-Token':state.csrf},
   body:JSON.stringify({profile:selection.profile,revision:selection.revision})
  });
  if(!response.ok){
   let data={};try{data=await response.json();}catch{}
   throw Error(data.message||data.error||'Dosya sunucudan alınamadı.');
  }
  if(format==='pdf'&&response.headers.get('x-pdf-status')!=='structural-pilot-not-pdfua')
   throw Error('PDF yapısal pilot durumu geçersiz.');
  const verified=await verifyExamDownload(response,{format});
  if(!sameDeliverySelection(selection,currentDeliverySelection()))
   throw Error('Dosya hazırlanırken sınav sürümü veya profil değişti. Önce güncel seçimi kontrol edin.');
  const filename=format==='pdf'
   ?'bep-'+selection.profile+'-surum-'+selection.revision+'-pdf-pilot.pdf'
   :'anonim-onayli-sinav-'+selection.profile+'-surum-'+selection.revision+'.zip';
  const receipt=deliveryReceipt({kind:format,filename,profile:selection.profile,
   revision:selection.revision,sha256:verified.sha256});
  downloadVerified(verified.bytes,verified.mime,filename);
  showDeliveryReceipt(receipt);
  status.textContent=receipt.description+' Öğretmen erişilebilirlik incelemesi ayrıca gereklidir.';
 }catch(err){
  if(!selection||lastDeliverySelectionKey===deliveryKeyOf(selection)){
   status.textContent='Dosya hazırlanamadı: '+err.message;
   notice(err.message,true);
  }
 }finally{
  deliveryInFlight=false;
  const disabled=!has('exam.export')||!state.current||state.dirty||state.current.status!=='approved'||state.busy;
  for(const id of ['exam-delivery-check','exam-delivery-package','exam-pdf-pilot'])$(id).disabled=disabled;
 }
}
$('exam-pdf-pilot').addEventListener('click',()=>downloadDelivery('pdf'));
$('exam-delivery-package').addEventListener('click',()=>downloadDelivery('zip'));
$('exam-delivery-preview').addEventListener('click',()=>{
 try{const variant=makeDeliveryVersion(state.exam,$('exam-delivery-profile').value);
 openPreview(printableHtml(variant,false));notice('Bu öğretmen önizlemesidir; onay ve pedagojik eşdeğerlik doğrulaması değildir.');
 }catch(err){notice(err.message,true);}
});
$('exam-voice-allow').addEventListener('change',draw);
$('exam-audio-preview').addEventListener('click',()=>{try{const html=generateAccessibleExamHtml(state.exam,{allowVoiceResponse:$('exam-voice-allow').checked});openPreview(html);notice('Sesli sınav önizlemesi açıldı. Bu taslak kurumsal olarak onaylanmış sayılmaz.');}catch(err){notice(err.message,true);}});
$('exam-audio-export').addEventListener('click',async()=>{try{const exam=await getApproved();const html=generateAccessibleExamHtml(exam);saveHtml(html,slugify(exam.title)+'-sesli-erisilebilir.html');notice('Cevap anahtarı ve kimlik bilgisi içermeyen, çevrimdışı sesli sınav indirildi.');}catch(err){notice(err.message,true);}});
$('exam-voice-export').addEventListener('click',async()=>{
 try{
  if(!$('exam-voice-allow').checked)throw Error('Öğretmen mikrofonla yanıt iznini işaretlemelidir.');
  if(!confirm('Sesli yanıt etkinleştirilsin mi? Bu pilot gerçek çocuk sesi için uygun değildir; dosyalar yalnızca öğrencinin cihazına kaydedilebilir.'))return;
  const exam=await getApproved();const html=generateAccessibleExamHtml(exam,{allowVoiceResponse:true});
  saveHtml(html,slugify(exam.title)+'-sesli-yanitli.html');notice('Mikrofon izni öğretmen tarafından seçilmiş, cevap anahtarı içermeyen HTML dosyası indirildi.');
 }catch(err){notice(err.message,true);}
});
$('exam-audio-mp3').addEventListener('click',async()=>{
 if(!state.mp3Available)return notice('Yerel MP3 motoru bu bilgisayarda hazır değil.',true);
 if(!state.current||state.dirty||state.current.status!=='approved')return notice('Önce onaylı sınavı açın.',true);
 try{
  state.busy=true;draw();notice('Türkçe MP3 yerel olarak hazırlanıyor…');
  const response=await fetch('/api/exams/'+state.current.id+'/audio-mp3',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':state.csrf}});
  if(!response.ok){const detail=await response.json().catch(()=>({}));throw Error(detail.message||'MP3 üretilemedi.');}
  const blob=await response.blob();if(blob.type!=='audio/mpeg'||!blob.size)throw Error('Ses çıktısı geçersiz.');
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=slugify(state.exam.title)+'-sesli-sinav.mp3';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
  notice('Türkçe ses dosyası indirildi. Telaffuzu öğretmen olarak mutlaka dinleyip kontrol edin.');
 }catch(err){notice(err.message,true);}finally{state.busy=false;draw();}
});
$('exam-print').addEventListener('click',async()=>{const w=window.open('','_blank');if(!w)return notice('Açılır pencereye izin verin.',true);try{const exam=await getApproved();w.document.open();w.document.write(printableHtml(exam,false));w.document.close();w.focus();setTimeout(()=>w.print(),240);notice('A4 çıktı yalnızca sunucudaki onaylı sürümden üretildi.');}catch(err){w.close();notice(err.message,true);}});
(async function init(){try{const s=await api('/session');if(!s.authenticated||s.mfaSetupRequired===true){
  document.body.dataset.examAuth='guest';
  const navigation=document.querySelector('.dou-nav');
  if(navigation)navigation.inert=true;
  $('exam-login-required').hidden=false;
  if(s.mfaSetupRequired===true){
   const prompt=$('exam-login-required').querySelector('p');
   if(prompt)prompt.textContent='Kurum politikasina gore once iki asamali dogrulamayi kurumsal panelde tamamlamalisiniz. Sinav editoru bu asamada acilmaz.';
  }
  document.documentElement.dataset.examAppReady='login';
  return;
 }state.actor=s.member;state.csrf=s.csrf;
 document.body.dataset.examAuth='authenticated';
 document.documentElement.dataset.navRole=s.member.role;
 document.dispatchEvent(new CustomEvent('dou-nav-role',{detail:{role:s.member.role}}));
 const navigation=document.querySelector('.dou-nav');if(navigation)navigation.inert=false;
 $('exam-workspace').hidden=false;$('exam-actor').textContent=s.member.email;$('exam-tenant').textContent=`${s.member.tenantId} · ${s.member.role}`;
 const sidebarProfile=$('campus-sidebar-profile');
 if(sidebarProfile){
  $('campus-profile-name').textContent=s.member.email.split('@')[0]||'Kurum kullanıcısı';
  $('campus-profile-role').textContent=({admin:'Kurum yöneticisi',coordinator:'Koordinatör',teacher:'Öğretmen',reviewer:'İncelemeci',observer:'Görüntüleyici'})[s.member.role]||'Kurum üyesi';
  sidebarProfile.hidden=false;
 }
 $('exam-new').hidden=!has('exam.edit');$('exam-add-question').hidden=!has('exam.edit');$('exam-confirm').disabled=!has('exam.approve');
 await refreshList();draft();await refreshLibrary();{const requested=new URLSearchParams(location.search).get('exam');if(requested&&/^[a-f0-9-]{36}$/.test(requested)){try{await openExam(requested);}catch(err){notice('Sınav açılmadı: '+err.message,true);}}}try{const capability=await api('/audio-capability');state.mp3Available=capability.mp3===true;}catch{state.mp3Available=false;}draw();if(!has('exam.edit')&&state.exams.length){await openExam(state.exams[0].id);}else if(!has('exam.edit')){state.dirty=false;draw();}
 document.documentElement.dataset.examAppReady='ready';
 }catch(err){document.body.dataset.examAuth='guest';const navigation=document.querySelector('.dou-nav');if(navigation)navigation.inert=true;notice(err.message,true);$('exam-workspace').hidden=true;$('exam-login-required').hidden=false;document.documentElement.dataset.examAppReady='error';}})();
