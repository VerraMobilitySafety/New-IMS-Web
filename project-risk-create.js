/* Project Risk controller: fixed Project Execution, manager submission, existing approval workflow. */
window.VeroProjectRiskCreator=(()=>{'use strict';
let overlay=null,form=null,version=0,busy=false,currentKey=null,requestId=null,cached=null,abort=null;
function createOverlay(){if(overlay)return;overlay=document.createElement('div');overlay.id='projectRiskCreateOverlay';overlay.className='modal-back';overlay.innerHTML='<div class="drawer" role="dialog" aria-modal="true" aria-labelledby="projectRiskCreateHeading"><div class="drawer-head"><button type="button" class="close" aria-label="Close Project Risk">×</button><small>PROJECT MANAGEMENT · PROJECT EXECUTION</small><h2 id="projectRiskCreateHeading">Add Project Risk</h2><small class="project-context"></small></div><div class="drawer-body"></div></div>';document.body.append(overlay);overlay.querySelector('.close').onclick=close;overlay.addEventListener('click',event=>{if(event.target===overlay)close();});overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();close();}if(event.key==='Tab'){const controls=[...overlay.querySelectorAll('button,input,select,textarea,[tabindex="0"]')].filter(e=>!e.disabled&&e.getClientRects().length);if(!controls.length)return;const first=controls[0],last=controls[controls.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});}
function close(){if(busy)return;if(form)cached=form.getValue();form?.closePickers();version++;abort?.abort();overlay?.classList.remove('show');}
function normalise(submission,options){if(!submission)return null;const a=submission.proposed_assessment||{},risk=submission.risk||{};
let parent=submission.classification_parent_id;const category=submission.classification_category_id;
const selected=options.classification_categories.find(c=>Number(c.id)===Number(category));
if(!parent&&selected?.tier===1)parent=options.classification_relationships.find(r=>Number(r.child_id)===Number(category)&&options.classification_categories.some(c=>c.id===r.parent_id&&c.tier===2))?.parent_id;
const path=selected?.tier===2?[Number(category)]:parent&&category?[Number(parent),Number(category)]:[];
const position=prefix=>Number.isInteger(a[prefix+'_likelihood'])&&Number.isInteger(a[prefix+'_impact'])?{likelihood:a[prefix+'_likelihood'],impact:a[prefix+'_impact']}:null;
return {risk_title:risk.risk_title,risk_description:risk.risk_description,classification_path:path,risk_owner_user_id:a.owner_user_id,
 inherent:position('inherent'),residual:position('residual'),target:position('target'),controls_summary:a.current_controls||'',treatments_summary:a.further_controls||'',
 justification:a.assessment_notes||submission.reason||'',next_review_date:a.next_review_date||'',control_ids:(submission.proposed_controls||[]).map(c=>Number(c.id||c.control_id)),
 document_ids:(submission.documents||[]).map(d=>Number(d.id||d.document_id)),treatment_actions:(submission.treatment_actions||[]).map(t=>({title:t.title,owner_user_id:t.owner_user_id,due_date:t.due_date,description:t.description||'',priority:t.priority||'Normal'}))};}
async function open(config){if(busy||!config.project?.id)return;createOverlay();const projectId=Number(config.project.id),submission=config.submission||null,riskId=submission?.risk_id||submission?.risk?.id;
const key=projectId+':'+(riskId||'new');if(key!==currentKey){currentKey=key;cached=null;requestId=null;}else if(form&&!submission)cached=form.getValue();
form?.destroy();form=null;abort?.abort();abort=new AbortController();const ticket=++version;
overlay.classList.add('show');overlay.querySelector('.project-context').textContent=(config.project.project_code||config.project.project_name||projectId)+' · Pending Risk Officer Review';
const host=overlay.querySelector('.drawer-body');host.textContent='Loading Project Risk permissions and assessment choices…';
async function api(path,body){const response=await config.apiFetch(config.apiBase+path,{method:body?'POST':'GET',cache:'no-store',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{signal:abort.signal})});let data;try{data=await response.json();}catch{throw Error('The server response could not be read. Your form has been kept.');}if(!response.ok)throw Error(data.message||'Unable to complete the Project Risk request');return data;}
try{
const options=await api('/projects/'+projectId+'/risk-submission-options');if(ticket!==version||!overlay.classList.contains('show'))return;
if(options.can_submit!==true)throw Error('Only authorised managers of this project can submit a risk.');
if(!options.schema_ready)throw Error('The shared assessment database update must be applied before using this form.');
const initial=submission?normalise(submission,options):cached;
form=window.VeroRiskAssessmentForm.mount(host,{options,idPrefix:'project-risk',projectMode:true,fixedTier3Id:options.project_execution_id,requireDocument:true,notesMaxLength:2000,initial,
 submitLabel:submission?'Resubmit For Risk Officer Review':'Submit For Risk Officer Review',savingMessage:'Submitting the complete Project Risk package…',onCancel:close,
 onBusy(value){busy=value;overlay.querySelector('.close').disabled=value;},
 async onSubmit(body){
 const selected=body.classification_path.slice(-2);
 const assessment={inherent_likelihood:body.inherent.likelihood,inherent_impact:body.inherent.impact,residual_likelihood:body.residual.likelihood,residual_impact:body.residual.impact,
 target_likelihood:body.target.likelihood,target_impact:body.target.impact,assessment_notes:body.justification,current_controls:body.controls_summary,further_controls:body.treatments_summary,
 owner_user_id:body.risk_owner_user_id,next_review_date:body.next_review_date,treatment_owner_user_id:null,treatment_due_date:null};
 const payload={assessment_format:'shared-v1',risk_title:body.risk_title,risk_description:body.risk_description,classification_parent_id:selected[0],classification_category_id:selected[1],reason:body.justification,
 proposed_assessment:assessment,proposed_document_ids:body.document_ids,proposed_control_ids:body.control_ids,treatment_actions:body.treatment_actions};
 let route='/risks/master-drafts';
 if(submission){route='/risks/'+riskId+'/project-submission/resubmit';payload.version=submission.version;payload.package_hash=submission.package_hash;}
 else{if(!requestId)requestId=crypto.randomUUID();payload.request_id=requestId;payload.project_id=projectId;}
 const result=await api(route,payload);
 if(!result.risk_id||Number(result.project_id)!==projectId)throw Error('The server did not confirm the project association. Check the project register before retrying.');
 cached=null;requestId=null;currentKey=null;form.setStatus('Submitted for Risk Officer review. The risk is not live until approval.');overlay.classList.remove('show');version++;
 Promise.resolve().then(()=>config.onSaved?.(result)).catch(error=>console.error('Risk submitted; project register refresh failed',error));
 }
});form.focus();
}catch(error){if(ticket===version&&overlay.classList.contains('show'))host.textContent=error.name==='AbortError'?'Loading was cancelled.':error.message;}
}
return {open,close};
})();
