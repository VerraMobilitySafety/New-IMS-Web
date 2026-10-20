/* Source provenance and supporting links do not transfer compliance assessments. */
(()=>{'use strict';
 const original=window.openLiveObligation;
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let sequence=0;
 window.openLiveObligation=async function(id){
  const request=++sequence;document.getElementById('regulatorySourcePanel')?.remove();await original(id);
  if(request!==sequence||typeof currentLiveObligation==='undefined'||currentLiveObligation?.compliance_type!=='Regulatory')return;
  const body=document.querySelector('#obligationModal .drawer-body');if(!body)return;
  const panel=document.createElement('section');panel.id='regulatorySourcePanel';panel.className='shared-requirement-notice';body.prepend(panel);panel.textContent='Loading regulatory source and supporting links…';
  try{
   const response=await fetch(COMPLIANCE_API+'/compliance/obligations/'+Number(id)+'/regulatory-source',{headers:complianceAuthHeaders(),cache:'no-store'});if(!response.ok)throw Error('Supporting links could not be loaded.');const data=await response.json();if(request!==sequence)return;
   if(!data.source){panel.remove();return;}const s=data.source;
   panel.innerHTML='<h3>Regulatory source · applicability review required</h3><p>'+esc(s.clause_reference)+' · '+esc(s.jurisdiction)+'</p><p><strong>Applies if:</strong> '+esc(s.applicability_condition)+'</p><p><strong>Timing:</strong> '+esc(s.timing_or_trigger)+'</p><p><strong>Source checked:</strong> '+esc(s.source_checked_date)+'. '+esc(s.effective_date_status)+'</p><p><strong>Review needed:</strong> '+esc(s.review_gap)+'</p><h4>Supporting requirements and documents</h4><p>These are related or partial matches. They do not establish full coverage, approved applicability or an effective control.</p><ul>'+data.links.map(l=>'<li>'+esc(l.title||l.key)+' · '+esc(l.relationship)+(l.obligation_id?' <button type="button" data-linked-requirement="'+Number(l.obligation_id)+'">Open existing requirement</button>':' <a href="compliance.html?ims_draft='+Number(l.draft_id)+'">Review existing IMS draft</a>')+(l.document_id?' · <a href="documents.html?document_id='+Number(l.document_id)+'">Controlled source document</a>':'')+'<p>'+esc(l.notes)+'</p></li>').join('')+'</ul>'+(!data.links.length?'<p>No specific existing match linked. Check Finance, Payroll, Legal or other business systems before treating this as a control gap.</p>':'');
   panel.querySelectorAll('[data-linked-requirement]').forEach(button=>button.onclick=()=>window.openLiveObligation(Number(button.dataset.linkedRequirement)));
  }catch(error){if(request===sequence)panel.textContent=error.message;}
 };
})();
