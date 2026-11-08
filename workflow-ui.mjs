// Visual workflow helpers only. No network, cookies, credentials, or personal data storage.
const nav = document.querySelector('.workflow-nav');
// Both navigation and the guided editor need the same step list.
const steps = nav ? Array.from(nav.querySelectorAll('[data-workflow-target]')) : [];
let updateGuidedView=()=>{};
let guidedModeEnabled=false;
if (nav) {
  const findTarget = button => document.getElementById(button.dataset.workflowTarget);
  const previous=document.getElementById('workflow-prev');
  const next=document.getElementById('workflow-next');
  const stepCount=document.getElementById('workflow-step-count');
  const nextHint=document.getElementById('workflow-next-hint');
  const stageHelp=document.getElementById('workflow-stage-help');
  const stageDescriptions=[
    'Önce sınavın başlığını, dersini, sınıfını ve süresini girin. Diğer adımlara daha sonra dönebilirsiniz.',
    'BEP hedeflerini kaynakla karşılaştırın ve öğretmen doğrulamasını tamamlayın.',
    'Kazanım ve soru bankasından içerik seçin veya yeni taslak hazırlayın.',
    'Soruları ve yanıtları düzenleyin; erişilebilirlik seçeneklerini ve önizlemeyi kontrol edin.',
    'Kaydetme durumunu kontrol edin, sınavı gözden geçirip onaylayın ve uygun çıktıyı alın.'
  ];
  const announcement=document.getElementById('workflow-announcement');

  const revealAndVisit = button => {
    const target=findTarget(button);
    if(!target)return;
    // Always reveal a section before scrolling or moving keyboard focus.
    for(let parent=target.parentElement;parent;parent=parent.parentElement){
      if(parent.tagName==='DETAILS')parent.open=true;
    }
    activate(button);
    if(announcement)announcement.textContent='Hazırlama aşaması: '+button.textContent.replace(/\s+/g,' ').trim();
    target.scrollIntoView({block:'start',behavior:'auto'});
    const heading=target.querySelector('h2,h3,h4')||target;
    heading.setAttribute('tabindex','-1');
    heading.focus({preventScroll:true});
  };
  const activate = button => {
    const selectedIndex=steps.indexOf(button);
    if(previous)previous.disabled=selectedIndex<=0;
    if(next)next.disabled=selectedIndex<0||selectedIndex>=steps.length-1;
    if(stepCount&&selectedIndex>=0)stepCount.textContent='Adım '+(selectedIndex+1)+' / '+steps.length;
    if(stageHelp&&selectedIndex>=0)stageHelp.textContent=stageDescriptions[selectedIndex]||'';
    if(nextHint&&selectedIndex>=0){
      const following=steps[selectedIndex+1];
      nextHint.textContent=following
        ?'Sıradaki: '+following.textContent.replace(/^\s*\d+\s*/,'').trim()
        :'Tüm hazırlama bölümlerini ziyaret ettiniz; kalite ve onayı kontrol edin.';
    }
    updateGuidedView(selectedIndex);
    for (const step of steps) {
      const selected = step === button;
      step.classList.toggle('active',selected);
      if (selected) step.setAttribute('aria-current','step');
      else step.removeAttribute('aria-current');
    }
  };
  for(const button of steps)button.addEventListener('click',()=>revealAndVisit(button));
  if(previous)previous.addEventListener('click',()=>{
    const index=steps.findIndex(step=>step.classList.contains('active'));
    if(index>0)revealAndVisit(steps[index-1]);
  });
  if(next)next.addEventListener('click',()=>{
    const index=steps.findIndex(step=>step.classList.contains('active'));
    if(index>=0&&index<steps.length-1)revealAndVisit(steps[index+1]);
  });
  if(steps.length)activate(steps.find(step=>step.classList.contains('active'))||steps[0]);
  // Follow the section the teacher is actually reading, not just the last
  // clicked tab. No polling or remote calls; observer is local-only.
  if(typeof IntersectionObserver!=='undefined'){
    const visible=new Map();
    const sectionObserver=new IntersectionObserver(entries=>{
      if(guidedModeEnabled)return;
      for(const entry of entries){
        if(entry.isIntersecting)visible.set(entry.target.id,entry.boundingClientRect.top);
        else visible.delete(entry.target.id);
      }
      const nearest=[...visible].sort((a,b)=>Math.abs(a[1])-Math.abs(b[1]))[0];
      if(!nearest)return;
      const active=steps.find(step=>step.dataset.workflowTarget===nearest[0]);
      if(active)activate(active);
    },{root:null,rootMargin:'-15% 0px -65% 0px',threshold:0});
    for(const step of steps){
      const target=findTarget(step);
      if(target)sectionObserver.observe(target);
    }
  }
  // Focus mode changes only presentation: never destroys a draft or saves it.
  const focusToggle=document.getElementById('exam-focus-toggle');
  const workspace=document.getElementById('exam-workspace');
  const draftsPanel=document.getElementById('exam-drafts-panel');
  if(focusToggle&&workspace&&draftsPanel){
    focusToggle.addEventListener('click',()=>{
      const enabled=!workspace.classList.contains('exam-focus-mode');
      // Focus must not remain in a now-hidden panel, including for screen readers.
      if(enabled&&draftsPanel.contains(document.activeElement))focusToggle.focus();
      workspace.classList.toggle('exam-focus-mode',enabled);
      draftsPanel.inert=enabled;
      draftsPanel.setAttribute('aria-hidden',String(enabled));
      focusToggle.setAttribute('aria-pressed',String(enabled));
      focusToggle.textContent=enabled?'Odak modu: Açık':'Odak modu: Kapalı';
      focusToggle.title=enabled?'Taslak listesini yeniden göster':'Taslak listesini gizleyip soru düzenleme alanını genişlet';
    });
  }
  const status = document.getElementById('workflow-save-state');
  const context = document.getElementById('workflow-context');
  const source = document.getElementById('exam-status');
  const onChange = () => {
    if (!source) return;
    const value = source.textContent.trim() || 'Yeni taslak';
    // The autosave manager owns #workflow-save-state (pending/saving/error).
    // Do not overwrite that detailed status when only the exam approval badge changes.
    if (context) context.textContent = value === 'KAYDEDİLMEDİ' ? 'Kaydedilmemiş değişiklikler' : value;
  };
  if (source) { new MutationObserver(onChange).observe(source,{subtree:true,childList:true,characterData:true});onChange(); }
}
const filter = document.querySelector('.library-filter');
const library = document.getElementById('exam-library-list');
if (filter && library) {
  let selected = 'all';
  const apply = () => {
    for (const item of library.querySelectorAll('.exam-library-item')) {
      // Filter by trusted server-derived publication status, never item text.
      const published = item.dataset.libraryStatus === 'published';
      item.hidden = selected === 'published' ? !published : selected === 'draft' ? published : false;
    }
    for (const button of filter.querySelectorAll('[data-library-status]')) {
      const current = button.dataset.libraryStatus === selected;
      button.classList.toggle('active',current);
      button.setAttribute('aria-pressed',String(current));
    }
  };
  filter.addEventListener('click',event=>{
    const button = event.target.closest('[data-library-status]');
    if (!button || !filter.contains(button)) return;
    selected = button.dataset.libraryStatus;
    apply();
  });
  new MutationObserver(apply).observe(library,{childList:true});
}


