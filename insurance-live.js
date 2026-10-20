/* Reconciled from feature/insurance-live-policy-register. Policies use the API;
   claims and renewals remain explicitly labelled, temporary prototypes. */
(()=>{
'use strict';
const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
const status=$('insuranceApiStatus'),form=$('form'),submit=form.querySelector('[type="submit"]');
const formStatus=$('insuranceFormStatus');
let livePolicies=[],office=false,state='loading',busy=false,financialAccess=false,linkingAccess=false;
const allPolicyFields=config.policies.slice(),financialFields=new Set(['limit','excess','premium']);
function setFinancialAccess(allowed){
 financialAccess=allowed===true;
 config.policies=allPolicyFields.filter(([name])=>financialAccess||!financialFields.has(name));
 if(formType==='policies')for(const name of financialFields){
  const input=form.elements[name];if(input){input.disabled=!financialAccess;input.closest('.field').hidden=!financialAccess}
 }
}
setFinancialAccess(false);
const token=()=>localStorage.getItem('vero_session_token');
function message(text){status.textContent=text}
async function request(path,options={}){
 if(!token())throw new Error('Sign in to access insurance policies.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{
  const res=await fetch(API+path,{...options,signal:controller.signal,headers:{
   Authorization:'Bearer '+token(),Accept:'application/json','Content-Type':'application/json'
  },cache:'no-store'});
  const body=await res.json().catch(()=>null);
  if(!res.ok)throw new Error(body?.message||'Request failed ('+res.status+')');
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
  submit.textContent=busy?'Saving…':'Save Draft';
  submit.disabled=busy||state!=='ready';
 }else{submit.textContent='Add to Prototype';submit.disabled=busy}
}
function renderPolicyWorkflow(){
 if(tab!=='Policies'||state!=='ready'||!livePolicies.length)return;
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
 if(state==='ready'&&!financialAccess)$('premium').textContent='Restricted';
 if(state!=='ready'){
  $('active').textContent='—';$('premium').textContent='—';$('upcoming').textContent='—';
  if(tab==='Policies'){
   const empty=document.createElement('p');empty.className='empty';
   empty.textContent=state==='loading'?'Loading policies…':'Policies could not be loaded. Use Refresh policies to try again.';
   $('content').replaceChildren(empty);
  }
 }
 renderPolicyWorkflow();
};
$('search').oninput=()=>render();
$('insuranceStatus').onchange=()=>render();
async function load(prefix=''){
 if(state==='loading'&&load.pending)return;
 state='loading';load.pending=true;linkingAccess=false;setFinancialAccess(false);message(prefix+'Loading policies…');render();updateSubmit();
 if(!$('policyDetails').hidden)oldClose();
 $('policyDetails').replaceChildren();
 try{
  const result=await request('/insurance/policies');
  if(!Array.isArray(result.policies)||result.policies.some(p=>!p||!p.id||typeof p.status!=='string'||
      !Array.isArray(p.insured_entities)||(result.financial_access===true&&!Array.isArray(p.coverages))))throw new Error('Invalid policy list.');
  setFinancialAccess(result.financial_access);
  linkingAccess=result.can_link_parent_policies===true;
  livePolicies=result.policies;office=Boolean(result.insurance_office);
  data.policies.splice(0,data.policies.length,...livePolicies.map(policyView));state='ready';
  message(prefix+(result.limited?'Showing the latest 500 accessible policies; cards cover this subset.':
   livePolicies.length+' policies loaded.')+' Policies are saved through the VERO API.');
 }catch(error){
  state='error';livePolicies=[];data.policies.length=0;
  message(prefix+'Policies could not be loaded: '+error.message);
 }finally{load.pending=false;render();updateSubmit()}
}
const oldDetails=openPolicyDetails;
openPolicyDetails=function(index){
 oldDetails(index);
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
  message(state==='loading'?'Loading policies…':'Policies must load successfully before creating a draft. Use Refresh policies.');return;
 }
 oldOpen(type);updateSubmit();
 if(type==='policies'){
  $('formTitle').textContent='Register policy draft';
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
closeForm=function(){if(!busy)oldClose()};
const oldSubmit=form.onsubmit;
form.onsubmit=async event=>{
 if(formType!=='policies'){oldSubmit(event);return}
 event.preventDefault();
 if(busy)return;
 if(state!=='ready'){formStatus.textContent='Load policies successfully before saving.';return}
 const values=Object.fromEntries(new FormData(form).entries());
 const payload={policy_name:values.name,policy_number:values.number,insurance_class:values.class,
  insurer_name:values.insurer,broker_name:values.broker,insured_entity_name:values.entity,
  currency:values.currency.toUpperCase(),inception_date:values.inception,expiry_date:values.expiry,
  policy_scope:'Local',country_code:values.country||null,status:'Draft'};
 if(linkingAccess&&values.parent_policy_id)payload.parent_policy_id=Number(values.parent_policy_id);
 if(financialAccess)Object.assign(payload,{
  coverage_limit:values.limit||null,deductible_amount:values.excess||null,annual_premium:values.premium||null});
 busy=true;updateSubmit();formStatus.textContent='Saving policy draft…';
 let saved=false;
 try{
  const result=await request('/insurance/policies',{method:'POST',body:JSON.stringify(payload)});
  if(!result.id||result.policy_status!=='Draft')throw new Error('Invalid save confirmation.');
  saved=true;
 }catch(error){
  formStatus.textContent='Save could not be confirmed: '+error.message+
   ' Your entries remain here. Refresh policies before retrying if the connection was interrupted.';
 }finally{busy=false;updateSubmit()}
 if(saved){
  oldClose();tab='Policies';$('search').value='';insuranceView='all';$('insuranceStatus').value='';
  await load('Policy saved. ');
 }
};
$('insuranceRefresh').onclick=()=>{if(!busy&&!load.pending)load()};
load();
})();
