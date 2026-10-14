// Create a governed Draft Master Risk within an authorised Tier 1 classification.
(()=>{
 const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
 const overlay=document.getElementById('veroRiskDetailsOverlay');
 const content=document.getElementById('veroRiskDetailsContent');
 const title=document.getElementById('veroRiskDetailsTitle');
 const subtitle=document.getElementById('veroRiskDetailsCode');
 let version=0,active=null,currentCategory=null;
 const unresolved=new Map();
 const headers=()=>({Authorization:'Bearer '+localStorage.getItem('vero_session_token'),Accept:'application/json','Content-Type':'application/json'});
 const make=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el;};
 const current=session=>active===session&&session.version===version&&!overlay.hidden;
 const emit=(name,detail)=>document.dispatchEvent(new CustomEvent(name,{detail}));
 const invalidate=()=>{version++;active=null;};
 function syncCreateLabel(){
  const button=content.querySelector('.vero-risk-master-create');
  if(button)button.textContent=unresolved.has(Number(currentCategory?.id))?'Resume Pending Master Risk':'+ Create Draft Master Risk';
 }
 function returnToLinks(category){emit('vero-risk-open-classification',{category,page:'Terminal Risks'});}
 function confirmDiscard(session){
  if(session.saved)return true;
  if(session.pending||session.uncertain)return window.confirm('This save may already have reached the server. Close and check the linked Master Risks before creating another?');
  if(session.fields.some(el=>el.value.trim()))return window.confirm('Discard this unsaved Master Risk draft?');
  return true;
 }
 document.addEventListener('vero-risk-before-close',event=>{
  if(active&&!confirmDiscard(active))event.preventDefault();
 });
 window.addEventListener('beforeunload',event=>{
  if(unresolved.size){event.preventDefault();event.returnValue='';}
 });
 for(const event of ['vero-risk-details-close','vero-risk-open-details']){
  document.addEventListener(event,()=>{invalidate();currentCategory=null;});
 }
 document.addEventListener('vero-risk-open-classification',async event=>{
  invalidate();
  const category=event.detail.category,seq=version;
  currentCategory=category;
  if(Number(category.tier)!==1)return;
  const nav=content.querySelector('.vero-risk-classification-tabs');
  if(!nav)return;
  const create=make('button','+ Create Draft Master Risk');create.type='button';create.hidden=true;
  create.className='vero-risk-classification-create vero-risk-master-create';nav.appendChild(create);syncCreateLabel();
  let authorised=false;
  create.addEventListener('click',()=>{
   if(authorised&&seq===version&&!overlay.hidden)showForm(category);
  });
  try{
   const response=await fetch(API+'/auth/my-roles',{headers:headers(),cache:'no-store'});
   if(!response.ok)return;
   const data=await response.json();
   if(seq!==version||overlay.hidden)return;
   authorised=(data.roles||[]).some(role=>role.role_name==='Risk Manager');
   create.hidden=!authorised;
  }catch(error){create.hidden=true;}
 });
 function showForm(category){
  emit('vero-risk-create-master',{category});
  const retained=unresolved.get(Number(category.id));
  if(retained){
   retained.version=++version;active=retained;content.replaceChildren(retained.section);
   title.textContent='Create Draft Master Risk';subtitle.textContent='Tier 1 · '+retained.category.name;
   return;
  }
  const session={version:++version,category,pending:false,uncertain:false,saved:false,fields:[]};active=session;
  const section=make('section','');section.className='vero-risk-details-card';
  session.section=section;
  const heading=make('h3','Create Draft Master Risk');
  const guidance=make('p','This creates a Draft linked to '+category.name+'. Risk Office reviews and approves the definition before operational use.');
  const form=make('form','');form.className='vero-risk-office-form';
  function field(label,name,required,maxLength,tag='input'){
   const wrapper=make('label',label),el=make(tag,'');
   el.name=name;el.required=required;el.maxLength=maxLength;
   if(tag==='input')el.type='text';
   wrapper.appendChild(el);form.appendChild(wrapper);session.fields.push(el);return el;
  }
  const name=field('Risk Title','risk_title',true,255);
  const description=field('Risk Description','risk_description',false,10000,'textarea');
  const reason=field('Reason for Creation','reason',true,2000,'textarea');
  const save=make('button','Create Draft');save.type='submit';
  const cancel=make('button','Cancel');cancel.type='button';
  const feedback=make('p','');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  form.append(save,cancel,feedback);section.append(heading,guidance,form);content.replaceChildren(section);
  title.textContent='Create Draft Master Risk';subtitle.textContent='Tier 1 · '+category.name;
  cancel.addEventListener('click',()=>{if(current(session)&&confirmDiscard(session))returnToLinks(category);});
  try{session.requestId=crypto.randomUUID();}catch(error){
   save.disabled=true;feedback.textContent='Draft creation is unavailable in this browser. A secure connection is required.';return;
  }
  name.focus();
  async function openSavedDraft(){
   if(!current(session)||session.pending)return;
   session.pending=true;save.disabled=true;feedback.textContent='Draft saved. Loading its Risk Office review...';
   try{
    const response=await fetch(API+'/risks',{headers:headers(),cache:'no-store'});
    const data=await response.json();
    if(!response.ok)throw Error('The saved draft could not be loaded.');
    const risk=(data.risks||[]).find(item=>Number(item.id)===Number(session.result.risk_id));
    if(!risk)throw Error('The saved draft is not yet available in your authorised register.');
    if(current(session))emit('vero-risk-open-details',{risk});
   }catch(error){
    if(current(session)){
     feedback.textContent='Draft '+session.result.risk_code+' was saved and linked. '+error.message+' Retry opening it or return to the linked Master Risks.';
     save.textContent='Retry Opening Draft';
    }
   }finally{session.pending=false;if(current(session))save.disabled=false;}
  }
  form.addEventListener('submit',async event=>{
   event.preventDefault();
   if(!current(session)||session.pending)return;
   if(session.saved){await openSavedDraft();return;}
   const payload={request_id:session.requestId,risk_title:name.value.trim(),risk_description:description.value.trim(),tier1_category_id:Number(category.id),reason:reason.value.trim()};
   if(!payload.risk_title||payload.risk_title.length>255||payload.risk_description.length>10000||!payload.reason||payload.reason.length>2000){
    feedback.textContent='Enter a title (up to 255 characters) and creation reason (up to 2000). Description may contain up to 10000 characters.';return;
   }
   session.pending=true;save.disabled=true;session.fields.forEach(el=>el.disabled=true);
   unresolved.set(Number(category.id),session);
   feedback.textContent='Creating and linking draft...';
   try{
    const response=await fetch(API+'/risks/master-drafts',{method:'POST',headers:headers(),body:JSON.stringify(payload)});
    const data=await response.json();
    if(!response.ok){
     const error=Error(data.message||'Draft creation is unavailable.');
     error.definitive=response.status>=400&&response.status<500;throw error;
    }
    if(!Number.isInteger(Number(data.risk_id))||Number(data.risk_id)<=0||!data.risk_code){throw Error('The server did not confirm the saved draft.');}
    session.saved=true;session.result=data;session.pending=false;session.uncertain=false;
    unresolved.delete(Number(category.id));syncCreateLabel();
    // A saved result always refreshes the register, even after the drawer was dismissed.
    emit('vero-risk-register-refresh',{riskId:data.risk_id,created:true});
    if(current(session)){
     cancel.textContent='Back to Linked Master Risks';
     await openSavedDraft();
    }else if(!overlay.hidden&&Number(currentCategory?.id)===Number(category.id)){
     const heading=content.querySelector('h3')?.textContent||'';
     if(heading==='Terminal Risks'||heading.startsWith('Linked Master Risks'))returnToLinks(currentCategory);
    }
   }catch(error){
    session.uncertain=!error.definitive;
    if(error.definitive){unresolved.delete(Number(category.id));syncCreateLabel();}
    {
     // Retained forms must also settle while detached from the drawer.
     feedback.textContent=error.definitive?error.message:'The save outcome is unconfirmed. Retry this unchanged draft safely before creating another. '+error.message;
     save.textContent=session.uncertain?'Retry Same Draft':'Create Draft';
     session.fields.forEach(el=>el.disabled=session.uncertain);
    }
   }finally{session.pending=false;save.disabled=false;}
  });
 }
})();
