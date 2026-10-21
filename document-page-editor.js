/* Page visibility is managed separately from document content and job links. */
(()=>{
 'use strict';
 const body=document.querySelector('#drawerBack .drawer-body');if(!body)return;
 const section=document.createElement('section');section.className='section';section.id='documentPageLinks';
 const heading=document.createElement('h3');heading.textContent='Show on pages';
 const help=document.createElement('p');help.textContent='Select the pages where this document should appear in Related documents.';
 const form=document.createElement('form'),choices=document.createElement('fieldset'),legend=document.createElement('legend'),status=document.createElement('p'),save=document.createElement('button');
 legend.textContent='Linked pages';choices.append(legend);status.setAttribute('role','status');save.type='submit';save.className='btn green';save.textContent='Save page links';
 form.append(choices,save);section.append(heading,help,form,status);body.append(section);
 const style=document.createElement('style');style.textContent='#documentPageLinks fieldset{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;border:1px solid #e5e1de;border-radius:8px;padding:16px;margin:12px 0;max-height:280px;overflow:auto}#documentPageLinks label{display:flex;align-items:start;gap:8px;font-size:12px;line-height:1.5}#documentPageLinks input{margin-top:2px;accent-color:#728824}#documentPageLinks p{font-size:12px;line-height:1.6}#documentPageLinks [hidden]{display:none!important}';document.head.append(style);
 let generation=0,current=null,busy=false;
 async function request(id,options={}){const response=await fetch(API_BASE+'/documents/'+encodeURIComponent(id)+'/pages',{...options,headers:authHeaders({Accept:'application/json','Content-Type':'application/json'}),cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.message||'Unable to load document page links.');return data;}
 function draw(data){choices.replaceChildren(legend);for(const page of data.pages){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.name='pages';input.value=page.id;input.checked=data.selected_pages.includes(page.id);input.disabled=!data.can_edit;label.append(input,document.createTextNode(page.label));choices.append(label);}save.hidden=!data.can_edit;form.hidden=false;help.textContent=data.can_edit?'Select the pages where this document should appear in Related documents.':'These pages show this document in Related documents. A Document Controller can change the links on the current version.';}
 const api={open:async doc=>{
  const ticket=++generation;current=null;form.hidden=true;status.replaceChildren();status.textContent='Loading page links…';
  try{const data=await request(doc.id);if(ticket!==generation)return;current={...data,id:doc.id};draw(data);status.textContent=data.selected_pages.length?'':'No pages selected.';}
  catch(error){if(ticket!==generation)return;status.textContent=error.message+' ';const retry=document.createElement('button');retry.type='button';retry.textContent='Retry';retry.onclick=()=>api.open(doc);status.append(retry);}
 }};window.VeroDocumentPages=api;
 form.onsubmit=async event=>{
  event.preventDefault();if(!current?.can_edit||busy)return;
  const selected=current,ticket=generation,pages=[...choices.querySelectorAll('input:checked')].map(input=>input.value);busy=true;save.disabled=true;choices.disabled=true;status.textContent='Saving page links…';
  try{const data=await request(selected.id,{method:'PUT',body:JSON.stringify({pages,expected_revision:selected.revision_token})});if(ticket!==generation)return;current={...data,id:selected.id};draw(data);status.textContent=pages.length?'Page links saved.':'Page links removed.';}
  catch(error){if(ticket===generation)status.textContent=error.message;}
  finally{busy=false;save.disabled=false;choices.disabled=false;}
 };
})();
