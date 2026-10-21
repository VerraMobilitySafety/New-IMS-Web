/* Follow VERO's existing signed-in session convention. No AI service or record writes. */
(()=>{'use strict';
const content=document.getElementById('vh'),status=document.getElementById('heights-auth-status'),menu=document.getElementById('heights-menu');
content.hidden=true;
menu.addEventListener('click',()=>{const open=document.body.classList.toggle('vr-nav-open');menu.setAttribute('aria-expanded',String(open));});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.body.classList.remove('vr-nav-open');menu.setAttribute('aria-expanded','false');}});
const login=()=>location.replace('login.html?return='+encodeURIComponent(location.pathname.split('/').pop()||'continual-improvement-management.html'));
const account=document.getElementById('veroAccount'),trigger=document.getElementById('veroAccountTrigger');
trigger.addEventListener('click',e=>{e.stopPropagation();trigger.setAttribute('aria-expanded',String(account.classList.toggle('open')));});
document.addEventListener('click',e=>{if(!account.contains(e.target)){account.classList.remove('open');trigger.setAttribute('aria-expanded','false');}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){account.classList.remove('open');trigger.setAttribute('aria-expanded','false');}});
document.getElementById('veroAccountSignOut').addEventListener('click',async()=>{const token=localStorage.getItem('vero_session_token');try{if(token)await fetch('https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+token}});}catch{}localStorage.removeItem('vero_session_token');localStorage.removeItem('vero_current_user');location.replace('login.html');});
async function load(){const token=localStorage.getItem('vero_session_token');if(!token){login();return;}
try{const response=await fetch('https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api/auth/me',{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store'});
if(response.status===401||response.status===403){login();return;}if(!response.ok)throw Error('Session check unavailable');const data=await response.json(),user=data.user||data;const name=[user.first_name,user.last_name].filter(Boolean).join(' ')||user.email||'Signed in user';document.getElementById('veroAccountName').textContent=name;document.getElementById('veroAccountFullName').textContent=name;document.getElementById('veroAccountEmail').textContent=user.email||'';document.getElementById('veroAccountAvatar').textContent=((user.first_name||'').charAt(0)+(user.last_name||'').charAt(0)).toUpperCase()||'U';document.getElementById('veroUserManagement').style.display=user.vero_role==='Administrator'?'flex':'none';content.hidden=false;status.hidden=true;window.dispatchEvent(new Event('vero-risk-auth-ready'));
}catch{window.dispatchEvent(new Event('vero-risk-resources-settled'));status.replaceChildren(document.createTextNode('Unable to check your session. '));const retry=document.createElement('button');retry.textContent='Try again';retry.onclick=load;status.append(retry);}finally{window.dispatchEvent(new Event('vero-risk-auth-settled'));}}
load();
})();
