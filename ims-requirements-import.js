/* IMS clause extraction: local source data stays in the authenticated VERO API. */
(()=>{
 'use strict';
 const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
 const headers=()=>({Authorization:'Bearer '+(localStorage.getItem('vero_session_token')||''),Accept:'application/json','Content-Type':'application/json'});
 const dialog=document.createElement('dialog');dialog.id='imsRequirementsImport';dialog.style.cssText='width:min(1100px,94vw);max-height:90vh;overflow:auto;border:0;border-radius:12px;padding:24px;font:13px Montserrat,Verdana,sans-serif';
 dialog.innerHTML='<h2>Import IMS requirements for review</h2><p>Each clause is submitted as an Internal requirement pending Compliance Controller review. Source wording can contain guidance alongside duties; review applicability, evidence and ownership before approval.</p><p><label>Prepared clause extraction (JSON) <input id="imsRequirementsFile" type="file" accept=".json,application/json"></label></p><p id="imsRequirementsStatus" role="status" aria-live="polite">Choose a prepared extraction.</p><button class="btn green" id="imsRequirementsStart" disabled>Submit requirements for review</button> <button class="btn outline" id="imsRequirementsClose">Close</button><div style="overflow:auto;max-height:55vh;margin-top:16px"><table class="table"><thead><tr><th>Source</th><th>Clause / section</th><th>Pages</th><th>Review request</th></tr></thead><tbody id="imsRequirementsRows"></tbody></table></div>';
 document.body.append(dialog);
 const button=document.createElement('button');button.className='btn outline';button.textContent='Import IMS requirements';button.onclick=()=>dialog.showModal();document.querySelector('.actions')?.append(button);
 const status=dialog.querySelector('#imsRequirementsStatus'),start=dialog.querySelector('#imsRequirementsStart'),file=dialog.querySelector('#imsRequirementsFile'),close=dialog.querySelector('#imsRequirementsClose'),body=dialog.querySelector('tbody');
 let rows=[],running=false;
 close.onclick=()=>{if(!running)dialog.close();};dialog.addEventListener('cancel',e=>{if(running)e.preventDefault();});
 const cell=(tr,text)=>{const td=document.createElement('td');td.textContent=text;tr.append(td);return td;};
 async function json(url,options){const r=await fetch(API+url,{...options,headers:headers(),cache:'no-store'});let data={};try{data=await r.json();}catch{}if(!r.ok)throw new Error(data.message||'VERO returned '+r.status);return data;}
 file.onchange=async()=>{
  start.disabled=true;rows=[];body.replaceChildren();
  try{
   const data=JSON.parse(await file.files[0].text());if(!Array.isArray(data)||!data.length||data.length>2000)throw new Error('Choose an extraction containing 1–2000 clause records.');
   const keys=new Set();for(const item of data){if(!/^[a-f0-9]{24}$/.test(item.extraction_key)||keys.has(item.extraction_key)||!item.document_number||!item.version||!item.section_heading||!item.source_text||!Array.isArray(item.pages)||!item.pages.length||item.pages.some(p=>!Number.isInteger(p)||p<1))throw new Error('Invalid or duplicate extraction record.');keys.add(item.extraction_key);}
   const result=await json('/documents'),docs=result.documents||[];
   for(const item of data){const found=docs.filter(d=>d.document_number===item.document_number&&String(d.version_number)===String(item.version)&&d.status==='Current');if(found.length!==1)throw new Error('Cannot uniquely match Current source '+item.document_number+' v'+item.version);const tr=document.createElement('tr');cell(tr,item.document_number+' v'+item.version);cell(tr,(item.clause?item.clause+' — ':'')+item.section_heading);cell(tr,item.pages.join(', '));const resultCell=cell(tr,'Ready');body.append(tr);rows.push({item,doc:found[0],resultCell,done:false});}
   status.textContent=rows.length+' clause requirements from '+new Set(rows.map(r=>r.doc.id)).size+' documents ready for Controller review.';start.disabled=false;
  }catch(e){status.textContent=e.message;rows=[];}
 };
 start.onclick=async()=>{
  if(running||!rows.length)return;running=true;start.disabled=true;file.disabled=true;close.disabled=true;let failure=false;
  try{
   for(const row of rows){if(row.done)continue;const i=row.item;row.resultCell.textContent='Submitting…';
    const location=i.clause?('Clause '+i.clause+' — '+i.section_heading):i.section_heading;
    const source=i.document_number+' v'+i.version+' — '+i.document_title;
    const payload={submission_type:'Single Requirement',request_title:(i.document_title+' — '+location).slice(0,240),description:'Internal IMS requirement extracted from '+source+'\n'+location+'; PDF page(s) '+i.pages.join(', ')+'.\n\nSource wording:\n'+i.source_text,compliance_type:'Internal',source_name:source,applicability_type:i.applicability_type||'Organisation',applicability_name:i.applicability_name||'Verra Mobility',additional_information:JSON.stringify({extraction_key:i.extraction_key,source_document_id:row.doc.id,document_number:i.document_number,version:i.version,clause:i.clause,section_heading:i.section_heading,pages:i.pages,document_owner:i.document_owner,review_note:'AI-assisted clause extraction. Confirm duties versus guidance, applicability, obligation owner, frequency, evidence and risk classification before approval. Related duties are grouped by source clause.'}),ims_extraction:{document_id:row.doc.id,version:String(i.version),page:i.pages[0],clause:i.clause||i.section_heading,key:i.extraction_key}};
    const result=await json('/compliance/requests',{method:'POST',body:JSON.stringify(payload)});if(!result.request?.id)throw new Error('No review request receipt was returned.');row.done=true;
    const link=document.createElement('a');link.href='compliance.html?request='+result.request.id;link.textContent=result.request.request_code+' · '+result.request.status+(result.already_exists?' (existing)':'');row.resultCell.replaceChildren(link);
    status.textContent=rows.filter(r=>r.done).length+' / '+rows.length+' submitted for Controller review.';
   }
   status.textContent='Complete: '+rows.length+' Internal requirements submitted for Controller review. Source clauses are linked in each review request.';
  }catch(e){failure=true;status.textContent='Stopped after '+rows.filter(r=>r.done).length+' confirmed submissions: '+e.message+' You can safely retry this extraction.';}
  finally{running=false;close.disabled=false;file.disabled=false;start.disabled=!failure;start.textContent=failure?'Retry remaining requirements':'Submitted for review';}
 };
 // Render only same-origin controlled-document links; other references remain plain text.
 window.renderImsSourceReference=function(element,reference){
  if(!element)return;element.textContent=reference||'—';
  try{const url=new URL(reference,location.href);if(url.origin!==location.origin||url.pathname!=='/documents.html'||!/^\d+$/.test(url.searchParams.get('document_id')||''))return;const a=document.createElement('a');a.href=url.pathname+url.search;a.target='_blank';a.rel='noopener';a.textContent='View source · '+(url.searchParams.get('clause')||'section')+' · page '+(url.searchParams.get('page')||'1');element.replaceChildren(a);}catch{}
 };
})();