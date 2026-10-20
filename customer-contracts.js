/* Vero customer contract register. Source data is loaded only through authenticated APIs. */
const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
let contracts=[],selected=null,tab='Overview',maintenanceFilter='all',contractDetails=null,importOptions=null,canEditContractOwner=false;
const workspace=!!document.getElementById('contractWorkspace');
const names=['Overview','Sites','Events','Risks','Compliance','Records'];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=x=>x?new Date(x).toLocaleDateString('en-AU'):'—';
async function request(path,options={}){
 const token=localStorage.getItem('vero_session_token');
 if(!token){location.href='login.html?return='+encodeURIComponent(location.pathname.split('/').pop()+location.search);throw Error('Sign in required');}
 const headers={Authorization:'Bearer '+token,...options.headers};
 if(!(options.body instanceof FormData))headers['Content-Type']='application/json';
 const r=await fetch(API+path,{...options,headers});
 if(r.status===401){location.href='login.html?return='+encodeURIComponent(location.pathname.split('/').pop()+location.search);throw Error('Session expired');}
 const type=r.headers.get('content-type')||'';
 const data=type.includes('json')?await r.json():await r.blob();
 if(!r.ok)throw Error(data.message||'Unable to complete the request ('+r.status+').');
 return data;
}
async function load(){
 try{
  const data=await request('/maintenance-contracts');contracts=data.contracts||[];canEditContractOwner=data.can_edit_owner===true;render();
 }catch(e){document.getElementById('rows').innerHTML='<tr><td colspan="8">'+esc(e.message)+'</td></tr>';}
}
function filterMaintenance(value,button){maintenanceFilter=value;document.querySelectorAll('.lifecycle-card').forEach(x=>x.classList.remove('active'));button.classList.add('active');render();}
function render(){
 const query=document.getElementById('search').value.toLowerCase();
 const days=c=>c.expiry_date?(new Date(c.expiry_date)-new Date())/86400000:NaN;
 const list=contracts.filter(c=>[c.contract_name,c.contract_code,c.customer_name,c.scope].some(x=>String(x||'').toLowerCase().includes(query)))
  .filter(c=>maintenanceFilter==='all'||maintenanceFilter==='active'&&c.status==='Active'||maintenanceFilter==='attention'&&c.compliance_status==='Attention'||maintenanceFilter==='renew'&&days(c)>=0&&days(c)<=90);
 for(const [id,n] of Object.entries({all:contracts.length,active:contracts.filter(c=>c.status==='Active').length,renew:contracts.filter(c=>days(c)>=0&&days(c)<=90).length,attention:contracts.filter(c=>c.compliance_status==='Attention').length}))document.getElementById(id).textContent=n;
 document.getElementById('rows').innerHTML=list.map(c=>'<tr data-id="'+c.id+'"><td><b><a href="maintenance-workspace.html?id='+encodeURIComponent(c.id)+'">'+esc(c.contract_name)+'</a></b><div>'+esc(c.contract_code)+'</div></td><td>'+esc(c.customer_name||'—')+'</td><td>'+esc(c.owner_name||'Unassigned')+'</td><td>'+esc(c.scope||'—')+'</td><td><span class="pill">'+esc(c.status)+'</span></td><td>'+c.requirement_count+' linked · Not assessed</td><td>Not assessed</td><td>'+date(c.expiry_date)+'</td></tr>').join('')||'<tr><td colspan="8">No customer contracts found.</td></tr>';
 document.querySelectorAll('#rows tr[data-id]').forEach(el=>el.onclick=()=>openContract(contracts.find(c=>String(c.id)===el.dataset.id)));
}
async function openContract(c){
 if(!c)return openImport();
 if(!workspace){location.href='maintenance-workspace.html?id='+encodeURIComponent(c.id);return;}
 selected=c;contractDetails=null;tab='Overview';document.getElementById('heroName').textContent=c.contract_name;document.title='VERO — '+c.contract_name;document.getElementById('heroCustomer').textContent=[c.contract_code,c.customer_name].filter(Boolean).join(' · ');document.getElementById('contractSummary').innerHTML=[['Status',c.status],['Owner',c.owner_name||'Unassigned'],['Renewal',date(c.expiry_date)],['Linked requirements',c.requirement_count??0]].map(([label,value])=>'<div class="kpi"><b>'+esc(value??'—')+'</b><span>'+label+'</span></div>').join('');drawTab();
 try{const details=await request('/maintenance-contracts/'+c.id+'/details');if(selected?.id===c.id){contractDetails=details;drawTab();}}catch(e){if(selected?.id===c.id){document.getElementById('tabContent').textContent=e.message;addContractRetry(()=>openContract(c));}}
}
function closeContract(){}
async function editContractOwner(c){
 if(!c||!canEditContractOwner)return;
 let dialog=document.getElementById('contractOwnerDialog');if(dialog)dialog.remove();
 dialog=document.createElement('dialog');dialog.id='contractOwnerDialog';dialog.className='contract-owner-dialog';dialog.setAttribute('aria-labelledby','contractOwnerTitle');
 dialog.innerHTML='<form><h2 id="contractOwnerTitle">Edit contract owner</h2><p>'+esc(c.contract_code)+' · '+esc(c.contract_name)+'</p><label>Owner<select name="owner_user_id" aria-label="Contract owner" disabled><option value="">Loading users…</option></select></label><p role="alert" id="contractOwnerError"></p><div class="contract-owner-actions"><button type="button" id="contractOwnerCancel">Cancel</button><button type="submit" class="primary" disabled>Save owner</button></div></form>';
 document.body.append(dialog);dialog.querySelector('#contractOwnerCancel').onclick=()=>dialog.close();dialog.showModal();
 const form=dialog.querySelector('form'),select=form.elements.owner_user_id,save=form.querySelector('[type=submit]'),error=dialog.querySelector('#contractOwnerError');
 try{
  const options=await request('/maintenance-contracts/'+c.id+'/owner');
  select.innerHTML='<option value="">Unassigned</option>'+options.users.map(u=>'<option value="'+u.id+'">'+esc(u.name+(u.email?' · '+u.email:''))+'</option>').join('');
  if(options.owner_user_id&&!options.users.some(u=>u.id===options.owner_user_id))select.insertAdjacentHTML('beforeend','<option value="'+Number(options.owner_user_id)+'" disabled>'+esc(options.owner_name||'Saved owner')+' (inactive)</option>');
  select.value=options.owner_user_id??'';select.disabled=false;save.disabled=false;
  form.onsubmit=async event=>{
   event.preventDefault();save.disabled=true;select.disabled=true;error.textContent='';
   try{
    const result=await request('/maintenance-contracts/'+c.id+'/owner',{method:'POST',body:JSON.stringify({owner_user_id:select.value?Number(select.value):null,owner_version:options.owner_version})});
    Object.assign(c,result);dialog.close();
    if(workspace)await openContract(c);else render();
   }catch(e){error.textContent=e.message;}
   finally{save.disabled=false;select.disabled=false;}
  };
 }catch(e){error.textContent=e.message;}
}

