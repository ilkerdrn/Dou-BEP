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
  const status = document.getElementById('workflow-save-state');
  const context = document.getElementById('workflow-context');
  const source = document.getElementById('exam-status');
  const onChange = () => {
    if (!source) return;
    const value = source.textContent.trim() || 'Yeni taslak';
    if (status) status.textContent = value;
    if (context) context.textContent = value === 'KAYDEDİLMEDİ' ? 'Yeni taslak' : value;
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
