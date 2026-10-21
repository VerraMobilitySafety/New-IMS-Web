/* Presentation adapters: preserve the original controls, permission gates and routes. */
(()=>{
 const $=s=>document.querySelector(s),node=(tag,c)=>{const n=document.createElement(tag);n.className=c;return n};
 const add=(n,c)=>n?.classList.add(c);
 function contexts(after,items){
  const row=node('section','vr-summary vr-context-summary');row.setAttribute('aria-label','Register context');
  for(const [value,label] of items){const c=node('div','vr-card vr-context'),b=document.createElement('b'),s=document.createElement('span');b.textContent=value;s.textContent=label;c.append(b,s);row.append(c)}after.after(row);return row;
 }
 function cards(row){if(!row)return;add(row,'vr-summary');for(const c of row.children)add(c,'vr-card')}
 function toolbar(panel,search){const bar=node('div','vr-toolbar'),filters=node('div','vr-filters');if(search){add(search,'vr-search');bar.append(search)}bar.append(filters);panel.prepend(bar);return {bar,filters}}
 function viewControl(buttons,onChange){
  const label=document.createElement('label'),select=document.createElement('select');label.append('View ',select);select.setAttribute('aria-label','View');
  for(const [value,text] of buttons){const opt=document.createElement('option');opt.value=value;opt.textContent=text;select.append(opt)}
  select.onchange=()=>onChange(select.value);return {label,select};
 }
 function records(){
  add($('.records-toolbar'),'vr-actions');cards($('.records-kpis'));add($('.records-panel'),'vr-register');
  $('.records-toolbar').replaceChildren($('#addRecordBtn'));
  contexts($('.records-toolbar'),[['Accessible records','Records available to your account'],['Retention','Review the recorded retention date'],['Controlled copies','Request a copy from the record'],['Record details','Open a row to view the record']]);
  const buttons=[...document.querySelectorAll('.records-tab')],selectors=[];
  $('.records-tabs').hidden=true;
  const panels=['recordsRegisterPanel','retentionSchedulePanel','recordsDispositionPanel','recordsHoldsPanel'];
  panels.forEach((id,i)=>{
   const panel=$('#'+id),search=panel.querySelector('input[type=search]'),old=panel.querySelector('.records-filters');
   const {filters}=toolbar(panel,search);search.setAttribute('aria-label',i?'Search '+buttons[i].textContent.trim():'Search records');
   const view=viewControl([],value=>buttons.find(b=>b.dataset.tab===value)?.click());selectors.push(view.select);filters.append(view.label);
   if(i===0){
    const more=node('details','vr-more records-manager-filter'),title=document.createElement('summary'),body=node('div','vr-more-body');title.textContent='More filters';more.append(title,body);
    for(const el of [...old.children]){if(el.classList.contains('records-manager-filter'))body.append(el);else filters.append(el)}
    filters.append(more);
    filters.append($('#clearRecordFilters'));$('.records-search-toolbar').remove();old.remove();
   }else{for(const el of [...old.children])filters.append(el);old.remove()}
  });
  function sync(){
   const manager=document.body.dataset.recordsManager==='true',active=buttons.find(b=>b.classList.contains('active'))?.dataset.tab||'register';
   for(const select of selectors){
    select.replaceChildren();for(const button of buttons){if(!manager&&button.dataset.tab!=='register')continue;const option=document.createElement('option');option.value=button.dataset.tab;option.textContent=button.textContent.trim();select.append(option)}select.value=active;
   }
  }
  buttons.forEach(b=>b.addEventListener('click',sync));new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['data-records-manager']});sync();
 }
 function risk(){
  const action=$('.vero-risk-primary-actions'),outer=$('#veroCompactFilterBarV3'),compact=$('#veroCompactRiskLayout'),panel=$('#veroRiskTableBody').closest('section');
  outer.before(action);add(action,'vr-actions');
  const more=node('details','vr-more vr-risk-actions'),title=document.createElement('summary'),menu=node('div','vr-more-body');title.textContent='More actions';menu.append($('#veroManageRiskHierarchy'));more.append(title,menu);action.append(more);
  menu.addEventListener('click',()=>more.open=false);
  contexts(action,[['Risk classification','Search the authorised hierarchy'],['Assessment basis','Compare residual and inherent risk'],['Operational context','Filter by available context data'],['Assessment matrix','Available below the risk register']]);
  compact.prepend(panel);add(panel,'vr-register');
  const {bar,filters}=toolbar(panel,$('#veroRiskSearch'));
  for(const id of ['veroRiskAssessmentFilter','veroRiskLevelFilter']){const control=$('#'+id),label=document.createElement('label');label.textContent=id==='veroRiskAssessmentFilter'?'Assessment':'Risk level';label.append(control);filters.append(label)}
  $('#veroRiskSearch').setAttribute('aria-label','Search risks');
  const detail=node('details','vr-risk-refine'),refineTitle=document.createElement('summary');refineTitle.textContent='Classification and context filters';detail.append(refineTitle,$('.vero-risk-filter-panels'));bar.after(detail);
  $('.vero-risk-primary-row').remove(); // only empty wrappers remain; controls moved above
  // The matrix and supporting dashboards stay in their original, accessible section.
 }
 function incidents(){
  const action=$('#new-report').closest('.toolbar'),content=$('#content');add(action,'vr-actions');
  const buttons=['dashboard','register','incident-actions','injury-register-button','deleted-records'].map(id=>$('#'+id)).filter(Boolean);
  const nav=node('div','vr-original-navigation');action.after(nav);nav.append(...buttons);nav.hidden=true;
  const context=contexts(action,[['Event reporting','Report and investigate events'],['Accessible events','Existing account permissions apply'],['Investigation actions','Track linked prevention actions'],['Dashboards','Available through the View selector']]);
  function render(){
   if(content.querySelector('.vr-view-toolbar'))return;
   const kpis=content.querySelector('.dashboard-kpis');cards(kpis);context.hidden=!!kpis;
   const register=$('#event-rows')?.closest('.card'),panel=register||content;
   if(register)add(register,'vr-register');
   const {bar,filters}=toolbar(panel,$('#event-register-search'));add(bar,'vr-view-toolbar');
   const available=buttons.filter(b=>!b.hidden&&b.id!=='incident-actions').map(b=>[b.id,b.textContent]);
   action.querySelector('.incident-admin-view')?.remove();
   const view=viewControl(available,value=>$('#'+value).click());add(view.label,'incident-admin-view');
   view.label.hidden=document.body.dataset.incidentAdministrator!=='true';action.append(view.label);
   const route=new URLSearchParams(location.search).get('view');
   view.select.value=route==='register'?'register':route==='actions'?'incident-actions':route==='injuries'?'injury-register-button':route==='deleted'?'deleted-records':'dashboard';
   if(register){
    const state=$('#event-filter');filters.append(state.closest('label'));const period=register.querySelector('.event-period');
    if(period){const note=period.querySelector('p');if(note){add(note,'vr-register-note');register.append(note)}filters.append(period)}
    add(register.querySelector('h2'),'vr-sr-only');
    for(const note of [...register.children].filter(n=>n.tagName==='P')){add(note,'vr-register-note');register.append(note)}
   }
   if(kpis){
    const dashboard=kpis.parentElement;
    dashboard.prepend(kpis);kpis.after(bar);
    const tabs=dashboard.querySelector('.report-tabs');
    if(tabs){add(tabs,'vr-segments');filters.prepend(tabs)}
    const period=dashboard.querySelector('.event-period');
    if(period){
     const note=period.querySelector('p');
     if(note){add(note,'vr-register-note');bar.after(note)}
     add(period,'incident-time-filters');bar.append(period);
    }
    const monthly=dashboard.querySelector('.monthly-filters');
    if(monthly){filters.append(...monthly.children);monthly.remove()}
    dashboard.querySelector('.monthly-heading')?.remove();
    const contextFilters=dashboard.querySelector('.event-context-filters');if(contextFilters){filters.append(...contextFilters.children);contextFilters.remove()}
   }
  }
  new MutationObserver(render).observe(content,{childList:true});render();
 }
 function init(){const page=document.body.dataset.registerLayout;if(page==='records')records();if(page==='risk')risk();if(page==='incidents')incidents()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