async function editContractStatus(c){
 if(!workspace||!c||!canEditContractOwner)return;
 document.getElementById('contractStatusDialog')?.remove();
 const dialog=document.createElement('dialog');dialog.id='contractStatusDialog';dialog.className='contract-owner-dialog';dialog.setAttribute('aria-labelledby','contractStatusTitle');
 dialog.innerHTML='<form><h2 id="contractStatusTitle">Edit contract status</h2><p>'+esc(c.contract_code)+' · '+esc(c.contract_name)+'</p><label>Status<select name="status" aria-label="Contract status" disabled><option value="">Loading statuses…</option></select></label><p role="alert"></p><div class="contract-owner-actions"><button type="button">Cancel</button><button type="submit" class="primary" disabled>Save status</button></div></form>';
 document.body.append(dialog);dialog.querySelector('[type=button]').onclick=()=>dialog.close();dialog.showModal();
 const form=dialog.querySelector('form'),select=form.elements.status,save=form.querySelector('[type=submit]'),error=form.querySelector('[role=alert]');
 try{
  const options=await request('/maintenance-contracts/'+c.id+'/status');
  select.innerHTML=options.statuses.map(s=>'<option value="'+esc(s)+'">'+esc(s)+'</option>').join('');
  if(!options.statuses.includes(options.status))select.insertAdjacentHTML('beforeend','<option value="'+esc(options.status)+'" disabled>'+esc(options.status)+'</option>');
  select.value=options.status;select.disabled=false;save.disabled=false;
  form.onsubmit=async event=>{
   event.preventDefault();save.disabled=true;select.disabled=true;error.textContent='';
   try{
    const result=await request('/maintenance-contracts/'+c.id+'/status',{method:'POST',body:JSON.stringify({status:select.value,status_version:options.status_version})});
    Object.assign(c,result);dialog.close();await openContract(c);
   }catch(e){error.textContent=e.message;}
   finally{save.disabled=false;select.disabled=false;}
  };
 }catch(e){error.textContent=e.message;}
}

