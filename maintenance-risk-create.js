/* Maintenance intake uses the existing project risk form and package format. */
const API_BASE=API;
async function apiFetch(url,options={}){return fetch(url,{...options,headers:{Authorization:"Bearer "+localStorage.getItem("vero_session_token"),...options.headers}});}
function readAdditionalProjectTreatments(overlay){
 return [...overlay.querySelectorAll('#praAdditionalActions .project-risk-treatment-editor')].map(row=>Object.fromEntries(['title','description','owner_user_id','due_date','priority'].map(key=>{const value=row.querySelector('[data-action-field="'+key+'"]').value;return [key,key==='owner_user_id'?Number(value):value.trim()];})));
}
function addProjectTreatmentEditor(overlay,action){
 const node=VeroMaintenanceRiskSubmission.node,row=node('section');row.className='project-risk-treatment-editor project-risk-review-card';row.appendChild(node('h3','Additional treatment action'));
 for(const [name,label,type] of [['title','Action title','input'],['description','Action description','textarea'],['owner_user_id','Action owner','select'],['due_date','Action due date','input'],['priority','Action priority','select']]){
  const wrapper=node('label',label),field=node(type);field.dataset.actionField=name;
  if(name==='due_date')field.type='date';if(name==='title')field.maxLength=255;if(name==='description')field.maxLength=10000;
  if(name==='owner_user_id'){field.add(new Option('Select owner…',''));for(const user of overlay._treatmentUsers||[])field.add(new Option(user.name||[user.first_name,user.last_name].filter(Boolean).join(' ')||user.email,String(user.id)));}
  if(name==='priority')for(const value of ['Normal','Low','High','Critical'])field.add(new Option(value,value));
  field.value=action[name]??(name==='priority'?'Normal':'');if(['title','owner_user_id','due_date'].includes(name))field.required=true;wrapper.appendChild(field);row.appendChild(wrapper);
 }
 const remove=node('button','Remove this action');remove.className='btn outline';remove.type='button';remove.onclick=()=>row.remove();row.appendChild(remove);overlay.querySelector('#praAdditionalActions').appendChild(row);
}
async function openProjectRiskCreator(options={}){
 if(!selected?.id)return;
 let overlay=document.getElementById('projectRiskCreateOverlay');
 if(overlay?.dataset.saving)return;
 const proposal=options.submission||null;
 const resume=overlay&&!proposal&&!overlay.dataset.riskId&&overlay.dataset.contractId===String(selected.id);
 const retained=resume?Object.fromEntries([...overlay.querySelectorAll('input[id],select[id],textarea[id]')].filter(f=>f.type!=='checkbox'&&f.type!=='search').map(f=>[f.id,f.value])):{};
 const retainedActions=resume?readAdditionalProjectTreatments(overlay):[];
 const retainedDocuments=resume?[...overlay.querySelectorAll('#praDocuments input[data-document-id]:checked')].map(f=>Number(f.value)):[];
 if(!overlay){
  overlay=document.createElement('div');overlay.id='projectRiskCreateOverlay';overlay.className='modal-back show';
  overlay.innerHTML='<div class="drawer"><div class="drawer-head"><button type="button" class="close" id="projectRiskCreateClose">×</button><small>RISK MANAGEMENT · GOVERNED CREATION</small><h2>Add Maintenance Risk</h2><small>Contract: <span id="projectRiskCreateProject"></span> · Draft pending Risk Office approval</small></div><div class="drawer-body"><form id="projectRiskCreateForm"><label for="projectRiskCreateCategory">Risk Classification · Maintenance contract</label><select required id="projectRiskCreateCategory" style="display:block;width:100%;padding:11px;margin:9px 0 18px"></select><label for="projectRiskCreateTitle">Risk Title</label><input required maxlength="255" id="projectRiskCreateTitle" style="display:block;width:100%;padding:11px;margin:9px 0 18px"><label for="projectRiskCreateDescription">Risk Description</label><textarea maxlength="10000" id="projectRiskCreateDescription" style="display:block;width:100%;min-height:110px;padding:11px;margin:9px 0 18px"></textarea><div class="project-risk-section">Risk assessment</div><div class="project-risk-grid"><label>Inherent likelihood<select id="praIL" required></select></label><label>Inherent consequence<select id="praIC" required></select></label><label>Residual likelihood<select id="praRL" required></select></label><label>Residual consequence<select id="praRC" required></select></label></div><p id="praScores">Inherent: — · Residual: —</p><label>Existing controls from Document Library</label><div id="praDocuments"></div><p class="meta">Select at least one current published control document. Its submitted version is retained with the risk assessment.</p><label>Additional control notes</label><textarea id="praCurrent" maxlength="10000"></textarea><label>Further controls and treatment notes</label><textarea id="praFuture" maxlength="10000"></textarea><div class="project-risk-section">Treatment action</div><label>Action title<input id="praActionTitle" maxlength="255" placeholder="Describe the required action"></label><label>Action description<textarea id="praActionDescription" maxlength="10000"></textarea></label><label>Action priority<select id="praActionPriority"><option>Normal</option><option>Low</option><option>High</option><option>Critical</option></select></label><div id="praAdditionalActions"></div><button type="button" class="btn outline" id="praAddAction">Add another treatment action</button><div class="project-risk-section">Ownership and review</div><label>Risk owner<select id="praOwner"></select></label><label>Treatment owner<select id="praTreatmentOwner"></select></label><label>Treatment due date<input type="date" id="praDue"></label><label>Next review date<input type="date" id="praReview"></label><label for="projectRiskCreateReason">Reason for Creation</label><textarea required maxlength="2000" id="projectRiskCreateReason" style="display:block;width:100%;min-height:90px;padding:11px;margin:9px 0 16px"></textarea><p class="meta">Submits the complete risk, document controls and assessment for review. It becomes live only after all required independent approvals. Each approval step appears in My Actions.</p><p id="projectRiskCreateStatus" role="status"></p><div class="drawer-actions"><button class="btn green" type="submit" id="projectRiskCreateSave">Submit for Risk Office review</button><button class="btn outline" type="button" id="projectRiskCreateCancel">Cancel</button></div></form></div></div>';
  document.body.appendChild(overlay);
  const close=()=>{if(!overlay.dataset.saving){overlay.dataset.loadVersion=String(Number(overlay.dataset.loadVersion||0)+1);overlay.classList.remove('show');}};
  overlay.querySelector('#projectRiskCreateClose').onclick=close;
  overlay.querySelector('#projectRiskCreateCancel').onclick=close;
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Submit Maintenance Risk');
  overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();close();}});
  overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
  overlay.querySelector('#projectRiskCreateForm').addEventListener('submit',async e=>{
   e.preventDefault();if(overlay.dataset.saving)return;
   const status=overlay.querySelector('#projectRiskCreateStatus'),save=overlay.querySelector('#projectRiskCreateSave');
   const category=Number(overlay.querySelector('#projectRiskCreateCategory').value);
   const payload={request_id:overlay.dataset.requestId,risk_title:overlay.querySelector('#projectRiskCreateTitle').value.trim(),risk_description:overlay.querySelector('#projectRiskCreateDescription').value.trim(),classification_category_id:category,reason:overlay.querySelector('#projectRiskCreateReason').value.trim(),contract_id:Number(overlay.dataset.contractId),
    proposed_document_ids:Array.from(overlay.querySelectorAll('#praDocuments input[data-document-id]:checked')).map(o=>Number(o.value)),
    proposed_control_ids:JSON.parse(overlay.dataset.controlIds||'[]'),
    treatment_actions:overlay.querySelector('#praActionTitle').value.trim()?[{title:overlay.querySelector('#praActionTitle').value.trim(),description:overlay.querySelector('#praActionDescription').value.trim(),owner_user_id:Number(overlay.querySelector('#praTreatmentOwner').value),due_date:overlay.querySelector('#praDue').value,priority:overlay.querySelector('#praActionPriority').value}]:[],
    proposed_assessment:{inherent_likelihood:Number(overlay.querySelector('#praIL').value),inherent_impact:Number(overlay.querySelector('#praIC').value),residual_likelihood:Number(overlay.querySelector('#praRL').value),residual_impact:Number(overlay.querySelector('#praRC').value),current_controls:overlay.querySelector('#praCurrent').value.trim(),further_controls:overlay.querySelector('#praFuture').value.trim(),owner_user_id:Number(overlay.querySelector('#praOwner').value)||null,treatment_owner_user_id:Number(overlay.querySelector('#praTreatmentOwner').value)||null,treatment_due_date:overlay.querySelector('#praDue').value||null,next_review_date:overlay.querySelector('#praReview').value||null}};
   if(!Number.isInteger(category)||category<=0||!payload.risk_title||!payload.reason||!payload.proposed_document_ids.length){status.textContent='Complete the required fields and select at least one published Document Library control.';return}
   if(payload.treatment_actions.length&&(!payload.treatment_actions[0].owner_user_id||!payload.treatment_actions[0].due_date)){status.textContent='Select an owner and due date for the treatment action.';return}
   payload.treatment_actions.push(...readAdditionalProjectTreatments(overlay));
   if(payload.treatment_actions.some(a=>!a.title||!a.owner_user_id||!a.due_date)){status.textContent='Each treatment action needs a title, owner and due date.';return;}
   if(overlay.dataset.riskId){payload.version=Number(overlay.dataset.version);payload.package_hash=overlay.dataset.packageHash;delete payload.request_id;delete payload.contract_id;}
   overlay.dataset.saving='1';save.disabled=true;status.textContent='Submitting complete risk package…';
   try{
    const response=await apiFetch(API_BASE+(overlay.dataset.riskId?'/risks/'+encodeURIComponent(overlay.dataset.riskId)+'/contract-submission/resubmit':'/maintenance-contracts/'+encodeURIComponent(selected.id)+'/risk-drafts'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(data.message||'Risk creation rejected ('+response.status+')');
    if(!data.risk_id||String(data.contract_id)!==overlay.dataset.contractId)throw Error('Server did not confirm the contract association. Refresh this contract before retrying.');
    status.textContent='Submitted for review. The risk remains non-live until all required approvals are complete.';
    overlay.dataset.requestId='';overlay.dataset.riskId='';
    overlay.querySelector('#projectRiskCreateForm').reset();
    overlay.querySelector('#praAdditionalActions').replaceChildren();overlay.dataset.controlIds='[]';
    overlay.classList.remove('show');
    // The server has confirmed persistence; refresh the register without blocking the drawer.
    const savedProjectId=selected.id;
    Promise.resolve().then(()=>drawContractRisks(selected)).catch(error=>{
     console.error('Maintenance Risk saved, but register refresh failed:',error);
    });
   }catch(error){status.textContent=error.message+' If the save outcome is uncertain, do not create another draft until the register has been checked.'}
   finally{delete overlay.dataset.saving;save.disabled=false}
  });
 }
 for(const [id,names] of [['praIL',['Rare','Unlikely','Possible','Likely','Very Likely']],['praIC',['Insignificant','Minor','Moderate','Major','Catastrophic']],['praRL',['Rare','Unlikely','Possible','Likely','Very Likely']],['praRC',['Insignificant','Minor','Moderate','Major','Catastrophic']]]){
  const field=overlay.querySelector('#'+id);
  if(!field.options.length){field.add(new Option('Select…',''));names.forEach((name,i)=>field.add(new Option((i+1)+' — '+name,String(i+1))))}
  field.onchange=()=>{const n=x=>Number(overlay.querySelector('#'+x).value);overlay.querySelector('#praScores').textContent='Inherent: '+(n('praIL')&&n('praIC')?n('praIL')*n('praIC')+'/25':'—')+' · Residual: '+(n('praRL')&&n('praRC')?n('praRL')*n('praRC')+'/25':'—')};
 }
 overlay.classList.add('show');overlay.dataset.contractId=String(selected.id);overlay.querySelector('#projectRiskCreateProject').textContent=selected.contract_code||selected.contract_name||selected.id;
 const status=overlay.querySelector('#projectRiskCreateStatus'),select=overlay.querySelector('#projectRiskCreateCategory'),save=overlay.querySelector('#projectRiskCreateSave');
 const loadVersion=String(Number(overlay.dataset.loadVersion||0)+1);overlay.dataset.loadVersion=loadVersion;
 status.textContent='Loading contract permissions, classification and published controls…';save.disabled=true;select.replaceChildren();
 try{
  const projectPath=API_BASE+'/maintenance-contracts/'+encodeURIComponent(selected.id);
  const [rolesRes,tiersRes,usersRes,controlsRes,treatmentUsersRes]=await Promise.all([apiFetch(projectPath+'/risk-submission-capabilities'),apiFetch(projectPath+'/risk-classifications'),apiFetch(API_BASE+'/users/active'),apiFetch(projectPath+'/risk-control-documents'),apiFetch(projectPath+'/risk-treatment-owners')]);
  if(!rolesRes.ok||!tiersRes.ok)throw Error('Unable to verify project submission access and classification');
  const roles=await rolesRes.json(),tiers=await tiersRes.json();
  if(overlay.dataset.loadVersion!==loadVersion||!overlay.classList.contains('show'))return;
  if(!usersRes.ok)throw Error('Unable to load active users');
  if(!controlsRes.ok)throw Error('Unable to load published Document Library controls');
  const controlsPayload=await controlsRes.json();
  const controlsList=controlsPayload.documents||[];
  VeroMaintenanceRiskSubmission.documentPicker(overlay.querySelector('#praDocuments'),controlsList,proposal?(proposal.documents||[]).map(d=>d.id||d.document_id):retainedDocuments);
  const usersPayload=await usersRes.json();
  const users=Array.isArray(usersPayload)?usersPayload:(usersPayload.users||[]);
  if(!treatmentUsersRes.ok)throw Error('Unable to load authorised treatment owners');
  const treatmentUsersPayload=await treatmentUsersRes.json(),treatmentUsers=treatmentUsersPayload.users||[];
  overlay._treatmentUsers=treatmentUsers;overlay.querySelector('#praAdditionalActions').replaceChildren();
  overlay.querySelector('#praAddAction').onclick=()=>addProjectTreatmentEditor(overlay,{});
  if(overlay.dataset.loadVersion!==loadVersion||!overlay.classList.contains('show'))return;
  for(const id of ['praOwner','praTreatmentOwner']){
   const field=overlay.querySelector('#'+id);field.replaceChildren();field.add(new Option('Select owner…',''));
   for(const user of id==='praTreatmentOwner'?treatmentUsers:users){const name=user.name||[user.first_name,user.last_name].filter(Boolean).join(' ')||user.email;if(user.id&&name)field.add(new Option(name,String(user.id)))}
  }
  if(roles.can_submit!==true)throw Error('Only authorised risk assessors for this contract can submit a risk.');
  const categories=(tiers.categories||[]).filter(x=>x.status==='Active');
  const parentIds=c=>Array.isArray(c.parent_category_ids)?c.parent_category_ids.map(Number):(c.parent_category_id==null?(tiers.relationships||[]).filter(r=>Number(r.child_category_id)===Number(c.id)).map(r=>Number(r.parent_category_id)):[Number(c.parent_category_id)]);
  const tier2=categories.filter(c=>Number(c.tier)===2);
  const tier2Ids=new Set(tier2.map(c=>Number(c.id)));
  const tier1=categories.filter(c=>Number(c.tier)===1&&parentIds(c).some(id=>tier2Ids.has(id)));
  select.add(new Option('Select classification…',''));
  tier2.sort((a,b)=>a.category_name.localeCompare(b.category_name)).forEach(parent=>{
   const group=document.createElement('optgroup');group.label='Risk Category · '+parent.category_name;
   group.appendChild(new Option('Risk Category · '+parent.category_name,String(parent.id)));
   tier1.filter(c=>parentIds(c).includes(Number(parent.id))).sort((a,b)=>a.category_name.localeCompare(b.category_name)).forEach(child=>{
    group.appendChild(new Option('Risk Event · '+child.category_name,String(child.id)));
   });
   select.appendChild(group);
  });
  if(proposal){
   overlay.querySelector('#projectRiskCreateForm').reset();
   overlay.dataset.riskId=String(proposal.risk_id||proposal.risk.id);overlay.dataset.version=String(proposal.version);overlay.dataset.packageHash=proposal.package_hash;
   const a=proposal.proposed_assessment||{},r=proposal.risk||{},action=(proposal.treatment_actions||[])[0]||{};
   const values={projectRiskCreateTitle:r.risk_title,projectRiskCreateDescription:r.risk_description,projectRiskCreateCategory:proposal.classification_category_id||r.classification_category_id,projectRiskCreateReason:proposal.reason||'',praIL:a.inherent_likelihood,praIC:a.inherent_impact,praRL:a.residual_likelihood,praRC:a.residual_impact,praCurrent:a.current_controls??a.controls_summary,praFuture:a.further_controls??a.treatments_summary,praOwner:a.owner_user_id,praTreatmentOwner:action.owner_user_id||a.treatment_owner_user_id,praDue:action.due_date||a.treatment_due_date,praReview:a.next_review_date,praActionTitle:action.title,praActionDescription:action.description,praActionPriority:action.priority||'Normal'};
   for(const [id,value] of Object.entries(values))overlay.querySelector('#'+id).value=value??'';
   VeroMaintenanceRiskSubmission.documentPicker(overlay.querySelector('#praDocuments'),controlsList,(proposal.documents||[]).map(d=>d.id||d.document_id));
   for(const action of (proposal.treatment_actions||[]).slice(1))addProjectTreatmentEditor(overlay,action);
   overlay.dataset.controlIds=JSON.stringify((proposal.proposed_controls||[]).map(c=>Number(c.control_id||c.id)));
   save.textContent='Resubmit corrected risk';status.textContent='Revise the returned package. Previous versions remain in history.';
  }else{
   if(overlay.dataset.riskId){overlay.querySelector('#projectRiskCreateForm').reset();overlay.dataset.riskId='';}
   overlay.dataset.controlIds='[]';for(const action of retainedActions)addProjectTreatmentEditor(overlay,action);
   if(!overlay.dataset.requestId)overlay.dataset.requestId=crypto.randomUUID();
   for(const [id,value] of Object.entries(retained)){const input=overlay.querySelector('#'+id);if(input)input.value=value;}
   save.textContent='Submit for Risk Office review';status.textContent='Choose the classification and control documents, then complete the assessment.';
  }
  overlay.querySelector('#praIL').onchange();save.disabled=false;
 }catch(error){if(overlay.dataset.loadVersion===loadVersion){status.textContent=error.message;save.disabled=true}}
}

