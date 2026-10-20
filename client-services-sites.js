'use strict';
const siteEl=id=>document.getElementById(id);
let allSites=[],sitePage=0;
const siteEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function drawSites(){
 const query=siteEl('siteSearch').value.trim().toLowerCase(),contract=siteEl('siteContract').value,status=siteEl('siteStatus').value;
 const sites=allSites.filter(s=>(!status||s.status===status)&&(!contract||(contract==='unlinked'?!s.contracts.length:s.contracts.some(c=>String(c.id)===contract)))&&(!query||[s.site_code,s.site_name,s.address,s.owner_name,...s.source_groups,...s.contracts.flatMap(c=>[c.code,c.name])].some(v=>String(v||'').toLowerCase().includes(query))));
 const pages=Math.max(1,Math.ceil(sites.length/50));sitePage=Math.min(sitePage,pages-1);
 siteEl('siteCount').textContent=sites.length.toLocaleString()+' of '+allSites.length.toLocaleString()+' sites · Page '+(sitePage+1)+' of '+pages;
 siteEl('siteRows').innerHTML=sites.slice(sitePage*50,sitePage*50+50).map(s=>'<tr><td><strong>'+siteEscape(s.site_code)+'</strong></td><td>'+siteEscape(s.site_name)+'</td><td>'+siteEscape(s.address||'—')+'</td><td>'+(s.contracts.length?s.contracts.map(c=>'<a href="maintenance-workspace.html?id='+encodeURIComponent(c.id)+'">'+siteEscape(c.code)+' · '+siteEscape(c.name)+'</a>').join('<br>'):'<span class="site-unlinked">Awaiting contract link</span>')+'</td><td>'+siteEscape(s.source_groups.join(', ')||'—')+'</td><td><span class="pill">'+siteEscape(s.status)+'</span></td></tr>').join('')||'<tr><td colspan="6">No sites match these filters.</td></tr>';
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
  siteEl('siteContract').innerHTML='<option value="">All contracts</option><option value="unlinked">Awaiting contract link</option>'+[...contracts.values()].sort((a,b)=>a.code.localeCompare(b.code)).map(c=>'<option value="'+c.id+'">'+siteEscape(c.code+' · '+c.name)+'</option>').join('');
  siteEl('allSiteTotal').textContent=allSites.length.toLocaleString();siteEl('activeSiteTotal').textContent=allSites.filter(s=>s.status==='Active').length.toLocaleString();siteEl('unlinkedSiteTotal').textContent=allSites.filter(s=>!s.contracts.length).length.toLocaleString();
  siteEl('siteRegister').hidden=false;siteEl('siteMessage').textContent='';drawSites();
 }catch(e){siteEl('siteMessage').textContent=e.message;siteEl('siteRetry').hidden=false;}
 finally{window.VeroPageLoader?.ready('maintenance');}
}
for(const id of ['siteSearch','siteContract','siteStatus'])siteEl(id).addEventListener(id==='siteSearch'?'input':'change',()=>{sitePage=0;drawSites();});
siteEl('sitePrevious').onclick=()=>{sitePage--;drawSites();};siteEl('siteNext').onclick=()=>{sitePage++;drawSites();};siteEl('siteRetry').onclick=()=>{siteEl('siteRetry').hidden=true;void loadSites();};
void loadSites();
