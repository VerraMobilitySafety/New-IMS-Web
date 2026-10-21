/* Reconciled from feature/insurance-live-policy-register. Policies use the API;
   claims remain explicitly labelled, temporary prototypes; renewals use the API. */
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
function pageAccess(allowed){
 document.body.classList.remove('insurance-access-pending');
 document.body.classList.toggle('insurance-access-denied',!allowed);
 for(const el of document.querySelectorAll('.insurance-actions,#insurancePanel,.kpis'))el.inert=!allowed;
 if(!allowed){canCreate=false;canEdit=false;canAttach=false;canRegisterActive=false;linkingAccess=false;readOnly=true;financialWriteAccess=false;setFinancialAccess(false);livePolicies=[];data.policies.length=0;editGeneration++;}
}
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
  if(!res.ok){
   if(res.status===401)pageAccess(false);
   if(res.status===403){try{const access=await fetch(API+'/insurance/access',{headers:{Authorization:'Bearer '+token(),Accept:'application/json'},cache:'no-store',signal:controller.signal});if(access.status===401||access.status===403)pageAccess(false);}catch{}}
   const error=new Error(body?.message||'Request failed ('+res.status+')');error.status=res.status;throw error}
  if(!body||body.status!=='success')throw new Error('Invalid Insurance API response.');
  return body;
 }finally{clearTimeout(timer)}
}
function policyView(p){
 const amounts=key=>(p.coverages||[]).filter(c=>c[key]!=null)
  .map(c=>c.currency===p.currency?c[key]:(c.currency||'Currency unstated')+' '+c[key]).join(' / ');
 const view={name:p.policy_name,number:p.policy_number,class:p.insurance_class,
  insurer:p.insurer_name,broker:p.broker_name||'',entity:(p.insured_entities||[]).join('; '),
  country:p.country_code||'',state:p.state_territory||'',inception:p.inception_date,expiry:p.expiry_date,
  owner:p.owner_name||(p.owner_user_id?'Name unavailable':'Unassigned'),
  jurisdiction:[p.country_code,p.state_territory].filter(Boolean).join(' / ')||'Not specified',
  coverage:p.coverage_geography?.scope==='Countries'?p.coverage_geography.countries.map(c=>c.country_code+(c.states?.length?' / '+c.states.join(', '):'')).join('; '):p.coverage_geography?.scope||'Unspecified',
  currency:p.currency,status:p.status,parent_policy_id:p.parent_policy_id??null};
 if(financialAccess)Object.assign(view,{premium:p.annual_premium??'',
  limit:amounts('limit_amount'),excess:amounts('deductible_amount')});
 return view;
}
function jurisdictionState(value=''){
 const previous=form.elements.state,country=form.elements.country.value;
 const input=document.createElement(country==='AU'?'select':'input');
 input.id='fstate';input.name='state';
 if(country==='AU'){
  for(const [code,label] of [['','Country-wide'],['ACT','Australian Capital Territory'],['NSW','New South Wales'],['NT','Northern Territory'],['QLD','Queensland'],['SA','South Australia'],['TAS','Tasmania'],['VIC','Victoria'],['WA','Western Australia']]){
   const option=document.createElement('option');option.value=code;option.textContent=code?code+' - '+label:label;input.append(option);
  }
 }else{input.maxLength=100;input.placeholder=country?'Optional - blank means country-wide':'Choose a country first'}
 input.disabled=!country;
 previous.replaceWith(input);input.value=value;
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
 table.querySelectorAll('[data-insurance-document-cell]').forEach(cell=>cell.remove());
 const heading=document.createElement('th');heading.dataset.insuranceDocumentCell='';heading.scope='col';heading.textContent='Policy document';table.querySelector('thead tr').append(heading);
 for(const row of table.querySelectorAll('tbody tr[data-policy-index]')){
  const policy=livePolicies[Number(row.dataset.policyIndex)];if(!policy)continue;
  const cell=document.createElement('td');cell.dataset.insuranceDocumentCell='';row.append(cell);
  cell.addEventListener('click',event=>event.stopPropagation());cell.addEventListener('keydown',event=>event.stopPropagation());
  const view=document.createElement('span');cell.append(view);
  const link=document.createElement('a');link.href='#';link.textContent='View Policy';view.append(link);
  if(documentUploads.get(String(policy.id))?.pending){
   const retry=document.createElement('button');retry.type='button';retry.textContent='Retry attachment';
   retry.onclick=()=>{documentPolicy=String(policy.id);tab='Documents';render()};cell.append(document.createTextNode(' '),retry);
  }
  link.onclick=async event=>{
   event.preventDefault();if(link.dataset.loading)return;link.dataset.loading='true';link.textContent='Checking policy PDF...';
   try{
    const result=await request('/insurance/policies/'+encodeURIComponent(policy.id)+'/records');
    if(!cell.isConnected)return;
    if(!Array.isArray(result.records))throw new Error('Invalid file list.');
    const candidates=result.records.filter(r=>['Policy Schedule','Certificate of Currency'].includes(r.attachment_type)&&r.status==='Active'&&
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
   const list=document.createElement('ul');list.className='insurance-file-list';
   for(const record of result.records){
    if(!Number.isSafeInteger(record.record_id)||record.record_id<=0)throw new Error('Invalid record reference.');
    const item=document.createElement('li'),link=document.createElement('a');item.className='insurance-file-card';
    link.href='records.html?record_id='+record.record_id;link.textContent=record.record_code+' - '+record.title;
    item.append(link,document.createTextNode(' · '+record.attachment_type+(record.retention_pending?' · Retention pending':'')));list.append(item);
    if(result.can_remove===true&&Number.isSafeInteger(record.link_id)&&record.link_id>0){
     const remove=document.createElement('button');remove.type='button';remove.className='insurance-file-refresh';remove.textContent='Remove from this policy';
     remove.onclick=async()=>{
      const selected=livePolicies.find(p=>String(p.id)===String(pid));
      if(!window.confirm('Remove '+record.record_code+' - '+record.title+' from '+(selected?.policy_name||'this policy')+'? The Record, PDF and other policy links will be kept.'))return;
      const reason=window.prompt('Reason for removing this policy association:','Attached to the wrong policy');
      if(reason===null)return;
      if(!reason.trim()||reason.trim().length>500){window.alert('Enter a reason of up to 500 characters.');return}
      remove.disabled=true;remove.textContent='Removing association...';
      try{
       const saved=await request('/insurance/policies/'+encodeURIComponent(pid)+'/record-links/'+record.link_id,
        {method:'DELETE',body:JSON.stringify({record_id:record.record_id,record_code:record.record_code,reason:reason.trim()})});
       if(saved.removed_link_id!==record.link_id||saved.record_id!==record.record_id||saved.record_preserved!==true)throw new Error('Invalid removal confirmation.');
       await loadDocuments();renderPolicyLinks();
      }catch(error){remove.disabled=false;remove.textContent='Remove from this policy';
       const notice=document.createElement('p');notice.setAttribute('role','alert');notice.textContent='Removal not confirmed: '+error.message+' Refresh files before trying again.';item.append(notice)}
     };
     item.append(remove);
    }
   }
   if(!result.records.length){const empty=document.createElement('p');empty.textContent='No accessible files attached.';body.append(empty)}
   body.append(list);
   const refresh=document.createElement('button');refresh.className='insurance-file-refresh';refresh.type='button';refresh.textContent='Refresh files';refresh.onclick=loadDocuments;body.append(refresh);
   if(result.can_upload===true){
    const upload=document.createElement('form');upload.id='insuranceUpload';upload.className='insurance-file-upload';
    const uploadHeading=document.createElement('h4');uploadHeading.textContent='Add a PDF';upload.append(uploadHeading);
    const title=document.createElement('input');title.name='record_title';title.required=true;title.maxLength=255;title.setAttribute('aria-label','File title');
    const type=document.createElement('select');type.name='attachment_type';type.setAttribute('aria-label','Attachment type');
    for(const name of result.attachment_types){const option=document.createElement('option');option.textContent=name;option.value=name;type.append(option)}
    const file=document.createElement('input');file.type='file';file.name='file';file.accept='application/pdf,.pdf';file.required=true;file.setAttribute('aria-label','PDF file');
    const save=document.createElement('button');save.type='submit';save.textContent='Save file as Record';
    const feedback=document.createElement('p');feedback.setAttribute('role','status');
    for(const [control,text] of [[title,'File title'],[type,'Attachment type'],[file,'PDF file']]){
     const label=document.createElement('label');label.className='insurance-upload-field';label.append(document.createTextNode(text),control);upload.append(label);
    }
    save.className='primary';upload.append(save,feedback);body.append(upload);
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
  pageAccess(true);
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
  state='error';pageAccess(false);livePolicies=[];data.policies.length=0;
  message(error.status===403?'You do not have access to Insurance.':prefix+'Policies could not be loaded: '+error.message);
 }finally{load.pending=false;render();updateSubmit();
  document.querySelector('[onclick="openForm(\'policies\')"]').hidden=state==='ready'&&!canCreate;
 }
}
const oldDetails=openPolicyDetails;
openPolicyDetails=function(index){
 ++editGeneration;oldDetails(index);
 const policy=livePolicies[index];
 if(policy){
  if(canEdit){const edit=document.createElement('button');edit.type='button';edit.textContent='Edit policy';edit.onclick=()=>openPolicyEdit(policy.id);edit.className='primary';$('insuranceDetailActions').append(edit)}
  const metadata=document.createElement('section');metadata.className='insurance-files-section';
  const metaHeading=document.createElement('h3');metaHeading.textContent='Coverage and source';
  const coverage=document.createElement('p');coverage.textContent='Coverage geography: '+policyView(policy).coverage;
  const wording=document.createElement('p');wording.textContent=policy.source_term_text||'Certificate term wording not recorded.';
  metadata.append(metaHeading,coverage,wording);$('insuranceDetailActions').before(metadata);
  const files=document.createElement('section');const heading=document.createElement('h3');heading.textContent='Policy files';
  files.append(heading);const body=document.createElement('div');files.className='insurance-files-section';files.append(body);$('insuranceDetailActions').before(files);renderDocuments(body,policy.id);
 }
 const record=data.policies[index];if(record?.parent_policy_id==null)return;
 const parent=livePolicies.find(p=>p.id===record.parent_policy_id);
 const row=document.createElement('div'),label=document.createElement('dt'),value=document.createElement('dd');
 label.textContent='Parent policy';
 value.textContent=parent?parent.policy_number+' - '+parent.policy_name:'Linked policy (not in the loaded register)';
 row.append(label,value);$('policyDetails').querySelector('dl').append(row);
};
function coverageControls(initial={scope:'Unspecified',countries:[]}){
 const group=document.createElement('section');group.className='field insurance-coverage-fields';
 const heading=document.createElement('h3');heading.textContent='Coverage geography';
 const note=document.createElement('p');note.className='note';note.textContent='Describes where cover applies. It does not change the access jurisdiction or who can see this policy.';
 const scope=document.createElement('select');scope.id='coverageScope';scope.setAttribute('aria-label','Coverage geography');
 for(const value of ['Unspecified','Worldwide','Countries']){const option=document.createElement('option');option.value=value;option.textContent=value;scope.append(option)}
 scope.value=initial.scope||'Unspecified';
 const rows=document.createElement('div'),add=document.createElement('button');add.type='button';add.textContent='Add covered country';
 const entries=[];
 function append(entry={country_code:'',states:[]}){
  const row=document.createElement('div');row.className='insurance-form-pair';
  const country=document.createElement('input');country.value=entry.country_code;country.maxLength=2;country.placeholder='AU, NZ';country.setAttribute('aria-label','Covered country code');
  const states=document.createElement('input');states.value=(entry.states||[]).join(', ');states.placeholder='Blank means whole country';states.setAttribute('aria-label','Covered states or territories');
  const countryField=document.createElement('label');countryField.textContent='Country code';countryField.append(country);
  const stateField=document.createElement('label');stateField.textContent='States / territories (comma separated)';stateField.append(states);
  const remove=document.createElement('button');remove.type='button';remove.textContent='Remove covered country';
  const item={row,country,states};entries.push(item);remove.onclick=()=>{entries.splice(entries.indexOf(item),1);row.remove()};
  row.append(countryField,stateField,remove);rows.append(row);
 }
 for(const entry of initial.countries||[])append(entry);
 add.onclick=()=>append();
 const sync=()=>{rows.hidden=add.hidden=scope.value!=='Countries';};scope.onchange=sync;sync();
 group.append(heading,note,scope,rows,add);$('fields').append(group);
 form.insuranceCoverage=()=>{
  if(scope.value!=='Countries')return {scope:scope.value,countries:[]};
  const countries=entries.map(({country,states})=>({country_code:country.value.trim().toUpperCase(),states:states.value.split(',').map(x=>x.trim()).filter(Boolean).sort()})).sort((a,b)=>a.country_code.localeCompare(b.country_code));
  if(!countries.length||countries.some(c=>! /^[A-Z]{2}$/.test(c.country_code))||new Set(countries.map(c=>c.country_code)).size!==countries.length)throw new Error('Enter distinct two-letter covered country codes.');
  for(const c of countries){if(new Set(c.states).size!==c.states.length||c.states.some(v=>v.length>100)||c.country_code==='AU'&&c.states.some(v=>!['ACT','NSW','NT','QLD','SA','TAS','VIC','WA'].includes(v)))throw new Error('Use distinct state codes; Australian states are ACT, NSW, NT, QLD, SA, TAS, VIC and WA.');}
  return {scope:'Countries',countries};
 };
}
function sourceControls(policy){
 const field=document.createElement('div');field.className='field';
 const label=document.createElement('label');label.htmlFor='sourceTermText';label.textContent='Certificate term wording (optional)';
 const input=document.createElement('textarea');input.id='sourceTermText';input.name='source_term_text';input.maxLength=2000;input.placeholder='For example: 4 pm local, as stated in the certificate';input.value=policy?.source_term_text||'';field.append(label,input);$('fields').append(field);
 const ownerField=document.createElement('div');ownerField.className='field';const ownerLabel=document.createElement('label');ownerLabel.htmlFor='registrationOwner';ownerLabel.textContent='Policy owner';
 const owner=document.createElement('select');owner.id='registrationOwner';owner.name='owner_choice';
 for(const [value,text] of [['unknown','Unknown / unassigned'],['creator','I am the policy owner']]){const option=document.createElement('option');option.value=value;option.textContent=text;owner.append(option)}
 ownerField.append(ownerLabel,owner);$('fields').append(ownerField);
 if(policy){ownerField.hidden=true;owner.disabled=true;}
}
const oldOpen=openForm,oldClose=closeForm;
const programmes=document.createElement('button');programmes.type='button';programmes.textContent='Insurance programmes';
$('insuranceMore').querySelector('.insurance-more-menu').append(programmes);
function programmeHost(title){
 ++editGeneration;editing=null;registration=null;formType='';form.hidden=true;
 const host=$('policyDetails');host.hidden=false;host.replaceChildren();$('modal').classList.add('insurance-policy-drawer');$('formTitle').textContent=title;
 showModal($('modal').querySelector('.insurance-drawer-close'),programmes);return host;
}
const renewalsButton=document.querySelector('[onclick="openForm(\'renewals\')"]');
renewalsButton.textContent='Renewal tracking';renewalsButton.removeAttribute('onclick');renewalsButton.onclick=renewalList;
async function renewalList(){
 const host=programmeHost('Insurance renewals'),generation=editGeneration;host.textContent='Loading renewal cycles.';
 try{
  const result=await request('/insurance/renewals');if(generation!==editGeneration||!$('modal').classList.contains('open'))return;
  if(!Array.isArray(result.renewals))throw new Error('Invalid renewal response.');
  host.replaceChildren();const note=document.createElement('p');note.className='note';note.textContent=result.enabled?'In-app renewal tasks are enabled. No purchase or renewal is automatic.':'Reminder generation is disabled. Dates below are a planning preview; no tasks have been created.';host.append(note);
  const search=document.createElement('input');search.type='search';search.setAttribute('aria-label','Search renewal cycles');search.placeholder='Search policies or programmes';host.append(search);
  const list=document.createElement('div');host.append(list);
  const draw=()=>{list.replaceChildren();const rows=result.renewals.filter(c=>c.title.toLowerCase().includes(search.value.toLowerCase()));
   if(!rows.length){const empty=document.createElement('p');empty.textContent='No accessible renewal cycles.';list.append(empty)}
   for(const c of rows){const section=document.createElement('section');section.className='insurance-renewal-cycle';const heading=document.createElement('h3');heading.textContent=c.title;section.append(heading);
    const summary=document.createElement('p');summary.textContent=c.expiry_date+' - '+c.stage+' - '+c.policy_ids.length+' policy/policies - '+c.task_status;section.append(summary);
    if(c.kind==='programme')programmeButton(section,'Open programme / certificates',()=>programmeDetail(c.target_id));
    else{const index=livePolicies.findIndex(p=>p.id===c.target_id);if(index>=0)programmeButton(section,'Open policy / certificates',()=>{closeForm();openPolicyDetails(index)})}
    if(result.enabled&&c.can_start&&c.cycle_id&&c.task_status==='Open')programmeButton(section,'Start assigned renewal',async e=>{const button=e.currentTarget;button.disabled=true;try{await request('/insurance/renewals/'+c.cycle_id+'/start',{method:'POST',body:JSON.stringify({expected_revision:c.revision})});if(generation===editGeneration)renewalList()}catch(error){if(generation===editGeneration){const message=document.createElement('p');message.setAttribute('role','alert');message.textContent='Change not confirmed: '+error.message;section.append(message);button.disabled=false}}});
    if(result.enabled&&c.cycle_id&&c.task_status!=='Renewed'&&(c.can_start||c.can_reassign))programmeButton(section,'Manage renewal evidence',()=>renewalManage(c));
    list.append(section);
   }
  };search.oninput=draw;draw();
 }catch(error){if(generation!==editGeneration)return;host.textContent='Renewals could not be loaded: '+error.message;programmeButton(host,'Retry renewals',renewalList)}
}
async function renewalManage(c){
 const host=programmeHost('Renewal evidence'),generation=editGeneration;host.textContent='Loading evidence options.';
 try{const data=await request('/insurance/renewals/'+c.cycle_id+'/evidence-options');if(generation!==editGeneration)return;host.replaceChildren();
 const note=document.createElement('p');note.textContent='Replacement cover and an existing linked certificate are required for every original policy. This records evidence only; it does not purchase or accept insurance.';host.append(note);
 const status=document.createElement('p');status.setAttribute('role','status');host.append(status);
 const select=(label,options)=>{const field=document.createElement('label');field.className='field';field.textContent=label;const input=document.createElement('select');input.add(new Option('Select…',''));for(const o of options)input.add(new Option(o.name||o.title,o.id));field.append(input);host.append(field);return input};
 const submit=async(button,operation,payload)=>{button.disabled=true;status.textContent='Saving renewal change.';try{await request('/insurance/renewals/'+c.cycle_id+'/'+operation,{method:'POST',body:JSON.stringify({expected_revision:c.revision,...payload})});if(generation===editGeneration)renewalList()}catch(error){if(generation===editGeneration){status.textContent='Change not confirmed: '+error.message;programmeButton(host,'Refresh renewal',renewalList);button.disabled=false}}};
 if(c.can_start&&!c.stale){const mappings=data.members.map(member=>{const policy=select('Replacement for '+member.name,data.replacements),record=select('Linked certificate',[]);policy.onchange=()=>{record.replaceChildren(new Option('Select…',''));for(const cert of data.replacements.find(p=>String(p.id)===policy.value)?.certificates||[])record.add(new Option(cert.title,cert.id))};return{member,policy,record}});
 const label=document.createElement('label'),confirmed=document.createElement('input');confirmed.type='checkbox';label.append(confirmed,document.createTextNode('I confirm the selected replacement cover and certificates cover every original policy in this renewal cycle.'));host.append(label);
 programmeButton(host,'Complete renewal',e=>{if(!confirmed.checked||mappings.some(m=>!m.policy.value||!m.record.value)){status.textContent='Select every replacement and certificate, then confirm coverage.';return}submit(e.currentTarget,'complete',{coverage_confirmed:true,replacements:mappings.map(m=>({source_policy_id:m.member.id,replacement_policy_id:Number(m.policy.value),record_id:Number(m.record.value)}))})});}
 if(c.can_reassign){const manager=select('Assign to active Insurance Manager',data.managers),reason=programmeField(host,'Reassignment reason','reason');programmeButton(host,'Reassign renewal',e=>{if(!manager.value||!reason.value.trim()){status.textContent='Select a manager and provide a reason.';return}submit(e.currentTarget,'reassign',{assigned_to_user_id:Number(manager.value),reason:reason.value})})}
 programmeButton(host,'Back to renewals',renewalList);
 }catch(error){if(generation===editGeneration){host.textContent='Evidence could not be loaded: '+error.message;programmeButton(host,'Back to renewals',renewalList)}}
}
function programmeField(container,label,name,value='',type='text'){
 const field=document.createElement('label');field.className='field';field.textContent=label;
 const input=document.createElement('input');input.name=name;input.type=type;if(type==='number')input.step='.01';input.value=value??'';field.append(input);container.append(field);return input;
}
function programmeButton(host,label,action){const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=action;host.append(button);return button;}
async function programmeList(){
 const host=programmeHost('Insurance programmes'),generation=editGeneration;host.textContent='Loading programmes.';
 try{const data=await request('/insurance/programmes');if(generation!==editGeneration||!$('modal').classList.contains('open'))return;host.replaceChildren();
  if(!data.programmes.length){const empty=document.createElement('p');empty.textContent='No accessible programmes.';host.append(empty)}
  for(const p of data.programmes)programmeButton(host,p.programme_code+' - '+p.name,()=>programmeDetail(p.id));
  if(data.can_create)programmeButton(host,'Register programme',()=>programmeCreate(data.can_link));
 }catch(error){if(generation!==editGeneration)return;host.textContent='Programmes could not be loaded: '+error.message;programmeButton(host,'Retry programmes',programmeList)}
}
programmes.onclick=programmeList;
function programmeCreate(canLink){
 const host=programmeHost('Register programme'),generation=editGeneration,editor=document.createElement('form');editor.className='fields';host.append(editor);
 programmeField(editor,'Programme code','programme_code').required=true;programmeField(editor,'Programme name','name').required=true;
 const type=document.createElement('select');type.name='programme_type';type.setAttribute('aria-label','Programme type');for(const v of ['Global','Regional','Local']){const option=document.createElement('option');option.value=v;option.textContent=v;type.append(option)}editor.append(type);
 programmeField(editor,'Stated programme limit (optional)','stated_limit','', 'number').step='.01';programmeField(editor,'Currency (blank if unstated)','currency');
 const members=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent='Member policies';members.append(legend);editor.append(members);
 if(canLink)for(const p of livePolicies.filter(p=>p.programme_id==null)){const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.value=p.id;check.name='member';label.append(check,document.createTextNode(p.policy_number+' - '+p.policy_name));members.append(label)}
 const note=document.createElement('p');note.textContent='Only loaded, accessible standalone policies are offered. Empty programmes are Administrator-only. Membership is not a parent-policy hierarchy.';editor.append(note);
 const status=document.createElement('p');status.setAttribute('role','status');editor.append(status);const save=document.createElement('button');save.type='submit';save.textContent='Save programme';editor.append(save);
 editor.onsubmit=async e=>{e.preventDefault();const values=Object.fromEntries(new FormData(editor));const payload={programme_code:values.programme_code,name:values.name,programme_type:values.programme_type,stated_limit:values.stated_limit||null,currency:values.currency?.toUpperCase()||null,policy_ids:[...members.querySelectorAll('input:checked')].map(e=>Number(e.value)),coverage_geography:{scope:'Unspecified'}};save.disabled=true;
  try{const result=await request('/insurance/programmes',{method:'POST',body:JSON.stringify(payload)});if(generation!==editGeneration)return;const refresh=load(),refreshGeneration=editGeneration;await refresh;if(refreshGeneration!==editGeneration)return;await programmeDetail(result.id)}catch(error){if(generation!==editGeneration)return;status.textContent='Programme save not confirmed: '+error.message+' Return to the programme list before retrying.';programmeButton(editor,'Check programmes',programmeList)}
 };
}
async function programmeDetail(id){
 const host=programmeHost('Programme'),generation=editGeneration;host.textContent='Loading programme.';
 try{const result=await request('/insurance/programmes/'+id),p=result.programme;if(generation!==editGeneration||!$('modal').classList.contains('open'))return;host.replaceChildren();$('formTitle').textContent=p.name;
  const info=document.createElement('p');info.textContent=p.programme_code+' - '+p.programme_type;host.append(info);
  const meta=document.createElement('form');meta.className='fields';host.append(meta);programmeField(meta,'Programme name','name',p.name).disabled=!p.can_edit;
  if(p.financial_access){programmeField(meta,'Stated programme limit','stated_limit',p.stated_limit,'number').disabled=!p.can_edit;programmeField(meta,'Programme currency','currency',p.currency).disabled=!p.can_edit}
  const scope=document.createElement('select');scope.name='coverage_scope';scope.setAttribute('aria-label','Programme coverage scope');for(const v of ['Unspecified','Worldwide','Countries']){const o=document.createElement('option');o.value=v;o.textContent=v;scope.append(o)}scope.value=p.coverage_geography.scope;scope.disabled=!p.can_edit;meta.append(scope);
  const countries=programmeField(meta,'Covered country codes (comma separated)','countries',p.coverage_geography.countries.map(c=>c.country_code).join(', '));countries.disabled=!p.can_edit||p.coverage_geography.countries.some(c=>c.states.length);
  const feedback=document.createElement('p');feedback.setAttribute('role','status');host.append(feedback);
  async function save(path,method,payload,button){button.disabled=true;try{await request('/insurance/programmes/'+id+path,{method,body:JSON.stringify({...payload,expected_updated_at:p.updated_at})});if(generation!==editGeneration)return;const refresh=load(),refreshGeneration=editGeneration;await refresh;if(refreshGeneration!==editGeneration)return;await programmeDetail(id)}catch(error){if(generation!==editGeneration)return;feedback.textContent='Changes not confirmed: '+error.message+' Reopen the programme before retrying.';programmeButton(host,'Reopen programme',()=>programmeDetail(id))}}
  if(p.can_edit){const submit=document.createElement('button');submit.type='submit';submit.textContent='Save programme details';meta.append(submit);meta.onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(meta)),payload={name:v.name};if(p.financial_access){payload.stated_limit=v.stated_limit||null;payload.currency=v.currency?.toUpperCase()||null}if(scope.value!==p.coverage_geography.scope||!countries.disabled&&countries.value!==p.coverage_geography.countries.map(c=>c.country_code).join(', '))payload.coverage_geography={scope:scope.value,countries:scope.value==='Countries'?countries.value.split(',').map(c=>({country_code:c.trim().toUpperCase(),states:[]})):[]};save('','PATCH',payload,submit)}}
  const layers=document.createElement('section');layers.className='insurance-files-section';host.append(layers);const lh=document.createElement('h3');lh.textContent='Policy layers';layers.append(lh);
  for(const pid of p.policy_ids){const policy=livePolicies.find(v=>v.id===pid),layer=p.layers.find(v=>v.policy_id===pid)||{},row=document.createElement('form');row.className='fields';layers.append(row);const name=document.createElement('p');name.textContent=policy?policy.policy_number+' - '+policy.policy_name:'Policy '+pid;row.append(name);programmeField(row,'Layer label','layer_label',layer.layer_label).disabled=!p.can_link;programmeField(row,'Display order','display_order',layer.display_order,'number').disabled=!p.can_link;
   if(policy)programmeButton(row,'Open policy / upload certificate',()=>{closeForm();openPolicyDetails(livePolicies.indexOf(policy))});
   if(p.can_link){const button=document.createElement('button');button.type='submit';button.textContent='Save layer';row.append(button);row.onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(row));save('/layers','PATCH',{policy_id:pid,layer_label:v.layer_label||null,display_order:v.display_order===''?null:Number(v.display_order)},button)};programmeButton(row,'Remove member',e=>{if(confirm('Remove this programme membership? Existing policy and files are preserved.'))save('/layers','DELETE',{policy_id:pid},e.currentTarget)})}
  }
  if(p.can_link){const select=document.createElement('select');select.setAttribute('aria-label','Policy to add to programme');for(const policy of livePolicies.filter(v=>v.programme_id==null)){const o=document.createElement('option');o.value=policy.id;o.textContent=policy.policy_number+' - '+policy.policy_name;select.append(o)}layers.append(select);programmeButton(layers,'Add member policy',e=>{if(select.value)save('/layers','POST',{policy_id:Number(select.value)},e.currentTarget)})}
  const certs=document.createElement('section');certs.className='insurance-files-section';host.append(certs);const ch=document.createElement('h3');ch.textContent='Certificate variants';certs.append(ch);
  for(const c of p.certificates){const row=document.createElement('p'),link=document.createElement('a');link.textContent=c.variant_name;link.href='records.html?record_id='+c.record_id+'&preview=1';row.append(link,document.createTextNode(' - policies '+c.policy_ids.join(', ')+(p.financial_access?' - '+(c.currency||'Currency unstated')+' '+(c.stated_limit??'Limit unstated'):'')+(c.insured_entity_text?' - '+c.insured_entity_text:'')));certs.append(row)}
  if(p.can_link){const editor=document.createElement('form');editor.className='fields';certs.append(editor);programmeField(editor,'Certificate variant name','variant_name').required=true;programmeField(editor,'Stated certificate limit','stated_limit','', 'number').step='.01';programmeField(editor,'Certificate currency (blank if unstated)','currency');programmeField(editor,'Insured entity scope','insured_entity_text');
   const records=document.createElement('select');records.name='record_id';records.required=true;records.setAttribute('aria-label','Existing certificate Record');editor.append(records);
   const note=document.createElement('p');note.textContent='Reuse an existing PDF Record. To upload once, open a member policy above and add its Certificate of Currency; then return here. Do not upload one copy per layer.';editor.append(note);
   const choices=document.createElement('fieldset');editor.append(choices);for(const pid of p.policy_ids){const l=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.value=pid;l.append(check,document.createTextNode(livePolicies.find(v=>v.id===pid)?.policy_number||'Policy '+pid));choices.append(l)}
   const seen=new Set();for(const pid of p.policy_ids){try{const files=await request('/insurance/policies/'+pid+'/records');if(generation!==editGeneration)return;for(const r of files.records){if(seen.has(r.record_id)||r.status!=='Active'||!r.file_name?.toLowerCase().endsWith('.pdf'))continue;seen.add(r.record_id);const o=document.createElement('option');o.value=r.record_id;o.textContent=r.record_code+' - '+r.title;records.append(o)}}catch(error){if(generation!==editGeneration)return;feedback.textContent='Some member files could not be loaded: '+error.message}}
   const submit=document.createElement('button');submit.type='submit';submit.textContent='Link certificate variant';submit.disabled=!records.options.length;editor.append(submit);editor.onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(editor));save('/certificates','POST',{record_id:Number(v.record_id),variant_name:v.variant_name,stated_limit:v.stated_limit||null,currency:v.currency?.toUpperCase()||null,insured_entity_text:v.insured_entity_text||null,policy_ids:[...choices.querySelectorAll('input:checked')].map(x=>Number(x.value))},submit)};
  }
  programmeButton(host,'Back to programmes',programmeList);
 }catch(error){if(generation!==editGeneration)return;host.textContent='Programme unavailable: '+error.message;programmeButton(host,'Back to programmes',programmeList)}
}

