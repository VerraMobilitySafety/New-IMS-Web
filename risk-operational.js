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
  // Only authorised Risk Managers can change the applicability boundary.
  const governance=section('Manage applicability');
  governance.appendChild(node('p','Risk Office only · each assignment or withdrawal requires a justification.'));
  try{
   const [roles,contexts]=await Promise.all([
    json(API+'/auth/my-roles'),
    json(API+'/risk/operational-contexts')
   ]);
   if(seq!==sequence||overlay.hidden)return;
   const canManage=(roles.roles||[]).some(r=>r.role_name==='Risk Manager');
   if(!canManage){
    governance.appendChild(node('p','Read-only access. Contact Risk Office to change applicability.'));
   }else{
    const form=node('form');
    form.style.display='grid';form.style.gap='10px';
    const typeLabel=node('label','Operational context type');
    const type=node('select');
    for(const t of ['VM Site','Project','Maintenance Contract']){
     const opt=node('option',t);opt.value=t;type.appendChild(opt);
    }
    typeLabel.appendChild(type);
    const recordLabel=node('label','Operational record');
    const record=node('select');record.required=true;recordLabel.appendChild(record);
    const actionLabel=node('label','Decision');
    const action=node('select');
    for(const a of ['Assign','Withdraw']){const opt=node('option',a);opt.value=a;action.appendChild(opt);}
    actionLabel.appendChild(action);
    const rationaleLabel=node('label','Risk Office justification (required)');
    const rationale=node('textarea');rationale.required=true;rationale.maxLength=2000;rationale.rows=3;
    rationaleLabel.appendChild(rationale);
    const message=node('p');message.setAttribute('role','status');
    const save=node('button','Record applicability decision');save.type='submit';
    function populate(){
     record.replaceChildren();
     const options=type.value==='VM Site'?contexts.vm_locations:
       type.value==='Project'?contexts.projects:contexts.contracts;
     const blank=node('option','Select an operational record');blank.value='';record.appendChild(blank);
     for(const item of options||[]){
      const opt=node('option',(item.code?item.code+' · ':'')+item.name);
      opt.value=String(item.id);record.appendChild(opt);
     }
    }
    type.addEventListener('change',populate);populate();
    // A project deep link may preselect the context, but never bypass Risk Office approval.
    const projectId=new URLSearchParams(location.search).get('project_id');
    if(projectId&&[...(contexts.projects||[])].some(item=>String(item.id)===projectId)){
      type.value='Project';populate();record.value=projectId;
    }
    const contractId=new URLSearchParams(location.search).get('contract_id');
    if(contractId&&(contexts.contracts||[]).some(item=>String(item.id)===contractId)){
      type.value='Maintenance Contract';populate();record.value=contractId;
    }
    form.append(typeLabel,recordLabel,actionLabel,rationaleLabel,save,message);
    form.addEventListener('submit',async event=>{
     event.preventDefault();
     if(!record.value||!rationale.value.trim())return;
     save.disabled=true;message.textContent='Recording Risk Office decision...';
     try{
      await json(API+'/risks/'+encodeURIComponent(risk.id)+'/applicability',{
       method:'POST',body:JSON.stringify({
        context_type:type.value,context_id:Number(record.value),
        action:action.value,rationale:rationale.value.trim()
       })
      });
      // Invalidate filter results even if the drawer closed while the decision was saving.
      document.dispatchEvent(new CustomEvent('vero-risk-applicability-changed',{detail:{riskId:risk.id}}));
      if(seq!==sequence||overlay.hidden)return;
      message.textContent='Decision recorded. Refreshing applicability...';
      await showApplicability(risk,seq);
     }catch(error){message.textContent=error.message;}
     finally{save.disabled=false;}
    });
    governance.appendChild(form);
   }
  }catch(error){governance.appendChild(node('p','Management controls unavailable: '+error.message));}
  // Context-specific permissions: visible to Risk Office only.
  if(governance.querySelector('form')){
   const access=section('Operational assessor and approver assignments');
   const chooser=node('select');
   const available=assignments.filter(a=>a.status==='Applicable');
   for(const a of available){
    const opt=node('option',a.context_type+' · Record '+a.context_id);
    opt.value=String(a.context_type+'|'+a.context_id);chooser.appendChild(opt);
   }
   const current=node('div');
   const form=node('form');form.style.display='grid';form.style.gap='10px';
   const userLabel=node('label','Assigned employee');
   const userId=node('select');userId.required=true;
   userLabel.appendChild(userId);
   async function loadUsers(){
    userId.replaceChildren();
    const blank=node('option','Select an eligible employee');blank.value='';userId.appendChild(blank);
    if(!chooser.value)return;
    const [type,id]=chooser.value.split('|');
    try{
     const result=await json(API+'/risk/eligible-assessors?context_type='+encodeURIComponent(type)+'&context_id='+encodeURIComponent(id));
     if(seq!==sequence||overlay.hidden)return;
     for(const person of result.users||[]){
      const opt=node('option',(person.name||person.email)+' · '+person.email);
      opt.value=String(person.id);
      opt.dataset.roles=(person.roles||[]).join(',');
      userId.appendChild(opt);
     }
    }catch(error){feedback.textContent=error.message;}
   }
   const permissionLabel=node('label','Permission');
   const permission=node('select');
   for(const p of ['Assessor','Approver']){const opt=node('option',p);opt.value=p;permission.appendChild(opt);}
   permissionLabel.appendChild(permission);
   const actionLabel=node('label','Action');
   const action=node('select');
   for(const a of ['Grant','Revoke']){const opt=node('option',a);opt.value=a;action.appendChild(opt);}
   actionLabel.appendChild(action);
   const reasonLabel=node('label','Justification');
   const reason=node('textarea');reason.required=true;reason.maxLength=2000;reason.rows=3;
   reasonLabel.appendChild(reason);
   const save=node('button','Record permission decision');save.type='submit';
   const feedback=node('p');feedback.setAttribute('role','status');
   async function reload(){
    current.textContent='Loading current assignments...';
    if(!chooser.value){current.textContent='Assign this risk to an operational record first.';return;}
    const [type,id]=chooser.value.split('|');
    try{
     const result=await json(API+'/risk/context-authorisations?context_type='+encodeURIComponent(type)+'&context_id='+encodeURIComponent(id));
     if(seq!==sequence||overlay.hidden)return;
     current.replaceChildren();
     if(!result.authorisations?.length)current.appendChild(node('p','No active operational permissions.'));
     for(const entry of result.authorisations){
      field(current,entry.permission,entry.user_name+' · '+entry.email+' (User '+entry.user_id+')');
     }
    }catch(error){current.textContent=error.message;}
   }
   chooser.addEventListener('change',()=>{reload();loadUsers();});
   form.append(userLabel,permissionLabel,actionLabel,reasonLabel,save,feedback);
   form.addEventListener('submit',async event=>{
    event.preventDefault();if(!chooser.value)return;
    const [type,id]=chooser.value.split('|');
    save.disabled=true;feedback.textContent='Recording permission decision...';
    try{
     await json(API+'/risk/context-authorisations',{method:'POST',body:JSON.stringify({
      context_type:type,context_id:Number(id),user_id:Number(userId.value),
      permission:permission.value,action:action.value,reason:reason.value.trim()
     })});
     feedback.textContent='Permission decision recorded.';
     await reload();
    }catch(error){feedback.textContent=error.message;}
    finally{save.disabled=false;}
   });
   if(available.length){access.append(chooser,current,form);reload();loadUsers();}
   else access.appendChild(node('p','Assign this risk to an operational record before managing its permissions.'));
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
  // The API is the authority for operational permissions and Project-only Administrator overrides.
  const capabilities=await Promise.all(assignments.map(async a=>{
   try{
    const response=await json(API+'/risk/applicability/'+encodeURIComponent(a.id)+'/capabilities');
    return {assignment:a,can_create:response.can_create===true,can_approve:response.can_approve===true,
      administrator_override:a.context_type==='Project'&&response.administrator_override===true};
   }catch(error){return {assignment:a,can_create:false};}
  }));
  if(seq!==sequence||overlay.hidden)return;
  const editable=capabilities.filter(c=>c.can_create).map(c=>c.assignment);
  const assessmentEditorEnabled=editable.length>0;
  let revisionSource=null;
  let revisionForm=null;
  if(assessmentEditorEnabled){
   const editor=section('Create operational risk assessment');
   const form=node('form');form.style.display='grid';form.style.gap='10px';
   const targetLabel=node('label','Applicable operational record');
   const target=node('select');target.required=true;
   for(const a of editable){
    const opt=node('option',a.context_type+' · Record '+a.context_id);
    opt.value=String(a.id);target.appendChild(opt);
   }
   targetLabel.appendChild(target);form.appendChild(targetLabel);
   const ratings={};
   for(const key of ['inherent_likelihood','inherent_impact','residual_likelihood','residual_impact']){
    const label=node('label',key.replaceAll('_',' '));
    const select=node('select');select.required=true;
    for(let n=1;n<=5;n++){const option=node('option',n);option.value=String(n);select.appendChild(option);}
    ratings[key]=select;label.appendChild(select);form.appendChild(label);
   }
   const controlsLabel=node('label','Existing controls');
   const controls=node('textarea');controls.rows=3;controls.maxLength=10000;controlsLabel.appendChild(controls);
   const treatmentsLabel=node('label','Additional treatments');
   const treatments=node('textarea');treatments.rows=3;treatments.maxLength=10000;treatmentsLabel.appendChild(treatments);
   const button=node('button','Save draft assessment');button.type='submit';
   const message=node('p');message.setAttribute('role','status');
   form.append(controlsLabel,treatmentsLabel,button,message);
   revisionForm={form,target,ratings,controls,treatments,message};
   if(editable.some(a=>a.context_type==='Project')){
    const loadProposal=node('button','Load proposed Project Risk assessment');
    loadProposal.type='button';
    loadProposal.addEventListener('click',async()=>{
     if(revisionSource!==null){message.textContent='Finish or discard the returned assessment revision before loading a proposal.';return;}
     const selected=editable.find(a=>String(a.id)===String(target.value));
     if(!selected||selected.context_type!=='Project'){message.textContent='Select an applicable Project record to load its proposal.';return;}
     loadProposal.disabled=true;message.textContent='Loading proposed assessment…';
     const requestedId=String(target.value);
     try{
      const response=await json(API+'/risk/applicability/'+encodeURIComponent(requestedId)+'/project-draft-prefill');
      if(seq!==sequence||overlay.hidden||String(target.value)!==requestedId)return;
      if(!response.available){message.textContent='No proposed assessment was saved for this Project Risk.';return;}
      const proposal=response.proposed_assessment||{};
      for(const [key,control] of Object.entries(ratings)){
       const value=Number(proposal[key]);
       if(Number.isInteger(value)&&value>=1&&value<=5)control.value=String(value);
      }
      controls.value=proposal.controls_summary||'';
      treatments.value=proposal.treatments_summary||'';
      message.textContent='Proposal loaded. Review the ratings and controls, then save the formal draft assessment. No approval has been recorded.';
     }catch(error){message.textContent=error.message;}
     finally{loadProposal.disabled=false;}
    });
    form.insertBefore(loadProposal,button);
   }
   target.addEventListener('change',()=>{revisionSource=null;message.textContent='';});
   form.addEventListener('submit',async event=>{
    event.preventDefault();button.disabled=true;message.textContent='Saving draft...';
    try{
     const payload=Object.fromEntries(Object.entries(ratings).map(([k,v])=>[k,Number(v.value)]));
     payload.controls_summary=controls.value.trim();
     payload.treatments_summary=treatments.value.trim();
     if(revisionSource!==null)payload.returned_assessment_id=revisionSource;
     await json(API+'/risk/applicability/'+encodeURIComponent(target.value)+'/assessments',{
      method:'POST',body:JSON.stringify(payload)
     });
     if(seq===sequence&&!overlay.hidden)await showAssessments(risk,seq);
    }catch(error){message.textContent=error.message;}
    finally{button.disabled=false;}
   });
   editor.appendChild(form);
  }else{
   const notice=section('Assessment creation');
   notice.appendChild(node('p','You are not assigned as an operational Risk Assessor for any applicable record.'));
  }
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
     const capability=capabilities.find(c=>Number(c.assignment.id)===Number(a.id));
     const me=await json(API+'/auth/me');
     if(seq!==sequence||overlay.hidden)return;
     const currentUser=me.user||me;
     const own=Number(assessment.owner_user_id)===Number(currentUser.id);
     const administratorOverride=capability?.administrator_override===true;
     if(assessment.status==='Returned'&&(own||administratorOverride)&&capability?.can_create&&revisionForm){
      const revise=node('button','Revise returned assessment');
      revise.type='button';
      revise.addEventListener('click',()=>{
       revisionForm.target.value=String(a.id);
       revisionSource=assessment.id;
       for(const [key,control] of Object.entries(revisionForm.ratings)){
        control.value=String(assessment[key]||1);
       }
       revisionForm.controls.value=assessment.controls_summary||'';
       revisionForm.treatments.value=assessment.treatments_summary||'';
       revisionForm.message.textContent='A new draft revision will be created. The returned assessment remains in history.';
       revisionForm.form.scrollIntoView({block:'start',behavior:'smooth'});
      });
      detail.appendChild(revise);
     }
     let decision=null;
     if(assessment.status==='Draft'&&(own||administratorOverride)&&capability?.can_create)decision='Submit';
     if(assessment.status==='Submitted'&&capability?.can_approve&&(!own||administratorOverride))decision='Approve';
     if(decision){
      const button=node('button',decision==='Submit'?'Submit for approval':'Approve assessment');
      button.type='button';
      button.style.margin='6px 8px 6px 0';
      const feedback=node('span');feedback.setAttribute('role','status');
      button.addEventListener('click',async()=>{
       if(decision==='Approve'&&!window.confirm('Approve this operational assessment?'))return;
       button.disabled=true;feedback.textContent='Recording decision...';
       try{
        await json(API+'/risk/assessments/'+encodeURIComponent(assessment.id)+'/decision',{
         method:'POST',body:JSON.stringify({decision})
        });
        if(seq===sequence&&!overlay.hidden)await showAssessments(risk,seq);
       }catch(error){feedback.textContent=error.message;button.disabled=false;}
      });
      detail.append(button,feedback);
      if(decision==='Approve'){
       const returnButton=node('button','Return for changes');
       returnButton.type='button';returnButton.style.margin='6px 8px 6px 0';
       returnButton.addEventListener('click',async()=>{
        const reason=window.prompt('Reason for returning this assessment (required):');
        if(reason===null)return;
        if(!reason.trim()||reason.length>2000){feedback.textContent='A reason of 1–2000 characters is required.';return;}
        returnButton.disabled=true;feedback.textContent='Returning assessment...';
        try{
         await json(API+'/risk/assessments/'+encodeURIComponent(assessment.id)+'/decision',{
          method:'POST',body:JSON.stringify({decision:'Return',reason:reason.trim()})
         });
         if(seq===sequence&&!overlay.hidden)await showAssessments(risk,seq);
        }catch(error){feedback.textContent=error.message;returnButton.disabled=false;}
       });
       detail.appendChild(returnButton);
      }
     }
     const historyButton=node('button','View decision history');
     historyButton.type='button';historyButton.style.margin='6px 8px 6px 0';
     const historyContainer=node('div');
     historyButton.addEventListener('click',async()=>{
      historyButton.disabled=true;historyContainer.textContent='Loading decision history...';
      try{
       const h=await json(API+'/risk/assessments/'+encodeURIComponent(assessment.id)+'/history');
       if(seq!==sequence||overlay.hidden)return;
       historyContainer.replaceChildren();
       if(!h.history?.length)historyContainer.textContent='No decisions recorded.';
       for(const event of h.history){
        field(historyContainer,event.action,event.actor+' · '+(event.occurred_at||'')+(event.reason?' · '+event.reason:''));
       }
      }catch(error){historyContainer.textContent=error.message;}
      finally{historyButton.disabled=false;}
     });
     detail.append(historyButton,historyContainer);
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



