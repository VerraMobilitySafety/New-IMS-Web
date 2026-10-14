// VERO Risk Office drawer actions. Requires authorised backend endpoints.
(function(){
 const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
 const overlay=document.getElementById('veroRiskDetailsOverlay');
 const title=document.getElementById('veroRiskDetailsTitle');
 const content=document.getElementById('veroRiskDetailsContent');
 const tabs=overlay.querySelector('.vero-risk-details-tabs');
 const actions=document.createElement('div');
 actions.className='vero-risk-office-actions';
 actions.innerHTML='<button type="button" id="veroRiskOfficeEdit" hidden>Edit Draft Risk</button><span id="veroRiskOfficeStatus" role="status"></span>';
 tabs.before(actions);
 const edit=actions.querySelector('button'),status=actions.querySelector('span');
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
  selected=event.detail.risk;authorised=false;edit.hidden=true;status.textContent='';version++;
  const seq=version;
  try{
   const response=await fetch(API+'/auth/my-roles',{headers:headers()});
   if(!response.ok)return;
   const data=await response.json();
   if(seq!==version)return;
   authorised=(data.roles||[]).some(r=>r.role_name==='Risk Manager');
   edit.hidden=!(authorised&&selected.status==='Draft');
  }catch(error){console.warn('Risk Office role lookup unavailable',error);}
 });
 edit.addEventListener('click',showEdit);
 tabs.addEventListener('click',event=>{
  const tab=event.target.closest('[data-risk-tab]');
  if(tab?.dataset.riskTab==='history'){version++;showHistory();}
 });
})();
