/* VERO Insurance: persistent policies API adapter. Claims and renewals remain prototype. */
(()=>{
const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
const token=()=>localStorage.getItem('vero_session_token');
const headers=()=>({'Authorization':'Bearer '+token(),'Accept':'application/json','Content-Type':'application/json'});
const status=document.createElement('p');status.className='note';status.id='insuranceApiStatus';
const tabs=document.getElementById('tabs');tabs?.parentNode?.insertBefore(status,tabs);
let livePolicies=[];
let office=false;
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
function message(t){status.textContent=t}
async function request(path,options={}){
 const res=await fetch(API+path,{...options,headers:headers(),cache:'no-store'});
 const body=await res.json().catch(()=>({}));
 if(!res.ok)throw new Error(body.message||'Request failed ('+res.status+')');
 return body;
}
async function load(){
 if(!token()){message('Sign in to access insurance policies.');return}
 try{
  const result=await request('/insurance/policies');
  office=Boolean(result.insurance_office);
  livePolicies=result.policies||[];
  data.policies.length=0;
  for(const p of livePolicies)data.policies.push({
   name:p.policy_name,number:p.policy_number,class:p.insurance_class,
   insurer:p.insurer_name,broker:p.broker_name||'',country:p.country_code||'',
   inception:p.inception_date,expiry:p.expiry_date,currency:p.currency,
   status:p.status,premium:''
  });
  message('Policy Register connected to VERO API. '+livePolicies.length+' policies loaded. Claims and renewals are still prototype-only.');
  render();
  if(tab==='Policies')renderPolicyWorkflow();
 }catch(e){message('Insurance API not available yet: '+e.message+'. Policy data is not being saved.')}
}
function renderPolicyWorkflow(){
 if(tab!=='Policies')return;
 const body=document.getElementById('content');
 if(!body)return;
 const panel=document.createElement('div');
 panel.style.cssText='margin-top:20px;border-top:1px solid #E5E1DE;padding-top:15px';
 panel.innerHTML='<h3 style="font-size:13px">Policy approvals</h3><p class="note">Drafts can be submitted by their owners. Only Insurance Office members can approve or request changes.</p>';
 const select=document.createElement('select');select.setAttribute('aria-label','Select policy');
 for(const p of livePolicies){const o=document.createElement('option');o.value=p.id;o.textContent=p.policy_number+' — '+p.policy_name+' ('+p.status+')';select.append(o)}
 panel.append(select);
 const actions=['Submit',...(office?['Approve','Request Changes']:[])];
 for(const action of actions){
  const btn=document.createElement('button');btn.textContent=action;btn.style.margin='5px';
  btn.onclick=async()=>{if(!select.value)return;btn.disabled=true;try{await request('/insurance/policies/'+encodeURIComponent(select.value)+'/decision',{method:'POST',body:JSON.stringify({action})});await load()}catch(e){message(e.message)}finally{btn.disabled=false}};
  panel.append(btn);
 }
 body.append(panel);
}
const oldRender=render;
render=function(){oldRender();if(tab==='Policies'&&livePolicies.length)renderPolicyWorkflow()};
const oldSubmit=document.getElementById('form').onsubmit;
document.getElementById('form').onsubmit=async e=>{
 if(formType!=='policies'){oldSubmit(e);return}
 e.preventDefault();
 const form=e.currentTarget;
 const v=Object.fromEntries(new FormData(form).entries());
 const payload={
  policy_name:v.name,policy_number:v.number,insurance_class:v.class,
  insurer_name:v.insurer,broker_name:v.broker,currency:(v.currency||'AUD').toUpperCase(),
  inception_date:v.inception,expiry_date:v.expiry,
  policy_scope:'Local',country_code:v.country||null
 };
 try{
  await request('/insurance/policies',{method:'POST',body:JSON.stringify(payload)});
  closeForm();await load();tab='Policies';render();
 }catch(err){message('Policy was not saved: '+err.message)}
};
load();
})();
