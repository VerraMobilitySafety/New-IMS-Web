/* One request mutation, with stable retry identity and no post-submission writes. */
(function(root){
 'use strict';
 const pending=new Map();
 function milestone(row){return {id:row.id==null?null:Number(row.id),milestone_type:row.milestone_type==='Project'?'Contract':row.milestone_type,milestone_name:row.milestone_name,target_date:row.target_date||null};}
 function collect(document){
  return [...document.querySelectorAll('.repeat-block')].map(el=>milestone({id:el.dataset.existingId||null,milestone_type:el.dataset.milestoneType,milestone_name:el.querySelector('.ms-name').value.trim(),target_date:el.querySelector('.ms-date').value})).filter(row=>row.id!==null||row.milestone_name);
 }
 async function send(fetch,url,payload){
  const bytes=new TextEncoder().encode(JSON.stringify(payload));
  const signature=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
  const storageKey='vero-request-retry:'+url;
  let entry=pending.get(url);
  try{entry=entry||JSON.parse(sessionStorage.getItem(storageKey)||'null');}catch{}
  if(entry&&entry.signature!==signature)throw new Error('The previous save outcome is uncertain. Retry with the original values or reload the saved record before making more changes.');
  if(!entry)entry={signature,operation_id:crypto.randomUUID()};pending.set(url,entry);
  try{sessionStorage.setItem(storageKey,JSON.stringify(entry));}catch{}
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,operation_id:entry.operation_id})});
  const data=await response.json();
  function clear(){pending.delete(url);try{sessionStorage.removeItem(storageKey);}catch{}}
  if(!response.ok){if(response.status>=400&&response.status<500)clear();throw new Error(data.message||'Unable to save request');}
  clear();return data;
 }
 // Call only after an explicit fresh server read has reconciled the saved form.
 function reconciled(url){pending.delete(url);try{sessionStorage.removeItem('vero-request-retry:'+url);}catch{}}
 root.VeroProjectRequestSave={collect,milestone,send,reconciled};
 if(typeof module!=='undefined')module.exports=root.VeroProjectRequestSave;
})(typeof window==='undefined'?globalThis:window);
