// Read-only enterprise control catalogue within Master Risk details.
// Linking and control effectiveness require authorised risk-control relationships.
(()=>{
 const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
 const overlay=document.getElementById('veroRiskDetailsOverlay');
 const content=document.getElementById('veroRiskDetailsContent');
 let version=0;
 const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text??'');return n;};
 document.addEventListener('vero-risk-controls-tab',async event=>{
  const ticket=++version, risk=event.detail?.risk;
  const card=node('section');card.className='vero-risk-details-card';
  card.appendChild(node('h3','Enterprise Controls'));
  card.appendChild(node('p','Reusable controls are maintained in the enterprise control catalogue. Linked controls are shown separately from the full enterprise catalogue.'));
  const status=node('p','Loading enterprise controls...');status.setAttribute('role','status');card.appendChild(status);
  content.replaceChildren(card);
  try{
   const response=await fetch(API+'/compliance/controls',{headers:{Authorization:'Bearer '+localStorage.getItem('vero_session_token'),Accept:'application/json'},cache:'no-store'});
   const data=await response.json();
   if(!response.ok)throw Error(data.message||'Unable to retrieve controls');
   if(ticket!==version||overlay.hidden)return;
   const controls=data.controls||[];
   const linkedResponse=await fetch(API+'/risks/'+encodeURIComponent(risk.id)+'/controls',{headers:{Authorization:'Bearer '+localStorage.getItem('vero_session_token'),Accept:'application/json'},cache:'no-store'});
   const linkedData=await linkedResponse.json();
   if(!linkedResponse.ok)throw Error(linkedData.message||'Unable to retrieve linked controls');
   if(ticket!==version||overlay.hidden)return;
   const linked=linkedData.controls||[];
   const roleResult=await fetch(API+'/auth/my-roles',{headers:{Authorization:'Bearer '+localStorage.getItem('vero_session_token')}});
   const roleData=roleResult.ok?await roleResult.json():{roles:[]};
   const canManage=(roleData.roles||[]).some(r=>r.role_name==='Risk Manager');
   status.textContent=linked.length+' linked controls · '+controls.length+' enterprise controls available';
   const linkedSection=node('section');linkedSection.appendChild(node('h3','Controls linked to this Master Risk'));
   if(!linked.length)linkedSection.appendChild(node('p','No enterprise controls linked to this Master Risk yet.'));
   for(const c of linked){
    const row=node('div');row.className='vero-exposure-context';
    row.appendChild(node('strong',(c.control_code||'')+' · '+(c.control_title||'')));
    row.appendChild(node('p',[c.relationship_type,c.effectiveness,c.control_status].filter(Boolean).join(' · ')));
    if(c.rationale)row.appendChild(node('p','Link justification: '+c.rationale));
    linkedSection.appendChild(row);
   }
   card.appendChild(linkedSection);
   if(!controls.length)return;
   const label=node('label','Find enterprise control');label.style.display='grid';label.style.gap='7px';
   const search=node('input');search.type='search';search.placeholder='Search control code, name or owner';label.appendChild(search);card.appendChild(label);
   const list=node('div');card.appendChild(list);
   function render(){
    const q=search.value.trim().toLowerCase();list.replaceChildren();
    const found=controls.filter(c=>[c.control_code,c.control_title,c.description,c.owner_name].some(v=>String(v||'').toLowerCase().includes(q)));
    for(const c of found.slice(0,80)){
     const section=node('div');section.className='vero-exposure-context';
     section.appendChild(node('strong',(c.control_code||'')+' · '+(c.control_title||'')));
     const meta=node('p',[c.control_type,c.status,c.owner_name&&'Owner: '+c.owner_name,c.control_frequency&&'Frequency: '+c.control_frequency].filter(Boolean).join(' · '));section.appendChild(meta);
     if(c.description)section.appendChild(node('p',c.description));
     list.appendChild(section);
    }
    if(!found.length)list.appendChild(node('p','No matching enterprise controls.'));
    if(found.length>80)list.appendChild(node('p','Showing first 80 matches. Refine your search.'));
   }
   search.addEventListener('input',render);render();
  }catch(error){if(ticket===version&&!overlay.hidden)status.textContent='Enterprise control catalogue unavailable: '+error.message;}
 });
 document.addEventListener('vero-risk-open-details',()=>{version++});
 document.addEventListener('vero-risk-open-classification',()=>{version++});
})();
