/* Contract sites and links to the shared formal incident workflow. */
(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let activeLoad=0;
const incidentURL=(c,site)=>'incident-management.html?'+new URLSearchParams({view:'report',contract_id:c.id,...(site?{site_id:site.id}:{})});
function heading(el,title,button,label){el.innerHTML='<div class="contract-activity-head"><div><h3>'+title+'</h3></div>'+ (button?'<button class="primary" id="contractActivityAdd">'+label+'</button>':'')+'</div>';}
function failure(el,error,retry){el.innerHTML='<p role="alert"></p><button type="button">Retry</button>';el.querySelector('p').textContent=error.message;el.querySelector('button').onclick=retry;}
async function sites(c,el,request){
 const load=++activeLoad;el.textContent='Loading contract sites…';
 try{const data=await request('/maintenance-contracts/'+c.id+'/sites');if(load!==activeLoad||!document.querySelector('[data-tab="Sites"].active'))return;
 heading(el,'Contract sites',data.can_manage,'+ Add Site');
 const list=document.createElement('div');list.className='contract-site-grid';el.append(list);
 list.innerHTML=data.sites.map(s=>'<article class="contract-site-card"><div class="contract-activity-head"><h4>'+esc(s.site_name)+'</h4><span class="pill">'+esc(s.status)+'</span></div><p><strong>'+esc(s.site_code)+'</strong></p><p>'+esc(s.address||'No address recorded')+'</p>'+(s.notes?'<p>'+esc(s.notes)+'</p>':'')+'<div class="contract-site-actions">'+(data.can_manage?'<button data-edit-site="'+s.id+'">Edit Site</button>':'')+'<a class="contract-event-link" href="'+incidentURL(c,s)+'">Report Event</a></div></article>').join('')||'<p class="empty">No sites have been added to this contract.</p>';
 if(data.can_manage){el.querySelector('#contractActivityAdd').onclick=()=>siteForm(c,null,data.users,request,()=>sites(c,el,request));el.querySelectorAll('[data-edit-site]').forEach(b=>b.onclick=()=>siteForm(c,data.sites.find(s=>String(s.id)===b.dataset.editSite),data.users,request,()=>sites(c,el,request)));}
 }catch(error){if(load===activeLoad&&document.querySelector('[data-tab="Sites"].active'))failure(el,error,()=>sites(c,el,request));}
}
function siteForm(c,site,users,request,refresh){
 let dialog=document.getElementById('contractSiteDialog');if(dialog)dialog.remove();dialog=document.createElement('dialog');dialog.id='contractSiteDialog';dialog.className='contract-site-dialog';document.body.append(dialog);const key=crypto.randomUUID();let attempted=false;
 dialog.innerHTML='<form><h2>'+ (site?'Edit Site':'Add Site')+'</h2><p class="note">'+esc(c.contract_name)+' · '+esc(c.contract_code)+'</p><div class="fields"><label>Site reference<input name="site_code" maxlength="80" required></label><label>Site name<input name="site_name" maxlength="250" required></label><label class="full">Address<textarea name="address" maxlength="2000" rows="3"></textarea></label><label>Status<select name="status"><option>Active</option><option>Inactive</option></select></label><label>Responsible person<select name="owner_user_id"><option value="">Unassigned</option>'+users.map(u=>'<option value="'+u.id+'">'+esc(u.name)+'</option>').join('')+'</select></label><label class="full">Notes<textarea name="notes" maxlength="10000" rows="4"></textarea></label></div><p role="alert" id="siteSaveError"></p><div class="dialog-actions"><button type="button" id="cancelSite">Cancel</button><button type="submit" class="primary">'+(site?'Save Changes':'Add Site')+'</button></div></form>';
 const form=dialog.querySelector('form');if(site)for(const key of ['site_code','site_name','address','status','owner_user_id','notes'])form.elements[key].value=site[key]??'';
 dialog.querySelector('#cancelSite').onclick=()=>dialog.close();
 form.addEventListener('input',()=>{attempted=false;});let requestId=key;
 form.onsubmit=async event=>{event.preventDefault();if(!form.reportValidity())return;if(attempted===false&&form.dataset.attempted)requestId=crypto.randomUUID();attempted=true;form.dataset.attempted='true';const buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);dialog.querySelector('#siteSaveError').textContent='';const fd=new FormData(form),payload=Object.fromEntries(fd);payload.owner_user_id=payload.owner_user_id?Number(payload.owner_user_id):null;if(site)payload.version=site.version;else payload.request_id=requestId;
 try{await request('/maintenance-contracts/'+c.id+'/sites'+(site?'/'+site.id:''),{method:'POST',body:JSON.stringify(payload)});dialog.close();await refresh();}catch(error){dialog.querySelector('#siteSaveError').textContent=error.message;}finally{buttons.forEach(b=>b.disabled=false);}};
 dialog.showModal();
}
async function events(c,el,request){
 const load=++activeLoad;el.textContent='Loading contract events…';
 try{const data=await request('/maintenance-contracts/'+c.id+'/events');if(load!==activeLoad||!document.querySelector('[data-tab="Events"].active'))return;
 heading(el,'Contract events',false);el.querySelector('.contract-activity-head').insertAdjacentHTML('beforeend','<a class="contract-event-link" href="'+incidentURL(c)+'">+ Report Event</a>');
 const intro=document.createElement('p');intro.className='note';intro.textContent='Formal incidents, near misses and hazards linked to this contract. Your Event Management access applies.';el.append(intro);
 const list=document.createElement('div');list.className='contract-event-list';el.append(list);
 list.innerHTML=(data.events||[]).map(e=>'<article class="contract-site-card"><h4><a href="incident-management.html?event='+encodeURIComponent(e.id)+'">'+esc(e.report.description)+'</a></h4><p>'+esc(e.report.classification.summary)+' · '+esc(e.status)+'</p><p>'+esc(e.report.occurred_date)+' · '+esc(e.report.reference_name||e.report.address||e.report.location)+'</p></article>').join('')||'<p class="empty">No accessible events are linked to this contract.</p>';
 }catch(error){if(load===activeLoad&&document.querySelector('[data-tab="Events"].active'))failure(el,error,()=>events(c,el,request));}
}
window.VeroContractActivity={sites,events};
})();
