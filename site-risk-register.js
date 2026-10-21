/* Preserve navigation back to the site that owns the approved assessment. */
(()=>{
 let generation=0;
 document.addEventListener('vero-risk-open-details',async event=>{
  const ticket=++generation,riskId=event.detail.risk.id;
  try{const response=await fetch('https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api/risks/'+encodeURIComponent(riskId)+'/site-submission',{headers:{Authorization:'Bearer '+localStorage.getItem('vero_session_token')},cache:'no-store'});
   if(!response.ok||ticket!==generation)return;const data=await response.json();if(!data.submission?.site_id)return;
   const host=document.getElementById('veroRiskDetailsContent');if(!host)return;
   const add=()=>{if(ticket!==generation||host.querySelector('[data-site-risk-origin]'))return;const card=document.createElement('section');card.className='vero-risk-details-card';card.dataset.siteRiskOrigin='true';const link=document.createElement('a');link.textContent='Open site assessment and approval history';link.href='client-services-site.html?'+new URLSearchParams({id:String(data.submission.site_id),risk_id:String(riskId)});card.append(link);host.prepend(card);};
   const observer=new MutationObserver(add);observer.observe(host,{childList:true});add();setTimeout(()=>observer.disconnect(),15000);
  }catch{/* Ordinary master risks have no site submission. */}
 });
 document.addEventListener('vero-risk-details-close',()=>generation++);
 document.addEventListener('vero-risk-operational-tab',event=>{
  if(event.detail.tab!=='applicability')return;
  const host=document.getElementById('veroRiskDetailsContent');if(!host)return;
  const observer=new MutationObserver(()=>{
   for(const row of host.querySelectorAll('.vero-risk-details-card>div')){
    if(row.dataset.siteLinked)continue;
    const match=row.textContent.match(/Site · Record (\d+)/);if(!match)continue;
    row.dataset.siteLinked='true';const link=document.createElement('a');link.textContent='Open site and assessments';link.href='client-services-site.html?'+new URLSearchParams({id:match[1],risk_id:String(event.detail.risk.id)});row.append(link);
   }
  });
  observer.observe(host,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),15000);
 });
})();
