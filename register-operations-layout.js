/* Batch 2: presentation only; existing controls retain their state and listeners. */
(()=>{
 const $=s=>document.querySelector(s),cls=(n,c)=>(n?.classList.add(c),n);
 const node=(tag,c)=>{const n=document.createElement(tag);n.className=c;return n};
 function contexts(anchor,items){const row=node('section','vr-summary');row.setAttribute('aria-label','Register summary');for(const [value,label] of items){const c=node('div','vr-card vr-context'),b=document.createElement('b'),s=document.createElement('span');b.textContent=value;s.textContent=label;c.append(b,s);row.append(c)}anchor.after(row);return row}
 function cards(row){cls(row,'vr-summary');for(const c of row.children)cls(c,'vr-card')}
 function toolbar(panel,search){const bar=node('div','vr-toolbar'),filters=node('div','vr-filters');if(search){cls(search,'vr-search');bar.append(search)}bar.append(filters);panel.prepend(bar);return {bar,filters}}
 function init(){
  const page=document.body.dataset.registerLayout;
  if(page==='contracts'){
   const action=$('.project-toolbar'),button=$('.project-tools button'),panel=$('.project-list'),search=$('#search');
   action.replaceChildren(button);cls(action,'vr-actions');cards($('.lifecycle-grid'));cls(panel,'vr-register');
   const {filters}=toolbar(panel,search),select=document.createElement('select');select.setAttribute('aria-label','Filter contracts');
   const choices=[['all','All contracts'],['active','Active'],['renew','Renewal due within 90 days'],['attention','Requires attention']];
   for(const [value,text] of choices){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option)}
   const buttons=[...document.querySelectorAll('.lifecycle-card')];
   select.onchange=()=>buttons[choices.findIndex(([value])=>value===select.value)].click();
   buttons.forEach((button,i)=>button.addEventListener('click',()=>{select.value=choices[i][0]}));
   filters.append(select);search.setAttribute('aria-label','Search customer contracts');
  }
  if(page==='locations'){
   const head=$('.page-head');
   contexts(head,[['VM locations','Operational location directory'],['Australia & New Zealand','Locations listed in the directory'],['United Kingdom','Locations listed in the directory'],['Location profiles','Open a location for its details']]);
   const grid=$('#sitesGrid'),panel=node('section','vr-register'),tools=$('.site-tools');
   grid.before(panel);panel.append(tools,grid);cls(tools,'vr-toolbar');cls($('#siteFilter'),'vr-search');$('#siteFilter').setAttribute('aria-label','Search locations');
   const filters=node('div','vr-filters');filters.append($('#siteCount'));tools.append(filters);
   if($('#noSites'))panel.append($('#noSites'));
   grid.style.padding='18px';
  }
  if(page==='users'){
   const action=$('#adminContent>.admin-toolbar');cls(action,'vr-actions');
   const title=action.querySelector('.admin-title');if(title)title.hidden=true;
   contexts(action,[['Administrator','Restricted user management'],['Business Roles','Manage assigned responsibilities'],['Invitations','Expire after 72 hours'],['Access history','Disable users to preserve history']]);
   const panel=$('#userBody').closest('.panel');cls(panel,'vr-register');
   const {filters}=toolbar(panel,$('#userSearch'));filters.append($('#statusFilter'));$('#userSearch').setAttribute('aria-label','Search users');$('#statusFilter').setAttribute('aria-label','Filter user status');
   $('.user-tools')?.remove();const note=$('.admin-only-note');if(note){cls(note,'vr-register-note');panel.append(note)}
   const head=panel.querySelector('.panel-head');if(head){cls(head,'vr-register-note');panel.append(head)}
  }
  if(page==='actions'){
   const container=$('.actions-page'),panel=$('.action-list-panel'),bar=$('.action-toolbar'),anchor=document.createElement('div');container.prepend(anchor);
   contexts(anchor,[['Assigned to you','Your outstanding work'],['Overdue','Filter actions past their due date'],['Source records','Documents, compliance, risks and more'],['Workflow actions','Open an item to review or respond']]);anchor.remove();
   cls(panel,'vr-register');panel.prepend(bar);cls(bar,'vr-toolbar');cls($('#actionSearch'),'vr-search');$('#actionSearch').setAttribute('aria-label','Search actions');
   const group=$('.action-toolbar-filters'),filters=node('div','vr-filters');cls(group,'vr-segments');group.before(filters);filters.append(group);
  }
  if(page==='client-sites'){
   const container=$('#siteRegister'),action=$('.site-register-actions'),primary=$('#siteAdd');action.prepend(primary);container.prepend(action);cls(action,'vr-actions');
   const menu=node('details','vr-more'),title=document.createElement('summary'),body=node('div','vr-more-body');title.textContent='More actions';body.append($('#siteMatchHistory'));menu.append(title,body);action.append(menu);body.addEventListener('click',()=>menu.open=false);document.addEventListener('click',e=>{if(!menu.contains(e.target))menu.open=false});menu.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.open=false;title.focus()}});
   cards($('.site-register-kpis'));const extra=node('div','vr-card vr-context'),b=document.createElement('b'),span=document.createElement('span');b.textContent='12 months';span.textContent='Recent event history window';extra.append(b,span);$('.site-register-kpis').append(extra);
   const panel=container.querySelector('.panel'),bar=$('.site-register-filters'),search=$('#siteSearch').closest('label');cls(panel,'vr-register');panel.prepend(bar);cls(bar,'vr-toolbar');cls(search,'vr-search');
   const filters=node('div','vr-filters');for(const child of [...bar.children])if(child!==search)filters.append(child);bar.append(filters);
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
