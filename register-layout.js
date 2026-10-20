/* Opt-in presentation adapters. Move existing controls, retaining their handlers. */
(()=>{
 'use strict';
 const $=s=>document.querySelector(s),add=(node,name)=>node?.classList.add(name);
 function summary(after,items){
  if(!after)return;
  const row=document.createElement('section');row.className='vr-summary';row.setAttribute('aria-label','Register summary');
  for(const [value,label] of items){const card=document.createElement('div');card.className='vr-card vr-context';const b=document.createElement('b'),span=document.createElement('span');b.textContent=value;span.textContent=label;card.append(b,span);row.append(card)}
  after.after(row);
 }
 function cards(selector){const row=$(selector);add(row,'vr-summary');if(row)for(const child of row.children)add(child,'vr-card')}
 function more(actions){
  if(!actions||actions.children.length<2)return;
  const secondary=[...actions.children].slice(1),details=document.createElement('details'),title=document.createElement('summary'),body=document.createElement('div');
  details.className='vr-more';title.textContent='More actions';body.className='vr-more-body';body.append(...secondary);details.append(title,body);actions.append(details);
  body.addEventListener('click',e=>{if(e.target.closest('button'))details.open=false});
  document.addEventListener('click',e=>{if(!details.contains(e.target))details.open=false});
  details.addEventListener('keydown',e=>{if(e.key==='Escape'){details.open=false;title.focus()}});
 }
 function scrollTable(table){if(!table||table.parentElement.classList.contains('vr-table-scroll'))return;const wrap=document.createElement('div');wrap.className='vr-table-scroll';table.before(wrap);wrap.append(table)}
 function mobile(){
  if($('.insurance-mobile-nav')||$('.vr-mobile-menu'))return;
  const sidebar=$('.sidebar');if(!sidebar)return;
  sidebar.id=sidebar.id||'registerSidebar';
  const button=document.createElement('button');button.type='button';button.className='vr-mobile-menu';button.textContent='Menu';button.setAttribute('aria-controls',sidebar.id);button.setAttribute('aria-expanded','false');
  button.onclick=()=>button.setAttribute('aria-expanded',String(document.body.classList.toggle('vr-nav-open')));document.body.prepend(button);
 }
 function init(){
  const page=document.body.dataset.registerLayout;if(!page)return;document.body.classList.add('vr-page');mobile();
  const actions=$('main>.actions');add(actions,'vr-actions');
  if(page==='documents'){
   summary(actions,[['Current versions','Controlled document scope'],['Document owners','Ownership recorded in the register'],['Review dates','Due for Review uses the next 60 days'],['Controlled records','View published documents and history']]);
   add($('.document-library'),'vr-register');add($('.document-toolbar'),'vr-toolbar');add($('.document-search-wrap'),'vr-search');add($('.document-filters'),'vr-filters');add($('.document-view-toggle'),'vr-segments');
   $('.document-search-icon')?.remove();$('#documentSearch')?.setAttribute('aria-label','Search controlled documents');scrollTable($('#controlledDocumentsTable'));
  }
  if(page==='compliance'){
   summary(actions,[['Regulatory','Source requirements'],['Internal','Organisational requirements'],['Client','Contract requirements'],['Not enabled','Summary totals']]);
   const install=()=>{
    const panel=$('#contractRequirementRegister');if(!panel||panel.dataset.layoutReady)return false;panel.dataset.layoutReady='true';add(panel,'vr-register');
    const toolbar=$('.contract-requirement-filters'),search=$('#contractRequirementSearch')?.closest('label'),filters=document.createElement('div');filters.className='vr-filters';add(toolbar,'vr-toolbar');add(search,'vr-search');
    const types=$('.compliance-view-toggle');add(types,'vr-segments');if(types)filters.append(types);
    for(const control of [...toolbar.children])if(control!==search)filters.append(control);
    toolbar.append(filters);$('.compliance-type-panel')?.remove();
    for(const label of toolbar.querySelectorAll('label'))for(const text of [...label.childNodes])if(text.nodeType===3&&text.textContent.trim()){const span=document.createElement('span');span.className='vr-sr-only';span.textContent=text.textContent;label.replaceChild(span,text)}
    // Keep the explanatory copy accessible, below the register, without a second header band.
    const heading=panel.querySelector(':scope>h2');if(heading){heading.id='requirementsRegisterTitle';heading.hidden=true;panel.setAttribute('aria-labelledby',heading.id)}
    const note=panel.querySelector(':scope>p:not([id])');if(note){add(note,'vr-register-note');panel.append(note)}
    add($('#contractRequirementCount'),'vr-register-note');add($('.contract-requirement-pages'),'vr-register-note');return true;
   };
   if(!install()){const observer=new MutationObserver(()=>{if(install())observer.disconnect()});observer.observe(document.querySelector('main'),{childList:true,subtree:true})}
  }
  if(page==='insurance'){
   cards('.kpis');add($('#insurancePanel'),'vr-register');add($('#insuranceToolbar'),'vr-toolbar');add($('#search'),'vr-search');add($('.insurance-filters'),'vr-filters');add($('#insuranceViews'),'vr-segments');
  }
  if(page==='contractors'){
   more(actions);cards('.kpis');const panel=$('#content')?.closest('.panel');add(panel,'vr-register');
   const toolbar=$('.panel-head');add(toolbar,'vr-toolbar');const search=$('#search');add(search,'vr-search');
   const heading=$('#heading');if(heading)heading.hidden=true;
   const filters=document.createElement('div');filters.className='vr-filters';const label=document.createElement('label');label.textContent='View ';
   const select=document.createElement('select');select.setAttribute('aria-label','Contractor view');
   for(const button of document.querySelectorAll('#tabs [data-tab]')){const option=document.createElement('option');option.value=button.dataset.tab;option.textContent=button.textContent;select.append(option)}
   // Existing tab click handler continues to own state, selection and drawer behaviour.
   select.onchange=()=>document.querySelector('#tabs [data-tab="'+select.value+'"]')?.click();
   $('#tabs').hidden=true;label.append(select);filters.append(label);toolbar.append(filters);$('#content').style.padding='0';
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
