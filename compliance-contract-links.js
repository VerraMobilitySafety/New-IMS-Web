/* Contract-specific clauses remain attached to one central requirement. */
(()=>{
 const original=window.openLiveObligation;
 if(typeof original!=='function')return;
 const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let requestNumber=0;
 window.openLiveObligation=async function(id){
  const current=++requestNumber;
  document.getElementById('customerContractRequirements')?.remove();
  const result=await original.apply(this,arguments);
  if(current!==requestNumber)return result;
  const anchor=document.getElementById('detailDescription')?.closest('.section');if(!anchor)return result;
  const section=document.createElement('div');section.id='customerContractRequirements';section.className='section compliance-section';section.textContent='Loading linked customer contracts…';anchor.after(section);
  try{
   const r=await fetch(COMPLIANCE_API+'/compliance/obligations/'+encodeURIComponent(id)+'/contracts',{headers:complianceAuthHeaders(),cache:'no-store'});
   if(!r.ok)throw Error('Unable to load linked customer contracts.');const d=await r.json();
   if(current!==requestNumber)return result;
   if(!d.contracts?.length){section.remove();return result;}
   section.innerHTML='<h3>Customer contract requirements</h3><p>Timing, conditions and source clauses for each linked customer contract. Actual compliance has not been assessed.</p>'+d.contracts.map(c=>'<details><summary><b>'+escape(c.code)+' · '+escape(c.name)+'</b> · '+c.activities.length+' details</summary><p><a href="maintenance-management.html?contract_id='+c.id+'">Open contract and source files</a></p>'+c.activities.map(a=>'<article><p><b>'+escape(a.verra_action)+'</b></p><p><strong>When:</strong> '+escape(a.timing_or_trigger)+'</p><p><strong>Conditions:</strong> '+escape(a.conditions_and_exceptions)+'</p><p>'+escape(a.clause_reference)+' · PDF pages '+escape(a.pdf_pages.join(', '))+'</p></article>').join('')+'</details>').join('');
  }catch(e){if(current===requestNumber)section.textContent=e.message;}
  return result;
 };
 const id=new URLSearchParams(location.search).get('obligation_id');
 if(id&&/^\d+$/.test(id))window.openLiveObligation(Number(id));
})();

