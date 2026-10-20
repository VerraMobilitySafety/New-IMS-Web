/* Administrator detail corrections; permissions are confirmed by the API. */
(()=>{
 'use strict';
 const modal=document.getElementById('recordModal'),body=modal?.querySelector('.record-drawer-body');
 if(!body)return;
 const base='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
 const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const section=node('section');section.className='record-section';section.id='recordMetadataEditor';section.hidden=true;body.prepend(section);
 const edit=node('button','Edit Record Details');edit.type='button';edit.className='request-record-btn';
 const status=node('p');status.setAttribute('role','status');
 const form=node('form');form.hidden=true;
 const fields={
  record_title:['Title','text',255],description:['Description','textarea',10000],
  record_type:['Record type','text',100],record_category:['Category','text',100],
  owner_business_area:['Business area','text',255],owner_user_id:['Owner','select'],
  record_date:['Record date','date'],reason:['Reason for correction','textarea',3000]
 };
 const inputs={};
 const grid=node('div');grid.className='record-detail-grid';
 for(const [key,[label,type,max]] of Object.entries(fields)){
  const wrap=node('label',label),input=node(type==='textarea'?'textarea':type==='select'?'select':'input');
  input.name=key;input.setAttribute('aria-label',label);
  if(input.tagName==='INPUT')input.type=type;
  if(max)input.maxLength=max;
  input.required=key!=='description';wrap.append(input);grid.append(wrap);inputs[key]=input;
 }
 const note=node('p','Classification, access groups, retention, holds, disposition and files stay in their controlled workflows. Date and classification details must preserve the assigned retention rule.');
 const save=node('button','Save Details'),cancel=node('button','Cancel');
 save.type='submit';cancel.type='button';save.className=cancel.className='request-record-btn';
 form.append(grid,note,save,cancel);section.append(edit,status,form);
 let activeId=null,sequence=0,data=null,busy=false,conflicted=false;
 async function api(id,method='GET',payload){
  const token=localStorage.getItem('vero_session_token');
  if(!token)throw Error('Sign in again before editing.');
  const r=await fetch(base+'/records/'+encodeURIComponent(id)+'/metadata',{
   method,cache:'no-store',headers:{Authorization:'Bearer '+token,Accept:'application/json','Content-Type':'application/json'},
   ...(payload?{body:JSON.stringify(payload)}:{})
  });
  const value=await r.json().catch(()=>({}));
  if(!r.ok){const error=Error(value.message||'Unable to load/save record details.');error.status=r.status;throw error;}
  return value;
 }
 function fill(){
  for(const key of Object.keys(fields))inputs[key].value=key==='reason'?'':data.metadata[key]??'';
 }
 function lock(){save.disabled=busy||conflicted;cancel.disabled=busy;edit.disabled=busy;for(const input of Object.values(inputs))input.disabled=busy;}
 async function load(force=false){
  const id=modal.classList.contains('open')?modal.dataset.activeRecordId:null;
  if(!force&&id===activeId)return;
  activeId=id;const ticket=++sequence;section.hidden=true;form.hidden=true;data=null;busy=false;conflicted=false;status.textContent='';lock();
  if(!id)return;
  try{
   const result=await api(id);
   if(ticket!==sequence)return;
   data=result;section.hidden=!result.can_edit;edit.hidden=false;
   inputs.owner_user_id.replaceChildren();
   for(const owner of result.owners||[]){const option=node('option',owner.name);option.value=String(owner.id);inputs.owner_user_id.append(option);}
   if(!(result.owners||[]).some(o=>o.id===result.metadata.owner_user_id)){
    const option=node('option','Current owner (inactive or unavailable)');option.value=String(result.metadata.owner_user_id);inputs.owner_user_id.append(option);
   }
   fill();
  }catch(error){
   if(ticket!==sequence||error.status===403)return;
   section.hidden=false;edit.hidden=true;status.textContent=error.message;
  }
 }
 edit.onclick=()=>{fill();conflicted=false;form.hidden=false;edit.hidden=true;status.textContent='';lock();inputs.record_title.focus();};
 cancel.onclick=()=>{form.hidden=true;edit.hidden=false;status.textContent='';if(conflicted)void load(true);};
 form.onsubmit=async event=>{
  event.preventDefault();if(busy||conflicted||!data||!form.reportValidity())return;
  const id=activeId,ticket=sequence,payload={expected_revision:data.revision_token};
  for(const key of Object.keys(fields))payload[key]=inputs[key].value;
  payload.owner_user_id=Number(payload.owner_user_id);
  // Preserve an absent optional description on a no-op.
  if(!payload.description&&data.metadata.description===null)payload.description=null;
  busy=true;lock();status.textContent='Saving details…';
  try{
   const result=await api(id,'PUT',payload);
   if(ticket!==sequence)return;
   data={...data,...result};form.hidden=true;edit.hidden=false;
   status.textContent=result.changed_fields?.length?'Details saved with audit history.':'No details changed.';
   window.dispatchEvent(new CustomEvent('vero-record-metadata-saved',{detail:{recordId:id}}));
  }catch(error){
   if(ticket!==sequence)return;
   conflicted=true;status.textContent=error.message+' Cancel and reopen the editor to reload before retrying.';
  }finally{if(ticket===sequence){busy=false;lock();}}
 };
 new MutationObserver(()=>void load()).observe(modal,{attributes:true,attributeFilter:['class','data-active-record-id']});
 void load();
})();
