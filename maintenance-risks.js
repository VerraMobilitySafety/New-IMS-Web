/* Contract risks reuse the central applicability and assessment workflows. */
async function drawContractRisks(contract){
 const host=document.getElementById('tabContent');
 host.innerHTML='<h3>Maintenance Contract Risks</h3><p>View linked risks, assessments and treatment actions. Submit a new risk with its assessment, controls and treatment actions for approval.</p><div class="actions"><button id="contractRiskLink">+ Link existing risk</button><button id="contractRiskCreate">+ Add Risk</button></div><div id="contractRiskEditor"></div><div id="contractRiskList" role="status">Loading contract risks…</div>';
 const list=host.querySelector('#contractRiskList');
 const create=host.querySelector('#contractRiskCreate');create.disabled=true;create.onclick=()=>openProjectRiskCreator();
 request('/maintenance-contracts/'+encodeURIComponent(contract.id)+'/risk-submission-capabilities').then(data=>{if(create.isConnected){create.disabled=data.can_submit!==true;create.title=data.can_submit?'':'Only an authorised contract risk assessor, Risk Manager or Administrator may submit a risk.';}}).catch(e=>{create.title=e.message;});
 host.querySelector('#contractRiskLink').onclick=()=>linkContractRisk(contract,host.querySelector('#contractRiskEditor'));
 try{
  const [data,proposals]=await Promise.all([request('/maintenance-contracts/'+encodeURIComponent(contract.id)+'/risks'),request('/maintenance-contracts/'+encodeURIComponent(contract.id)+'/risk-drafts')]);
  if(!list.isConnected)return;
  const ids=new Set((proposals.drafts||[]).map(r=>String(r.id)));
  list.innerHTML=(proposals.drafts||[]).map(r=>'<article class="message"><b>'+esc(r.risk_code)+' · '+esc(r.risk_title)+'</b><p>'+esc(r.approval_state)+(r.approval_state==='Approved'?'':' · Pending approval')+'</p><button data-submission="'+esc(r.id)+'">Open submitted risk</button></article>').join('')+(data.risks||[]).filter(r=>!ids.has(String(r.id))).map(r=>'<article class="message"><b><a href="risk.html?risk_id='+encodeURIComponent(r.id)+'&contract_id='+encodeURIComponent(contract.id)+'">'+esc(r.risk_code)+' · '+esc(r.risk_title)+'</a></b><p>'+esc(r.status)+' · '+(r.assessed?'Approved assessment available':'Awaiting approved assessment')+'</p><a href="risk.html?risk_id='+encodeURIComponent(r.id)+'&contract_id='+encodeURIComponent(contract.id)+'">Open risk, assessments and treatment actions →</a></article>').join('')||'<p>No risks are currently linked to this contract.</p>';
  list.querySelectorAll('[data-submission]').forEach(b=>b.onclick=()=>openMaintenanceSubmission(Number(b.dataset.submission)));
 }catch(e){if(!list.isConnected)return;list.textContent=e.message;const retry=document.createElement('button');retry.textContent='Retry loading risks';retry.onclick=()=>drawContractRisks(contract);list.appendChild(retry);}
}
async function linkContractRisk(contract,host){
 host.textContent='Loading authorised risks…';
 try{
  const roles=await request('/auth/my-roles');
  if(!(roles.roles||[]).some(r=>r.role_name==='Risk Manager'))throw Error('A Risk Manager must link risks to this contract.');
  const data=await request('/risks');
  if(!host.isConnected)return;
  const risks=(data.risks||[]).filter(r=>['Open','Under Review','Treatment','Accepted'].includes(r.status));
  host.innerHTML='<form id="contractRiskLinkForm"><label>Existing risk<select required id="contractRiskChoice"><option value="">Choose a risk</option>'+risks.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.risk_code)+' · '+esc(r.risk_title)+'</option>').join('')+'</select></label><label>Reason for linking<textarea required maxlength="2000" id="contractRiskReason"></textarea></label><button type="submit">Link risk to contract</button> <button type="button" id="contractRiskCancel">Cancel</button><p role="status" id="contractRiskStatus"></p></form>';
  host.querySelector('#contractRiskCancel').onclick=()=>host.replaceChildren();
  host.querySelector('form').onsubmit=async event=>{
   event.preventDefault();const button=host.querySelector('[type="submit"]'),message=host.querySelector('#contractRiskStatus');
   const id=Number(host.querySelector('select').value),reason=host.querySelector('textarea').value.trim();if(!id||!reason)return;
   button.disabled=true;message.textContent='Linking risk…';
   try{await request('/risks/'+encodeURIComponent(id)+'/applicability',{method:'POST',body:JSON.stringify({context_type:'Maintenance Contract',context_id:Number(contract.id),action:'Assign',rationale:reason})});if(host.isConnected&&selected?.id===contract.id&&tab==='Risks')await drawContractRisks(contract);}
   catch(e){message.textContent=e.message;}finally{button.disabled=false;}
  };
 }catch(e){host.textContent=e.message;}
}

async function openMaintenanceSubmission(riskId){
 const contractId=selected?.id;if(!contractId)return;
 let overlay=document.getElementById('maintenanceRiskReview');
 if(!overlay){overlay=document.createElement('div');overlay.id='maintenanceRiskReview';overlay.className='modal-back';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Maintenance risk review');overlay.innerHTML='<div class="drawer"><div class="drawer-head"><button class="close" aria-label="Close risk review">×</button><h2>Maintenance Risk</h2></div><div class="drawer-body"></div></div>';overlay.querySelector('.close').onclick=()=>{if(!overlay.querySelector('[data-saving="1"]'))overlay.classList.remove('show');};document.body.appendChild(overlay);}
 overlay.classList.add('show');const host=overlay.querySelector('.drawer-body');host.textContent='Loading submitted risk…';
 const ticket=String(Number(overlay.dataset.ticket||0)+1);overlay.dataset.ticket=ticket;
 try{const data=await VeroMaintenanceRiskSubmission.load(riskId);if(overlay.dataset.ticket!==ticket||selected?.id!==contractId)return;if(Number(data.submission?.contract_id)!==Number(contractId))throw Error('This risk belongs to another contract.');VeroMaintenanceRiskSubmission.render(host,data,{isCurrent:()=>overlay.classList.contains('show')&&overlay.dataset.ticket===ticket,onSaved:()=>drawContractRisks(selected),onRevise:submission=>{overlay.classList.remove('show');openProjectRiskCreator({submission});}});}
 catch(e){host.textContent=e.message;}
}
