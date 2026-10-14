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
 let serial=0;
 const make=(tag,text)=>{const el=document.createElement(tag);el.textContent=String(text??'');return el;};
 function context(){
  const mapped={'Project':'Project','Contract':'Maintenance Contract','VM Location':'VM Site'}[type.value]||'';
  return {context_type:mapped,context_id:Number(name.value)||0};
 }
 function selectedParent(){
  for(let i=filters.length-1;i>=0;i--)if(filters[i].value)return Number(filters[i].value);
  return 0;
 }
 async function draw(){
  const ticket=++serial;
  const token=localStorage.getItem('vero_session_token');
  if(!token)return;
  const params=new URLSearchParams({parent_id:String(selectedParent()),...Object.fromEntries(Object.entries(context()).map(([k,v])=>[k,String(v)]))});
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
    const values=[category?'Tier '+row.tier:row.code||'Risk',
     row.name,category?'Aggregate':'Terminal risk',
     category?'Classification':'Master Risk',
     category?(row.average_residual_score??'Not assessed'):'—',
     category?(row.maximum_residual_score??'—'):'—',
     category?(row.contributing_assessments??0):'—',
     category?(row.awaiting_assessment??0):'—'];
    for(const value of values)tr.appendChild(make('td',value));
    const open=()=>{
     if(category){
      const filter=filters[4-row.tier];
      if(filter){
       filter.value=String(row.id);
       filter.dispatchEvent(new Event('change',{bubbles:true}));
      }
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
   if(!rows.length){const tr=make('tr','');const td=make('td','No classifications or terminal risks at this level.');td.colSpan=8;tr.appendChild(td);fragment.appendChild(tr);}
   body.replaceChildren(fragment);
   status.textContent=rows.length+' hierarchy rows displayed';
  }catch(error){
   if(ticket===serial)console.warn('Hierarchical register unavailable; keeping existing register',error);
  }
 }
 document.addEventListener('vero-risk-hierarchy-render',draw);
})();
