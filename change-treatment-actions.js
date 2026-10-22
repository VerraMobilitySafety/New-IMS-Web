/* Assignees complete only their own approved change actions; no register-wide access is granted. */
(()=>{'use strict';
const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
let dialog,busy=false;
function node(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;}
async function api(id,notes){const r=await fetch(API+'/changes/treatment-actions/'+encodeURIComponent(id),{method:notes===undefined?'GET':'POST',cache:'no-store',headers:{Authorization:'Bearer '+localStorage.getItem('vero_session_token'),'Content-Type':'application/json'},...(notes===undefined?{}:{body:JSON.stringify({notes})})});const d=await r.json();if(!r.ok)throw Error(d.message||'Unable to load this action.');return d.action;}
async function open(id){
 if(busy||!/^\d+$/.test(String(id)))return;
 if(!dialog){dialog=node('dialog',null,'action-edit-dialog');dialog.setAttribute('aria-label','Change treatment action');document.body.append(dialog);dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});}
 dialog.replaceChildren();const header=node('header'),heading=node('h2','Change treatment action'),close=node('button','×'),body=node('div',null,'action-edit-body'),status=node('p','Loading action…');close.type='button';close.setAttribute('aria-label','Close change action');close.onclick=()=>{if(!busy)dialog.close();};header.append(heading,close);body.append(status);dialog.append(header,body);if(!dialog.open)dialog.showModal();busy=true;
 try{render(await api(id));}catch(e){status.textContent=e.message;}finally{busy=false;}
 function render(action){
  heading.textContent=action.title;body.replaceChildren(node('p',action.risk_code+' · '+action.risk_title),node('p',action.risk_description),node('p',action.owner_name+' · Due '+action.due_date+' · '+action.status));
  if(action.completion_notes)body.append(node('p',action.completion_notes));
  if(!action.can_complete)return;
  const label=node('label','Completion notes'),notes=node('textarea'),complete=node('button','Mark completed','action-edit-primary'),feedback=node('p');notes.maxLength=20000;notes.rows=4;label.append(notes);complete.type='button';feedback.setAttribute('role','status');body.append(label,complete,feedback);
  complete.onclick=async()=>{if(busy)return;if(!notes.value.trim()){feedback.textContent='Completion notes are required.';notes.focus();return;}busy=true;complete.disabled=notes.disabled=close.disabled=true;feedback.textContent='Saving completion…';try{render(await api(id,notes.value.trim()));if(typeof loadActions==='function')await loadActions();}catch(e){feedback.textContent=e.message;}finally{busy=false;complete.disabled=notes.disabled=close.disabled=false;}};
 }
}
window.VeroChangeTreatment={open};
const requested=new URLSearchParams(location.search).get('change_treatment_id');if(requested)open(requested);
})();
