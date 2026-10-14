// Shared Vero classification picker.
// Usage: VeroRiskClassificationPicker.mount(element,{onSelect(item),value})
// The picker selects a classification, not a risk score or assessment.
window.VeroRiskClassificationPicker=(()=>{
 const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
 function mount(host,options={}){
  if(!host)throw Error('Classification picker host required');
  const wrap=document.createElement('div');wrap.className='vero-classification-picker';
  const search=document.createElement('input');search.type='search';search.placeholder='Search risk classifications';search.setAttribute('aria-label','Search risk classifications');
  const select=document.createElement('select');select.setAttribute('aria-label','Risk classification');select.size=1;
  const info=document.createElement('p');info.setAttribute('role','status');
  const selected=document.createElement('p');selected.className='vero-classification-selected';
  wrap.append(search,select,selected,info);host.replaceChildren(wrap);
  let rows=[],current=options.value||null;
  function render(){
   const q=search.value.trim().toLowerCase();
   const matches=rows.filter(x=>x.path.toLowerCase().includes(q));
   const unique=new Map();
   for(const item of matches)if(!unique.has(String(item.category_id)))unique.set(String(item.category_id),item);
   // Multiple paths can lead to one classification when it has multiple parents.
   // Keep the selected category ID stable even if the displayed path changes.
   select.replaceChildren();
   const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Select a classification';select.appendChild(placeholder);
   for(const item of unique.values()){const opt=document.createElement('option');opt.value=String(item.category_id);opt.textContent=item.path+' (Tier '+item.tier+')';select.appendChild(opt)}
   select.value=current==null?'':String(current);
   if(!matches.some(x=>String(x.category_id)===String(current)))select.value='';
   info.textContent=unique.size+' matching classifications';
  }
  search.addEventListener('input',render);
  select.addEventListener('change',()=>{
   current=select.value||null;
   const item=rows.find(x=>String(x.category_id)===String(current)&&x.path.toLowerCase().includes(search.value.trim().toLowerCase()))||rows.find(x=>String(x.category_id)===String(current));
   selected.textContent=item?'Selected: '+item.path+' · Tier '+item.tier:'';
   if(typeof options.onSelect==='function')options.onSelect(item||null);
  });
  async function refresh(){
   info.textContent='Loading classifications…';
   try{
    const response=await fetch(API+'/risk/classification-catalogue',{headers:{Authorization:'Bearer '+localStorage.getItem('vero_session_token'),Accept:'application/json'},cache:'no-store'});
    const data=await response.json();if(!response.ok)throw Error(data.message||'Catalogue unavailable');
    rows=data.categories||[];render();
   }catch(error){info.textContent='Unable to load classifications: '+error.message;select.replaceChildren();}
  }
  refresh();
  return {refresh,getValue:()=>current,destroy:()=>wrap.remove()};
 }
 return {mount};
})();
