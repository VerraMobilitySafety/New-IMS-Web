/* Adapter: Compliance status/classifications stay in their own workflow.
   The common component supplies the same six-axis assessment and control UI. */
(()=>{'use strict';
const originalPrepare=prepareComplianceRiskAssessment,originalExemption=updateComplianceRiskExemption,originalClose=complianceRiskHandleClose;
const shared={single:{},review:{}};
function hideLegacy(prefix){const fieldset=complianceRiskElement(prefix,'Fields');for(const suffix of [...complianceRiskNumericFields,'Owner','ControlsSummary','TreatmentsSummary','Justification']){const el=complianceRiskElement(prefix,suffix);if(el){el.required=false;el.disabled=true;const field=el.closest('.field');if(field)field.hidden=true;}}const scores=complianceRiskElement(prefix,'Scores');if(scores)scores.hidden=true;const matrix=complianceRiskElement(prefix,'Matrix');if(matrix?.closest('details'))matrix.closest('details').hidden=true;return fieldset;}
function resetEditor(prefix){const s=shared[prefix];s.form?.destroy();s.form=null;s.ready=false;}
prepareComplianceRiskAssessment=async function(prefix='review',reset=true){const state=complianceRiskForms[prefix],s=shared[prefix],ticket=state.sequence+1,retained=!reset?s.form?.getValue():null;resetEditor(prefix);if(reset||!s.requestId)s.requestId=crypto.randomUUID();await originalPrepare(prefix,reset);if(ticket!==state.sequence)return;
 const fieldset=hideLegacy(prefix);let host=document.getElementById(prefix+'SharedRiskAssessment');if(!host){host=document.createElement('div');host.id=prefix+'SharedRiskAssessment';host.className='compliance-shared-editor';fieldset.append(host);}host.textContent='Loading shared assessment…';
 try{const options=await complianceRiskRequest('/compliance/risk-assessment-options'+(prefix==='review'?'?obligation_id='+encodeURIComponent(state.obligationId):''),{cache:'no-store'});if(ticket!==state.sequence)return;if(!options.schema_ready)throw Error('The shared Compliance assessment database update is required.');if(!Array.isArray(options.users)||!options.users.length)throw Error('No active Risk Owners are available.');
  s.options=options;s.form=window.VeroRiskAssessmentForm.mount(host,{options,idPrefix:prefix+'-shared',assessmentOnly:true,embedded:true,initial:retained||{},onSubmit:async()=>{}});s.ready=true;complianceRiskElement(prefix,'Message').textContent='';complianceRiskElement(prefix,'Retry').hidden=true;if(prefix==='review')updateComplianceRiskExemption();
 }catch(e){if(ticket!==state.sequence)return;host.textContent='Shared risk assessment unavailable.';complianceRiskElement(prefix,'Message').textContent=e.message;complianceRiskElement(prefix,'Retry').hidden=false;}
};
updateComplianceRiskExemption=function(){originalExemption();const exempt=document.getElementById('reviewAssessmentStatus').value==='Not Applicable',host=document.getElementById('reviewSharedRiskAssessment');if(host)host.hidden=exempt;shared.review.form?.setBusy(exempt);const next=document.getElementById('reviewAssessmentNextDate');if(next?.closest('.field'))next.closest('.field').hidden=!exempt;hideLegacy('review');};
readComplianceRiskPosition=function(prefix='review',status){if(prefix==='review'&&status==='Not Applicable')return null;const s=shared[prefix];if(!s.ready||!s.form)throw Error('Wait for the shared risk assessment, or retry the risk options.');const v=s.form.getValue();
 for(const stage of ['inherent','residual','target']){const p=v[stage];if(!p||!Number.isInteger(p.likelihood)||!Number.isInteger(p.impact)||p.likelihood<1||p.likelihood>5||p.impact<1||p.impact>5)throw Error('Complete Inherent, Current Residual and Target assessments.');}
 if(!s.options.users.some(u=>u.id===v.risk_owner_user_id))throw Error('Select an active Risk Owner.');if(!v.justification.trim())throw Error('Explain the risk from non-compliance or partial compliance in Assessment Notes And Justification.');
 const effect=complianceRiskElement(prefix,'ControlEffectiveness').value;if(!complianceRiskEffects.includes(effect))throw Error('Select Control Effectiveness.');
 if(!v.next_review_date)throw Error('The Current Residual rating is needed to calculate the next review.');
 if(v.treatment_actions.some(a=>!a.title||!a.owner_user_id||!a.due_date))throw Error('Complete each treatment title, owner and due date, or remove the empty action.');
 if((v.target.likelihood!==v.residual.likelihood||v.target.impact!==v.residual.impact)&&!v.treatments_summary.trim()&&!v.treatment_actions.length)throw Error('Describe the further controls needed to achieve the Target.');
 const linked=complianceRiskElement(prefix,'LinkedMaster')?.value||'';
 return {inherent_likelihood:v.inherent.likelihood,inherent_impact:v.inherent.impact,residual_likelihood:v.residual.likelihood,residual_impact:v.residual.impact,risk_owner_user_id:v.risk_owner_user_id,control_effectiveness:effect,justification:v.justification,controls_summary:v.controls_summary||null,treatments_summary:v.treatments_summary||null,linked_risk_id:linked?Number(linked):null,shared_assessment:{format_version:'shared-v1',request_id:s.requestId,target:v.target,control_ids:v.control_ids,document_ids:v.document_ids,treatment_actions:v.treatment_actions,next_review_date:v.next_review_date}};
};
document.getElementById('reviewAssessmentStatus').removeEventListener('change',originalExemption);
document.getElementById('reviewAssessmentStatus').addEventListener('change',updateComplianceRiskExemption);
complianceRiskHandleClose=function(id){originalClose(id);if(id==='submitModal')resetEditor('single');if(id==='reviewAssessmentModal'||id==='obligationModal')resetEditor('review');};
})();
