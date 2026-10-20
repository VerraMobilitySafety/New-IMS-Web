/* Show individual requirements; retain shared assessment parents. */
function installContractRequirementRegister(){
 const commonPanel=document.getElementById('complianceSearch')?.closest('.panel');if(!commonPanel)return;
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const panel=document.createElement('section');panel.id='contractRequirementRegister';panel.className='panel contract-requirement-register';
 panel.innerHTML='<h2>Requirements</h2><p>Each requirement is listed separately. Linked requirements can share one assessment.</p><div class="contract-requirement-filters"><label>Search requirements<input id="contractRequirementSearch" type="search" placeholder="Search requirements, contracts or clauses"></label><label id="contractRequirementFilterLabel">Contract<select id="contractRequirementFilter"><option value="">All contracts</option></select></label><label>Status<select id="requirementStatusFilter"><option value="">All statuses</option><option>Compliant</option><option>Partially Compliant</option><option>Non-Compliant</option><option>Not Assessed</option></select></label><label>Applicability<select id="requirementApplicabilityFilter"><option value="">All applicability</option><option>Project</option><option>Maintenance</option><option>Jurisdiction</option><option>Organisation</option></select></label><button type="button" id="contractRequirementRetry" hidden>Retry loading contracts</button></div><p id="contractRequirementCount" role="status" aria-live="polite">Loading requirements…</p><div class="table-wrap"><table class="table"><thead><tr><th>Requirement</th><th>Type / applicability</th><th>Timing / trigger</th><th>Source</th><th>Assessment</th></tr></thead><tbody id="contractRequirementRows"></tbody></table></div><div class="contract-requirement-pages"><button type="button" id="contractRequirementPrevious">Previous</button><span id="contractRequirementPage"></span><button type="button" id="contractRequirementNext">Next</button></div>';
 commonPanel.before(panel);commonPanel.hidden=true;
 const $=id=>document.getElementById(id),size=50;
 let data=[],contracts=new Map(),page=0,loading=true,loadNumber=0,type=$('typeFilter')?.value||'',commonError='';
 let common=Object.values(typeof obligationsLive==='undefined'?{}:obligationsLive),commonLoaded=!document.getElementById('complianceLoadingRow');
 function entries(){
  const parents=new Map(common.map(o=>[String(o.id),o])),expanded=new Set(data.map(r=>String(r.obligation_id)));
  return data.map(r=>({...r,type:'Client',parent:parents.get(String(r.obligation_id)),applicability:'Maintenance'})).concat(common.filter(o=>!expanded.has(String(o.id))&&!/^COM-CLIENT-CONTRACT/i.test(o.obligation_code||'')&&(o.compliance_type!=='Client'||!loading)).map(o=>({obligation_id:o.id,type:o.compliance_type||'',parent:o,applicability:o.applicability?.type||(o.compliance_type==='Regulatory'&&o.jurisdiction?'Jurisdiction':''),activity:{verra_action:o.obligation_title,timing_or_trigger:o.obligation_frequency,clause_reference:o.source_reference},standalone:true})));
 }
 const status=r=>r.parent?.current_assessment?.status||(r.parent?'Not Assessed':'Assessment unavailable');
 function updateCounts(){
  const all=entries(),ready=commonLoaded&&!loading;
  // Use the same complete authorised requirement entries as the tab badges, before filtering or paging.
  const summary=document.querySelector('body[data-register-layout="compliance"] main>.vr-summary');
  if(summary){
   summary.setAttribute('aria-label','Requirement counts');
   summary.setAttribute('aria-busy',String(!ready));
   const types=['Regulatory','Internal','Client',''];
   [...summary.children].forEach((card,index)=>{
    const type=types[index];if(type===undefined)return;
    card.classList.remove('vr-context');
    card.querySelector('b').textContent=ready?all.filter(r=>!type||r.type===type).length:'—';
    card.querySelector('span').textContent=type||'Total Requirements';
    card.title=ready?'All loaded requirements, before search and filters':'Requirement totals are unavailable until all requirements load';
   });
  }
  document.querySelectorAll('.compliance-view').forEach(button=>{
   const t=button.dataset.type,badge=button.querySelector('span');if(badge)badge.textContent=(!commonLoaded||loading)?'—':all.filter(r=>!t||r.type===t).length;
  });
 }
 window.updateClientRequirementCount=updateCounts;
 window.setComplianceRegisterItems=items=>{common=items;commonLoaded=true;commonError='';updateCounts();render();};
 window.setComplianceRegisterError=message=>{commonError=message||'Other requirements could not be loaded.';commonLoaded=false;updateCounts();render();};
 window.showComplianceTypeView=next=>{type=next;page=0;commonPanel.hidden=true;render();};
 function openRequirement(id){
  const linked=entries().filter(r=>String(r.obligation_id)===String(id));
  Promise.resolve(window.openLiveObligation(Number(id))).then(()=>{
   const body=document.querySelector('#obligationModal .drawer-body');if(!body)return;
   document.getElementById('sharedRequirementNotice')?.remove();if(linked.length<2)return;
   const note=document.createElement('p');note.id='sharedRequirementNotice';note.className='shared-requirement-notice';
   note.textContent='Shared assessment: '+linked.length+' individual requirements use this requirement’s assessment. Record the result once here; it applies to these linked requirements. Check the contract-specific conditions before assessing compliance.';body.prepend(note);
  });
 }
 function render(){
  const id=$('contractRequirementFilter').value,q=$('contractRequirementSearch').value.toLowerCase().trim(),s=$('requirementStatusFilter').value,a=$('requirementApplicabilityFilter').value;
  $('contractRequirementFilterLabel').hidden=!!type&&type!=='Client';
  const all=entries(),rows=all.filter(r=>(!type||r.type===type)&&(!id||(!r.standalone&&String(r.contract_id)===id)||(type&&type!=='Client'))&&(!s||status(r).toLowerCase()===s.toLowerCase())&&(!a||r.applicability===a)&&(!q||[r.activity.verra_action,r.activity.timing_or_trigger,r.activity.clause_reference,r.activity.instance_id,r.common_requirement,r.parent?.source_name,contracts.get(String(r.contract_id))?.code,contracts.get(String(r.contract_id))?.name].join(' ').toLowerCase().includes(q)));
  page=Math.min(page,Math.max(0,Math.ceil(rows.length/size)-1));const start=page*size,shown=rows.slice(start,start+size);
  $('contractRequirementCount').textContent=(loading||!commonLoaded?'Loading requirements · ':'')+rows.length+' requirement'+(rows.length===1?'':'s')+(rows.length?' · showing '+(start+1)+'–'+(start+shown.length):'');
  if(commonError){$('contractRequirementCount').textContent=commonError+' Showing '+rows.length+' loaded requirements; totals are incomplete.';$('contractRequirementRetry').hidden=false;}
  const groups=new Map();for(const r of all)groups.set(String(r.obligation_id),(groups.get(String(r.obligation_id))||0)+1);
  $('contractRequirementRows').innerHTML=shown.map(r=>{
   const c=contracts.get(String(r.contract_id)),n=groups.get(String(r.obligation_id)),a=r.activity;
   return '<tr data-requirement="'+esc(r.obligation_id)+'"><td><button type="button" class="contract-requirement-open" data-common="'+esc(r.obligation_id)+'">'+esc(a.verra_action||'Untitled requirement')+'</button><div class="contract-requirement-common">'+esc(a.instance_id||r.parent?.obligation_code||'')+'</div>'+(n>1?'<details><summary>Shared assessment · '+n+' requirements</summary><p>'+esc(r.common_requirement)+'</p><p>'+esc(a.conditions_and_exceptions||'Check the source conditions before applying a shared result.')+'</p><button type="button" data-common="'+esc(r.obligation_id)+'">Review shared assessment</button></details>':'')+'</td><td>'+esc(r.type)+'<br>'+(c?'<a href="maintenance-management.html?contract_id='+esc(r.contract_id)+'">'+esc(c.code)+' · '+esc(c.name)+'</a>':esc(r.parent?.applicability?.name||r.applicability))+'</td><td>'+esc(a.timing_or_trigger||'Ongoing')+'</td><td>'+esc(r.standalone?r.parent?.source_name:a.clause_reference)+(r.standalone?'':'<div>PDF pages '+esc((a.pdf_pages||[]).join(', '))+'</div>')+'</td><td>'+esc(status(r))+'</td></tr>';
  }).join('')||'<tr><td colspan="5">'+(loading||!commonLoaded?'Loading requirements…':'No requirements match these filters.')+'</td></tr>';
  panel.querySelectorAll('[data-requirement]').forEach(row=>row.onclick=e=>{if(!e.target.closest('a,button,summary,details,input,select'))openRequirement(row.dataset.requirement);});
  panel.querySelectorAll('[data-common]').forEach(button=>button.onclick=()=>openRequirement(button.dataset.common));
  $('contractRequirementPrevious').disabled=page===0;$('contractRequirementNext').disabled=start+size>=rows.length;
  $('contractRequirementPage').textContent=rows.length?'Page '+(page+1)+' of '+Math.ceil(rows.length/size):'';
 }
 for(const id of ['contractRequirementFilter','contractRequirementSearch','requirementStatusFilter','requirementApplicabilityFilter'])$(id).addEventListener('input',()=>{page=0;render();});
 $('contractRequirementPrevious').onclick=()=>{page--;render();};$('contractRequirementNext').onclick=()=>{page++;render();};
 async function load(){
  const number=++loadNumber;loading=true;$('contractRequirementRetry').hidden=true;updateCounts();render();
  try{
   const response=await fetch(COMPLIANCE_API+'/compliance/contract-requirements',{headers:complianceAuthHeaders(),cache:'no-store'});
   if(response.status===401){location.replace('login.html?return=compliance.html');return;}
   if(!response.ok)throw Error('Contract requirements could not be loaded.');const d=await response.json();if(number!==loadNumber)return;
   if(!Array.isArray(d.contracts)||!Array.isArray(d.requirements))throw Error('Contract requirements are unavailable.');
   contracts=new Map(d.contracts.map(c=>[String(c.id),c]));data=d.requirements;
   const selected=$('contractRequirementFilter').value||new URLSearchParams(location.search).get('contract_id');
   $('contractRequirementFilter').innerHTML='<option value="">All contracts</option>'+d.contracts.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.code)+' · '+esc(c.name)+'</option>').join('');
   if(selected&&contracts.has(String(selected)))$('contractRequirementFilter').value=selected;
   loading=false;updateCounts();render();
  }catch(error){if(number!==loadNumber)return;loading=true;render();$('contractRequirementCount').textContent=error.message+' Other loaded requirements remain available.';$('contractRequirementRetry').hidden=false;}
 }
 const params=new URLSearchParams(location.search);
 if(params.has('contract_id')&&!params.has('obligation_id')){const button=document.querySelector('.compliance-view[data-type="Client"]');if(button&&window.setComplianceType)window.setComplianceType(button,'Client');}
 $('contractRequirementRetry').onclick=()=>{load();if(commonError&&typeof window.loadComplianceRegister==='function')window.loadComplianceRegister();};load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installContractRequirementRegister,{once:true});else installContractRequirementRegister();
