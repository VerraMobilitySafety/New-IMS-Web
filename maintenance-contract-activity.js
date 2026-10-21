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
 const note=document.createElement('p');note.className='note';note.textContent='Sites from the shared site register linked to this contract.';el.append(note);
 if(data.can_manage){const link=document.createElement('button');link.textContent='+ Link Existing Site';link.className='contract-link-site';link.onclick=()=>linkSiteForm(c,data.available_sites||[],request,()=>sites(c,el,request));el.querySelector('.contract-activity-head').append(link);}
 const search=document.createElement('input');search.type='search';search.placeholder='Search site reference, name or address';search.setAttribute('aria-label','Search contract sites');search.style.cssText='width:100%;margin:12px 0;padding:12px';el.append(search);
 const count=document.createElement('p');count.className='note';el.append(count);
 const list=document.createElement('div');list.className='contract-site-table-wrap';el.append(list);
 const pager=document.createElement('div');pager.className='contract-site-actions';el.append(pager);let page=0;
 const draw=()=>{const q=search.value.trim().toLowerCase(),filtered=data.sites.filter(s=>[s.site_code,s.site_name,s.address,s.notes].some(v=>String(v||'').toLowerCase().includes(q)));page=Math.min(page,Math.max(0,Math.ceil(filtered.length/50)-1));count.textContent=filtered.length+' of '+data.sites.length+' sites · Page '+(page+1)+' of '+Math.max(1,Math.ceil(filtered.length/50));
 list.innerHTML='<table class="contract-site-table"><thead><tr><th scope="col">Reference</th><th scope="col">Site</th><th scope="col">Address</th><th scope="col">Status</th>'+(data.can_manage?'<th scope="col">Actions</th>':'')+'</tr></thead><tbody>'+filtered.slice(page*50,page*50+50).map(s=>'<tr><td class="site-reference">'+esc(s.site_code)+'</td><td>'+esc(s.site_name)+'<br><a href="documents.html?'+new URLSearchParams({category:'Operational',link_type:'Site',link_value:s.id,link_label:s.site_name})+'">Documents</a></td><td>'+esc(s.address||'—')+'</td><td><span class="pill">'+esc(s.status)+'</span></td>'+(data.can_manage?'<td><button data-edit-site="'+s.id+'" aria-label="Edit site '+esc(s.site_code)+'">Edit</button></td>':'')+'</tr>').join('')+(filtered.length?'':'<tr><td colspan="'+(data.can_manage?5:4)+'" class="empty">No sites match this search.</td></tr>')+'</tbody></table>';
 if(data.can_manage)list.querySelectorAll('[data-edit-site]').forEach(b=>b.onclick=()=>siteForm(c,data.sites.find(s=>String(s.id)===b.dataset.editSite),data.users,request,()=>sites(c,el,request)));
 pager.replaceChildren();for(const [label,delta,disabled] of [['Previous',-1,page===0],['Next',1,(page+1)*50>=filtered.length]]){const b=document.createElement('button');b.textContent=label;b.disabled=disabled;b.onclick=()=>{page+=delta;draw();search.focus();};pager.append(b);}};
 search.oninput=()=>{page=0;draw();};draw();
 if(data.can_manage)el.querySelector('#contractActivityAdd').onclick=()=>siteForm(c,null,data.users,request,()=>sites(c,el,request));
 }catch(error){if(load===activeLoad&&document.querySelector('[data-tab="Sites"].active'))failure(el,error,()=>sites(c,el,request));}
}
function linkSiteForm(c,available,request,refresh){
 let dialog=document.getElementById('contractSiteDialog');if(dialog)dialog.remove();dialog=document.createElement('dialog');dialog.id='contractSiteDialog';dialog.className='contract-site-dialog';document.body.append(dialog);
 dialog.innerHTML='<form><h2>Link Existing Site</h2><p class="note">'+esc(c.contract_name)+' · Choose a site from the shared register.</p>'+(available.length?'<label>Find site<input type="search" name="search" placeholder="Search reference or site name"></label><label>Site<select name="existing_site_id" aria-label="Site" size="6" required></select></label>':'<p>No unlinked sites are available. Use Add Site to create a site in the shared register.</p>')+'<p role="alert" id="siteSaveError"></p><div class="dialog-actions"><button type="button" id="cancelSite">Cancel</button>'+(available.length?'<button type="submit" class="primary">Link Site</button>':'')+'</div></form>';
 const form=dialog.querySelector('form');let requestId=crypto.randomUUID(),attempted=false;
 if(available.length){const select=form.elements.existing_site_id,filter=form.elements.search;const draw=()=>{const previous=select.value,q=filter.value.trim().toLowerCase();select.innerHTML=available.filter(s=>(s.site_code+' '+s.site_name).toLowerCase().includes(q)).map(s=>'<option value="'+s.id+'">'+esc(s.site_code+' · '+s.site_name)+'</option>').join('');if([...select.options].some(o=>o.value===previous))select.value=previous;else select.selectedIndex=-1;};filter.oninput=draw;select.onchange=()=>{if(attempted)requestId=crypto.randomUUID();attempted=false;};draw();
 form.onsubmit=async event=>{event.preventDefault();if(!form.reportValidity())return;attempted=true;const buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);dialog.querySelector('#siteSaveError').textContent='';try{await request('/maintenance-contracts/'+c.id+'/sites',{method:'POST',body:JSON.stringify({existing_site_id:Number(select.value),request_id:requestId})});dialog.close();await refresh();}catch(error){dialog.querySelector('#siteSaveError').textContent=error.message;}finally{buttons.forEach(b=>b.disabled=false);}};}
 dialog.querySelector('#cancelSite').onclick=()=>dialog.close();dialog.showModal();
}
function siteForm(c,site,users,request,refresh){
 let dialog=document.getElementById('contractSiteDialog');if(dialog)dialog.remove();dialog=document.createElement('dialog');dialog.id='contractSiteDialog';dialog.className='contract-site-dialog';document.body.append(dialog);const key=crypto.randomUUID();let attempted=false;
 dialog.innerHTML='<form><h2>'+ (site?'Edit Site':'Add Site')+'</h2><p class="note">'+esc(c.contract_name)+' · '+esc(c.contract_code)+'</p><div class="fields"><label>Site reference<input name="site_code" maxlength="80" required></label><label>Site name<input name="site_name" maxlength="250" required></label><label class="full">Address<textarea name="address" maxlength="2000" rows="3"></textarea></label><label>Status<select name="status" aria-label="Status"><option>Active</option><option>Inactive</option></select></label><label>Responsible person<select name="owner_user_id" aria-label="Responsible person"><option value="">Unassigned</option>'+users.map(u=>'<option value="'+u.id+'">'+esc(u.name)+'</option>').join('')+'</select></label><label class="full">Notes<textarea name="notes" maxlength="10000" rows="4"></textarea></label></div><p role="alert" id="siteSaveError"></p><div class="dialog-actions"><button type="button" id="cancelSite">Cancel</button><button type="submit" class="primary">'+(site?'Save Changes':'Add Site')+'</button></div></form>';
 const form=dialog.querySelector('form');if(site)for(const key of ['site_code','site_name','address','status','owner_user_id','notes'])form.elements[key].value=site[key]??'';
 const shared=document.createElement('p');shared.className='note';shared.textContent=site?(site.linked_contract_count>1?'This site is linked to '+site.linked_contract_count+' contracts. Changes apply to the shared site.':'Changes update this site in the shared register.'):'The new site will be saved to the shared register and linked to this contract.';form.querySelector('.fields').before(shared);
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
