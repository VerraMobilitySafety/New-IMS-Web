/* Contract corrections are audited; linked objects retain their governed editors. */
window.VeroMaintenanceAdmin=(()=>{
 const fields=[['friendly_name','Friendly name',250],['official_contract_name','Full contract name',250],['contract_code','Contract reference',80],['customer_name','Customer',250],['start_date','Start date','date'],['expiry_date','Expiry / renewal date','date'],['scope','Scope',10000],['notes','Notes',10000]];
 const activityFields=[['verra_action','Requirement / activity',10000],['timing_or_trigger','Timing / trigger',5000],['conditions_and_exceptions','Conditions and exceptions',10000],['clause_reference','Clause reference',2000]];
 const node=(tag,value)=>{const n=document.createElement(tag);if(value!=null)n.textContent=value;return n;};
 function formEditor(title,description,specs,load,save,onSaved){
  document.getElementById('maintenanceAdminDialog')?.remove();
  const dialog=node('dialog');dialog.id='maintenanceAdminDialog';dialog.className='contract-site-dialog';dialog.setAttribute('aria-labelledby','maintenanceAdminTitle');
  const form=node('form'),heading=node('h2',title);heading.id='maintenanceAdminTitle';const intro=node('p',description);intro.className='note';
  const grid=node('div');grid.className='fields';const inputs={};
  for(const [key,label,max] of [...specs,['reason','Reason for change',2000]]){
   const wrap=node('label',label),input=node(typeof max==='number'&&max>2000||key==='reason'?'textarea':'input');input.name=key;inputs[key]=input;input.disabled=true;
   if(max==='date')input.type='date';else input.maxLength=max;
   input.required=key==='reason'||['friendly_name','official_contract_name','contract_code','customer_name','verra_action'].includes(key);
   if(input.tagName==='TEXTAREA'){input.rows=3;wrap.className='full';}wrap.append(input);grid.append(wrap);
  }
  const error=node('p');error.setAttribute('role','alert');const actions=node('div');actions.className='dialog-actions';
  const cancel=node('button','Cancel'),submit=node('button','Save Changes');cancel.type='button';submit.type='submit';submit.className='primary';submit.disabled=true;actions.append(cancel,submit);
  form.append(heading,intro,grid,error,actions);dialog.append(form);document.body.append(dialog);let busy=false,data;
  const active=()=>dialog.isConnected&&dialog.open;
  cancel.onclick=()=>dialog.close();dialog.oncancel=e=>{if(busy)e.preventDefault();};dialog.showModal();error.textContent='Loading saved details…';
  load().then(result=>{if(!active())return;data=result;for(const [key] of specs)inputs[key].value=result[key]??'';Object.values(inputs).forEach(i=>i.disabled=false);submit.disabled=false;error.textContent='';}).catch(e=>{if(active())error.textContent=e.message;});
  form.onsubmit=async event=>{
   event.preventDefault();if(busy||!data||!form.reportValidity())return;busy=true;cancel.disabled=submit.disabled=true;Object.values(inputs).forEach(i=>i.disabled=true);error.textContent='';
   const payload=Object.fromEntries(Object.entries(inputs).map(([k,i])=>[k,i.value]));payload.version=data.version;
   try{const result=await save(payload);dialog.close();await onSaved(result);}
   catch(e){if(active())error.textContent=e.message;else window.alert('Changes were saved, but the workspace could not refresh. Reload the page.');}
   finally{busy=false;cancel.disabled=submit.disabled=false;Object.values(inputs).forEach(i=>i.disabled=false);}
  };
  return dialog;
 }
 function editDetails(c,request,refresh){return formEditor('Edit contract details',c.contract_code+' · Changes update this contract. Existing document links keep their current associations.',fields,
  ()=>request('/maintenance-contracts/'+c.id+'/admin-details'),payload=>request('/maintenance-contracts/'+c.id+'/admin-details',{method:'POST',body:JSON.stringify(payload)}),refresh);}
 function editActivity(c,r,index,request,refresh){return formEditor('Edit contract requirement',r.code+' · Updates only this contract’s activity details. Original identifiers and source pages are retained.',activityFields,
  async()=>{const result=await request('/maintenance-contracts/'+c.id+'/requirements/'+r.id+'/admin-details');if(!result.activities[index])throw Error('Activity no longer available. Reload the workspace.');return {...result.activities[index],version:result.version};},
  payload=>request('/maintenance-contracts/'+c.id+'/requirements/'+r.id+'/admin-details',{method:'POST',body:JSON.stringify({...payload,activity_index:index})}),refresh);}
 function toolbar(c,tab,admin,request,refresh){
  let host=document.getElementById('maintenanceAdminTools');if(!host){host=node('div');host.id='maintenanceAdminTools';host.className='panel';host.style.cssText='padding:16px 20px;margin-bottom:18px';document.getElementById('contractSummary').after(host);}host.replaceChildren();host.hidden=!admin;if(!admin)return;
  const title=node('strong','Administrator controls · '+tab),actions=node('div');actions.className='contract-site-actions';host.append(title,actions);
  if(tab==='Overview'){const b=node('button','Edit contract details');b.type='button';b.className='primary';b.onclick=()=>editDetails(c,request,refresh);actions.append(b);}
  const destinations={Events:['Manage events','incident-management.html'],Risks:['Manage risks and assessments','risk.html'],Compliance:['Manage shared obligations and assessments','compliance.html'],Documents:['Manage controlled documents','documents.html?'+new URLSearchParams({category:'Operational',link_type:'Contract',link_value:c.id,link_label:c.contract_name})],
   'Client Documents':['Manage shared client documents','documents.html?'+new URLSearchParams({category:'Operational',link_type:'Client',link_value:c.customer_name||'',link_label:c.customer_name||''})],Records:['Manage records','records.html']};
  if(destinations[tab]){const [label,url]=destinations[tab],a=node('a',label);a.href=url;a.className='btn';actions.append(a);}
  const guidance={Overview:'Owner and status have their own edit controls below. Totals and audit history are calculated or retained by the system.',Sites:'Click any site row to edit its details. Shared-site changes apply wherever that site is linked.',Events:'Open an event below to edit its report, assignment or investigation in Event Management.',Risks:'Open a linked risk below to manage its details, assessments and treatment actions. Approval steps still apply.',Compliance:'Use Edit activity below for contract-specific corrections, or open an obligation for its shared definition and assessment.',Documents:'Open a document below to edit details, links or request a revision through Document Control.', 'Client Documents':'Client documents are shared across that client’s contracts. Open a document to manage its details and links.',Records:'Use Edit record details below to open the original record. Record access, retention and legal holds still apply.'};
  const note=node('p',guidance[tab]);note.className='note';host.append(note);
 }
 async function records(host,c,request,base,admin){
  const ticket={};host._maintenanceRecords=ticket;const active=()=>host._maintenanceRecords===ticket&&host.isConnected&&document.querySelector('[data-tab="Records"].active');host.textContent='Loading linked records…';
  try{const data=await request('/maintenance-contracts/'+c.id+'/documents');if(!active())return;
   host.replaceChildren(node('h3','Contract records'));const seen=new Set();
   for(const record of data.records||[]){if(seen.has(record.id))continue;seen.add(record.id);
    const card=node('article');card.className='message';const title=node('b',[record.record_code,record.title].filter(Boolean).join(' · ')),why=node('p',(record.linked_via||[]).join(' · ')),link=node('a',admin?'Edit record details':'View record');link.className='btn';link.href='records.html?'+new URLSearchParams({record_id:record.id});card.append(title,why,link);
    if(record.content_path){const open=node('button','Open file');open.type='button';open.className='btn';open.onclick=()=>window.VeroProjectDocumentViewer.open({contentUrl:base+record.content_path,fileName:record.filename||record.title,fetch:(url,options={})=>fetch(url,{...options,headers:{...options.headers,Authorization:'Bearer '+localStorage.getItem('vero_session_token')}})});card.append(open);}host.append(card);
   }
   if(!seen.size)host.append(node('p','No accessible records linked to this contract.'));
  }catch(e){if(!active())return;host.textContent=e.message;const retry=node('button','Retry records');retry.type='button';retry.onclick=()=>records(host,c,request,base,admin);host.append(retry);}
 }
 return {toolbar,editDetails,editActivity,records};
})();
