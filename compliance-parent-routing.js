/* Parent areas are requirement-specific; Compliance remains fixed at Tier 2. */
(()=>{'use strict';
 const states={single:{generation:0},review:{generation:0}};
 const key=path=>JSON.stringify(path);
 const node=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
 function mount(host,options,{prefix,retained}={}){
  host.replaceChildren();host.append(node('h3','Compliance — Tier 2'));
  if(!options.available){host.append(node('p',options.reason||'Parent selection is unavailable. Existing mappings will be preserved.'));return {read:()=>undefined,retain:()=>null};}
  const current=options.current||{revision:0,parent_paths:[]};
  const enabled=node('input');enabled.type='checkbox';enabled.checked=prefix==='links'||(retained?retained.enabled:prefix==='single');
  const label=node('label');label.append(enabled,node('span',prefix==='single'?'Select the parent areas for this requirement':"Update this requirement's selected parent areas"));if(prefix!=='links')host.append(label);
  host.append(node('p','Only selected paths receive this requirement’s Current Residual assessment. Existing risk classifications are retained.'));
  if(!options.aggregation_enabled)host.append(node('p','Parent selections can be reviewed and saved. Aggregation is not enabled.'));
  const selected=new Set((retained?.paths||current.parent_paths).map(key)),checks=[];
  const group=node('fieldset');group.append(node('legend','Parent areas'));
  for(const path of options.paths||[]){const row=node('label'),check=node('input');check.type='checkbox';check.checked=selected.has(key(path.ids));row.append(check,node('span',path.label));group.append(row);checks.push({check,path});}
  const stale=[...selected].filter(k=>!checks.some(x=>key(x.path.ids)===k));
  if(stale.length)group.append(node('p','A saved path is no longer available. Review the remaining selections before replacing the mapping.'));
  const refresh=()=>{group.disabled=!enabled.checked;};enabled.addEventListener('change',refresh);refresh();host.append(group);
  const revision=retained?.revision??current.revision;
  const paths=()=>checks.filter(x=>x.check.checked).map(x=>x.path.ids);
  const retain=()=>({enabled:enabled.checked,paths:paths(),revision});
  const read=()=>{if(!enabled.checked)return undefined;const chosen=paths();if(!chosen.length)throw Error('Select at least one parent area for Compliance, or leave the existing mapping unchanged.');return {register_id:options.register_id,compliance_category_id:480,expected_revision:revision,parent_paths:chosen};};
  if(current.parent_paths.length)host.append(node('p','Saved parent paths: '+current.parent_paths.map(p=>(options.paths||[]).find(x=>key(x.ids)===key(p))?.label||p.join(' → ')).join('; ')));
  if(current.history?.length){const details=node('details');details.append(node('summary','Parent selection history'));for(const h of current.history){details.append(node('p','Revision '+h.revision+' · User #'+h.actor_user_id+' · '+h.created_at+' · '+(h.selected_routing.parent_path_labels||h.selected_routing.parent_paths.map(p=>p.join(' → '))).join('; ')));}host.append(details);}
  if(prefix==='links'&&current.history?.length){const audit=node('details');audit.append(node('summary','Risk Links change reasons'));for(const h of current.history){if(h.change_reason)audit.append(node('p','Revision '+h.revision+' — '+h.change_reason));}host.append(audit);}
  return {read,retain};
 }
 window.VeroComplianceParentRouting={mount};
 const originalPrepare=prepareComplianceRiskAssessment,originalRead=readComplianceRiskPosition,originalClose=complianceRiskHandleClose,originalSummary=complianceRiskSummary;
 prepareComplianceRiskAssessment=async function(prefix='review',reset=true){
  const s=states[prefix],generation=++s.generation,retained=!reset?s.view?.retain():null;s.view=null;
  await originalPrepare(prefix,reset);if(generation!==s.generation)return;
  const oid=prefix==='review'?complianceRiskForms.review.obligationId:null;
  let host=document.getElementById(prefix+'ComplianceParentRouting');if(!host){host=node('section');host.id=prefix+'ComplianceParentRouting';complianceRiskElement(prefix,'Fields').append(host);}host.textContent='Loading Compliance parent areas…';
  try{const options=await complianceRiskRequest('/compliance/parent-routing-options'+(oid?'?obligation_id='+encodeURIComponent(oid):''),{cache:'no-store'});if(generation!==s.generation||prefix==='review'&&Number(currentLiveObligationId)!==Number(oid))return;s.view=mount(host,options,{prefix,retained});if(prefix==='review')updateRoutingExemption();}
  catch(error){if(generation!==s.generation)return;host.textContent='Unable to load parent areas: '+error.message+'. Retry the risk options before changing parent selections.';complianceRiskElement(prefix,'Retry').hidden=false;}
 };
 readComplianceRiskPosition=function(prefix='review',status){const result=originalRead(prefix,status);if(!result)return result;const s=states[prefix];if(!s.view)throw Error('Wait for Compliance parent areas, or retry the risk options.');const routing=s.view.read();if(routing!==undefined)result.parent_routing=routing;return result;};
 complianceRiskSummary=function(position){const html=originalSummary(position),routing=position?.parent_routing;if(!routing)return html;const labels=routing.parent_path_labels||routing.parent_paths.map(p=>p.join(' → '));return html+'<p><strong>Compliance — Tier 2; selected parent areas:</strong> '+labels.map(escapeComplianceText).join('; ')+'</p><p>On approval these selections apply to a new requirement. Linking an existing requirement retains its existing mapping.</p>';};
 complianceRiskHandleClose=function(id){originalClose(id);for(const prefix of id==='submitModal'?['single']:id==='reviewAssessmentModal'||id==='obligationModal'?['review']:[]){states[prefix].generation++;states[prefix].view=null;}};
 function updateRoutingExemption(){const host=document.getElementById('reviewComplianceParentRouting');if(host)host.hidden=document.getElementById('reviewAssessmentStatus')?.value==='Not Applicable';}
 document.getElementById('reviewAssessmentStatus')?.addEventListener('change',updateRoutingExemption);
})();
