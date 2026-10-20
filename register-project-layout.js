/* Project landing presentation only. Reuse the released workflow and permissions. */
(()=>{
 function init(){
  if(document.body.dataset.registerLayout!=='projects')return;
  const action=document.querySelector('.project-toolbar'),search=document.getElementById('projectSearch'),primary=action.querySelector('button');
  const cards=document.querySelector('.lifecycle-grid'),panel=document.querySelector('.project-list');
  action.replaceChildren(primary);action.classList.add('vr-actions');
  cards.classList.add('vr-summary');for(const card of cards.children)card.classList.add('vr-card');
  panel.classList.add('vr-register');
  const bar=document.createElement('div'),filters=document.createElement('div'),select=document.createElement('select');
  bar.className='vr-toolbar';filters.className='vr-filters';search.classList.add('vr-search');search.setAttribute('aria-label','Search projects');
  select.setAttribute('aria-label','Filter project lifecycle');
  const buttons=[...cards.querySelectorAll('[data-filter]')];
  for(const button of buttons){const option=document.createElement('option');option.value=button.dataset.filter;option.textContent=button.querySelector('span').textContent;select.append(option);button.addEventListener('click',()=>select.value=button.dataset.filter)}
  select.value=buttons.find(b=>b.classList.contains('active'))?.dataset.filter||'all';
  select.addEventListener('change',()=>buttons.find(b=>b.dataset.filter===select.value)?.click());
  filters.append(select);bar.append(search,filters);panel.prepend(bar);
  const table=panel.querySelector('table'),wrap=document.createElement('div');wrap.className='vr-table-scroll';table.before(wrap);wrap.append(table);
  const note=panel.querySelector('.panel-head');note.classList.add('vr-register-note');note.querySelector('h2').classList.add('vr-sr-only');panel.append(note);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
