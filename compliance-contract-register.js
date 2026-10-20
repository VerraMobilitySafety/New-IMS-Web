/* Read-only contract-specific requirement register; no task dates or assessments are created. */
function installContractRequirementRegister(){
 const commonPanel=document.getElementById('complianceSearch')?.closest('.panel');if(!commonPanel)return;
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const switcher=document.createElement('div');switcher.className='contract-register-views';
 switcher.innerHTML='<button type="button" id="contractRequirementView" aria-pressed="true">Contract-specific requirements</button><button type="button" id="commonRequirementView" aria-pressed="false">Common requirements</button>';
 const panel=document.createElement('section');panel.id='contractRequirementRegister';panel.className='panel contract-requirement-register';
 panel.innerHTML='<h2>Contract-specific requirements</h2><p>Each row is a requirement from a customer contract, including its timing, conditions and clause reference.</p><div class="contract-requirement-filters"><label>Contract<select id="contractRequirementFilter"><option value="">All contracts</option></select></label><label>Search requirements<input id="contractRequirementSearch" type="search" placeholder="Search actions, clauses or common requirements"></label><button type="button" id="contractRequirementRetry" hidden>Retry loading</button></div><p id="contractRequirementCount" role="status" aria-live="polite">Loading contract-specific requirements…</p><div class="table-wrap"><table class="table"><thead><tr><th>Requirement</th><th>Contract</th><th>Timing / trigger</th><th>Source clause</th><th>Assessment</th></tr></thead><tbody id="contractRequirementRows"></tbody></table></div><div class="contract-requirement-pages"><button type="button" id="contractRequirementPrevious">Previous</button><span id="contractRequirementPage"></span><button type="button" id="contractRequirementNext">Next</button></div>';
 commonPanel.before(switcher,panel);
 const $=id=>document.getElementById(id);let data=[],contracts=new Map(),page=0,loading=true,loadNumber=0;
 const size=50;
 function view(specific){commonPanel.hidden=specific;panel.hidden=!specific;$('contractRequirementView').setAttribute('aria-pressed',String(specific));$('commonRequirementView').setAttribute('aria-pressed',String(!specific));}
 window.showComplianceTypeView=type=>{
  switcher.hidden=!!type&&type!=='Client';
  view(false);
 };
 $('contractRequirementView').onclick=()=>view(true);$('commonRequirementView').onclick=()=>view(false);
 const params=new URLSearchParams(location.search);
 view(params.has('contract_id')&&!params.has('obligation_id'));
 if(params.has('contract_id')&&!params.has('obligation_id')){
  const clientButton=document.querySelector('.compliance-view[data-type="Client"]');
  if(clientButton&&typeof window.setComplianceType==='function'){
   window.setComplianceType(clientButton,'Client');view(true);
  }
 }
 function render(){
  const id=$('contractRequirementFilter').value,q=$('contractRequirementSearch').value.toLowerCase().trim();
  const rows=data.filter(r=>(!id||String(r.contract_id)===id)&&(!q||[r.activity.verra_action,r.activity.timing_or_trigger,r.activity.conditions_and_exceptions,r.activity.clause_reference,r.activity.instance_id,r.common_requirement,r.obligation_code,contracts.get(String(r.contract_id))?.code,contracts.get(String(r.contract_id))?.name].join(' ').toLowerCase().includes(q)));
  page=Math.min(page,Math.max(0,Math.ceil(rows.length/size)-1));const start=page*size,shown=rows.slice(start,start+size);
  $('contractRequirementCount').textContent=loading?'Loading contract-specific requirements…':rows.length+' contract-specific requirements'+(id?' for '+contracts.get(id)?.code:' across '+new Set(rows.map(r=>r.contract_id)).size+' contracts')+(rows.length?' · showing '+(start+1)+'–'+(start+shown.length):'');
  $('contractRequirementRows').innerHTML=shown.map(r=>{const a=r.activity,c=contracts.get(String(r.contract_id));return '<tr data-requirement="'+esc(r.obligation_id)+'"><td><button type="button" class="contract-requirement-open" data-common="'+esc(r.obligation_id)+'">'+esc(a.verra_action)+'</button><div class="contract-requirement-common">'+esc(r.common_requirement)+' · '+esc(a.instance_id)+'</div><details><summary>Conditions and linked requirement</summary><p>'+esc(a.conditions_and_exceptions||'See source contract.')+'</p><button type="button" data-common="'+esc(r.obligation_id)+'">Open common requirement</button></details></td><td><a href="maintenance-management.html?contract_id='+esc(r.contract_id)+'">'+esc(c?.code)+' · '+esc(c?.name)+'</a></td><td>'+esc(a.timing_or_trigger)+'</td><td>'+esc(a.clause_reference)+'<div>PDF pages '+esc((a.pdf_pages||[]).join(', '))+'</div></td><td>'+esc(r.assessment_status)+'</td></tr>';}).join('')||(loading?'':'<tr><td colspan="5">No contract-specific requirements match these filters.</td></tr>');
  panel.querySelectorAll('[data-requirement]').forEach(row=>row.onclick=e=>{if(!e.target.closest('a,button,summary,details,input,select'))window.openLiveObligation(Number(row.dataset.requirement));});
  panel.querySelectorAll('[data-common]').forEach(b=>b.onclick=()=>window.openLiveObligation(Number(b.dataset.common)));
  $('contractRequirementPrevious').disabled=loading||page===0;$('contractRequirementNext').disabled=loading||start+size>=rows.length;
  $('contractRequirementPage').textContent=rows.length?'Page '+(page+1)+' of '+Math.ceil(rows.length/size):'';
 }
 for(const id of ['contractRequirementFilter','contractRequirementSearch'])$(id).addEventListener('input',()=>{page=0;render();});
 $('contractRequirementPrevious').onclick=()=>{page--;render();};$('contractRequirementNext').onclick=()=>{page++;render();};
 async function load(){
  const number=++loadNumber;loading=true;data=[];$('contractRequirementRetry').hidden=true;render();
  try{
   const r=await fetch(COMPLIANCE_API+'/compliance/contract-requirements',{headers:complianceAuthHeaders(),cache:'no-store'});
   if(r.status===401){location.replace('login.html?return=compliance.html');return;}
   if(!r.ok)throw Error('Unable to load contract-specific requirements.');const d=await r.json();if(number!==loadNumber)return;
   if(!Array.isArray(d.contracts)||!Array.isArray(d.requirements))throw Error('The contract requirement list is unavailable.');
   contracts=new Map(d.contracts.map(c=>[String(c.id),c]));data=d.requirements;
   $('contractRequirementFilter').innerHTML='<option value="">All contracts</option>'+d.contracts.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.code)+' · '+esc(c.name)+'</option>').join('');
   const initial=new URLSearchParams(location.search).get('contract_id');if(initial&&contracts.has(initial))$('contractRequirementFilter').value=initial;
   loading=false;render();
  }catch(e){if(number!==loadNumber)return;loading=false;$('contractRequirementCount').textContent=e.message;$('contractRequirementRows').innerHTML='<tr><td colspan="5">Requirements could not be loaded. Use Retry loading to try again.</td></tr>';$('contractRequirementRetry').hidden=false;}
 }
 $('contractRequirementRetry').onclick=load;load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installContractRequirementRegister,{once:true});else installContractRequirementRegister();