// Progressive disclosure is presentation-only. Keep the original section nodes
// and their IDs intact so every existing editor handler continues to work.
const optionalExamTools=[
  // Keep major workflow section nodes and IDs unchanged. Native details make
  // the teacher workspace navigable without losing any editor listeners.
  ['exam-goal-section','BEP hedef doğrulama','İçe aktarılan hedefleri kaynakla karşılaştır'],
  ['exam-library-section','Kazanım ve soru bankası','İçerik seç veya kuruma ait soru ekle'],
  ['exam-output-section','Onay ve çıktı işlemleri','Kaydet, kaliteyi denetle ve yetkili çıktı al'],
  ['exam-goal-matrix-section','Hedef–soru kapsam matrisi','Kazanım ilişkilerini ve eksik bağlantıları incele'],
  ['exam-guided-panel','Hazır soru şablonları','Şablondan yeni soru oluştur'],
  ['exam-material-library','Görsel materyal kütüphanesi','Geometri ve görsel destekleri kullan'],
  ['exam-teacher-preview','Öğrenci görünümü önizlemesi','Sorunun uyarlanmış görünümünü kontrol et']
];
for(const [id,title,description] of optionalExamTools){
 const section=document.getElementById(id);
 if(!section||!section.parentNode)continue;
 const wrapper=document.createElement('details');
 wrapper.className='exam-optional-tool';
 if(['exam-goal-section','exam-library-section','exam-output-section'].includes(id))wrapper.classList.add('campus-major-module');
 if(id==='exam-output-section')wrapper.open=true;
 wrapper.dataset.toolId=id;
 const summary=document.createElement('summary');
 const name=document.createElement('span');
 name.textContent=title;
 const hint=document.createElement('small');
 hint.textContent=description;
 summary.append(name,hint);
 wrapper.appendChild(summary);
 section.parentNode.insertBefore(wrapper,section);
 wrapper.appendChild(section);
 // Deep links and keyboard focus may reference an optional section.
 // Reveal its native details before focusing/scrolling a target inside.
 if(location.hash&&section.contains(document.getElementById(location.hash.slice(1))))
  wrapper.open=true;
 wrapper.addEventListener('focusin',()=>{wrapper.open=true;});
}


