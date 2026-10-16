/* Compliance uses normalized likelihood/impact levels 1–5. Ratings are the
   shared Verra matrix cells, never thresholds inferred from multiplied scores. */
const COMPLIANCE_RISK_MATRIX=[
 ['Low','Low','Low','Moderate','Moderate'],
 ['Low','Moderate','Moderate','Moderate','High'],
 ['Low','Moderate','High','High','Significant'],
 ['Moderate','Moderate','High','Significant','Significant'],
 ['Moderate','High','Significant','Significant','Significant']
];
const complianceRiskForms={single:{sequence:0,ownersReady:false},review:{sequence:0,ownersReady:false,obligationId:null}};
const complianceRiskNumericFields=['InherentLikelihood','InherentImpact','ResidualLikelihood','ResidualImpact'];
const complianceRiskEffects=['Effective','Partially Effective','Ineffective','Not Assessed'];
let submissionRiskPaths=[];
let submissionRiskClassificationSequence=0;
let submissionRiskClassificationsReady=false;
let complianceRiskHistorySequence=0;
let complianceRequirementClassificationSequence=0;
function complianceRiskElement(prefix,suffix){return document.getElementById(prefix+'Risk'+suffix);}
function complianceRiskScore(likelihood,impact){
 const l=Number(likelihood),i=Number(impact);
 return Number.isInteger(l)&&l>=1&&l<=5&&Number.isInteger(i)&&i>=1&&i<=5
  ? {score:l*5*i,rating:COMPLIANCE_RISK_MATRIX[l-1][i-1]} : null;
}
function complianceRiskOptions(select,placeholder,items){
 select.replaceChildren();
 const add=(value,label)=>{const option=document.createElement('option');option.value=String(value);option.textContent=String(label);select.appendChild(option);};
 add('',placeholder);items.forEach(item=>add(item.value,item.label));
}
function renderComplianceRiskMatrix(prefix){
 const labels=[5,4,3,2,1];
 complianceRiskElement(prefix,'Matrix').innerHTML='<table class="compliance-risk-matrix"><caption>Shared matrix ratings using normalized likelihood levels 1–5 (equivalent to 5–25 in the Risk register). Scores here are likelihood × 5 × consequence, out of 125.</caption><thead><tr><th scope="col">Likelihood / Impact</th>'+[1,2,3,4,5].map(i=>'<th scope="col">'+i+'</th>').join('')+'</tr></thead><tbody>'+labels.map(l=>'<tr><th scope="row">'+l+'</th>'+[1,2,3,4,5].map(i=>{const value=complianceRiskScore(l,i);return '<td class="compliance-risk-'+value.rating.toLowerCase()+'">'+value.score+'<br>'+value.rating+'</td>';}).join('')+'</tr>').join('')+'</tbody></table>';
}
function updateComplianceRiskScores(prefix='review'){
 const exempt=prefix==='review'&&document.getElementById('reviewAssessmentStatus').value==='Not Applicable';
 const target=complianceRiskElement(prefix,'Scores');
 if(exempt){target.textContent='Risk assessment exempt: Not Applicable';return;}
 target.innerHTML=['Inherent','Residual','Target'].map(kind=>{
  const result=complianceRiskScore(complianceRiskElement(prefix,kind+'Likelihood')?.value,complianceRiskElement(prefix,kind+'Impact')?.value);
  return '<div class="compliance-risk-score">'+kind+' risk<strong>'+(result?result.score+' / 125 · <span class="compliance-risk-level compliance-risk-'+result.rating.toLowerCase()+'">'+result.rating+'</span>':'Select likelihood and impact')+'</strong></div>';
 }).join('');
}
function updateComplianceRiskExemption(){
 const exempt=document.getElementById('reviewAssessmentStatus').value==='Not Applicable';
 document.querySelectorAll('#reviewRiskFields select, #reviewRiskFields textarea').forEach(el=>{el.disabled=exempt;});
 complianceRiskElement('review','Exemption').hidden=!exempt;
 updateComplianceRiskScores('review');
}
async function prepareComplianceRiskAssessment(prefix='review',reset=true){
 const state=complianceRiskForms[prefix];
 const sequence=++state.sequence;
 state.ownersReady=false;
 if(prefix==='review')state.obligationId=currentLiveObligationId;
 const obligationId=state.obligationId;
 const owner=complianceRiskElement(prefix,'Owner');
 const oldOwner=reset?'':owner.value;
 const linked=complianceRiskElement(prefix,'LinkedMaster');
 const oldLinked=reset?'':linked?.value;
 const message=complianceRiskElement(prefix,'Message');
 const retry=complianceRiskElement(prefix,'Retry');
 message.textContent='Loading risk options...';retry.hidden=true;
 if(reset){
  complianceRiskNumericFields.forEach(suffix=>{complianceRiskElement(prefix,suffix).value='';});
  ['ControlEffectiveness','Justification','ControlsSummary','TreatmentsSummary'].forEach(suffix=>{const el=complianceRiskElement(prefix,suffix);if(el)el.value='';});
 }
 complianceRiskOptions(owner,'Loading owners...',[]);
 if(linked)complianceRiskOptions(linked,'Loading linked master risks...',[]);
 if(prefix==='review')updateComplianceRiskExemption();else updateComplianceRiskScores(prefix);
 const results=await Promise.allSettled([
  complianceRiskRequest('/users/active',{cache:'no-store'}),
  linked?complianceRiskRequest('/compliance/obligations/'+obligationId+'/risks',{cache:'no-store'}):Promise.resolve({risks:[]})
 ]);
 if(sequence!==state.sequence||(prefix==='review'&&Number(currentLiveObligationId)!==Number(obligationId)))return;
 const errors=[];
 if(results[0].status==='fulfilled'){
  const users=results[0].value.users||[];
  const options=users.filter(u=>Number.isInteger(Number(u.id))&&Number(u.id)>0).map(u=>({value:u.id,label:u.name||[u.first_name,u.last_name].filter(Boolean).join(' ')||u.email||'User '+u.id}));
  complianceRiskOptions(owner,'Select owner...',options);
  owner.value=oldOwner;
  state.ownersReady=options.length>0;
  if(!state.ownersReady)errors.push('No active risk owners are available.');
 }else{complianceRiskOptions(owner,'Owners unavailable',[]);errors.push('Unable to load risk owners: '+results[0].reason.message);}
 if(linked){
  if(results[1].status==='fulfilled'){
   complianceRiskOptions(linked,'No linked master risk',(results[1].value.risks||[]).map(r=>({value:r.id,label:(r.risk_code||'')+' — '+(r.risk_title||'')})));
   linked.value=oldLinked||'';
  }else{complianceRiskOptions(linked,'Linked risks unavailable',[]);errors.push('Optional linked risks are unavailable. You can still save without a master risk.');}
 }
 message.textContent=errors.join(' ');retry.hidden=!errors.length;
}
function readComplianceRiskPosition(prefix='review',status){
 if(prefix==='review'&&status==='Not Applicable')return null;
 const get=suffix=>complianceRiskElement(prefix,suffix)?.value||'';
 const numbers=complianceRiskNumericFields.map(suffix=>Number(get(suffix)));
 if(numbers.some(n=>!Number.isInteger(n)||n<1||n>5))throw Error('Select likelihood and impact from 1 to 5 for both inherent and residual risk.');
 const owner=Number(get('Owner'));
 if(!complianceRiskForms[prefix].ownersReady||!Number.isInteger(owner)||owner<1)throw Error('Select an active Risk Owner. Retry the risk options if owners are unavailable.');
 const effectiveness=get('ControlEffectiveness');
 if(!complianceRiskEffects.includes(effectiveness))throw Error('Select Control Effectiveness.');
 const justification=get('Justification').trim();
 if(!justification)throw Error('Explain the risk from non-compliance or partial compliance in Risk Justification.');
 const linked=get('LinkedMaster');
 if(linked&&(!Number.isInteger(Number(linked))||Number(linked)<1))throw Error('Select a valid linked master risk.');
 return {inherent_likelihood:numbers[0],inherent_impact:numbers[1],residual_likelihood:numbers[2],residual_impact:numbers[3],control_effectiveness:effectiveness,risk_owner_user_id:owner,linked_risk_id:linked?Number(linked):null,justification,controls_summary:get('ControlsSummary').trim()||null,treatments_summary:get('TreatmentsSummary').trim()||null};
}
function complianceRiskHandleEscape(){
 // A controller request may still be loading before its drawer is visible.
 ++complianceControllerLoadSequence;
}
function complianceRiskHandleClose(id){
 if(id==='controllerModal')++complianceControllerLoadSequence;
 if(id==='reviewAssessmentModal')++complianceRiskForms.review.sequence;
 if(id==='submitModal'){++complianceRiskForms.single.sequence;++submissionRiskClassificationSequence;}
 if(id==='obligationModal'){
  ++complianceObligationLoadSequence;++complianceRiskHistorySequence;++complianceRequirementClassificationSequence;
  if(document.getElementById('reviewAssessmentModal').classList.contains('show'))closeModal('reviewAssessmentModal');
 }
}
async function loadSubmissionRiskClassifications(){
 const sequence=++submissionRiskClassificationSequence;
 const message=document.getElementById('singleRiskClassificationMessage');
 const retry=document.getElementById('singleRiskClassificationRetry');
 submissionRiskClassificationsReady=false;submissionRiskPaths=[];
 message.textContent='Loading risk classifications...';retry.hidden=true;
 [4,3,2,1].forEach(t=>{const select=document.getElementById('singleRiskTier'+t);complianceRiskOptions(select,'Loading...',[]);select.disabled=true;});
 try{
  const data=await complianceRiskRequest('/compliance/risk-classification-paths',{cache:'no-store'});
  if(sequence!==submissionRiskClassificationSequence)return;
  submissionRiskPaths=(data.categories||[]).filter(p=>p.is_terminal&&Number(p.tier)===1&&Array.isArray(p.path_ids)&&p.path_ids.length===4&&Number(p.category_id)===Number(p.path_ids[3])&&p.path_ids.every(id=>Number.isInteger(Number(id))&&Number(id)>0)&&String(p.path||'').split(' → ').length===4);
  submissionRiskClassificationsReady=submissionRiskPaths.length>0;
  changeSubmissionRiskTier(5);
  message.textContent=submissionRiskPaths.length?'':'No active complete Tier 4 to Tier 1 paths are available. Contact the Risk Administrator.';
  retry.hidden=submissionRiskPaths.length>0;
 }catch(error){
  if(sequence!==submissionRiskClassificationSequence)return;
  message.textContent='Unable to load risk classifications: '+error.message;retry.hidden=false;
  [4,3,2,1].forEach(t=>complianceRiskOptions(document.getElementById('singleRiskTier'+t),'Classifications unavailable',[]));
 }
}
function changeSubmissionRiskTier(changedTier){
 const tiers=[4,3,2,1],selected={};
 tiers.forEach(t=>{selected[t]=document.getElementById('singleRiskTier'+t).value;if(t<changedTier)selected[t]='';});
 tiers.forEach(t=>{
  const select=document.getElementById('singleRiskTier'+t);
  const eligible=submissionRiskPaths.filter(path=>tiers.filter(parent=>parent>t).every(parent=>selected[parent]&&String(path.path_ids[4-parent])===selected[parent]));
  const choices=new Map(eligible.map(path=>[String(path.path_ids[4-t]),String(path.path).split(' → ')[4-t]]));
  complianceRiskOptions(select,'Select Tier '+t+'...',[...choices].sort((a,b)=>a[1].localeCompare(b[1])).map(([value,label])=>({value,label})));
  select.value=choices.has(selected[t])?selected[t]:'';selected[t]=select.value;
  select.disabled=!submissionRiskClassificationsReady||(t<4&&!selected[t+1]);
 });
}
function readSubmissionRiskClassification(){
 if(!submissionRiskClassificationsReady)return null;
 const path=submissionRiskPaths.find(p=>[4,3,2,1].every(t=>String(p.path_ids[4-t])===document.getElementById('singleRiskTier'+t).value));
 return path?Number(path.category_id):null;
}
async function loadRequirementRiskClassifications(id){
 const sequence=++complianceRequirementClassificationSequence;
 const target=document.getElementById('complianceRequirementRiskClassifications');target.textContent='Loading classifications...';
 try{
  const data=await complianceRiskRequest('/compliance/obligations/'+id+'/risk-classifications',{cache:'no-store'});
  if(sequence!==complianceRequirementClassificationSequence||Number(currentLiveObligationId)!==Number(id))return;
  target.textContent=(data.classifications||[]).map(c=>c.path||c.category_name).filter(Boolean).join(' · ')||'No classification assigned.';
 }catch(error){if(sequence===complianceRequirementClassificationSequence&&Number(currentLiveObligationId)===Number(id))target.textContent='Unable to load classifications: '+error.message;}
}
function complianceRiskSummary(position){
 if(position?.shared_assessment?.target){position={...position,target_likelihood:position.shared_assessment.target.likelihood,target_impact:position.shared_assessment.target.impact};}
 const e=escapeComplianceText;
 if(!position)return '<p>No initial risk assessment was recorded.</p>';
 if(position.assessment_status==='Not Applicable')return '<p>Not Applicable: risk scoring exempt.</p>';
 return '<div class="compliance-risk-scores">'+['Inherent','Residual','Target'].map(kind=>{
  const key=kind.toLowerCase(),result=complianceRiskScore(position[key+'_likelihood'],position[key+'_impact']);
  return '<div class="compliance-risk-score">'+kind+' risk<strong>'+(result?result.score+' / 125 · <span class="compliance-risk-level compliance-risk-'+result.rating.toLowerCase()+'">'+result.rating+'</span>':'Not recorded')+'</strong></div>';
 }).join('')+'</div><small>Controls: '+e(position.control_effectiveness||'Not recorded')+' · Risk Owner: '+e(position.risk_owner_name||position.owner_name||position.risk_owner_user_id||'Not recorded')+'</small>'+(position.risk_code?'<small>Linked master risk: '+e(position.risk_code)+' — '+e(position.risk_title||'')+'</small>':'')+(position.shared_assessment?.next_review_date?'<p><strong>Next Review Date:</strong> '+e(position.shared_assessment.next_review_date)+'</p>':'')+'<p>'+e(position.justification||'')+'</p>'+(position.controls_summary?'<p><strong>Existing controls:</strong> '+e(position.controls_summary)+'</p>':'')+(position.treatments_summary?'<p><strong>Further Treatment:</strong> '+e(position.treatments_summary)+'</p>':'')
 +(position.shared_assessment?.controls||[]).map(c=>'<p><strong>Enterprise Control:</strong> '+e(c.code)+' · '+e(c.title)+'</p>').join('')
 +(position.shared_assessment?.documents||[]).map(d=>'<p><strong>Document Control:</strong> '+e(d.code)+' · '+e(d.title)+' · Version '+e(d.version)+'</p>').join('')
 +(position.shared_assessment?.treatment_actions||[]).map(a=>'<p><strong>Proposed Treatment:</strong> '+e(a.title)+' · Owner #'+e(a.owner_user_id)+' · Due '+e(a.due_date)+'</p>').join('');
}
async function loadComplianceRiskAssessmentHistory(id){
 const sequence=++complianceRiskHistorySequence;
 const target=document.getElementById('complianceRiskAssessmentHistory');target.textContent='Loading risk assessments...';
 try{
  const data=await complianceRiskRequest('/compliance/obligations/'+id+'/risk-assessments',{cache:'no-store'});
  if(sequence!==complianceRiskHistorySequence||Number(currentLiveObligationId)!==Number(id))return;
  const rows=data.assessments||[],e=escapeComplianceText;
  target.innerHTML=rows.length?rows.map(row=>{
   const submission=row.source==='Submission';
   const date=row.assessment_date?new Date(row.assessment_date).toLocaleDateString('en-AU'):'';
   return '<article class="compliance-risk-history-item"><strong>'+e(submission?'Initial submission risk assessment':row.assessment_status||'Risk assessment')+'</strong><small>'+e([date,row.assessed_by_name||row.assessed_by||row.submitted_by_name].filter(Boolean).join(' · '))+'</small>'+(submission?'<small>Scenario: '+e(row.scenario||'Non-compliance or partial compliance')+'</small>':'')+complianceRiskSummary(row)+'</article>';
  }).join(''):'<div class="compliance-empty-state">No risk assessments recorded.</div>';
 }catch(error){if(sequence===complianceRiskHistorySequence&&Number(currentLiveObligationId)===Number(id))target.textContent='Unable to load risk assessment history: '+error.message;}
}
function renderControllerComplianceRisk(item,section){
 let target=document.getElementById('controllerProposedRisk');
 if(!target){target=document.createElement('div');target.id='controllerProposedRisk';target.className='compliance-risk-history-item';section.appendChild(target);}
 const names=(item.risk_classifications||[]).map(c=>c.path||c.category_name).filter(Boolean);
 target.innerHTML='<h3>Initial Risk Assessment</h3><small>Scenario: Non-compliance or partial compliance</small><small>Risk Classification: '+escapeComplianceText(names.join(' · ')||'Not selected')+'</small>'+complianceRiskSummary(item.risk_position);
}
['single','review'].forEach(prefix=>{
 complianceRiskNumericFields.forEach(suffix=>{const select=complianceRiskElement(prefix,suffix);complianceRiskOptions(select,'Select 1–5...',[1,2,3,4,5].map(n=>({value:n,label:n})));select.addEventListener('change',()=>updateComplianceRiskScores(prefix));});
 renderComplianceRiskMatrix(prefix);updateComplianceRiskScores(prefix);
});
document.getElementById('reviewAssessmentStatus').addEventListener('change',updateComplianceRiskExemption);

