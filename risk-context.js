// Read-only context filters use the same authorised applicability API as Operational Exposure.
(()=>{
 const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
 const type=document.getElementById('veroContextTypeFilter');
 const name=document.getElementById('veroApplicationFilter');
 const site=document.getElementById('veroSiteFilter');
 const status=document.getElementById('veroContextStatus');
 const retry=document.getElementById('veroContextRetry');
 const keys={'Project':'projects','Contract':'contracts','VM Location':'vm_locations','Site':'sites'};
 let contexts={},risks=[],assignments=[],dataReady=false,optionsError=false;
 let state='idle',dataState='loading',generation=0,controller=null;

 function fill(select,rows,placeholder){
  select.replaceChildren(new Option(placeholder,''));
  for(const row of rows)select.add(new Option((row.code?row.code+' · ':'')+(row.name||String(row.id)),String(row.id)));
  select.disabled=!rows.length;
 }
 function clearSite(){
  // Current applicability records have no site dimension. Do not infer it from context/site links.
  fill(site,[],'Choose Site in Context Type');
 }
 function emit(){
  retry.hidden=!(optionsError||state==='error');
  const message=dataState==='error'?'Risk Register data could not be loaded. Retry to reload authorised risks.':
   optionsError?'Operational Context options could not be loaded.':
   type.value&&state==='error'?'Risk applicability could not be loaded. No partial totals are shown.':
   type.value&&state!=='ready'?'Loading authorised risk applicability…':
   type.value&&assignments.some(a=>a.status==='Pending')?'Includes saved submissions awaiting Risk Officer approval. Totals use approved assessments.':'';
  status.textContent=[message,type.value==='Contract'&&state==='ready'&&!optionsError?
   'Includes risks recorded against contracts and their linked sites.':''].filter(Boolean).join(' ');
  document.dispatchEvent(new CustomEvent('vero-risk-context-assignments',{
   detail:{assignments,contractSites:(contexts.contract_sites||[]).filter(link=>
    (contexts.contracts||[]).some(c=>Number(c.id)===Number(link.context_id))&&
    (contexts.sites||[]).some(s=>Number(s.id)===Number(link.site_id))),ready:state==='ready',state}
  }));
 }
 async function read(path,signal){
  const token=localStorage.getItem('vero_session_token');
  if(!token)throw Error('Sign in to load Operational Context');
  const response=await fetch(API+path,{
   headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store',signal
  });
  if(!response.ok)throw Error('Context data unavailable ('+response.status+')');
  return response.json();
 }
 async function loadAssignments(){
  if(!dataReady){state=dataState==='error'?'error':'loading';emit();return;}
  if(state==='ready'||controller){emit();return;}
  const ticket=generation,active=new AbortController(),pending=risks.slice();
  controller=active;state='loading';assignments=[];emit();
  const loaded=[];
  let next=0;
  try{
   // Fetch only Master Risk IDs already returned by the authorised register.
   // A bounded pool avoids issuing one simultaneous request per risk.
   await Promise.all(Array.from({length:Math.min(6,pending.length)},async()=>{
    while(ticket===generation&&next<pending.length){
     const risk=pending[next++];
     const data=await read('/risks/'+encodeURIComponent(risk.id)+'/applicability',active.signal);
     if(!Array.isArray(data.assignments))throw Error('Invalid applicability response');
     for(const assignment of [...data.assignments,...(data.pending_contexts||[])]){
      if(['Applicable','Pending'].includes(assignment.status))loaded.push({...assignment,risk_id:risk.id});
     }
    }
   }));
   if(ticket!==generation)return;
   assignments=loaded;state='ready';
  }catch(error){
   active.abort();
   if(ticket!==generation)return;
   assignments=[];state='error';
   console.warn('VERO risk applicability unavailable',error);
  }finally{
   if(ticket===generation){controller=null;emit();}
  }
 }
 function changed(){
  clearSite();
  if(type.value)loadAssignments();
  else emit();
 }
 type.addEventListener('change',()=>{
  fill(name,contexts[keys[type.value]]||[],'All contexts');
  changed();
 });
 name.addEventListener('change',changed);
 function invalidate(){
  generation++;
  if(controller)controller.abort();
  controller=null;assignments=[];
  state=dataReady?'idle':dataState==='error'?'error':'loading';
  changed();
 }
 function acceptRiskData(detail){
  dataState=detail.state;dataReady=dataState==='ready';
  risks=dataReady?(detail.risks||[]):[];
  invalidate();
 }
 for(const eventName of ['vero-risk-data-loading','vero-risk-data-loaded','vero-risk-data-error']){
  document.addEventListener(eventName,event=>acceptRiskData(event.detail));
 }
 document.addEventListener('vero-risk-applicability-changed',invalidate);
 async function loadOptions(){
  try{
   contexts=await read('/risk/operational-contexts');
   const types=(contexts.context_types||[]).filter(value=>Object.hasOwn(keys,value));
   fill(type,types.map(value=>({id:value,name:value})),'All context types');
   fill(name,[],'Select context type first');clearSite();optionsError=false;emit();
  }catch(error){
   fill(type,[],'Context options unavailable');fill(name,[],'Select context type first');
   clearSite();optionsError=true;emit();console.warn('VERO Operational Context unavailable',error);
  }
 }
 retry.addEventListener('click',()=>{
  if(optionsError)loadOptions();
  else if(!dataReady)document.dispatchEvent(new CustomEvent('vero-risk-register-refresh'));
  else loadAssignments();
 });
 fill(type,[],'Loading context types…');fill(name,[],'Select context type first');clearSite();
 // Replay completed or in-flight initial load state if this external script loaded later.
 if(window.__veroRiskContextData)acceptRiskData(window.__veroRiskContextData);
 loadOptions();
})();