// A progressive editor view: original fields, listeners and save logic stay in
// place. Only the presentation of inactive stages changes; advanced view
// restores every stage without discarding draft values.
if(nav){
 const editor=document.getElementById('exam-editor-card');
 const viewToggle=document.getElementById('workflow-view-toggle');
 if(editor&&viewToggle){
  const stageIds=['exam-main-fields','exam-goal-section','exam-library-section',
   'exam-question-section','exam-output-section'];
  const directChildFor=id=>{
   let node=document.getElementById(id);
   while(node&&node.parentElement!==editor)node=node.parentElement;
   return node?.parentElement===editor?node:null;
  };
  const nodes=[...editor.children];
  const stageStarts=stageIds.map((id,index)=>{
   const child=directChildFor(id);
   let at=nodes.indexOf(child);
   // Keep the headings attached to the related stage.
   if((index===0||index===3)&&at>0&&nodes[at-1].matches('.workspace-block-label'))
    at--;
   return at;
  });
  const valid=stageStarts.every((at,index)=>at>=0&&(index===0||at>stageStarts[index-1]));
  // DOM-only diagnostics for the isolated browser acceptance run.
  // Never log draft content, user identifiers or question answers.
  editor.dataset.workflowStagePositions=stageStarts.join(',');
  editor.dataset.workflowStageValid=String(valid);
  if(valid){
   const stageFor=index=>{
    let stage=-1;
    for(let i=0;i<stageStarts.length;i++)if(index>=stageStarts[i])stage=i;
    return stage;
   };
   let guided=true;
   const sync=index=>{
    const active=index>=0?index:0;
    guidedModeEnabled=guided;
    editor.classList.toggle('exam-guided-view',guided);
    for(const [position,node] of nodes.entries()){
     const stage=stageFor(position);
     // Editor title, save state, autosave and version/history stay visible.
     const hide=guided&&stage>=0&&stage!==active;
     node.hidden=hide;
     node.dataset.workflowHidden=String(hide);
     if(hide&&node.contains(document.activeElement))viewToggle.focus();
    }
    viewToggle.setAttribute('aria-pressed',String(guided));
    viewToggle.textContent=guided?'Tüm alanları göster':'Adım adım görünüme dön';
   };
   updateGuidedView=sync;
   viewToggle.addEventListener('click',()=>{
    guided=!guided;
    const current=steps.findIndex(step=>step.classList.contains('active'));
    sync(current);
   });
   sync(steps.findIndex(step=>step.classList.contains('active')));
  }else{
   // Fail open instead of hiding controls if the editor structure changes.
   viewToggle.hidden=true;
  }
 }
}