openForm=function(type){
 if(type==='renewals'){renewalList();return}
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
  form.elements.currency.value='';form.elements.currency.maxLength=3;
  const unknown=document.createElement('input');unknown.type='checkbox';unknown.name='currency_unknown';unknown.checked=true;
  const unknownLabel=document.createElement('label');unknownLabel.append(unknown,document.createTextNode('Currency not stated in source'));
  form.elements.currency.closest('.field').append(unknownLabel);form.elements.currency.required=false;
  unknown.onchange=()=>{form.elements.currency.required=!unknown.checked;if(unknown.checked)form.elements.currency.value='';};
  form.elements.currency.oninput=()=>{unknown.checked=!form.elements.currency.value.trim();form.elements.currency.required=!unknown.checked;};
  coverageControls();sourceControls();
  form.elements.country.maxLength=3;
  form.elements.country.placeholder='AU for Australia';
  const countries=document.createElement('datalist');countries.id='insuranceJurisdictions';
  const australia=document.createElement('option');australia.value='AU';australia.label='Australia';
  countries.append(australia);$('fields').append(countries);
  form.elements.country.setAttribute('list',countries.id);
  jurisdictionState();
  form.elements.country.addEventListener('input',()=>jurisdictionState());
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
   statusChoice.value='Active';statusChoice.onchange();
   formStatus.textContent='Insurance Managers may register purchased policies as Active when today (UTC) is within their dates. Future or expired policies must use Draft. This records registration, not approval.';
  }
  if(canAttach){
   const field=document.createElement('div');field.className='field';
   const label=document.createElement('label');label.htmlFor='registrationPdf';label.textContent='Policy PDF (optional)';
   const file=document.createElement('input');file.type='file';file.id='registrationPdf';file.accept='application/pdf,.pdf';
   const note=document.createElement('p');note.className='note';note.textContent='PDF up to 25 MiB. Saved using the selected document type as a Record with retention pending after the policy is saved. Open the saved PDF using View Policy in the policy list.';
   const titleLabel=document.createElement('label');titleLabel.htmlFor='registrationFileTitle';titleLabel.textContent='File title';
   const title=document.createElement('input');title.id='registrationFileTitle';title.name='registration_file_title';title.maxLength=255;title.placeholder='Optional - defaults to policy name';
   field.classList.add('insurance-policy-pdf');
   const fileField=document.createElement('div');fileField.className='field';fileField.append(label,file);
   const titleField=document.createElement('div');titleField.className='field';titleField.append(titleLabel,title);
   const typeField=document.createElement('div');typeField.className='field';
   const typeLabel=document.createElement('label');typeLabel.htmlFor='registrationDocumentType';typeLabel.textContent='Document type';
   const documentType=document.createElement('select');documentType.id='registrationDocumentType';documentType.name='registration_document_type';
   for(const value of ['Policy Schedule','Certificate of Currency']){const option=document.createElement('option');option.value=value;option.textContent=value;documentType.append(option)}
   typeField.append(typeLabel,documentType);
   field.append(fileField,titleField,typeField,note);$('fields').append(field);
  }

  for(const names of [['country','state'],['inception','expiry'],['limit','excess','premium','currency']]){
   const fields=names.map(name=>form.elements[name]?.closest('.field')).filter(Boolean);
   if(!fields.length)continue;
   const group=document.createElement('div');group.className='insurance-form-pair';
   fields[0].before(group);group.append(...fields);
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
   formStatus.textContent+=' Parent choices are limited to loaded policies you can view. Programme membership is managed in Insurance programmes.';
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
  pending.set('attachment_type',operation.pending.get('attachment_type'));pending.set('request_id',crypto.randomUUID());operation.pending=pending;
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
  jurisdictionState(values.state);
  $('fields').querySelector('.insurance-coverage-fields').remove();coverageControls(policy.coverage_geography);
  form.elements.source_term_text.value=policy.source_term_text||'';
  form.elements.owner_choice.disabled=true;form.elements.owner_choice.closest('.field').hidden=true;
  form.elements.currency_unknown.checked=policy.currency==null;
  form.elements.currency.required=policy.currency!=null;
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
 const mapping={name:'policy_name',number:'policy_number',class:'insurance_class',insurer:'insurer_name',broker:'broker_name',entity:'insured_entity_name',currency:'currency',inception:'inception_date',expiry:'expiry_date',country:'country_code',state:'state_territory',premium:'annual_premium',limit:'coverage_limit',excess:'deductible_amount'};
 const initial=policyView(current.policy),payload={expected_updated_at:current.revision};
 for(const [name,key] of Object.entries(mapping))if(!form.elements[name]?.disabled&&String(values[name]??'')!==String(initial[name]??''))payload[key]=values[name]||null;
 if(payload.country_code!==undefined)payload.state_territory=values.state||null;
 let geography;try{geography=form.insuranceCoverage()}catch(error){formStatus.textContent=error.message;return}
 if(JSON.stringify(geography)!==JSON.stringify(current.policy.coverage_geography||{scope:'Unspecified',countries:[]}))payload.coverage_geography=geography;
 if((values.source_term_text||'')!==(current.policy.source_term_text||''))payload.source_term_text=values.source_term_text||null;
 if('currency' in payload&&payload.currency===null)payload.currency_unknown=form.elements.currency_unknown.checked;
 const pdf=$('registrationPdf')?.files[0];
 if(pdf&&(!pdf.size||pdf.size>25*1024*1024||!pdf.name.toLowerCase().endsWith('.pdf'))){formStatus.textContent='Choose a non-empty PDF no larger than 25 MiB.';return}
 busy=true;updateSubmit();let saved=false;
 try{
  const result=await request('/insurance/policies/'+current.id+'/edit',{method:'PATCH',body:JSON.stringify(payload)});
  if(result.id!==current.id||result.policy_status!==current.policy.status)throw new Error('Invalid edit confirmation.');
  saved=true;editing=null;
  if(pdf){const pending=new FormData();pending.set('file',pdf);pending.set('record_title',(values.registration_file_title||'').trim()||values.name.slice(0,255));pending.set('attachment_type',values.registration_document_type);pending.set('request_id',crypto.randomUUID());
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
  currency:values.currency?.toUpperCase()||null,currency_unknown:form.elements.currency_unknown.checked,owner_unknown:values.owner_choice==='unknown',source_term_text:values.source_term_text||null,inception_date:values.inception,expiry_date:values.expiry,
  policy_scope:'Local',country_code:values.country||null,state_territory:values.state||null,status:canRegisterActive&&values.status==='Active'?'Active':'Draft'};
 try{payload.coverage_geography=form.insuranceCoverage()}catch(error){formStatus.textContent=error.message;return}
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
   const pending=new FormData();pending.set('file',pdf);pending.set('record_title',(values.registration_file_title||'').trim()||values.name.slice(0,255));
   pending.set('attachment_type',values.registration_document_type);pending.set('request_id',crypto.randomUUID());
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
load().then(()=>{if(state==='ready'&&new URLSearchParams(location.search).get('renewals')==='1')renewalList()});
})();