function drawTab(){
 document.getElementById('tabs').innerHTML=names.map(n=>'<button data-tab="'+n+'" class="'+(tab===n?'active':'')+'">'+n+'</button>').join('');
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;drawTab();});
 const el=document.getElementById('tabContent'),c=selected;if(!c)return;
 if(tab==='Risks'){void drawContractRisks(c);return;}
 if(tab==='Sites'){void window.VeroContractActivity.sites(c,el,request);return;}
 if(tab==='Events'){void window.VeroContractActivity.events(c,el,request);return;}
 if(tab==='Overview'){
  el.innerHTML='<div class="fields">'+[['Contract reference',c.contract_code],['Customer',c.customer_name],['Contract type','Customer'],['Status',c.status],['Owner',c.owner_name||'Unassigned'],['Compliance','Not assessed'],['Source files',c.source_count],['Linked requirements',c.requirement_count],['Scope',c.scope],['Notes',c.notes]].map(([label,value])=>'<div class="field"><label>'+esc(label)+'</label><p>'+esc(value||'—')+'</p>'+(label==='Owner'&&canEditContractOwner?'<button type="button" class="btn contract-owner-edit" id="contractOwnerEdit">Edit owner</button>':'')+(label==='Status'&&canEditContractOwner?'<button type="button" class="btn contract-owner-edit" id="contractStatusEdit">Edit status</button>':'')+'</div>').join('')+'</div>';document.getElementById('contractOwnerEdit')?.addEventListener('click',()=>editContractOwner(c));document.getElementById('contractStatusEdit')?.addEventListener('click',()=>editContractStatus(c));return;
 }
 if(!contractDetails){el.textContent='Loading linked records…';return;}
 if(tab==='Records'){
  el.innerHTML='<h3>Contract source files</h3>'+contractDetails.sources.map(s=>'<article class="message"><b>'+esc(s.title)+'</b><p>'+esc(s.record_code)+(s.metadata.supporting_only?' · Supporting tender':'')+'</p><button class="btn" data-source="'+s.id+'">Open PDF</button></article>').join('');
  document.querySelectorAll('[data-source]').forEach(b=>b.onclick=async()=>{const destination=window.open('about:blank','_blank');try{const blob=await request('/maintenance-contracts/'+c.id+'/sources/'+b.dataset.source);const url=URL.createObjectURL(blob);destination.location=url;setTimeout(()=>URL.revokeObjectURL(url),600000);}catch(e){destination?.close();alert(e.message);}});return;
 }
 drawContractCompliance(c,el);
}

function drawContractCompliance(c,el){
 const items=(contractDetails.requirements||[]).flatMap(r=>(r.activities||[]).map(a=>({r,a})));
 el.innerHTML='<section class="contract-compliance-list"><div class="contract-compliance-tools"><label>Search requirements<input type="search" id="contractComplianceSearch" placeholder="Search requirements, timing or clauses"></label></div><p id="contractComplianceCount" role="status" aria-live="polite"></p><div class="table-wrap"><table><thead><tr><th>Requirement</th><th>Type / applicability</th><th>Timing / trigger</th><th>Source</th><th>Assessment</th></tr></thead><tbody id="contractComplianceRows"></tbody></table></div><div class="contract-compliance-pages"><button type="button" id="contractCompliancePrevious">Previous</button><span id="contractCompliancePage"></span><button type="button" id="contractComplianceNext">Next</button></div></section>';
 const search=el.querySelector('#contractComplianceSearch'),rows=el.querySelector('#contractComplianceRows'),count=el.querySelector('#contractComplianceCount'),previous=el.querySelector('#contractCompliancePrevious'),next=el.querySelector('#contractComplianceNext'),pageLabel=el.querySelector('#contractCompliancePage');
 let page=0;const size=50;
 function renderRequirements(){
  const query=search.value.trim().toLowerCase(),filtered=items.filter(({r,a})=>[a.verra_action,a.instance_id,r.title,r.code,a.timing_or_trigger,a.conditions_and_exceptions,a.clause_reference].join(' ').toLowerCase().includes(query));
  page=Math.min(page,Math.max(0,Math.ceil(filtered.length/size)-1));const start=page*size,shown=filtered.slice(start,start+size);
  count.textContent=filtered.length+' requirement'+(filtered.length===1?'':'s')+(filtered.length?' · showing '+(start+1)+'–'+(start+shown.length):'');
  rows.innerHTML=shown.map(({r,a})=>{
   const href='compliance.html?obligation_id='+encodeURIComponent(r.id);
   return '<tr><td><a class="contract-compliance-open" href="'+href+'">'+esc(a.verra_action||r.title||'Untitled requirement')+'</a><div class="contract-compliance-reference">'+esc(a.instance_id||r.code||'')+'</div><details><summary>Conditions and shared requirement</summary><p><strong>Common requirement:</strong> '+esc(r.title)+'</p><p><strong>Conditions:</strong> '+esc(a.conditions_and_exceptions||'No additional conditions recorded.')+'</p></details></td><td>Client<br>Maintenance</td><td>'+esc(a.timing_or_trigger||'Ongoing')+'</td><td>'+esc(a.clause_reference||'—')+((a.pdf_pages||[]).length?'<div>PDF pages '+esc(a.pdf_pages.join(', '))+'</div>':'')+'</td><td><a href="'+href+'">Open assessment</a></td></tr>';
  }).join('')||'<tr><td colspan="5">'+(items.length?'No requirements match your search.':'No requirements linked to this contract.')+'</td></tr>';
  previous.disabled=page===0;next.disabled=start+size>=filtered.length;pageLabel.textContent=filtered.length?'Page '+(page+1)+' of '+Math.ceil(filtered.length/size):'';
 }
 search.oninput=()=>{page=0;renderRequirements();};previous.onclick=()=>{page--;renderRequirements();};next.onclick=()=>{page++;renderRequirements();};renderRequirements();
}

