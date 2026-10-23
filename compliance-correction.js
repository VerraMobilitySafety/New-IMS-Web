/* Returned requirement correction. Risk/context and approval controls are deliberately absent. */
(()=>{
 'use strict';
 const fields=[['proposed_title','Requirement title'],['proposed_description','Description'],['proposed_source_name','Source name'],['proposed_source_reference','Source reference'],['proposed_frequency','Frequency'],['proposed_evidence_required','Evidence required']];
 const frequencies=['One-off','Weekly','Monthly','Quarterly','Six Monthly','Annual','Ongoing','As Required'];
 const node=(tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;return el;};
 async function open(id){
  const dialog=node('dialog');dialog.style.cssText='width:min(720px,90vw);max-height:85vh;border:1px solid #d3dbe0;border-radius:12px;padding:24px;overflow:auto';
  const heading=node('h2','Correct returned requirement'),notes=node('p'),error=node('p'),form=node('form'),buttons=node('div'),save=node('button','Save correction draft'),submit=node('button','Resubmit to controller'),close=node('button','Close');
  error.setAttribute('role','status');error.style.color='#98221c';notes.style.whiteSpace='pre-wrap';
  save.type=submit.type=close.type='button';buttons.append(save,submit,close);form.append(buttons);
  dialog.append(heading,notes,node('p','Correct the fields below. Applicability, classification and Risk information remain unchanged. The controller must review the resubmission.'),form,error);document.body.append(dialog);dialog.showModal();
  let state,busy=false,dirty=false,pending=null;
  const inputs={};const url=COMPLIANCE_API+'/compliance/requests/'+encodeURIComponent(id)+'/correction';
  function dismiss(){if(busy)return;if(dirty&&!confirm('Close without saving these corrections?'))return;dialog.close();dialog.remove();}
  close.onclick=dismiss;dialog.addEventListener('cancel',event=>{event.preventDefault();dismiss();});
  function setBusy(value){busy=value;form.querySelectorAll('input,textarea,select,button').forEach(el=>el.disabled=value);}
  async function load(){
   setBusy(true);
   try{
    const r=await fetch(url,{headers:complianceAuthHeaders(),cache:'no-store'}),data=await r.json();
    if(!r.ok)throw new Error(data.message||'Unable to open returned requirement');state=data;
    heading.textContent=data.request.request_code+' - correction';notes.textContent='Controller notes: '+(data.request.controller_notes||'See the controller for details.');
    for(const [key,label] of fields){
     const wrap=node('label',label);wrap.style.cssText='display:block;margin:14px 0';
     const input=node(key==='proposed_frequency'?'select':key==='proposed_title'||key==='proposed_source_name'?'input':'textarea');
     input.style.cssText='display:block;width:100%;padding:8px;box-sizing:border-box';input.name=key;
     if(['proposed_title','proposed_source_name','proposed_source_reference'].includes(key))input.maxLength=255;
     if(key==='proposed_frequency')for(const value of new Set([data.item[key]||'',...frequencies]))input.append(new Option(value||'Not specified',value));
     input.value=data.item[key]||'';input.required=key==='proposed_title';input.oninput=()=>{dirty=true;};inputs[key]=input;wrap.append(input);form.insertBefore(wrap,buttons);
    }
   }catch(exc){error.textContent=exc.message;save.hidden=submit.hidden=true;}finally{setBusy(false);}
  }
  async function write(operation){
   if(busy||!state||!form.reportValidity())return;
   const payload={operation,expected_revision:state.request.revision,item:Object.fromEntries(fields.map(([key])=>[key,inputs[key].value]))};
   const signature=JSON.stringify(payload);
   if(pending&&pending.signature!==signature){error.textContent='The previous save outcome is uncertain. Retry the same values before editing further, or close and reopen the saved request.';return;}
   pending=pending||{signature,key:crypto.randomUUID()};setBusy(true);error.textContent='Saving...';
   try{
    const r=await fetch(url,{method:'POST',headers:{...complianceAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({...payload,operation_id:pending.key})}),data=await r.json();
    if(!r.ok){if(r.status>=400&&r.status<500)pending=null;throw new Error(data.message||'Unable to save correction');}
    pending=null;dirty=false;state.request=data.request;
    error.textContent=operation==='resubmit'?'Resubmitted to the controller. No new request was created.':'Correction draft saved.';
    if(operation==='resubmit'){save.hidden=submit.hidden=true;form.querySelectorAll('input,textarea,select').forEach(el=>el.readOnly=true);}
   }catch(exc){error.textContent=exc.message;}finally{setBusy(false);}
  }
  save.onclick=()=>write('save');submit.onclick=()=>write('resubmit');form.onsubmit=event=>event.preventDefault();await load();
 }
 document.addEventListener('DOMContentLoaded',()=>{const id=new URLSearchParams(location.search).get('correct');if(id&&/^\d+$/.test(id))open(id);});
})();
