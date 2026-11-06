// Visual workflow helpers only. No network, cookies, credentials, or personal data storage.
const nav = document.querySelector('.workflow-nav');
if (nav) {
  const steps = Array.from(nav.querySelectorAll('[data-workflow-target]'));
  const findTarget = button => document.getElementById(button.dataset.workflowTarget);
  const previous=document.getElementById('workflow-prev');
  const next=document.getElementById('workflow-next');
  const stepCount=document.getElementById('workflow-step-count');
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


// Short question cards show the fields needed to write/score a question first.
// Optional presentation, visual support and review controls remain in the DOM.
// Delegated handlers in institutional-exams.mjs continue to receive all events.
const questionList=document.getElementById('exam-questions');
const questionJump=document.getElementById('exam-question-jump');
if(questionList&&questionJump){
 const expandedQuestions=new Set();
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
 const enhanceQuestions=()=>{
  const cards=[...questionList.querySelectorAll(':scope > .exam-question')];
  questionJump.hidden=cards.length===0;
  // Draft replacement/deletion may change indices: discard stale expansion entries.
  for(const index of [...expandedQuestions]){
   if(index>=cards.length)expandedQuestions.delete(index);
  }
  questionJump.replaceChildren();
  for(const [index,card] of cards.entries()){
   const actualIndex=Number(card.dataset.qindex);
   const link=document.createElement('button');
   link.type='button';
   link.className='exam-question-jump-button';
   link.textContent='Soru '+(index+1);
   link.setAttribute('aria-label','Soru '+(index+1)+' düzenlemeye git');
   link.addEventListener('click',()=>{
    card.scrollIntoView({block:'start',behavior:'auto'});
    const heading=card.querySelector('.exam-q-head strong');
    if(heading){
     heading.tabIndex=-1;
     heading.focus({preventScroll:true});
    }
   });
   questionJump.appendChild(link);
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
    if(advanced.open)expandedQuestions.add(actualIndex);
    else expandedQuestions.delete(actualIndex);
   });
  }
 };
 new MutationObserver(enhanceQuestions).observe(questionList,{childList:true});
 enhanceQuestions();
}
