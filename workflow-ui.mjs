// Visual workflow helpers only. No network, cookies, credentials, or personal data storage.
const nav = document.querySelector('.workflow-nav');
if (nav) {
  const steps = Array.from(nav.querySelectorAll('[data-workflow-target]'));
  const findTarget = button => document.getElementById(button.dataset.workflowTarget);
  const activate = button => {
    for (const step of steps) {
      const selected = step === button;
      step.classList.toggle('active',selected);
      if (selected) step.setAttribute('aria-current','step');
      else step.removeAttribute('aria-current');
    }
  };
  for (const button of steps) button.addEventListener('click', () => {
    const target = findTarget(button);
    if (!target) return;
    activate(button);
    target.scrollIntoView({block:'start',behavior:'auto'});
    const heading = target.querySelector('h3') || target;
    heading.setAttribute('tabindex','-1');
    heading.focus({preventScroll:true});
  });
  // Focus mode changes only presentation: never destroys a draft or saves it.
  const focusToggle=document.getElementById('exam-focus-toggle');
  const workspace=document.getElementById('exam-workspace');
  if(focusToggle&&workspace){
    focusToggle.addEventListener('click',()=>{
      const enabled=!workspace.classList.contains('exam-focus-mode');
      workspace.classList.toggle('exam-focus-mode',enabled);
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
 if(location.hash&&section.contains(document.getElementById(decodeURIComponent(location.hash.slice(1)))))
  wrapper.open=true;
 wrapper.addEventListener('focusin',()=>{wrapper.open=true;});
}
