/* Reconciled from feature/insurance-live-policy-register. Policies use the API;
   claims and renewals remain explicitly labelled, temporary prototypes. */
(()=>{
'use strict';
const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
const status=$('insuranceApiStatus'),form=$('form'),submit=form.querySelector('[type="submit"]');
const formStatus=$('insuranceFormStatus');
let livePolicies=[],office=false,state='loading',busy=false,financialAccess=false,linkingAccess=false;
let readOnly=true,financialWriteAccess=false,canCreate=false,canEdit=false,editing=null,editGeneration=0;
let canAttach=false,canRegisterActive=false,registration=null;
const allPolicyFields=config.policies.slice(),financialFields=new Set(['limit','excess','premium']);
function setFinancialAccess(allowed){
 financialAccess=allowed===true;
 config.policies=allPolicyFields.filter(([name])=>financialAccess||!financialFields.has(name));
 if(formType==='policies')for(const name of financialFields){
  const input=form.elements[name];if(input){input.disabled=!financialWriteAccess;input.closest('.field').hidden=!financialWriteAccess}
 }
}
setFinancialAccess(false);
const token=()=>localStorage.getItem('vero_session_token');
function message(text){status.textContent=text;status.hidden=!text}
async function request(path,options={}){
 if(!token())throw new Error('Sign in to access insurance policies.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{
  const res=await fetch(API+path,{...options,signal:controller.signal,headers:{
   Authorization:'Bearer '+token(),Accept:'application/json',
   ...(options.body instanceof FormData?{}:{'Content-Type':'application/json'})
  },cache:'no-store'});
  const body=await res.json().catch(()=>null);
  if(!res.ok){const error=new Error(body?.message||'Request failed ('+res.status+')');error.status=res.status;throw error}
  if(!body||body.status!=='success')throw new Error('Invalid Insurance API response.');
  return body;
 }finally{clearTimeout(timer)}
}
function policyView(p){
 const amounts=key=>(p.coverages||[]).filter(c=>c[key]!=null)
  .map(c=>c.currency===p.currency?c[key]:c.currency+' '+c[key]).join(' / ');
 const view={name:p.policy_name,number:p.policy_number,class:p.insurance_class,
  insurer:p.insurer_name,broker:p.broker_name||'',entity:(p.insured_entities||[]).join('; '),
  country:p.country_code||'',inception:p.inception_date,expiry:p.expiry_date,
  currency:p.currency,status:p.status,parent_policy_id:p.parent_policy_id??null};
 if(financialAccess)Object.assign(view,{premium:p.annual_premium??'',
  limit:amounts('limit_amount'),excess:amounts('deductible_amount')});
 return view;
}
function updateSubmit(){
 if(formType==='policies'){
  submit.textContent=busy?'Saving…':registration?.id?'Retry attachment':editing?'Save policy changes':form.elements.status?.value==='Active'?'Register Active policy':'Save Draft';
  submit.disabled=busy||(!registration?.id&&state!=='ready');
 }else{submit.textContent='Add to Prototype';submit.disabled=busy}
}
function renderPolicyWorkflow(){
 if(tab!=='Policies'||state!=='ready'||!livePolicies.length||readOnly)return;
 const panel=document.createElement('div');panel.id='insurancePolicyWorkflow';
 const heading=document.createElement('h3');heading.textContent='Policy approvals';panel.append(heading);
 const select=document.createElement('select');select.setAttribute('aria-label','Select policy');
 for(const p of livePolicies){const option=document.createElement('option');option.value=p.id;
  option.textContent=p.policy_number+' — '+p.policy_name+' ('+p.status+')';select.append(option)}
 panel.append(select);
 for(const action of ['Submit',...(office?['Approve','Request Changes']:[])]){
  const button=document.createElement('button');button.type='button';button.textContent=action;button.disabled=busy;
  button.onclick=async()=>{
   if(busy||!select.value)return;
   busy=true;render();updateSubmit();
   try{
    const result=await request('/insurance/policies/'+encodeURIComponent(select.value)+'/decision',
     {method:'POST',body:JSON.stringify({action})});
    if(!result.policy_status)throw new Error('Invalid decision confirmation.');
    await load('Decision saved. ');
   }catch(error){message('Decision could not be confirmed: '+error.message+' Refresh policies before retrying.')}
   finally{busy=false;render();updateSubmit()}
  };
  panel.append(button);
 }
 $('content').append(panel);
}
const oldRender=render;
render=function(){
 oldRender();
 status.dataset.state=state;
 $('insuranceRefresh').hidden=state!=='error';
 $('insuranceRefresh').textContent='Retry loading policies';
 if(tab==='Overview'){
  $('heading').hidden=true;$('search').style.display='block';$('search').placeholder='Search policies...';
  if($('search').value.trim()){
   const results=document.createElement('div');results.id='insuranceOverviewResults';
   if(state!=='ready')results.textContent=state==='loading'?'Loading policies.':'Policies could not be loaded. Retry loading policies.';
   else{
    const {start,end}=insuranceRenewalWindow();
    const matches=data.policies.map((policy,index)=>({policy,index})).filter(({policy})=>registerMatches(policy,start,end));
    if(!matches.length)results.textContent='No policies match your search.';
    for(const {policy,index} of matches){const button=document.createElement('button');button.type='button';button.dataset.policyIndex=index;
     button.textContent=policy.number+' - '+policy.name+' · '+policy.insurer+' · '+policy.status;results.append(button)}
   }
   $('content').append(results);
  }
 }
 if(state==='ready'&&!financialAccess)$('premium').textContent='Restricted';
 if(state!=='ready'){
  $('active').textContent='—';$('premium').textContent='—';$('upcoming').textContent='—';
  if(tab==='Policies'){
   const empty=document.createElement('p');empty.className='empty';
   empty.textContent=state==='loading'?'Loading policies…':'Policies could not be loaded. Retry loading policies.';
   $('content').replaceChildren(empty);
  }
 }
 // Keep the register focused on the policy list.
 renderPolicyLinks();
 renderDocuments();
};
let documentPolicy='',documentGeneration=0;
const documentUploads=new Map();
// Keep the upstream policy-list layout while exposing existing file management.
const policiesButton=document.createElement('button');policiesButton.type='button';policiesButton.textContent='Current policies';
policiesButton.onclick=()=>{tab='Policies';render()};
$('insuranceToolbar').append(policiesButton);
function renderPolicyLinks(){
 if(tab!=='Policies'||state!=='ready')return;
 const table=$('content').querySelector('table');if(!table)return;
 const heading=document.createElement('th');heading.scope='col';heading.textContent='Policy document';table.querySelector('thead tr').append(heading);
 for(const row of table.querySelectorAll('tbody tr[data-policy-index]')){
  const policy=livePolicies[Number(row.dataset.policyIndex)];if(!policy)continue;
  const cell=document.createElement('td');row.append(cell);
  cell.addEventListener('click',event=>event.stopPropagation());cell.addEventListener('keydown',event=>event.stopPropagation());
  const view=document.createElement('span');cell.append(view);
  const link=document.createElement('a');link.href='#';link.textContent='View Policy';view.append(link);
  if(documentUploads.has(String(policy.id))){
   const retry=document.createElement('button');retry.type='button';retry.textContent='Retry attachment';
   retry.onclick=()=>{documentPolicy=String(policy.id);tab='Documents';render()};cell.append(document.createTextNode(' '),retry);
  }
  link.onclick=async event=>{
   event.preventDefault();if(link.dataset.loading)return;link.dataset.loading='true';link.textContent='Checking policy PDF...';
   try{
    const result=await request('/insurance/policies/'+encodeURIComponent(policy.id)+'/records');
    if(!cell.isConnected)return;
    if(!Array.isArray(result.records))throw new Error('Invalid file list.');
    const candidates=result.records.filter(r=>r.attachment_type==='Policy Schedule'&&r.status==='Active'&&
     typeof r.file_name==='string'&&r.file_name.toLowerCase().endsWith('.pdf')&&Number.isSafeInteger(r.record_id)&&r.record_id>0);
    if(!candidates.length){view.textContent='Policy PDF unavailable';return}
    const url=id=>'records.html?record_id='+id+'&preview=1';
    if(candidates.length===1){window.location.assign(url(candidates[0].record_id));return}
    view.textContent='Multiple active policy PDFs - choose: ';
    for(const record of candidates){const choice=document.createElement('a');choice.href=url(record.record_id);choice.textContent=record.record_code+' - '+record.title;view.append(choice,document.createElement('br'))}
   }catch(error){link.textContent='Retry View Policy';link.removeAttribute('data-loading');link.title='Policy PDF could not be checked: '+error.message}
  };
 }
}
function renderDocuments(target=null,selectedPolicy=null){
 if(!target&&tab!=='Documents')return;
 const host=target||$('content');host.replaceChildren();
 const note=document.createElement('p');note.textContent=state!=='ready'?'Load policies before viewing files.':
  'Files are controlled Records. New uploads await retention assignment and have no disposal date.';
 host.append(note);
 if(state!=='ready'||!livePolicies.length){
  if(state==='ready')note.textContent='No accessible policies. Save a policy before attaching files.';
  return;
 }
 const picker=document.createElement('select');picker.setAttribute('aria-label','Policy for documents');
 for(const p of livePolicies){const option=document.createElement('option');option.value=p.id;
  option.textContent=p.policy_number+' - '+p.policy_name;picker.append(option)}
 if(selectedPolicy)documentPolicy=String(selectedPolicy);
 if(livePolicies.some(p=>String(p.id)===documentPolicy))picker.value=documentPolicy;
 if(selectedPolicy)picker.hidden=true;
 documentPolicy=picker.value;
 const body=document.createElement('div');host.append(picker,body);
 picker.onchange=()=>{documentPolicy=picker.value;loadDocuments()};
 async function loadDocuments(){
  const generation=++documentGeneration,pid=picker.value;
  body.textContent='Loading policy files.';
  try{
   const result=await request('/insurance/policies/'+encodeURIComponent(pid)+'/records');
   if(!body.isConnected||generation!==documentGeneration)return;
   if(!Array.isArray(result.records)||!Array.isArray(result.attachment_types))throw new Error('Invalid file list.');
   body.replaceChildren();
   const list=document.createElement('ul');
   for(const record of result.records){
    if(!Number.isSafeInteger(record.record_id)||record.record_id<=0)throw new Error('Invalid record reference.');
    const item=document.createElement('li'),link=document.createElement('a');
    link.href='records.html?record_id='+record.record_id;link.textContent=record.record_code+' - '+record.title;
    item.append(link,document.createTextNode(' · '+record.attachment_type+(record.retention_pending?' · Retention pending':'')));list.append(item);
   }
   if(!result.records.length){const empty=document.createElement('p');empty.textContent='No accessible files attached.';body.append(empty)}
   body.append(list);
   const refresh=document.createElement('button');refresh.type='button';refresh.textContent='Refresh files';refresh.onclick=loadDocuments;body.append(refresh);
   if(result.can_upload===true){
    const upload=document.createElement('form');upload.id='insuranceUpload';
    const title=document.createElement('input');title.name='record_title';title.required=true;title.maxLength=255;title.setAttribute('aria-label','File title');
    const type=document.createElement('select');type.name='attachment_type';type.setAttribute('aria-label','Attachment type');
    for(const name of result.attachment_types){const option=document.createElement('option');option.textContent=name;option.value=name;type.append(option)}
    const file=document.createElement('input');file.type='file';file.name='file';file.accept='application/pdf,.pdf';file.required=true;file.setAttribute('aria-label','PDF file');
    const save=document.createElement('button');save.type='submit';save.textContent='Save file as Record';
    const feedback=document.createElement('p');feedback.setAttribute('role','status');
    upload.append(title,type,file,save,feedback);body.append(upload);
    const operation=documentUploads.get(pid)||{pending:null,saving:false,message:''};
    documentUploads.set(pid,operation);
    if(operation.pending){
     title.value=operation.pending.get('record_title');type.value=operation.pending.get('attachment_type');file.required=false;
     for(const field of [title,type,file])field.disabled=true;
     save.textContent=operation.saving?'Saving file.':'Retry same upload';save.disabled=operation.saving;
     feedback.textContent=operation.message||'This upload is awaiting server confirmation.';
    }
    upload.onsubmit=async event=>{
     event.preventDefault();if(operation.saving)return;
     if(!operation.pending){operation.pending=new FormData(upload);operation.pending.set('request_id',crypto.randomUUID())}
     operation.saving=true;save.disabled=true;picker.disabled=true;refresh.disabled=true;
     for(const field of [title,type,file])field.disabled=true;
     feedback.textContent='Saving file. Wait for server confirmation.';
     try{
      const saved=await request('/insurance/policies/'+encodeURIComponent(pid)+'/records',{method:'POST',body:operation.pending});
      if(!Number.isSafeInteger(saved.record_id)||saved.record_id<=0)throw new Error('Invalid save confirmation.');
      documentUploads.delete(pid);await loadDocuments();
     }catch(error){
      if([400,413].includes(error.status)){
       operation.pending=null;operation.message='File rejected: '+error.message+' Correct the file or title and try again.';
       for(const field of [title,type,file])field.disabled=false;
       file.required=true;save.textContent='Save file as Record';feedback.textContent=operation.message;
      }else{
      feedback.textContent='Save not confirmed: '+error.message+' Retry uses the same file and request. Refresh files to check for a completed save.';
      operation.message=feedback.textContent;
      save.textContent='Retry same upload';
      }
     }finally{operation.saving=false;save.disabled=false;picker.disabled=false;refresh.disabled=false;
      if(!upload.isConnected&&tab==='Documents')renderDocuments();}
    };
   }
  }catch(error){
   if(!body.isConnected||generation!==documentGeneration)return;
   body.textContent='Files could not be loaded: '+error.message;
   const retry=document.createElement('button');retry.type='button';retry.textContent='Retry files';retry.onclick=loadDocuments;body.append(retry);
  }
 }
 loadDocuments();
}
$('search').oninput=()=>render();
$('insuranceStatus').onchange=()=>render();
async function load(prefix=''){
 ++editGeneration;
 if(state==='loading'&&load.pending)return;
 state='loading';load.pending=true;linkingAccess=false;readOnly=true;financialWriteAccess=false;canCreate=false;setFinancialAccess(false);message(prefix+'Loading policies…');render();updateSubmit();
 if(!$('policyDetails').hidden)oldClose();
 $('policyDetails').replaceChildren();
 try{
  const result=await request('/insurance/policies');
  if(!Array.isArray(result.policies)||result.policies.some(p=>!p||!p.id||typeof p.status!=='string'||
      !Array.isArray(p.insured_entities)||(result.financial_access===true&&!Array.isArray(p.coverages))))throw new Error('Invalid policy list.');
  readOnly=result.read_only!==false;
  financialWriteAccess=result.financial_write_access===true;
  canCreate=result.can_create_policies===true;
  canEdit=result.can_edit_policies===true;
  canAttach=result.can_attach_to_new_policy===true;
  canRegisterActive=result.can_register_active===true;
  setFinancialAccess(result.financial_access);
  linkingAccess=result.can_link_parent_policies===true;
  livePolicies=result.policies;office=Boolean(result.insurance_office);
  data.policies.splice(0,data.policies.length,...livePolicies.map(policyView));state='ready';
  message(result.limited?'Showing the latest 500 accessible policies; cards and search cover this subset.':'');
 }catch(error){
  state='error';livePolicies=[];data.policies.length=0;
  message(prefix+'Policies could not be loaded: '+error.message);
 }finally{load.pending=false;render();updateSubmit();
  document.querySelector('[onclick="openForm(\'policies\')"]').hidden=state==='ready'&&!canCreate;
 }
}
const oldDetails=openPolicyDetails;
openPolicyDetails=function(index){
 ++editGeneration;oldDetails(index);
 const policy=livePolicies[index];
 if(policy){
  if(canEdit){const edit=document.createElement('button');edit.type='button';edit.textContent='Edit policy';edit.onclick=()=>openPolicyEdit(policy.id);$('policyDetails').append(edit)}
  const files=document.createElement('section');const heading=document.createElement('h3');heading.textContent='Policy files';
  files.append(heading);const body=document.createElement('div');files.append(body);$('policyDetails').append(files);renderDocuments(body,policy.id);
 }
 const record=data.policies[index];if(record?.parent_policy_id==null)return;
 const parent=livePolicies.find(p=>p.id===record.parent_policy_id);
 const row=document.createElement('div'),label=document.createElement('dt'),value=document.createElement('dd');
 label.textContent='Parent policy';
 value.textContent=parent?parent.policy_number+' - '+parent.policy_name:'Linked policy (not in the loaded register)';
 row.append(label,value);$('policyDetails').querySelector('dl').append(row);
};
const oldOpen=openForm,oldClose=closeForm;
openForm=function(type){
 if(type==='policies'&&state!=='ready'){
  message(state==='loading'?'Loading policies…':'Policies must load successfully before creating a draft. Retry loading policies.');return;
 }
 if(type==='policies'&&!canCreate){message('Your Insurance access is view-only.');return}
 ++editGeneration;editing=null;registration=null;oldOpen(type);updateSubmit();
 if(type==='policies'){
  $('formTitle').textContent='Register policy draft';
  const previousClass=form.elements.class;
  const type=document.createElement('select');type.id='fclass';type.name='class';type.required=true;
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Select insurance type';type.append(placeholder);
  const commonTypes=['Public Liability','Professional Indemnity','Property','Motor','Workers Compensation','Management Liability','Cyber','Business Travel'];
  const existingTypes=livePolicies.map(p=>p.insurance_class).filter(v=>typeof v==='string'&&v.trim());
  for(const value of [...new Set([...commonTypes,...existingTypes])].sort((a,b)=>a.localeCompare(b))){
   const option=document.createElement('option');option.value=value;option.textContent=value;type.append(option);
  }
  const other=document.createElement('option');other.value='';other.textContent='Other (specify)';other.dataset.custom='true';type.append(other);
  previousClass.closest('.field').querySelector('label').textContent='Insurance type';previousClass.replaceWith(type);
  const customField=document.createElement('div');customField.className='field';customField.hidden=true;
  const customLabel=document.createElement('label');customLabel.htmlFor='insuranceCustomType';customLabel.textContent='Other insurance type';
  const custom=document.createElement('input');custom.id='insuranceCustomType';custom.name='custom_insurance_type';custom.maxLength=100;custom.disabled=true;
  customField.append(customLabel,custom);type.closest('.field').after(customField);
  type.onchange=()=>{const isOther=type.selectedOptions[0]?.dataset.custom==='true';customField.hidden=!isOther;custom.disabled=!isOther;custom.required=isOther;type.required=!isOther;};
  for(const name of ['class','insurer','currency','inception','expiry'])form.elements[name].required=true;
  form.elements.currency.value='AUD';form.elements.currency.maxLength=3;
  form.elements.country.maxLength=3;
  form.elements.country.placeholder='AU for Australia';
  const countries=document.createElement('datalist');countries.id='insuranceJurisdictions';
  const australia=document.createElement('option');australia.value='AU';australia.label='Australia';
  countries.append(australia);$('fields').append(countries);
  form.elements.country.setAttribute('list',countries.id);
  form.elements.status.value='Draft';form.elements.status.readOnly=true;
  formStatus.textContent='New policies are saved as Draft. Submit them for approval after saving.';
  if(canRegisterActive){
   $('formTitle').textContent='Register policy';
   const statusChoice=document.createElement('select');statusChoice.id='fstatus';statusChoice.name='status';
   for(const value of ['Draft','Active']){const option=document.createElement('option');option.value=value;option.textContent=value==='Active'?'Active - already purchased and currently in force':'Draft - submit for approval';statusChoice.append(option)}
   form.elements.status.replaceWith(statusChoice);
   const confirmation=document.createElement('div');confirmation.className='field';confirmation.hidden=true;
   const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.name='purchased_in_force';
   label.append(check,document.createTextNode('I confirm this policy is already purchased and currently in force.'));confirmation.append(label);statusChoice.closest('.field').after(confirmation);
   statusChoice.onchange=()=>{confirmation.hidden=statusChoice.value!=='Active';check.required=statusChoice.value==='Active';check.checked=false;updateSubmit()};
   formStatus.textContent='Insurance Managers may register purchased policies as Active when today (UTC) is within their dates. Future or expired policies must use Draft. This records registration, not approval.';
  }
  if(canAttach){
   const field=document.createElement('div');field.className='field';
   const label=document.createElement('label');label.htmlFor='registrationPdf';label.textContent='Policy PDF (optional)';
   const file=document.createElement('input');file.type='file';file.id='registrationPdf';file.accept='application/pdf,.pdf';
   const note=document.createElement('p');note.className='note';note.textContent='PDF up to 25 MiB. Saved as a Policy Schedule Record with retention pending after the policy is saved. Open the saved PDF using View Policy in the policy list.';
   field.append(label,file,note);$('fields').append(field);
  }

  if(!financialWriteAccess)for(const name of financialFields){
   const input=form.elements[name];if(input){input.disabled=true;input.closest('.field').hidden=true}
  }
  if(linkingAccess){
   const field=document.createElement('div');field.className='field';
   const label=document.createElement('label');label.htmlFor='fparent_policy_id';label.textContent='Parent policy (optional)';
   const select=document.createElement('select');select.id='fparent_policy_id';select.name='parent_policy_id';
   const none=document.createElement('option');none.value='';none.textContent='No parent policy';select.append(none);
   for(const policy of livePolicies){
    if(!Number.isSafeInteger(policy.id)||policy.id<=0)continue;
    const option=document.createElement('option');option.value=policy.id;
    option.textContent=policy.policy_number+' — '+policy.policy_name;select.append(option);
   }
   field.append(label,select);$('fields').append(field);
   formStatus.textContent+=' Parent choices are limited to loaded policies you can view. Programme linking is not yet available.';
  }
 }
};
closeForm=function(){if(!busy){
 ++editGeneration;editing=null;
 if(registration?.id){documentPolicy=String(registration.id);registration=null;oldClose();tab='Documents';load('Policy saved. Attachment confirmation is pending. ');return}
 registration=null;oldClose();$('policyDetails').replaceChildren();
}};
async function saveRegistrationAttachment(){
 const pid=String(registration.id),operation=documentUploads.get(pid);
 if(registration.rejected){
  const pdf=$('registrationPdf')?.files[0];
  if(!pdf||!pdf.size||pdf.size>25*1024*1024||!pdf.name.toLowerCase().endsWith('.pdf')){formStatus.textContent='Policy is saved. Choose a non-empty PDF no larger than 25 MiB.';return}
  const pending=new FormData();pending.set('file',pdf);pending.set('record_title',operation.pending.get('record_title'));
  pending.set('attachment_type','Policy Schedule');pending.set('request_id',crypto.randomUUID());operation.pending=pending;
  registration.rejected=false;$('registrationPdf').disabled=true;
 }
 busy=true;updateSubmit();formStatus.textContent='Policy saved. Saving PDF as a Record.';
 try{
  const access=await request('/insurance/policies/'+pid+'/records');
  if(access.can_upload!==true)throw new Error('File upload is no longer permitted.');
  const result=await request('/insurance/policies/'+pid+'/records',{method:'POST',body:operation.pending});
  if(!Number.isSafeInteger(result.record_id)||result.record_id<=0)throw new Error('Invalid save confirmation.');
  documentUploads.delete(pid);registration=null;oldClose();tab='Policies';$('search').value='';insuranceView='all';$('insuranceStatus').value='';
  await load('Policy and PDF saved. ');
 }catch(error){
  operation.message='Policy '+pid+' is saved. Attachment not confirmed: '+error.message+' Retry attaches the same file to this policy; it does not create another policy.';
  if([400,413].includes(error.status)){
   registration.rejected=true;$('registrationPdf').disabled=false;
   operation.message='Policy '+pid+' is saved. PDF rejected: '+error.message+' Choose a corrected PDF and retry the attachment.';
  }
  formStatus.textContent=operation.message;
 }finally{busy=false;updateSubmit()}
}
async function openPolicyEdit(id){
 if(busy)return;
 if(documentUploads.get(String(id))?.pending){message('Finish or reconcile the pending attachment before editing this policy.');return}
 const generation=++editGeneration;
 try{
  const result=await request('/insurance/policies/'+id+'/edit');
  if(generation!==editGeneration||!$('modal').classList.contains('open'))return;
  if(documentUploads.get(String(id))?.pending){message('Finish or reconcile the pending attachment before editing this policy.');return}
  if(!result.policy||!result.updated_at)throw new Error('Invalid edit response.');
  openForm('policies');
  const policy=result.policy,values=policyView(policy);
  editing={id,policy,revision:result.updated_at};
  for(const [name,value] of Object.entries(values))if(form.elements[name])form.elements[name].value=value??'';
  // Links and lifecycle have separate rules; this editor never submits them.
  for(const name of ['status','parent_policy_id','purchased_in_force'])if(form.elements[name]){form.elements[name].disabled=true;form.elements[name].closest('.field').hidden=true}
  if(policy.insured_entities.length>1)form.elements.entity.disabled=true;
  if(policy.coverages.length>1||policy.coverages.some(c=>c.currency!==policy.currency))for(const name of ['limit','excess','currency'])form.elements[name].disabled=true;
  $('formTitle').textContent='Edit policy';
  formStatus.textContent='Status, approval and policy links remain unchanged. An optional PDF adds a Record; it does not replace existing files.';
  updateSubmit();
 }catch(error){if(generation===editGeneration)message('Policy could not be opened for editing: '+error.message)}
}
async function savePolicyEdit(){
 const current=editing,values=Object.fromEntries(new FormData(form).entries());
 if(documentUploads.get(String(current.id))?.pending){formStatus.textContent='Finish or reconcile the pending attachment before editing this policy.';return}
 if(form.elements.class.selectedOptions[0]?.dataset.custom==='true')values.class=(values.custom_insurance_type||'').trim();
 const mapping={name:'policy_name',number:'policy_number',class:'insurance_class',insurer:'insurer_name',broker:'broker_name',entity:'insured_entity_name',currency:'currency',inception:'inception_date',expiry:'expiry_date',country:'country_code',premium:'annual_premium',limit:'coverage_limit',excess:'deductible_amount'};
 const initial=policyView(current.policy),payload={expected_updated_at:current.revision};
 for(const [name,key] of Object.entries(mapping))if(!form.elements[name]?.disabled&&String(values[name]??'')!==String(initial[name]??''))payload[key]=values[name]||null;
 const pdf=$('registrationPdf')?.files[0];
 if(pdf&&(!pdf.size||pdf.size>25*1024*1024||!pdf.name.toLowerCase().endsWith('.pdf'))){formStatus.textContent='Choose a non-empty PDF no larger than 25 MiB.';return}
 busy=true;updateSubmit();let saved=false;
 try{
  const result=await request('/insurance/policies/'+current.id+'/edit',{method:'PATCH',body:JSON.stringify(payload)});
  if(result.id!==current.id||result.policy_status!==current.policy.status)throw new Error('Invalid edit confirmation.');
  saved=true;editing=null;
  if(pdf){const pending=new FormData();pending.set('file',pdf);pending.set('record_title',values.name.slice(0,255));pending.set('attachment_type','Policy Schedule');pending.set('request_id',crypto.randomUUID());
   registration={id:current.id};documentUploads.set(String(current.id),{pending,saving:false,message:''});
   for(const input of form.querySelectorAll('input,select,textarea'))input.disabled=true;
  }
 }catch(error){formStatus.textContent='Changes not confirmed: '+error.message+' Your entries remain here. Reopen the policy to reconcile before retrying.'}
 finally{busy=false;updateSubmit()}
 if(saved){if(registration?.id){await saveRegistrationAttachment();return}oldClose();await load()}
}
const oldSubmit=form.onsubmit;
form.onsubmit=async event=>{
 if(formType!=='policies'){oldSubmit(event);return}
 event.preventDefault();
 if(registration?.id){if(!busy)await saveRegistrationAttachment();return}
 if(editing){if(!busy)await savePolicyEdit();return}
 if(!canCreate){formStatus.textContent='Your Insurance access is view-only.';return}
 if(busy)return;
 if(state!=='ready'){formStatus.textContent='Load policies successfully before saving.';return}
 const values=Object.fromEntries(new FormData(form).entries());
 if(form.elements.class.selectedOptions[0]?.dataset.custom==='true')values.class=(values.custom_insurance_type||'').trim();
 if(!values.class){formStatus.textContent='Choose an insurance type or specify Other.';return}
 const pdf=$('registrationPdf')?.files[0];
 if(pdf&&(pdf.size>25*1024*1024||!pdf.size||!pdf.name.toLowerCase().endsWith('.pdf'))){formStatus.textContent='Choose a non-empty PDF no larger than 25 MiB.';return}
 const payload={policy_name:values.name,policy_number:values.number,insurance_class:values.class,
  insurer_name:values.insurer,broker_name:values.broker,insured_entity_name:values.entity,
  currency:values.currency.toUpperCase(),inception_date:values.inception,expiry_date:values.expiry,
  policy_scope:'Local',country_code:values.country||null,status:canRegisterActive&&values.status==='Active'?'Active':'Draft'};
 if(payload.status==='Active'){
  const today=new Date().toISOString().slice(0,10);
  if(!form.elements.purchased_in_force.checked||values.inception>today||values.expiry<today){formStatus.textContent='Confirm purchase and use dates covering today (UTC), or save as Draft.';return}
  payload.purchased_in_force=true;
 }
 if(linkingAccess&&values.parent_policy_id)payload.parent_policy_id=Number(values.parent_policy_id);
 if(financialWriteAccess)Object.assign(payload,{
  coverage_limit:values.limit||null,deductible_amount:values.excess||null,annual_premium:values.premium||null});
 busy=true;updateSubmit();formStatus.textContent='Saving policy draft…';
 let saved=false;
 try{
  const result=await request('/insurance/policies',{method:'POST',body:JSON.stringify(payload)});
  if(!Number.isSafeInteger(result.id)||result.id<=0||result.policy_status!==payload.status)throw new Error('Invalid save confirmation.');
  saved=true;
  if(pdf){
   const pending=new FormData();pending.set('file',pdf);pending.set('record_title',values.name.slice(0,255));
   pending.set('attachment_type','Policy Schedule');pending.set('request_id',crypto.randomUUID());
   registration={id:result.id};documentUploads.set(String(result.id),{pending,saving:false,message:''});
   for(const input of form.querySelectorAll('input,select,textarea'))input.disabled=true;
  }
 }catch(error){
  formStatus.textContent='Save could not be confirmed: '+error.message+
   ' Your entries remain here. Refresh policies before retrying if the connection was interrupted.';
 }finally{busy=false;updateSubmit()}
 if(saved){
  if(registration?.id){await saveRegistrationAttachment();return}
  oldClose();tab='Policies';$('search').value='';insuranceView='all';$('insuranceStatus').value='';
  await load('Policy saved. ');
 }
};
$('insuranceRefresh').onclick=()=>{if(!busy&&!load.pending)load()};
load();
})();
