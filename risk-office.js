// VERO Risk Office drawer actions. Requires authorised backend endpoints.
(function(){
 const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
 const overlay=document.getElementById('veroRiskDetailsOverlay');
 const title=document.getElementById('veroRiskDetailsTitle');
 const content=document.getElementById('veroRiskDetailsContent');
 const tabs=overlay.querySelector('.vero-risk-details-tabs');
 const submissionTab=document.createElement('button');submissionTab.type='button';submissionTab.dataset.riskTab='project-submission';submissionTab.textContent='Submitted package';submissionTab.hidden=true;tabs.appendChild(submissionTab);
 const actions=document.createElement('div');
 actions.className='vero-risk-office-actions';
 actions.innerHTML='<button type="button" id="veroRiskOfficeEdit" hidden>Edit Draft Risk</button><button type="button" id="veroRiskOfficeApprove" hidden>Approve</button><button type="button" id="veroRiskOfficeChanges" hidden>Request Changes</button><button type="button" id="veroRiskOfficeArchive" hidden>Archive Master Risk</button><span id="veroRiskOfficeStatus" role="status"></span>';
 tabs.before(actions);
 const edit=actions.querySelector('button'),status=actions.querySelector('span');
 const approve=actions.querySelector('#veroRiskOfficeApprove');
 const changes=actions.querySelector('#veroRiskOfficeChanges');
 const archive=actions.querySelector('#veroRiskOfficeArchive');
 const canArchivePackage=()=>submissionState==='none'||(submissionState==='package'&&submissionData?.approval_state==='Approved');
 function syncActions(){
  const show=authorised&&selected?.status==='Draft'&&submissionState==='none';
  edit.hidden=!show;approve.hidden=!show;changes.hidden=!show;
  archive.hidden=!(authorised&&selected&&canArchivePackage()&&['Draft','Open','Closed'].includes(selected.status));
 }
 async function decide(decision){
  if(!authorised||selected?.status!=='Draft'||submissionState!=='none')return;
  const current=selected,seq=version;
  const reason=window.prompt(decision==='Approved'?'Approval rationale (required):':'Reason for requesting changes (required):');
  if(reason===null)return;
  if(!reason.trim()){status.textContent='A reason is required.';return;}
  if(reason.length>2000){status.textContent='Reason must be 2000 characters or fewer.';return;}
  if(decision==='Approved'&&!window.confirm('Approve this Master Risk definition?'))return;
  approve.disabled=true;changes.disabled=true;status.textContent='Recording decision...';
  try{
   const response=await fetch(API+'/risks/'+encodeURIComponent(current.id)+'/office-decision',{
    method:'POST',headers:headers(),body:JSON.stringify({decision,reason:reason.trim()})
   });
   const data=await response.json();
   if(!response.ok)throw Error(data.message||'Unable to record decision');
   current.status=data.risk_status||current.status;
   document.dispatchEvent(new CustomEvent('vero-risk-register-refresh',{detail:{riskId:current.id,decision}}));
   if(seq!==version||overlay.hidden)return;
   status.textContent=decision==='Approved'?'Approved. Register updating...':'Changes requested. Register updating...';
   syncActions();
   document.getElementById('veroRiskDetailsClose')?.click();
  }catch(error){if(seq===version&&!overlay.hidden)status.textContent=error.message;}
  finally{approve.disabled=false;changes.disabled=false;}
 }
 archive.addEventListener('click',async()=>{
  if(!authorised||!selected||!canArchivePackage()||!['Draft','Open','Closed'].includes(selected.status))return;
  const current=selected,seq=version;
  const reason=window.prompt('Reason for archiving this Master Risk:');
  if(reason===null)return;
  if(!reason.trim()||reason.length>2000){status.textContent='A justification of up to 2000 characters is required.';return;}
  if(!window.confirm('Archive this Master Risk? Its history will be retained.'))return;
  archive.disabled=true;status.textContent='Archiving Master Risk…';
  try{
   const response=await fetch(API+'/risks/'+encodeURIComponent(current.id)+'/archive',{
    method:'POST',headers:headers(),body:JSON.stringify({reason:reason.trim()})
   });
   const data=await response.json();
   if(!response.ok)throw Error(data.message||'Unable to archive Master Risk');
   current.status='Archived';
   document.dispatchEvent(new CustomEvent('vero-risk-register-refresh',{detail:{riskId:current.id,archived:true}}));
   if(seq!==version||overlay.hidden)return;
   status.textContent='Master Risk archived.';
   syncActions();
   document.getElementById('veroRiskDetailsClose')?.click();
  }catch(error){
   if(seq===version&&!overlay.hidden){status.textContent=error.message;window.alert('Master Risk not archived: '+error.message);}
  }finally{archive.disabled=false;}
 });
 approve.addEventListener('click',()=>decide('Approved'));
 changes.addEventListener('click',()=>decide('Changes Requested'));

 let selected=null,authorised=false,version=0,submissionState='none',submissionData=null;
 const headers=()=>({Authorization:'Bearer '+localStorage.getItem('vero_session_token'),Accept:'application/json','Content-Type':'application/json'});
 const field=(form,label,name,value,tag='input')=>{
  const wrapper=document.createElement('label');wrapper.textContent=label;
  const el=document.createElement(tag);el.name=name;el.value=value||'';
  el.required=name!=='risk_description';el.maxLength=name==='risk_title'?255:name==='reason'?2000:10000;
  wrapper.appendChild(el);form.appendChild(wrapper);return el;
 };
 function showEdit(){
  if(!selected||!authorised||selected.status!=='Draft'||submissionState!=='none')return;
  const current=selected,seq=version;
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
    const response=await fetch(API+'/risks/'+encodeURIComponent(current.id)+'/definition',{
     method:'PUT',headers:headers(),body:JSON.stringify({
      risk_title:name.value.trim(),risk_description:description.value.trim(),reason:reason.value.trim()
     })
    });
    const data=await response.json();
    if(!response.ok)throw Error(data.message||'Unable to save');
    current.risk_title=name.value.trim();current.risk_description=description.value.trim();
    document.dispatchEvent(new CustomEvent('vero-risk-register-refresh',{detail:{riskId:current.id,definitionUpdated:true}}));
    if(seq!==version||overlay.hidden)return;
    title.textContent=selected.risk_title;status.textContent='Saved. Refresh register for updated results.';
    document.querySelector('[data-risk-tab="overview"]')?.click();
   }catch(error){if(seq===version&&!overlay.hidden)status.textContent=error.message;}finally{save.disabled=false;}
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
 function renderSubmission(){
  if(!submissionData?.available)return;
  const current=selected,seq=version;
  for(const tab of tabs.querySelectorAll('[data-risk-tab]'))tab.setAttribute('aria-current',String(tab===submissionTab));
  VeroProjectRiskSubmission.render(content,submissionData,{isCurrent:()=>seq===version&&!overlay.hidden&&submissionTab.getAttribute('aria-current')==='true',onSaved:async()=>{
   submissionData=await VeroProjectRiskSubmission.load(current.id);
   if(submissionData.risk_status)current.status=submissionData.risk_status;syncActions();
   document.dispatchEvent(new CustomEvent('vero-risk-register-refresh',{detail:{riskId:current.id,submissionUpdated:true}}));
  }});
 }
 submissionTab.addEventListener('click',renderSubmission);
 document.addEventListener('vero-risk-open-details',async event=>{
  selected=event.detail.risk;authorised=false;submissionState='loading';submissionData=null;submissionTab.hidden=true;syncActions();status.textContent='Checking submitted risk package…';version++;
  const seq=version;
  try{
   const [response,packageData]=await Promise.all([fetch(API+'/auth/my-roles',{headers:headers()}),VeroProjectRiskSubmission.load(selected.id)]);
   if(seq!==version||overlay.hidden)return;
   const data=response.ok?await response.json():{roles:[]};
   if(seq!==version||overlay.hidden)return;
   authorised=(data.roles||[]).some(r=>r.role_name==='Risk Manager');
   submissionData=packageData;if(packageData.risk_status)selected.status=packageData.risk_status;submissionState=packageData.available?'package':'none';submissionTab.hidden=!packageData.available;status.textContent='';syncActions();
   if(packageData.available&&tabs.querySelector('[data-risk-tab="overview"]')?.getAttribute('aria-current')==='true')renderSubmission();
  }catch(error){if(seq===version&&!overlay.hidden){submissionState='unavailable';syncActions();status.textContent='Submitted package could not be checked. Approval is unavailable: '+error.message;}}
 });
 for(const event of ['vero-risk-open-classification','vero-risk-create-master','vero-risk-details-close']){
  document.addEventListener(event,()=>{version++;selected=null;authorised=false;submissionState='none';submissionData=null;submissionTab.hidden=true;syncActions();status.textContent='';});
 }
 edit.addEventListener('click',showEdit);
 tabs.addEventListener('click',event=>{
  const tab=event.target.closest('[data-risk-tab]');
  if(tab?.dataset.riskTab==='history'){version++;showHistory();}
 });
})();


