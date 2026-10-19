/* A versioned Maintenance Risk package: proposal, documents, assessment and decisions stay together. */
(function(global){
 'use strict';
 const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
 const node=(tag,text)=>{const el=document.createElement(tag);if(text!=null)el.textContent=String(text);return el;};
 async function json(path,options={}){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch(API+path,{...options,signal:controller.signal,cache:'no-store',headers:{Authorization:'Bearer '+localStorage.getItem('vero_session_token'),Accept:'application/json','Content-Type':'application/json',...options.headers}});
   const data=await response.json().catch(()=>({}));
   if(!response.ok){const error=Error(data.message||'Request failed ('+response.status+')');error.status=response.status;throw error;}
   return data;
  }catch(error){if(error.name==='AbortError')throw Error('The request timed out. Refresh the risk before retrying a decision.');throw error;}
  finally{clearTimeout(timeout);}
 }
 function field(host,label,value){const row=node('div');row.className='project-risk-value';row.append(node('dt',label),node('dd',value==null||value===''?'Not recorded':value));host.appendChild(row);}
 function card(host,title){const el=node('section');el.className='project-risk-review-card vero-risk-details-card';el.appendChild(node('h3',title));host.appendChild(el);return el;}
 const bands=[['Low','Low','Low','Moderate','Moderate'],['Low','Moderate','Moderate','Moderate','High'],['Low','Moderate','High','High','Significant'],['Moderate','Moderate','High','Significant','Significant'],['Moderate','High','Significant','Significant','Significant']];
 const score=(a,b)=>Number.isInteger(Number(a))&&Number(a)>=1&&Number(a)<=5&&Number.isInteger(Number(b))&&Number(b)>=1&&Number(b)<=5?Number(a)*5*Number(b)+' / 125 · '+bands[Number(a)-1][Number(b)-1]:'Not Assessed';
 async function openDocument(documentId,message,riskId){
  try{
   const response=await fetch(API+(riskId?'/risks/'+encodeURIComponent(riskId)+'/contract-submission/documents/'+encodeURIComponent(documentId)+'/content':'/documents/'+encodeURIComponent(documentId)+'/content'),{headers:{Authorization:'Bearer '+localStorage.getItem('vero_session_token')},cache:'no-store'});
   if(!response.ok)throw Error('Document unavailable ('+response.status+').');
   const blob=await response.blob(),url=URL.createObjectURL(blob);
   const link=node('a','Open document');link.href=url;link.target='_blank';link.rel='noopener';if(message){message.textContent='Document ready: ';message.appendChild(link);}link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(error){if(message)message.textContent=error.message;}
 }
 function documentPicker(host,documents,selected=[]){
  host.replaceChildren();const selectedSet=new Set(selected.map(Number));
  const search=node('input');search.type='search';search.placeholder='Search published control documents';search.setAttribute('aria-label','Search published control documents');host.appendChild(search);
  const list=node('div');list.className='project-risk-document-list';host.appendChild(list);
  const message=node('p');message.setAttribute('role','status');host.appendChild(message);
  for(const doc of documents){
   const row=node('div');row.className='project-risk-document-option';row.dataset.search=[doc.document_number,doc.document_title].join(' ').toLowerCase();
   const label=node('label'),input=node('input');input.type='checkbox';input.value=String(doc.id);input.checked=selectedSet.has(Number(doc.id));input.dataset.documentId=String(doc.id);
   label.append(input,node('span',(doc.document_number||'Document')+' · '+(doc.document_title||'Untitled')+' · v'+doc.version_number));row.appendChild(label);
   const view=node('button','View');view.type='button';view.className='btn outline';view.addEventListener('click',()=>openDocument(doc.id,message));row.appendChild(view);list.appendChild(row);
  }
  if(!documents.length)message.textContent='No eligible published Document Library controls are available.';
  search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();for(const row of list.children)row.hidden=!row.dataset.search.includes(q);});
 }
 function render(host,data,options={}){
  host.replaceChildren();
  const submission=data.submission;
  if(!data.available||!submission){host.appendChild(node('p','No submitted Maintenance Risk package is available.'));return;}
  const capabilities=data.capabilities||{},assessment=submission.proposed_assessment||{},risk=submission.risk||{};
  const pending=['Submitted','Assessment Approval Pending'].includes(submission.status)&&!['Archived','Closed'].includes(risk.status||data.risk_status);
  const summary=card(host,'Submitted Maintenance Risk');
  field(summary,'Risk',risk.risk_code||submission.risk_id);field(summary,'Title',risk.risk_title);field(summary,'Description',risk.risk_description);
  field(summary,'Contract',submission.contract_name||submission.contract_id);field(summary,'Submission version',submission.version);
  field(summary,'Submitted by',submission.submitted_by_name||submission.submitted_by||submission.submitted_by_user_id);field(summary,'Submitted at',submission.submitted_at);
  field(summary,'Review status',data.approval_state||submission.status||data.status);
  field(summary,'Live in contract reporting',data.is_live?'Yes':pending?'No, required approvals are still pending':'No');
  field(summary,'Reason for submission',submission.reason);
  if(submission.status==='Changes Requested'&&(submission.return_reason||data.return_reason||submission.last_reason||data.last_reason))field(summary,'Changes requested',submission.return_reason||data.return_reason||submission.last_reason||data.last_reason);
  const ratings=card(host,'Submitted risk assessment');
  for(const [label,key] of [['Inherent likelihood','inherent_likelihood'],['Inherent consequence','inherent_impact'],['Residual likelihood','residual_likelihood'],['Residual consequence','residual_impact']])field(ratings,label,assessment[key]);
  field(ratings,'Inherent rating',score(assessment.inherent_likelihood,assessment.inherent_impact));field(ratings,'Current Residual Rating',score(assessment.residual_likelihood,assessment.residual_impact));field(ratings,'Target Rating',score(assessment.target_likelihood,assessment.target_impact));field(ratings,'Assessment Notes',assessment.assessment_notes);
  field(ratings,'Current control notes',assessment.current_controls??assessment.controls_summary);field(ratings,'Further controls and treatment',assessment.further_controls??assessment.treatments_summary);
  field(ratings,'Risk owner',assessment.owner_name||assessment.owner_user_id);field(ratings,'Treatment owner',assessment.treatment_owner_name||assessment.treatment_owner_user_id);
  field(ratings,'Treatment due date',assessment.treatment_due_date);field(ratings,'Next Review Date',assessment.next_review_date);if(assessment.review_schedule){const schedule=assessment.review_schedule;field(ratings,'Review Basis',schedule.residual_rating+' · '+schedule.default_interval_months+' month default');if(schedule.constraints?.length)field(ratings,'Earlier Review Requirements',schedule.constraints.join('; '));if(schedule.immediate_escalation)field(ratings,'Escalation','Significant risk requires immediate escalation; the review date does not defer it.');}
  const documents=card(host,'Document Library controls');const documentStatus=node('p');documentStatus.setAttribute('role','status');documents.appendChild(documentStatus);
  if(!submission.documents?.length)documents.appendChild(node('p','No Document Library controls were recorded in this submission.'));
  for(const doc of submission.documents||[]){const row=node('div');row.className='project-risk-document-option';row.appendChild(node('span',(doc.document_number||'Document')+' · '+(doc.document_title||'Untitled')+' · submitted version '+doc.version_number));const view=node('button','View submitted document');view.type='button';view.className='btn outline';view.addEventListener('click',()=>openDocument(doc.id||doc.document_id,documentStatus,submission.risk_id||risk.id));row.appendChild(view);documents.appendChild(row);}
  if(submission.proposed_controls?.length){const controls=card(host,'Linked enterprise controls');for(const control of submission.proposed_controls)field(controls,control.control_code||'Control',control.control_title||control.id);}
  const treatments=card(host,'New control and treatment actions');
  if(!submission.treatment_actions?.length)treatments.appendChild(node('p','No new treatment actions proposed.'));
  for(const action of submission.treatment_actions||[]){
   const row=node('section');row.className='project-risk-treatment';row.dataset.treatmentActionId=String(action.id||'');
   field(row,'Title',action.title);field(row,'Description',action.description);field(row,'Owner',action.owner_name||action.owner_user_id);field(row,'Due date',action.due_date);field(row,'Priority',action.priority);field(row,'Status',action.status||'Proposed');field(row,'Verification',action.verification_status||'Not due');
   if(action.completion_notes)field(row,'Completion notes',action.completion_notes);if(action.verification_notes)field(row,'Verification notes',action.verification_notes);
   const feedback=node('p');feedback.setAttribute('role','status');row.appendChild(feedback);
   async function updateAction(route,payload){
    if(row.dataset.saving)return;
    row.dataset.saving='1';const buttons=[...row.querySelectorAll('button')];buttons.forEach(button=>button.disabled=true);feedback.textContent='Saving action update…';
    try{
     await json('/contract-risk/treatment-actions/'+encodeURIComponent(action.id)+'/'+route,{method:'POST',body:JSON.stringify({...payload,version:action.version})});
     await options.onSaved?.();
     if(!host.isConnected||options.isCurrent&&!options.isCurrent())return;
     const latest=await load(submission.risk_id||risk.id);if(!host.isConnected||options.isCurrent&&!options.isCurrent())return;render(host,latest,options);
    }catch(error){feedback.textContent=error.message+' Refresh the risk before retrying.';}
    finally{delete row.dataset.saving;buttons.forEach(button=>button.disabled=false);}
   }
   if(data.is_live&&Number.isInteger(action.version)&&action.capabilities?.can_update_status){
    if(action.status==='Open'){const start=node('button','Start treatment');start.className='btn outline';start.type='button';start.addEventListener('click',()=>updateAction('status',{status:'In Progress',notes:''}));row.appendChild(start);}
    const complete=node('button',action.verification_status==='Rejected'?'Resubmit treatment completion':'Complete treatment');complete.className='btn green';complete.type='button';complete.addEventListener('click',()=>{const notes=global.prompt('Completion notes (required):');if(notes===null)return;if(!notes.trim()){feedback.textContent='Completion notes are required.';return;}updateAction('status',{status:'Completed',notes:notes.trim()});});row.appendChild(complete);
   }
   if(data.is_live&&Number.isInteger(action.version)&&action.capabilities?.can_verify){
    for(const decision of ['Verified','Rejected']){const button=node('button',decision==='Verified'?'Verify treatment':'Return treatment for correction');button.type='button';button.className='btn outline';button.addEventListener('click',()=>{const notes=global.prompt(decision==='Rejected'?'Reason for returning the treatment (required):':'Verification notes:');if(notes===null)return;if(decision==='Rejected'&&!notes.trim()){feedback.textContent='A return reason is required.';return;}updateAction('verify',{decision,notes:notes.trim()});});row.appendChild(button);}
   }
   treatments.appendChild(row);
  }
  if(data.assessment){const formal=card(host,'Formal assessment and approval');for(const [label,key] of [['Assessment ID','id'],['Revision','revision'],['Status','status'],['Inherent likelihood','inherent_likelihood'],['Inherent consequence','inherent_impact'],['Residual likelihood','residual_likelihood'],['Residual consequence','residual_impact'],['Current controls','controls_summary'],['Further treatments','treatments_summary'],['Owner','owner_user_id'],['Approved by','approved_by_user_id'],['Approved at','approved_at'],['Target Likelihood','target_likelihood'],['Target Consequence','target_impact'],['Assessment Notes','assessment_notes'],['Next Review Date','next_review_date']])field(formal,label,data.assessment[key]);field(formal,'Target Rating',score(data.assessment.target_likelihood,data.assessment.target_impact));}
  if(Array.isArray(data.history)&&data.history.length){const history=card(host,'Submission history');for(const event of data.history)field(history,event.action||event.status,[event.actor_name||event.actor||event.actor_user_id,event.occurred_at||event.created_at,event.reason].filter(Boolean).join(' · '));}
  const decisions=card(host,'Risk approval');
  if(submission.legacy&&capabilities.can_resubmit)decisions.appendChild(node('p','Your original risk and assessment are saved. Complete any missing controls or documents, then resubmit the same risk. No new assessment is needed.'));
  for(const blocker of capabilities.approval_blockers||[])decisions.appendChild(node('p',typeof blocker==='string'?blocker:blocker.message));
  if(pending&&!data.is_live){if(data.reviewer_routing?.ready===false)decisions.appendChild(node('p',data.reviewer_routing.message||'An eligible reviewer must be assigned before this risk can be approved.'));else decisions.appendChild(node('p','Each remaining approval is routed through My Actions. The submitted assessment and selected document versions stay with this risk.'));}
  if(options.onAssessments&&(data.is_live||capabilities.can_use_assessment_workflow)){const history=node('button','View assessment history and revisions');history.type='button';history.className='btn outline';history.addEventListener('click',options.onAssessments);decisions.appendChild(history);}
  const status=node('p');status.setAttribute('role','status');decisions.appendChild(status);
  const buttons=[];
  async function decide(decision){
   if(decisions.dataset.saving)return;
   const reason=global.prompt(decision==='Return'?'Reason for returning this Maintenance Risk (required):':'Approval rationale (required):');
   if(reason===null)return;if(!reason.trim()||reason.length>2000){status.textContent='Enter a rationale of 1–2000 characters.';return;}
   if(decision==='Approve'&&!global.confirm(capabilities.can_complete?'Approve this risk and its submitted assessment?':'Approve this stage? An independent reviewer must still approve the assessment before the risk becomes active.'))return;
   decisions.dataset.saving='1';buttons.forEach(b=>b.disabled=true);status.textContent='Recording review…';
   try{
    await json('/risks/'+encodeURIComponent(submission.risk_id||risk.id)+'/contract-submission/decision',{method:'POST',body:JSON.stringify({decision,reason:reason.trim(),version:submission.version,package_hash:submission.package_hash})});
    await options.onSaved?.();
    if(!host.isConnected||options.isCurrent&&!options.isCurrent())return;
    const latest=await load(submission.risk_id||risk.id);if(!host.isConnected||options.isCurrent&&!options.isCurrent())return;render(host,latest,options);
   }catch(error){status.textContent=error.message+' Refresh this risk before retrying; the submitted package may have changed.';}
   finally{delete decisions.dataset.saving;buttons.forEach(b=>b.disabled=false);}
  }
  if(capabilities.can_approve&&data.reviewer_routing?.ready!==false){const button=node('button',capabilities.can_complete?'Approve risk and assessment':'Approve risk — next reviewer required');button.className='btn green';button.type='button';button.addEventListener('click',()=>decide('Approve'));buttons.push(button);decisions.appendChild(button);}
  if(capabilities.can_request_changes){const button=node('button','Return for changes');button.className='btn outline';button.type='button';button.addEventListener('click',()=>decide('Return'));buttons.push(button);decisions.appendChild(button);}
  if(capabilities.can_resubmit){const button=node('button',submission.legacy?'Complete submission':'Edit and resubmit');button.className='btn green';button.type='button';button.addEventListener('click',()=>{if(options.onRevise)options.onRevise(submission);else global.location.href='maintenance-workspace.html?'+new URLSearchParams({id:String(submission.contract_id),risk_id:String(submission.risk_id||risk.id),risk_action:'correct'});});decisions.appendChild(button);}
  if(!capabilities.can_approve&&!capabilities.can_request_changes&&!capabilities.can_resubmit&&!data.is_live)decisions.appendChild(node('p',pending?'Read-only review. Authorised reviewers can act through My Actions once routing is ready.':'Read-only risk history.'));
 }
 const load=riskId=>json('/risks/'+encodeURIComponent(riskId)+'/contract-submission');
 global.VeroMaintenanceRiskSubmission={json,node,load,render,documentPicker,score};
})(window);


