'use strict';
const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
const el=id=>document.getElementById(id);
let checked=null, state=null, busy=false;
async function request(method='GET',data){
 const token=localStorage.getItem('vero_session_token');
 if(!token){location.href='login.html?return=site-import.html';throw Error('Sign in required.');}
 const result=await fetch(API+'/maintenance-site-import',{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});
 const value=await result.json();if(!result.ok)throw Error(value.message||'Unable to complete the import.');return value;
}
function table(target,rows){target.replaceChildren();for(const row of rows){const tr=document.createElement('tr');for(const value of row){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}target.append(tr);}}
async function refresh(){state=await request();el('registerStatus').textContent=state.imported_sites+' Cognito sites in the shared register · '+state.linked_sites+' linked to contracts · '+(state.imported_sites-state.linked_sites)+' awaiting contract mapping.';table(el('contractCounts'),state.by_contract.map(r=>[r.code,r.sites]));el('agreements').textContent=state.contracts.map(c=>c.code+' — '+c.name+(c.in_maintenance?'':' (not yet in maintenance register)')).join('\n');el('preview').disabled=false;}
el('importFile').onchange=()=>{checked=null;el('run').hidden=true;el('previewDetails').replaceChildren();el('progress').textContent='';};
el('preview').onclick=async()=>{
 checked=null;el('run').hidden=true;
 try{
  const file=el('importFile').files[0];if(!file)throw Error('Choose a reconciled site package.');if(file.size>20*1024*1024)throw Error('Package exceeds 20 MB.');
  const data=JSON.parse(await file.text());if(data.format!=='vero-cognito-sites-v1'||!Array.isArray(data.sites)||!data.sites.length||!Array.isArray(data.agreements))throw Error('Unsupported site package.');
  const groups=new Map();for(const s of data.sites){const key=s.contract_code||'Awaiting verified contract mapping';groups.set(key,(groups.get(key)||0)+1);}
  const heading=document.createElement('p');heading.textContent=data.sites.length+' distinct sites checked. '+(data.held_source_rows||0)+' conflicting source rows are excluded.';
  const t=document.createElement('table');table(t,[['Contract reference','Sites'],...groups]);el('previewDetails').replaceChildren(heading,t);
  const note=document.createElement('p');note.textContent='Missing agreements to load: '+(data.agreements.map(c=>c.code+' — '+c.name).join('; ')||'None');el('previewDetails').append(note);
  checked=data;el('run').hidden=false;el('progress').textContent='Package checked. Ready to import.';
 }catch(e){el('progress').textContent=e.message;}
};
el('run').onclick=async()=>{
 if(!checked||busy)return;busy=true;el('run').disabled=true;el('preview').disabled=true;el('importFile').disabled=true;
 const totals={created:0,already_imported:0,linked:0,unlinked:0,conflicts:0,owners_unassigned:0,coordinates_corrected:0};
 try{
  for(const c of checked.agreements){const match=state.contracts.filter(x=>x.code.toLowerCase()===c.code.toLowerCase());const anchor=state.contracts.filter(x=>x.code===c.organisation_from_contract);if(anchor.length!==1)throw Error('Organisation anchor is missing or ambiguous: '+c.organisation_from_contract);if(match.length>1)throw Error('Agreement code is ambiguous: '+c.code);await request('POST',{format:checked.format,action:'ensure-contract',contract:{code:c.code,name:c.name,customer:c.customer,source_reference:c.source_reference,unit_id:anchor[0].unit_id}});}
  for(let offset=0;offset<checked.sites.length;offset+=100){el('progress').textContent='Importing sites '+(offset+1)+'–'+Math.min(offset+100,checked.sites.length)+' of '+checked.sites.length+'… Keep this page open.';const result=await request('POST',{format:checked.format,sites:checked.sites.slice(offset,offset+100)});for(const key of Object.keys(totals))totals[key]+=key==='conflicts'?result.conflicts.length:result[key];}
  await refresh();el('progress').textContent='Import complete. '+totals.created+' new sites; '+totals.already_imported+' already imported; '+totals.linked+' new contract links; '+totals.unlinked+' new sites awaiting mapping; '+totals.conflicts+' existing-reference conflicts held.\n'+totals.coordinates_corrected+' coordinate pairs corrected. '+totals.owners_unassigned+' new sites have no matching active responsible account.';
 }catch(e){el('progress').textContent=e.message+' Completed batches are retained. Retry this same package to resume safely.';}
 finally{busy=false;el('run').disabled=false;el('preview').disabled=false;el('importFile').disabled=false;}
};
window.addEventListener('beforeunload',event=>{if(busy){event.preventDefault();event.returnValue='';}});
el('checkNsw').onclick=async()=>{
 if(busy)return;
 const message=el('nswStatus'),apply=el('applyNsw');apply.hidden=true;el('checkNsw').disabled=true;
 try{
  const plan=await request('POST',{format:'vero-cognito-sites-v1',action:'correct-nsw-contracts'});
  message.textContent=plan.groups.map(g=>g.name+': '+g.sites+' sites → '+g.contract).join('\n')+(plan.create_mobile_contract?'\n1971OS will be added from the source agreement register.':'')+'\nSite identities, details, Cognito source records and linked events are retained. Only the incorrect NSW contract links are replaced.';
  apply.hidden=false;
  apply.onclick=async()=>{
   if(busy)return;busy=true;apply.disabled=true;el('preview').disabled=true;el('run').disabled=true;el('importFile').disabled=true;el('checkNsw').disabled=true;message.textContent='Correcting NSW site links…';
   try{
    const result=await request('POST',{format:'vero-cognito-sites-v1',action:'correct-nsw-contracts',apply:true,fingerprint:plan.fingerprint});
    message.textContent=result.corrected_sites+' sites corrected. '+result.links_added+' correct links added; '+result.incorrect_links_removed+' incorrect links removed.\n'+result.groups.map(g=>g.contract+': '+g.sites+' sites').join('\n');
    apply.hidden=true;await refresh();
   }catch(error){message.textContent=error.message+' Check the mapping again before retrying.';apply.hidden=true;}
   finally{busy=false;apply.disabled=false;el('preview').disabled=false;el('run').disabled=false;el('importFile').disabled=false;el('checkNsw').disabled=false;}
  };
 }catch(error){message.textContent=error.message;}
 finally{el('checkNsw').disabled=false;}
};
el('checkOwners').onclick=async()=>{
 if(busy)return;el('checkOwners').disabled=true;el('applyOwners').hidden=true;
 try{
  const plan=await request('POST',{format:'vero-cognito-sites-v1',action:'link-site-owners'});
  el('ownerStatus').textContent=plan.owners.map(o=>o.name+' ('+o.status+'): '+o.sites+' sites').join('\n')+'\n'+plan.matched_sites+' sites ready to link. Existing owners are preserved; unmatched emails remain unassigned.';
  el('applyOwners').hidden=plan.matched_sites===0;
  el('applyOwners').onclick=async()=>{
   if(busy)return;busy=true;el('applyOwners').disabled=true;el('checkOwners').disabled=true;
   try{const result=await request('POST',{format:'vero-cognito-sites-v1',action:'link-site-owners',apply:true,fingerprint:plan.fingerprint});el('ownerStatus').textContent=result.updated_sites+' sites linked to their Cognito owners. User access and invitation status are unchanged.';el('applyOwners').hidden=true;}
   catch(e){el('ownerStatus').textContent=e.message;el('applyOwners').hidden=true;}
   finally{busy=false;el('applyOwners').disabled=false;el('checkOwners').disabled=false;}
  };
 }catch(e){el('ownerStatus').textContent=e.message;}
 finally{el('checkOwners').disabled=false;}
};
refresh().catch(e=>{el('registerStatus').textContent=e.message;});




