/* Vero customer contract register. Source data is loaded only through authenticated APIs. */
const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
let contracts=[],selected=null,tab='Overview',maintenanceFilter='all',contractDetails=null,importOptions=null;
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
  const data=await request('/maintenance-contracts');contracts=data.contracts||[];render();
  document.getElementById('count').textContent=contracts.length+' customer contracts';
 }catch(e){document.getElementById('count').textContent=e.message;document.getElementById('rows').innerHTML='<tr><td colspan="8">'+esc(e.message)+'</td></tr>';}
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
function drawTab(){
 document.getElementById('tabs').innerHTML=names.map(n=>'<button data-tab="'+n+'" class="'+(tab===n?'active':'')+'">'+n+'</button>').join('');
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;drawTab();});
 const el=document.getElementById('tabContent'),c=selected;if(!c)return;
 if(tab==='Risks'){void drawContractRisks(c);return;}
 if(tab==='Sites'){void window.VeroContractActivity.sites(c,el,request);return;}
 if(tab==='Events'){void window.VeroContractActivity.events(c,el,request);return;}
 if(tab==='Overview'){
  el.innerHTML='<div class="fields">'+[['Contract reference',c.contract_code],['Customer',c.customer_name],['Contract type','Customer'],['Status',c.status],['Owner',c.owner_name||'Unassigned'],['Compliance','Not assessed'],['Source files',c.source_count],['Linked requirements',c.requirement_count],['Scope',c.scope],['Notes',c.notes]].map(([label,value])=>'<div class="field"><label>'+esc(label)+'</label><p>'+esc(value||'—')+'</p></div>').join('')+'</div>';return;
 }
 if(!contractDetails){el.textContent='Loading linked records…';return;}
 if(tab==='Records'){
  el.innerHTML='<h3>Contract source files</h3>'+contractDetails.sources.map(s=>'<article class="message"><b>'+esc(s.title)+'</b><p>'+esc(s.record_code)+(s.metadata.supporting_only?' · Supporting tender':'')+'</p><button class="btn" data-source="'+s.id+'">Open PDF</button></article>').join('');
  document.querySelectorAll('[data-source]').forEach(b=>b.onclick=async()=>{const destination=window.open('about:blank','_blank');try{const blob=await request('/maintenance-contracts/'+c.id+'/sources/'+b.dataset.source);const url=URL.createObjectURL(blob);destination.location=url;setTimeout(()=>URL.revokeObjectURL(url),600000);}catch(e){destination?.close();alert(e.message);}});return;
 }
 el.innerHTML='<h3>Compliance requirements</h3><p>Common requirements with this contract’s activities, timing and source clauses. Compliance has not been assessed.</p>'+contractDetails.requirements.map(r=>'<details class="message"><summary><b>'+esc(r.title)+'</b> · '+r.activities.length+' details</summary><p><a href="compliance.html?obligation_id='+r.id+'">'+esc(r.code)+' · Open central requirement</a></p>'+r.activities.map(a=>'<article><p><b>'+esc(a.verra_action)+'</b></p><p><strong>When:</strong> '+esc(a.timing_or_trigger)+'</p><p><strong>Conditions:</strong> '+esc(a.conditions_and_exceptions)+'</p><p>'+esc(a.clause_reference)+' · PDF pages '+esc(a.pdf_pages.join(', '))+'</p></article>').join('')+'</details>').join('')||'<p>No requirements linked yet.</p>';
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
if(!workspace)request('/maintenance-contracts/import-options').then(options=>{if(options.can_import){const link=document.createElement('a');link.href='site-import.html';link.textContent='Import Sites';link.className='btn';document.querySelector('.project-tools')?.appendChild(link);}}).catch(()=>{});
async function loadContractWorkspace(){
 try{
  const id=new URLSearchParams(location.search).get('id');
  if(!id)throw Error('No contract was selected. Return to the register to choose a contract.');
  const data=await request('/maintenance-contracts');
  const c=(data.contracts||[]).find(c=>String(c.id)===id);
  if(!c)throw Error('This contract could not be found in the contract register.');
  await openContract(c);
  const riskId=Number(new URLSearchParams(location.search).get('risk_id'));
  if(Number.isSafeInteger(riskId)&&riskId>0){tab='Risks';drawTab();await openMaintenanceSubmission(riskId);}
 }catch(e){document.getElementById('tabContent').textContent=e.message;addContractRetry(loadContractWorkspace);}
}
const initialContract=new URLSearchParams(location.search).get('contract_id');
if(initialContract&&!workspace)location.replace('maintenance-workspace.html?id='+encodeURIComponent(initialContract));
