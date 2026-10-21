/* Site identity owns its assessments independently of contract links. */
(()=>{'use strict';
const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
const el=id=>document.getElementById(id),id=Number(new URLSearchParams(location.search).get('id'));
let site=null,reviewVersion=0;
const node=(tag,value)=>{const n=document.createElement(tag);if(value!=null)n.textContent=String(value);return n;};
async function apiFetch(url,options={}){return fetch(url,{...options,headers:{Authorization:'Bearer '+localStorage.getItem('vero_session_token'),Accept:'application/json',...options.headers},cache:'no-store'});}
async function read(path){const response=await apiFetch(API+path);const data=await response.json();if(!response.ok)throw Error(data.message||'Unable to load this site.');return data;}
function create(submission){window.VeroSiteRiskCreator.open({site,submission,apiBase:API,apiFetch,onSaved:async result=>{el('siteRiskStatus').textContent='Assessment submitted for independent Risk Officer review.';await load();await openReview(result.risk_id);}});}
async function openReview(riskId){
 const ticket=++reviewVersion,host=el('siteRiskReviewBody');el('siteRiskReview').hidden=false;host.textContent='Loading assessment…';
 try{const data=await window.VeroSiteRiskSubmission.load(riskId);if(ticket!==reviewVersion)return;
  if(Number(data.submission?.site_id)!==id)throw Error('This assessment belongs to a different site.');
  window.VeroSiteRiskSubmission.render(host,data,{isCurrent:()=>ticket===reviewVersion,onSaved:load,onRevise:create});
  el('siteRiskReview').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(error){if(ticket===reviewVersion)host.textContent=error.message;}
}
async function load(){
 const data=await read('/client-services-sites/'+id+'/workspace');site=data.site;
 el('siteTitle').textContent=site.site_name;el('siteSubtitle').textContent=site.site_code+' · '+site.status;
 const details=el('siteDetails');details.replaceChildren();
 for(const [label,value] of [['Reference',site.site_code],['Address',site.address||'Not recorded'],['Responsible person',site.owner_name||'Unassigned'],['Linked contracts',(site.contracts||[]).map(c=>c.code+' · '+c.name).join('; ')||'No contract linked'],['Notes',site.notes||'Not recorded']])details.append(node('dt',label),node('dd',value));
 el('siteAssess').hidden=!data.can_submit;el('siteWorkspace').hidden=false;el('siteWorkspaceStatus').textContent='';
 const rows=el('siteRiskRows');rows.replaceChildren();
 for(const risk of data.risks||[]){const row=node('tr');
  const score=risk.residual_likelihood&&risk.residual_impact?window.VeroSiteRiskSubmission.score(risk.residual_likelihood,risk.residual_impact):'Not assessed';
  for(const value of [risk.risk_code,risk.risk_title,risk.approval_state,score,risk.next_review_date||'Not set'])row.append(node('td',value));
  if(risk.approval_state==='Approved'){const link=node('a',risk.risk_code);link.href='risk.html?risk_id='+encodeURIComponent(risk.id);link.title='Open in Risk Register';row.firstElementChild.replaceChildren(link);}
  const cell=node('td'),button=node('button','Open assessment');button.type='button';button.onclick=()=>openReview(risk.id);cell.append(button);row.append(cell);rows.append(row);
 }
 if(!rows.children.length){const row=node('tr'),cell=node('td','No risk assessments recorded for this site.');cell.colSpan=6;row.append(cell);rows.append(row);}
}
el('siteAssess').onclick=()=>create(null);
el('siteReviewClose').onclick=()=>{reviewVersion++;el('siteRiskReview').hidden=true;};
(async()=>{try{
 if(!Number.isSafeInteger(id)||id<=0)throw Error('Choose a valid site from the Client Services Site List.');
 if(!localStorage.getItem('vero_session_token')){location.replace('login.html?return='+encodeURIComponent('client-services-site.html?id='+id));return;}
 await load();const riskId=Number(new URLSearchParams(location.search).get('risk_id'));if(Number.isSafeInteger(riskId)&&riskId>0)await openReview(riskId);
}catch(error){el('siteWorkspaceStatus').textContent=error.message;const retry=node('button','Retry');retry.onclick=()=>location.reload();el('siteWorkspaceStatus').append(' ',retry);}
finally{window.VeroPageLoader?.ready('maintenance');}})();
})();
