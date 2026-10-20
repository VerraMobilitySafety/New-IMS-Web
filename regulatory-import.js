(()=>{'use strict';
 const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
 const $=id=>document.getElementById(id);let payload=null,receipt=null,previewed=false;
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 $('regulatoryFile').onchange=async()=>{
  payload=null;previewed=false;$('preview').disabled=true;$('save').disabled=true;$('rows').replaceChildren();
  try{const file=$('regulatoryFile').files[0];if(!file)return;if(file.size>2000000)throw Error('Package exceeds 2 MB.');const data=JSON.parse((await file.text()).replace(/^\uFEFF/,''));if(data.format!=='vero-regulatory-research-v1'||!Array.isArray(data.requirements)||!data.requirements.length)throw Error('Choose a valid regulatory research package.');payload={...data,save:false};$('preview').disabled=false;$('result').textContent=data.requirements.length+' candidates ready for preview.';}catch(error){$('result').textContent=error.message;}
 };
 async function run(save){
  if(!payload||save&&!previewed)return;
  $('preview').disabled=true;$('save').disabled=true;$('regulatoryFile').disabled=true;
  $('result').textContent=save?'Saving unassessed candidates and supporting links…':'Checking duplicates and matching existing Vero records…';
  try{
   const token=localStorage.getItem('vero_session_token');
   const response=await fetch(API+'/compliance/regulatory-import',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json',...(token?{'Authorization':'Bearer '+token}:{})},body:JSON.stringify({...payload,save})});
   const data=await response.json();if(!response.ok)throw Error(data.message||'Import could not be completed.');
   receipt=data;
   $('rows').innerHTML=data.requirements.map(r=>{const source=payload.requirements.find(x=>x.requirement_id===r.source_key);return '<tr><td>'+esc(r.source_key)+'</td><td>'+(r.id?'<a href="compliance.html?obligation_id='+Number(r.id)+'">'+esc(source?.title)+'</a>':esc(source?.title))+'</td><td>'+esc(r.existing?'Existing entry':save?'Saved — Not Assessed':'New candidate')+'</td><td>'+r.resolved_links+' resolved'+(r.unresolved_links.length?' · '+r.unresolved_links.length+' unresolved':'')+'</td></tr>';}).join('');
   $('result').textContent=(save?'Saved':'Preview')+': '+data.total+' regulatory candidates; '+data.new+' '+(save?'created':'new')+', '+data.existing+' existing.\n'+data.resolved_links+' supporting links resolved; '+data.unresolved_links+' unresolved.\nAll remain Not Assessed. Applicability requires review.';
   previewed=!save;$('save').disabled=save;$('download').hidden=false;
  }catch(error){previewed=false;$('result').textContent=error.message+(save?' No automatic retry. Preview again to reconcile any uncertain outcome.':'');}
  finally{$('preview').disabled=!payload;$('regulatoryFile').disabled=false;}
 }
 $('preview').onclick=()=>run(false);$('save').onclick=()=>run(true);
 $('download').onclick=()=>{if(!receipt)return;const url=URL.createObjectURL(new Blob([JSON.stringify(receipt,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='vero-regulatory-import-receipt.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
})();
