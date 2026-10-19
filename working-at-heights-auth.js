/* Follow VERO's existing signed-in session convention. No AI service or record writes. */
(()=>{'use strict';
const content=document.getElementById('vh'),status=document.getElementById('heights-auth-status'),menu=document.getElementById('heights-menu');
content.hidden=true;
menu.addEventListener('click',()=>{const open=document.body.classList.toggle('heights-nav-open');menu.setAttribute('aria-expanded',String(open));});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.body.classList.remove('heights-nav-open');menu.setAttribute('aria-expanded','false');}});
const login=()=>location.replace('login.html?return='+encodeURIComponent('working-at-heights.html'));
async function load(){const token=localStorage.getItem('vero_session_token');if(!token){login();return;}
try{const response=await fetch('https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api/auth/me',{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store'});
if(response.status===401||response.status===403){login();return;}if(!response.ok)throw Error('Session check unavailable');const data=await response.json(),user=data.user||data;document.getElementById('heights-user').textContent=[user.first_name,user.last_name].filter(Boolean).join(' ')||'Signed in';content.hidden=false;status.hidden=true;
}catch{status.replaceChildren(document.createTextNode('Unable to check your session. '));const retry=document.createElement('button');retry.textContent='Try again';retry.onclick=load;status.append(retry);}}
load();
})();
