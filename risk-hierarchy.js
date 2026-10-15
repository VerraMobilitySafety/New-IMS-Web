// Hierarchical register renderer. Existing register remains fallback if API fails.
(()=>{
 const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
 const ids=['veroTier4Filter','veroTier3Filter','veroTier2Filter','veroTier1Filter'];
 const filters=ids.map(id=>document.getElementById(id));
 const type=document.getElementById('veroContextTypeFilter');
 const name=document.getElementById('veroApplicationFilter');
 const site=document.getElementById('veroSiteFilter');
 const body=document.getElementById('veroRiskTableBody');
 const status=document.getElementById('veroRiskListStatus');
 const search=document.getElementById('veroRiskSearch');
 let serial=0,showRisks=false;
 const make=(tag,text)=>{const el=document.createElement(tag);el.textContent=String(text??'');return el;};
 function context(){
  const mapped={'Project':'Project','Contract':'Maintenance Contract','VM Location':'VM Site'}[type.value]||'';
  return {context_type:mapped,context_id:Number(name.value)||0};
 }
 function selectedParent(){
  for(let i=filters.length-1;i>=0;i--)if(filters[i].value)return Number(filters[i].value);
  return 0;
 }
 async function draw(event){
  const ticket=++serial;
  if(event?.detail&&typeof event.detail.showRisks==='boolean')showRisks=event.detail.showRisks;
  if(showRisks)return;
  const token=localStorage.getItem('vero_session_token');
  if(!token)return;
  const params=new URLSearchParams({parent_id:String(selectedParent()),...Object.fromEntries(Object.entries(context()).map(([k,v])=>[k,String(v)]))});
  // The legacy register is the fallback, not a temporary display.
  // Keep its current rows for recovery, but show a stable loading state.
  const fallback=[...body.childNodes].map(node=>node.cloneNode(true));
  const fallbackStatus=status.textContent;
  const loading=make('tr','');
  const cell=make('td','Loading risk classifications…');
  cell.colSpan=7;
  cell.style.textAlign='center';
  cell.style.padding='28px';
  loading.appendChild(cell);
  body.replaceChildren(loading);
  status.textContent='Loading…';
  try{
   const response=await fetch(API+'/risk/hierarchical-register?'+params,{
    headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store'
   });
   if(!response.ok)throw Error('Hierarchy unavailable: '+response.status);
   const data=await response.json();
   if(ticket!==serial)return;
   const rows=(data.rows||[]).filter(r=>!search.value.trim()||
    String(r.name||'').toLowerCase().includes(search.value.trim().toLowerCase()));
   const fragment=document.createDocumentFragment();
   for(const row of rows){
    const tr=make('tr','');tr.tabIndex=0;tr.setAttribute('role','button');
    const category=row.kind==='category';
    const endpoint=category&&Number(row.children)===0;
    const awaiting=Number(row.awaiting_assessment||0);
    const applicable=Number(row.applicable_contexts||0);
    const assessmentStatus=!category?'Master Risk':endpoint?(awaiting>0?'Assessment Required':applicable===0?'Ready for Assessment':'Assessment Current'):'Classification';
    const values=[row.name,
     assessmentStatus,
     category?(row.average_residual_score??'—'):'—',
     category?(row.maximum_residual_score??'—'):'—',
     category?(row.children??0):'—',
     category?(row.contributing_assessments??0):'—',
     category?(row.awaiting_assessment??0):'—'];
    for(const value of values)tr.appendChild(make('td',value));
    const open=()=>{
     if(category){
      document.dispatchEvent(new CustomEvent('vero-risk-open-classification',{detail:{category:row}}));
     }else{
      const master=window.__veroRiskById?.(row.id);
      if(master)document.dispatchEvent(new CustomEvent('vero-risk-open-details',{detail:{risk:master}}));
      else status.textContent='Open this Master Risk from the detailed risk view.';
     }
    };
    tr.addEventListener('click',open);
    tr.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
    fragment.appendChild(tr);
   }
   if(!rows.length){const tr=make('tr','');const td=make('td','No classifications or terminal risks at this level.');td.colSpan=7;tr.appendChild(td);fragment.appendChild(tr);}
   body.replaceChildren(fragment);
   status.textContent=String(rows.length);
  }catch(error){
   if(ticket===serial){
    body.replaceChildren(...fallback);
    status.textContent=fallbackStatus;
    console.warn('Hierarchical register unavailable; restoring existing register',error);
   }
  }
 }
 document.addEventListener('vero-risk-hierarchy-render',draw);
})();

