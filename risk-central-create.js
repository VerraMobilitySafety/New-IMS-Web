/* Central Risk Office controller. Assessment fields are shared with Project Management. */
(()=>{'use strict';
const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
const launch=document.getElementById('veroAddRiskButton'),overlay=document.getElementById('veroRiskDrawerOverlay');
if(!launch||!overlay)return;launch.hidden=true;
const host=overlay.querySelector('.vero-risk-drawer-body');let form=null,requestId=null;
async function api(path,body){const response=await fetch(API+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+localStorage.getItem('vero_session_token'),Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'});let data;try{data=await response.json();}catch{throw Error('The server returned an unreadable response. Your form has been kept.');}if(!response.ok)throw Error(data.message||'Unable to complete request');return data;}
function close(){if(form?.isBusy())return;form?.closePickers();overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');launch.focus();}
document.getElementById('veroCloseRiskDrawer').onclick=close;
overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
document.addEventListener('keydown',e=>{if(!overlay.classList.contains('open'))return;if(e.key==='Escape')close();if(e.key==='Tab'){const all=[...overlay.querySelectorAll('button,input,select,textarea,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);if(!all.length)return;const first=all[0],last=all[all.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
launch.onclick=()=>{if(!form||form.isBusy())return;overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');form.focus();};
(async()=>{try{const options=await api('/risk/central-creation-options');if(!options.can_create)return;launch.hidden=false;launch.disabled=!options.schema_ready;launch.title=options.schema_ready?'Create a live risk':'Risk assessment database update is required';if(!options.schema_ready)return;
 form=window.VeroRiskAssessmentForm.mount(host,{options,idPrefix:'central',onCancel:close,onBusy:value=>document.getElementById('veroCloseRiskDrawer').disabled=value,
 async onSubmit(body){if(!requestId)requestId=crypto.randomUUID();const result=await api('/risks/central',{...body,request_id:requestId});form.setStatus('Risk '+result.risk_id+' saved ('+result.risk_status+'). Refreshing the register…');window.location.reload();}});
}catch{launch.hidden=true;}})();
})();
