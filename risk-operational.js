// VERO operational risk detail panels. No mutation until authorised by Risk Office.
(()=>{
 const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
 const content=document.getElementById('veroRiskDetailsContent');
 const overlay=document.getElementById('veroRiskDetailsOverlay');
 let sequence=0;
 const headers=()=>({Authorization:'Bearer '+localStorage.getItem('vero_session_token'),Accept:'application/json','Content-Type':'application/json'});
 function node(tag,text){const n=document.createElement(tag);if(text!=null)n.textContent=String(text);return n;}
 function section(title){const el=node('section');el.className='vero-risk-details-card';el.appendChild(node('h3',title));content.appendChild(el);return el;}
 function field(parent,label,value){const p=node('p');const strong=node('strong',label+': ');p.append(strong,document.createTextNode(value==null?'Not recorded':String(value)));parent.appendChild(p);}
 async function json(url,options={}){const r=await fetch(url,{...options,headers:headers(),cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.message||'Request failed');return data;}
 async function showApplicability(risk,seq){
  const data=await json(API+'/risks/'+encodeURIComponent(risk.id)+'/applicability');
  if(seq!==sequence||overlay.hidden)return;
  content.replaceChildren();
  const summary=section('Operational risk aggregation');
  const a=data.aggregation;
  field(summary,'Applicable operational records',a?.applicable_contexts??0);
  field(summary,'Approved assessments',a?.contributing_assessments??0);
  field(summary,'Average residual score',a?.average_residual_score??'Not assessed');
  field(summary,'Maximum residual score',a?.maximum_residual_score??'Not assessed');
  field(summary,'Awaiting assessment',a?.awaiting_assessment??0);
  const list=section('Approved operational applicability');
  const assignments=data.assignments||[];
  if(!assignments.length)list.appendChild(node('p','No operational records assigned yet.'));
  for(const a of assignments){
   const row=node('div');row.style.padding='10px 0';row.style.borderBottom='1px solid #e1e5e2';
   field(row,a.context_type+' · Record '+a.context_id,a.status);
   field(row,'Risk Office rationale',a.rationale);
   list.appendChild(row);
  }
  const note=section('Risk Office governance');
  note.appendChild(node('p','Applicability changes require an authorised Risk Manager and a recorded rationale. Operational assessments are separately owned and approved.'));
 }
 async function showAssessments(risk,seq){
  const data=await json(API+'/risks/'+encodeURIComponent(risk.id)+'/applicability');
  if(seq!==sequence||overlay.hidden)return;
  content.replaceChildren();
  const list=section('Operational assessments');
  const assignments=(data.assignments||[]).filter(a=>a.status==='Applicable');
  if(!assignments.length){list.appendChild(node('p','No applicable operational records. Risk Office must establish applicability first.'));return;}
  for(const a of assignments){
   const item=node('div');item.style.padding='12px 0';item.style.borderBottom='1px solid #e1e5e2';
   item.appendChild(node('strong',a.context_type+' · Record '+a.context_id));
   const detail=node('div','Loading assessments...');item.appendChild(detail);list.appendChild(item);
   try{
    const d=await json(API+'/risk/applicability/'+encodeURIComponent(a.id)+'/assessments');
    if(seq!==sequence||overlay.hidden)return;
    detail.replaceChildren();
    if(!d.assessments?.length){detail.textContent='Not yet assessed';continue;}
    for(const assessment of d.assessments){
     const score=assessment.residual_likelihood!=null&&assessment.residual_impact!=null
       ?assessment.residual_likelihood*5*assessment.residual_impact:'—';
     field(detail,'Revision '+assessment.revision,assessment.status+' · Residual score '+score);
    }
   }catch(e){detail.textContent=e.message;}
  }
 }
 document.addEventListener('vero-risk-operational-tab',async e=>{
  const seq=++sequence;
  try{
   if(e.detail.tab==='applicability')await showApplicability(e.detail.risk,seq);
   else await showAssessments(e.detail.risk,seq);
  }catch(error){if(seq===sequence&&!overlay.hidden)content.textContent=error.message;}
 });
})();