// Short question cards show the fields needed to write/score a question first.
// Optional presentation, visual support and review controls remain in the DOM.
// Delegated handlers in institutional-exams.mjs continue to receive all events.
const questionList=document.getElementById('exam-questions');
const questionJump=document.getElementById('exam-question-jump');
if(questionList&&questionJump){
 const expandedQuestions=new Set();
 // Question indices are presentation positions. Deleting one question shifts
 // later indices; carry each surviving disclosure to its new position.
 questionList.addEventListener('exam-question-removed',event=>{
  const removed=event.detail?.index;
  if(!Number.isSafeInteger(removed)||removed<0)return;
  const shifted=[...expandedQuestions].filter(index=>index!==removed).map(index=>index>removed?index-1:index);
  expandedQuestions.clear();
  for(const index of shifted)expandedQuestions.add(index);
 });
 // Opening a different exam must never inherit another draft's UI state.
 questionList.addEventListener('exam-question-reset',()=>expandedQuestions.clear());
 // Keep keyboard focus in view when an editor handler opens a concealed field.
 // No question state, answers or personal data are stored here.
 questionList.addEventListener('focusin',event=>{
   const details=event.target.closest('.exam-question-advanced');
   if(details&&!details.open)details.open=true;
 });
 const essentialField=new Set(['type','prompt','objective','points','options','pairs','answer']);
 const isEssential=node=>{
  if(node.matches('.exam-q-head'))return true;
  if(node.querySelector('[data-source-review]'))return true; // explicit source review should remain visible
  const fields=[...node.querySelectorAll('[data-qkey]')];
  if(node.matches('[data-qkey]'))fields.push(node);
  return fields.length>0&&fields.every(el=>essentialField.has(el.dataset.qkey));
 };
 // One delegated jump handler for any number of questions; no per-card
 // listeners survive a redraw and no exam content is copied into navigation.
 questionJump.addEventListener('click',event=>{
  const button=event.target.closest('[data-question-jump]');
  if(!button||!questionJump.contains(button))return;
  const index=Number(button.dataset.questionJump);
  if(!Number.isSafeInteger(index)||index<0)return;
  const card=questionList.querySelector(`.exam-question[data-qindex="${index}"]`);
  if(!card)return;
  card.scrollIntoView({block:'start',behavior:'auto'});
  const heading=card.querySelector('.exam-q-head strong');
  if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
 });
 let previousCards=[];
 const enhanceQuestions=()=>{
  const cards=[...questionList.querySelectorAll(':scope > .exam-question')];
  // MutationObserver fires again as we move optional fields into <details>.
  // Do not rebuild a 100-button navigator for changes within the same cards.
  if(cards.length===previousCards.length&&cards.every((card,index)=>card===previousCards[index]))return;
  previousCards=cards;
  questionJump.hidden=cards.length===0;
  // Draft replacement/deletion may change indices: discard stale expansion entries.
  for(const index of [...expandedQuestions]){
   if(index>=cards.length)expandedQuestions.delete(index);
  }
  const jumpItems=document.createDocumentFragment();
  for(const [index,card] of cards.entries()){
   const actualIndex=Number(card.dataset.qindex);
   const link=document.createElement('button');
   link.type='button';
   link.className='exam-question-jump-button';
   link.textContent='Soru '+(index+1);
   link.setAttribute('aria-label','Soru '+(index+1)+' düzenlemeye git');
   link.dataset.questionJump=String(actualIndex);
   jumpItems.appendChild(link);
   if(card.querySelector(':scope > .exam-question-advanced'))continue;
   const advanced=document.createElement('details');
   advanced.className='exam-question-advanced';
   if(expandedQuestions.has(actualIndex))advanced.open=true;
   const summary=document.createElement('summary');
   summary.textContent='Gelişmiş ayarlar ve erişilebilirlik kontrolleri';
   advanced.appendChild(summary);
   const optional=[...card.children].filter(node=>!isEssential(node));
   for(const node of optional)advanced.appendChild(node);
   if(!optional.length)continue;
   card.appendChild(advanced);
   // Programmatic focus, keyboard navigation and browser find may expose controls.
   // A section is never removed from the DOM: all editor handlers keep working.
   advanced.addEventListener('focusin',()=>{advanced.open=true;});
   advanced.addEventListener('toggle',()=>{
    if(!advanced.isConnected)return;
    if(advanced.open)expandedQuestions.add(actualIndex);
    else expandedQuestions.delete(actualIndex);
   });
  }
  // Append once even for long exams; avoid one live DOM mutation per jump.
  questionJump.replaceChildren(jumpItems);
 };
 new MutationObserver(enhanceQuestions).observe(questionList,{childList:true});
 enhanceQuestions();
}
