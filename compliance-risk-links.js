/* Dedicated routing editor. No assessment creation or requirement-field writes. */
(()=>{'use strict';
 const modal=document.createElement('div');modal.id='complianceRiskLinksModal';modal.className='modal-back';
 modal.innerHTML=`<div class="drawer compliance-requirement-drawer" role="dialog" aria-modal="true" aria-labelledby="riskLinksHeading">
  <div class="drawer-head"><div><p>COMPLIANCE REQUIREMENT</p><h2 id="riskLinksHeading">Edit Risk Links</h2></div><button class="btn outline" id="riskLinksClose" aria-label="Close Risk Links">Close</button></div>
  <div class="drawer-body"><p id="riskLinksRequirement"></p><p>Save parent areas without creating a formal assessment. Status, owner, review dates and assessment history stay unchanged.</p>
   <section id="riskLinksFields"></section><p>Select at least one parent area. Clearing all links is not supported. Saving an unchanged selection records a new audit revision to reaffirm the links.</p>
   <div class="field"><label for="riskLinksReason">Reason for change</label><textarea id="riskLinksReason" maxlength="2000" rows="3"></textarea></div>
   <p id="riskLinksMessage" role="status" aria-live="polite"></p>
  </div><div class="drawer-actions"><button class="btn outline" id="riskLinksReload">Reload saved links</button><button class="btn green" id="riskLinksSave" disabled>Save Risk Links</button></div></div>`;
 document.body.append(modal);
 const $=id=>document.getElementById(id);
 const button=document.createElement('button');button.id='complianceRiskLinksButton';button.className='btn outline';button.textContent='Edit Risk Links';
 $('complianceReviewButton').after(button);
 let generation=0,oid=null,view=null,busy=false;
 const active=(token,id)=>token===generation&&id===oid&&Number(currentLiveObligationId)===id&&modal.classList.contains('show');
 const message=text=>{$('riskLinksMessage').textContent=text;};
 function render(options){
  view=options.available?VeroComplianceParentRouting.mount($('riskLinksFields'),options,{prefix:'links'}):null;
  if(!view)$('riskLinksFields').textContent=options.reason||'Risk Links are unavailable.';
  $('riskLinksSave').disabled=!view;
 }
 async function load(){
  const token=++generation,id=oid;view=null;busy=false;$('riskLinksSave').disabled=true;
  $('riskLinksReload').disabled=false;$('riskLinksFields').textContent='Loading saved Risk Links…';message('');
  try{const options=await complianceRiskRequest('/compliance/obligations/'+id+'/risk-links',{cache:'no-store'});if(active(token,id))render(options);}
  catch(error){if(active(token,id)){$('riskLinksFields').textContent='';message(error.message);}}
 }
 window.openComplianceRiskLinks=()=>{
  oid=Number(currentLiveObligationId);if(!Number.isSafeInteger(oid)||oid<=0)return;
  $('riskLinksRequirement').textContent=$('obligationTitle').textContent;
  $('riskLinksReason').value='';modal.classList.add('show');load();$('riskLinksClose').focus();
 };
 button.onclick=window.openComplianceRiskLinks;
 $('riskLinksClose').onclick=()=>closeModal(modal.id);
 modal.onclick=event=>{if(event.target===modal)closeModal(modal.id);};
 modal.addEventListener('keydown',event=>{if(event.key==='Escape')closeModal(modal.id);});
 const close=complianceRiskHandleClose;
 complianceRiskHandleClose=function(id){close(id);if(id===modal.id||id==='obligationModal'){generation++;oid=null;view=null;busy=false;modal.classList.remove('show');$('riskLinksSave').disabled=true;}};
 $('riskLinksReload').onclick=()=>{if(!busy){$('riskLinksReason').value='';load();}};
 $('riskLinksSave').onclick=async()=>{
  const token=generation,id=oid;if(busy||!view||!active(token,id))return;
  let routing;const reason=$('riskLinksReason').value.trim();
  try{routing=view.read();if(!reason)throw Error('Enter a reason for this Risk Links change.');}catch(error){message(error.message);return;}
  busy=true;$('riskLinksSave').disabled=true;$('riskLinksReload').disabled=true;message('Saving Risk Links…');
  try{
   const result=await complianceRiskRequest('/compliance/obligations/'+id+'/risk-links',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({routing,reason})});
   if(!active(token,id))return;
   render(result);$('riskLinksReason').value='';message('Risk Links saved. No assessment was created.');
  }catch(error){if(active(token,id))message(error.message+' Reload saved links to review the latest selection before trying again.');}
  finally{if(active(token,id)){busy=false;$('riskLinksSave').disabled=!view;$('riskLinksReload').disabled=false;}}
 };
})();