async function openImport(){
 try{
  importOptions=importOptions||await request('/maintenance-contracts/import-options');
  if(!importOptions.can_import)throw Error('Administrator permission is required to import the historical contracts.');
  let dialog=document.getElementById('customerContractImport');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='customerContractImport';dialog.style.cssText='width:min(720px,90vw);border:0;border-radius:12px;padding:28px';document.body.append(dialog);}
  dialog.innerHTML='<h2>Import customer contracts</h2><p>Import the contract package first, then the compliance requirements package. Repeating a completed package will not duplicate records.</p><label>Organisation <select id="contractImportUnit">'+importOptions.units.map(u=>'<option value="'+u.id+'">'+esc(u.name)+'</option>').join('')+'</select></label><p><label>Prepared package <input id="contractImportFile" type="file" accept=".zip"></label></p><button class="btn green" id="contractImportRun">Import selected package</button> <button class="btn" id="contractImportClose">Close</button><p id="contractImportStatus" role="status"></p>';
  document.getElementById('contractImportClose').onclick=()=>dialog.close();
  document.getElementById('contractImportRun').onclick=async()=>{
   const button=document.getElementById('contractImportRun'),message=document.getElementById('contractImportStatus'),file=document.getElementById('contractImportFile').files[0];
   if(!file){message.textContent='Select a prepared package.';return;}
   button.disabled=true;message.textContent='Importing. Please keep this page open…';
   try{const form=new FormData();form.append('file',file);form.append('organisation_unit_id',document.getElementById('contractImportUnit').value);const data=await request('/maintenance-contracts/import',{method:'POST',body:form});message.textContent=(data.already_imported?'Already imported. ': 'Import complete. ')+(data.stage==='contracts'?data.contracts+' contracts and '+data.source_files+' source files.':data.common_requirements+' common requirements, '+data.contract_profiles+' contract links and '+data.activity_details+' activity details.');await load();}
   catch(e){message.textContent=e.message;}finally{button.disabled=false;}
  };
  dialog.showModal();
 }catch(e){alert(e.message);}
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeContract();});
if(!workspace)request('/maintenance-contracts/import-options').then(options=>{importOptions=options;const button=document.querySelector('.project-tools button');if(button){button.textContent='Import Contracts';button.hidden=!options.can_import;button.onclick=openImport;}}).catch(()=>{});
function addContractRetry(action){const b=document.createElement('button');b.textContent='Retry loading contract';b.onclick=action;document.getElementById('tabContent').appendChild(b);}
async function loadContractWorkspace(){
 try{
  const id=new URLSearchParams(location.search).get('id');
  if(!id)throw Error('No contract was selected. Return to the register to choose a contract.');
  const data=await request('/maintenance-contracts');canEditContractOwner=data.can_edit_owner===true;
  const c=(data.contracts||[]).find(c=>String(c.id)===id);
  if(!c)throw Error('This contract could not be found in the contract register.');
  await openContract(c);
  const riskId=Number(new URLSearchParams(location.search).get('risk_id'));
  if(Number.isSafeInteger(riskId)&&riskId>0){tab='Risks';drawTab();await openMaintenanceSubmission(riskId);}
 }catch(e){document.getElementById('tabContent').textContent=e.message;addContractRetry(loadContractWorkspace);}
}
const initialContract=new URLSearchParams(location.search).get('contract_id');
if(initialContract&&!workspace)location.replace('maintenance-workspace.html?id='+encodeURIComponent(initialContract));


