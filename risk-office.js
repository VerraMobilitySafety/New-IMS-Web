// VERO Risk Office drawer actions. Requires authorised backend endpoints.
(function(){
 const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
 const overlay=document.getElementById('veroRiskDetailsOverlay');
 const title=document.getElementById('veroRiskDetailsTitle');
 const content=document.getElementById('veroRiskDetailsContent');
 const tabs=overlay.querySelector('.vero-risk-details-tabs');
 const actions=document.createElement('div');
 actions.className='vero-risk-office-actions';
 actions.innerHTML='<button type="button" id="veroRiskOfficeEdit" hidden>Edit Draft Risk</button><button type="button" id="veroRiskOfficeApprove" hidden>Approve</button><button type="button" id="veroRiskOfficeChanges" hidden>Request Changes</button><span id="veroRiskOfficeStatus" role="status"></span>';
 tabs.before(actions);
 const edit=actions.querySelector('button'),status=actions.querySelector('span');
 const approve=actions.querySelector('#veroRiskOfficeApprove');
 const changes=actions.querySelector('#veroRiskOfficeChanges');
 function syncActions(){
  const show=authorised&&selected?.status==='Draft';
  edit.hidden=!show;approve.hidden=!show;changes.hidden=!show;
 }
 async function decide(decision){
  if(!authorised||selected?.status!=='Draft')return;
  const reason=window.prompt(decision==='Approved'?'Approval rationale (required):':'Reason for requesting changes (required):');
  if(reason===null)return;
  if(!reason.trim()){status.textContent='A reason is required.';return;}
  if(reason.length>2000){status.textContent='Reason must be 2000 characters or fewer.';return;}
  if(decision==='Approved'&&!window.confirm('Approve this Master Risk definition?'))return;
  approve.disabled=true;changes.disabled=true;status.textContent='Recording decision...';
  try{
   const response=await fetch(API+'/risks/'+encodeURIComponent(selected.id)+'/office-decision',{
    method:'POST',headers:headers(),body:JSON.stringify({decision,reason:reason.trim()})
   });
   const data=await response.json();
   if(!response.ok)throw Error(data.message||'Unable to record decision');
   selected.status=data.risk_status||selected.status;
   status.textContent=decision==='Approved'?'Approved. Register updating...':'Changes requested. Register updating...';
   document.dispatchEvent(new CustomEvent('vero-risk-register-refresh',{detail:{riskId:selected.id,decision}}));
   syncActions();
   document.getElementById('veroRiskDetailsClose')?.click();
  }catch(error){status.textContent=error.message;}
  finally{approve.disabled=false;changes.disabled=false;}
 }
 approve.addEventListener('click',()=>decide('Approved'));
 changes.addEventListener('click',()=>decide('Changes Requested'));

 let selected=null,authorised=false,version=0;
 const headers=()=>({Authorization:'Bearer '+localStorage.getItem('vero_session_token'),Accept:'application/json','Content-Type':'application/json'});
 const field=(form,label,name,value,tag='input')=>{
  const wrapper=document.createElement('label');wrapper.textContent=label;
  const el=document.createElement(tag);el.name=name;el.value=value||'';
  el.required=name!=='risk_description';el.maxLength=name==='risk_title'?255:name==='reason'?2000:10000;
  wrapper.appendChild(el);form.appendChild(wrapper);return el;
 };
 function showEdit(){
  if(!selected||!authorised||selected.status!=='Draft')return;
  const form=document.createElement('form');form.className='vero-risk-office-form';
  const h=document.createElement('h3');h.textContent='Edit Draft Master Risk';form.appendChild(h);
  const name=field(form,'Risk Title','risk_title',selected.risk_title);
  const description=field(form,'Risk Description','risk_description',selected.risk_description,'textarea');
  const reason=field(form,'Reason for Change','reason','','textarea');
  const save=document.createElement('button');save.textContent='Save Changes';save.type='submit';
  const cancel=document.createElement('button');cancel.textContent='Cancel';cancel.type='button';
  cancel.onclick=()=>document.querySelector('[data-risk-tab="overview"]')?.click();
  form.append(save,cancel);content.replaceChildren(form);
  form.onsubmit=async event=>{
   event.preventDefault();save.disabled=true;status.textContent='Saving...';
   try{
    const response=await fetch(API+'/risks/'+encodeURIComponent(selected.id)+'/definition',{
     method:'PUT',headers:headers(),body:JSON.stringify({
      risk_title:name.value.trim(),risk_description:description.value.trim(),reason:reason.value.trim()
     })
    });
    const data=await response.json();
    if(!response.ok)throw Error(data.message||'Unable to save');
    selected.risk_title=name.value.trim();selected.risk_description=description.value.trim();
    title.textContent=selected.risk_title;status.textContent='Saved. Refresh register for updated results.';
    document.querySelector('[data-risk-tab="overview"]')?.click();
   }catch(error){status.textContent=error.message;}finally{save.disabled=false;}
  };
 }
 async function showHistory(){
  const current=selected,seq=version;
  content.textContent='Loading change history...';
  try{
   const response=await fetch(API+'/risks/'+encodeURIComponent(current.id)+'/history',{headers:headers()});
   const data=await response.json();
   if(!response.ok)throw Error(data.message||'History unavailable');
   if(seq!==version||overlay.hidden)return;
   content.replaceChildren();
   const records=data.history||[];
   if(!records.length){content.textContent='No recorded changes yet.';return;}
   for(const entry of records){
    const card=document.createElement('section');card.className='vero-risk-details-card';
    const heading=document.createElement('h3');heading.textContent=entry.action;
    const body=document.createElement('p');
    body.textContent=[entry.changed_by,entry.changed_at,entry.reason].filter(Boolean).join(' · ');
    card.append(heading,body);content.appendChild(card);
   }
  }catch(error){if(seq===version)content.textContent=error.message;}
 }
 document.addEventListener('vero-risk-open-details',async event=>{
  selected=event.detail.risk;authorised=false;syncActions();status.textContent='';version++;
  const seq=version;
  try{
   const response=await fetch(API+'/auth/my-roles',{headers:headers()});
   if(!response.ok)return;
   const data=await response.json();
   if(seq!==version)return;
   authorised=(data.roles||[]).some(r=>r.role_name==='Risk Manager');
   syncActions();
  }catch(error){console.warn('Risk Office role lookup unavailable',error);}
 });
 edit.addEventListener('click',showEdit);
 tabs.addEventListener('click',event=>{
  const tab=event.target.closest('[data-risk-tab]');
  if(tab?.dataset.riskTab==='history'){version++;showHistory();}
 });
})();
