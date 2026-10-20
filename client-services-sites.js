'use strict';
const siteEl=id=>document.getElementById(id);
let allSites=[],sitePage=0,siteOptions={contracts:[],users:[]};
const siteEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function siteImpact(summary){
 if(!summary)return '<span class="site-muted">Unavailable</span>';
 if(!summary.total)return '<span class="site-muted">No linked events</span>';
 const labels=['No impact','Insignificant','Minor','Moderate','Major','Significant'],score=summary.highest_score;
 return (Number.isInteger(score)&&score>=0&&score<=5?'<span class="site-impact site-impact-'+score+'">'+labels[score]+'</span>':'<span class="site-muted">Unclassified</span>')+(summary.unclassified?'<small class="site-event-detail">'+summary.unclassified+' unclassified</small>':'');
}
function drawSites(){
 const query=siteEl('siteSearch').value.trim().toLowerCase(),contract=siteEl('siteContract').value,status=siteEl('siteStatus').value;
 const history=siteEl('siteEventFilter').value,sort=siteEl('siteSort').value;
 const sites=allSites.filter(s=>(!status||s.status===status)&&(!contract||(contract==='unlinked'?!s.contracts.length:s.contracts.some(c=>String(c.id)===contract)))&&(!history||(history==='reported'?s.event_summary?.total>0:history==='open'?s.event_summary?.open>0:s.event_summary?.total===0))&&(!query||[s.site_code,s.site_name,s.address,s.owner_name,...s.source_groups,...s.contracts.flatMap(c=>[c.code,c.name])].some(v=>String(v||'').toLowerCase().includes(query))));
 sites.sort((a,b)=>(sort==='events'?(b.event_summary?.total??-1)-(a.event_summary?.total??-1):sort==='open'?(b.event_summary?.open??-1)-(a.event_summary?.open??-1):sort==='impact'?(b.event_summary?.highest_score??-1)-(a.event_summary?.highest_score??-1):0)||a.site_code.localeCompare(b.site_code));
 const pages=Math.max(1,Math.ceil(sites.length/50));sitePage=Math.min(sitePage,pages-1);
 siteEl('siteRows').innerHTML=sites.slice(sitePage*50,sitePage*50+50).map(s=>'<tr><td><strong>'+siteEscape(s.site_code)+'</strong></td><td>'+siteEscape(s.site_name)+'</td><td class="site-event-count">'+(s.event_summary?'<strong>'+s.event_summary.total+'</strong><small class="site-event-detail">'+s.event_summary.recent+' in last 12 months</small>':'Unavailable')+'</td><td>'+(s.event_summary?s.event_summary.open:'�')+'</td><td>'+siteImpact(s.event_summary)+'</td><td class="site-event-date">'+siteEscape(s.event_summary?.last_date||'�')+'</td><td>'+siteEscape(s.address||'—')+'</td><td>'+(s.contracts.length?s.contracts.map(c=>'<a href="maintenance-workspace.html?id='+encodeURIComponent(c.id)+'">'+siteEscape(c.code)+' · '+siteEscape(c.name)+'</a>').join('<br>'):'<span class="site-unlinked">Awaiting contract link</span>')+'</td><td>'+siteEscape(s.source_groups.join(', ')||'—')+'</td><td><span class="pill">'+siteEscape(s.status)+'</span></td><td><button class="btn" data-site-edit="'+s.id+'" aria-label="Edit site '+siteEscape(s.site_code)+'">Edit</button></td></tr>').join('')||'<tr><td colspan="11">No sites match these filters.</td></tr>';
 siteEl('siteRows').querySelectorAll('[data-site-edit]').forEach(button=>button.onclick=()=>openSiteEditor(allSites.find(s=>String(s.id)===button.dataset.siteEdit)));
 siteEl('sitePrevious').disabled=sitePage===0;siteEl('siteNext').disabled=sitePage+1>=pages;
}
async function loadSites(){
 try{
  const token=localStorage.getItem('vero_session_token');if(!token){location.replace('login.html?return=client-services-sites.html');return;}
  const response=await fetch('https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api/client-services-sites',{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store'});
  if(response.status===401){location.replace('login.html?return=client-services-sites.html');return;}
  if(response.status===403){siteEl('siteMessage').textContent='Administrator access is required to view this page.';return;}
  if(!response.ok)throw Error('Unable to load the site list. Please retry.');
  const data=await response.json();allSites=data.sites||[];
  const contracts=new Map(allSites.flatMap(s=>s.contracts).map(c=>[c.id,c]));
  siteOptions={contracts:data.contracts||[...contracts.values()],users:data.users||[]};
  const previousContract=siteEl('siteContract').value;
  siteEl('siteContract').innerHTML='<option value="">All contracts</option><option value="unlinked">Awaiting contract link</option>'+[...contracts.values()].sort((a,b)=>a.code.localeCompare(b.code)).map(c=>'<option value="'+c.id+'">'+siteEscape(c.code+' · '+c.name)+'</option>').join('');
  if([...siteEl('siteContract').options].some(o=>o.value===previousContract))siteEl('siteContract').value=previousContract;
  siteEl('allSiteTotal').textContent=allSites.length.toLocaleString();siteEl('activeSiteTotal').textContent=allSites.filter(s=>s.status==='Active').length.toLocaleString();siteEl('unlinkedSiteTotal').textContent=allSites.filter(s=>!s.contracts.length).length.toLocaleString();
  siteEl('siteRegister').hidden=false;siteEl('siteMessage').textContent='';drawSites();return true;
 }catch(e){siteEl('siteMessage').textContent=e.message;siteEl('siteRetry').hidden=false;}
}
for(const id of ['siteSearch','siteContract','siteStatus','siteEventFilter','siteSort'])siteEl(id).addEventListener(id==='siteSearch'?'input':'change',()=>{sitePage=0;drawSites();});
siteEl('sitePrevious').onclick=()=>{sitePage--;drawSites();};siteEl('siteNext').onclick=()=>{sitePage++;drawSites();};siteEl('siteRetry').onclick=()=>{siteEl('siteRetry').hidden=true;void loadSites();};
siteEl('siteAdd').onclick=()=>openSiteEditor(null);

function openSiteEditor(site){
 let dialog=document.getElementById('globalSiteDialog');if(dialog)dialog.remove();dialog=document.createElement('dialog');dialog.id='globalSiteDialog';dialog.className='contract-site-dialog';document.body.append(dialog);
 const links=site?.contracts||[],available=siteOptions.contracts.filter(c=>!links.some(link=>link.id===c.id));
 const users=[...siteOptions.users];if(site?.owner_user_id&&!users.some(u=>u.id===site.owner_user_id))users.push({id:site.owner_user_id,name:(site.owner_name||'Saved responsible person')+' (inactive — choose an active person or unassign)'});
 dialog.innerHTML='<form><h2>'+(site?'Edit Site':'Add Site')+'</h2><p class="note">'+(site?'Changes update this shared site wherever it is used. Existing contract links are retained.':'Create a site in the shared register. You can link a contract now or leave it unlinked.')+'</p>'+(links.length?'<p class="note"><strong>Linked contracts:</strong> '+links.map(c=>siteEscape(c.code+' · '+c.name)).join('; ')+'</p>':'')+'<div class="fields"><label>Site reference<input name="site_code" maxlength="80" required></label><label>Site name<input name="site_name" maxlength="250" required></label><label class="full">Address<textarea name="address" maxlength="2000" rows="3"></textarea></label><label>Status<select name="status" aria-label="Site status"><option>Active</option><option>Inactive</option></select></label><label>Responsible person<select name="owner_user_id" aria-label="Responsible person"><option value="">Unassigned</option>'+users.map(u=>'<option value="'+u.id+'">'+siteEscape(u.name)+'</option>').join('')+'</select></label><label class="full">'+(site?'Add contract link':'Link to contract')+'<select name="contract_id" aria-label="Link to contract"><option value="">'+(site?'No additional link':'Leave unlinked')+'</option>'+available.map(c=>'<option value="'+c.id+'">'+siteEscape(c.code+' · '+c.name)+'</option>').join('')+'</select></label><label class="full">Notes<textarea name="notes" maxlength="10000" rows="3"></textarea></label></div><p role="alert" id="globalSiteError"></p><div class="dialog-actions"><button type="button" id="globalSiteCancel">Cancel</button><button type="submit" class="primary">'+(site?'Save Changes':'Add Site')+'</button></div></form>';
 const form=dialog.querySelector('form');if(site)for(const key of ['site_code','site_name','address','status','owner_user_id','notes'])form.elements[key].value=site[key]??'';
 let requestId=crypto.randomUUID(),lastFingerprint=null;
 dialog.querySelector('#globalSiteCancel').onclick=()=>dialog.close();
 form.onsubmit=async event=>{
  event.preventDefault();if(!form.reportValidity())return;
  const data=Object.fromEntries(new FormData(form));data.owner_user_id=data.owner_user_id?Number(data.owner_user_id):null;data.contract_id=data.contract_id?Number(data.contract_id):null;
  if(site)data.version=site.version;
  const fingerprint=JSON.stringify(data);if(lastFingerprint!==null&&lastFingerprint!==fingerprint)requestId=crypto.randomUUID();lastFingerprint=fingerprint;if(!site)data.request_id=requestId;
  const buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);dialog.querySelector('#globalSiteError').textContent='';
  try{
   const token=localStorage.getItem('vero_session_token');if(!token)throw Error('Please sign in again before saving.');
   const response=await fetch('https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api/client-services-sites'+(site?'/'+site.id:''),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(data)});
   const result=await response.json();if(!response.ok)throw Error(result.message||'Unable to save this site. Please retry.');
   dialog.close();sitePage=0;siteEl('siteSearch').value=result.site.site_code;siteEl('siteContract').value='';siteEl('siteStatus').value='';siteEl('siteEventFilter').value='';
   if(await loadSites())siteEl('siteMessage').textContent=(site?'Site updated.':'Site created.')+(data.contract_id?' Contract linked.':'');
   else siteEl('siteMessage').textContent='Site saved. Retry loading sites to refresh the list.';
  }catch(error){dialog.querySelector('#globalSiteError').textContent=error.message;}
  finally{buttons.forEach(b=>b.disabled=false);}
 };
 dialog.showModal();
}


