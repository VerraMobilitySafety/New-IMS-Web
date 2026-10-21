/* Context selectors for the shared governance and operational DMS. */
const VeroDocumentContext=(()=>{
 const byId=id=>document.getElementById(id);
 const style=document.createElement('style');style.textContent='#reqCategory,#reqLinks,#reqLinkSearch{box-sizing:border-box;width:100%;border:1px solid #d7d3d0;border-radius:7px;padding:10px;background:#fff;font:13px Montserrat,Verdana,Arial,sans-serif;margin-bottom:8px}#documentCategoryFilter,#documentLinkFilter{max-width:250px;min-height:36px;border:1px solid #d7d3d0;border-radius:7px;padding:7px;background:#fff;font:inherit}#requestLinksField[hidden]{display:none}#documentContextDetails p{font-size:12px;overflow-wrap:anywhere}';document.head.append(style);
 const params=new URLSearchParams(location.search);
 let options=[],optionsLoaded=false,optionsPromise=null;
 const key=x=>JSON.stringify([x.type,x.type==='Client'?x.name:x.id]);
 const category=()=>byId('reqCategory').value;
 const selectedLinks=()=>Array.from(byId('reqLinks').selectedOptions).map(o=>JSON.parse(o.value));
 const urlLink=()=>{
  const type=params.get('link_type'),value=params.get('link_value');
  if(!['Client','Project','Contract','Site'].includes(type)||!value)return null;
  if(type!=='Client'&&(!/^\d+$/.test(value)||Number(value)<=0))return null;
  return type==='Client'?{type,name:value}:{type,id:Number(value)};
 };
 async function loadOptions(){
  if(optionsLoaded)return options;
  if(!optionsPromise)optionsPromise=(async()=>{
   const r=await fetch(API_BASE+'/documents/link-options',{headers:authHeaders({Accept:'application/json'}),cache:'no-store'});
   if(!r.ok)throw Error('Unable to load clients and jobs. Close and reopen the request to retry.');
   const data=await r.json();options=data.options||[];optionsLoaded=true;return options;
  })().finally(()=>{optionsPromise=null;});
  return optionsPromise;
 }
 function renderOptions(select,selected=[]){
  const selectedKeys=new Set(selected.map(key));select.replaceChildren();
  for(const type of ['Client','Project','Contract','Site']){
   const group=document.createElement('optgroup');group.label=type;
   for(const item of options.filter(x=>x.type===type)){
    const clean={type:item.type,label:item.label};
    if(type==='Client')clean.name=item.name;else clean.id=item.id;
    const option=document.createElement('option');option.value=JSON.stringify(clean);option.textContent=item.label;
    option.selected=selectedKeys.has(key(clean));group.append(option);
   }
   select.append(group);
  }
 }
 function updateRequest(){
  const type=byId('reqType').value,existing=type==='Revise Existing Document'||type==='Withdraw Document';
  const doc=existing?liveDocuments.find(x=>String(x.id)===byId('reqExistingDocument').value):null;
  if(doc)byId('reqCategory').value=doc.category;
  byId('reqCategory').disabled=false;
  const replacement=Array.from(byId('reqType').options).find(o=>o.value==='Replace Existing Document');
  replacement.disabled=category()==='Operational';
  if(replacement.disabled&&byId('reqType').value==='Replace Existing Document'){byId('reqType').value='New Document';updateRequestType();return;}
  byId('reqLinks').disabled=existing;
  byId('reqLinkSearch').disabled=existing;
  byId('requestLinksField').hidden=category()!=='Operational';
  byId('reqFile').accept=category()==='Operational'?'.docx,.xlsx':'.docx';
  byId('requestDraftLabel').textContent=category()==='Operational'?'Completed draft (.docx or .xlsx) *':'Completed Word Draft (.docx) *';
  if(doc)renderOptions(byId('reqLinks'),doc.documentLinks);
 }
 function categoryChanged(){
  populateDocumentRequestSelectors();
  updateRequest();
 }
 function resetRequest(){
  byId('reqCategory').value=params.get('category')==='Operational'||urlLink()?'Operational':'Governance';
  byId('reqLinkSearch').value='';
  byId('requestLinkStatus').textContent='Loading clients and jobs…';
  byId('reqLinks').replaceChildren();
  loadOptions().then(()=>{
   renderOptions(byId('reqLinks'),urlLink()?[urlLink()]:[]);
   byId('requestLinkStatus').textContent='';updateRequest();
  }).catch(e=>{byId('requestLinkStatus').textContent=e.message;});
 }
 function searchOptions(value){
  const query=value.trim().toLowerCase();
  for(const option of byId('reqLinks').options)option.hidden=!option.selected&&!option.textContent.toLowerCase().includes(query);
 }
 function validateRequest(){
  const type=byId('reqType').value;
  if(category()==='Operational'&&!['Revise Existing Document','Withdraw Document'].includes(type)&&!selectedLinks().length){
   setRequestMessage('Select at least one linked client, project, contract or site.');byId('reqLinks').focus();return false;
  }
  if(category()==='Operational'&&!optionsLoaded){setRequestMessage('Wait for clients and jobs to load, then try again.');return false;}
  return true;
 }
 function appendRequest(form){
  form.append('entity_type',category());
  // Revision context is inherited server-side from the selected release.
  if(!['Revise Existing Document','Withdraw Document'].includes(byId('reqType').value))form.append('document_links',JSON.stringify(category()==='Operational'?selectedLinks():[]));
 }
 function populateFilters(){
  const select=byId('documentLinkFilter'),previous=select.value;
  const links=new Map();for(const d of liveDocuments)for(const l of d.documentLinks)links.set(key(l),l);
  const target=urlLink();if(target&&!links.has(key(target)))links.set(key(target),{...target,label:params.get('link_label')||String(target.name||target.id)});
  select.replaceChildren(new Option('All clients and jobs',''));
  for(const [value,item] of [...links].sort((a,b)=>String(a[1].label).localeCompare(String(b[1].label))))select.add(new Option(item.type+': '+item.label,value));
  select.value=previous||(target?key(target):'');
  if(params.get('category')==='Operational')byId('documentCategoryFilter').value='Operational';
 }
 function contextHref(link){
  if(link.type==='Project')return 'project-workspace.html?id='+encodeURIComponent(link.id);
  if(link.type==='Contract')return 'maintenance-workspace.html?id='+encodeURIComponent(link.id);
  // Client and site associations can span jobs: show all linked releases in DMS.
  return 'documents.html?'+new URLSearchParams({category:'Operational',link_type:link.type,link_value:link.type==='Client'?link.name:link.id,link_label:link.label});
 }
 async function showDocument(doc){
  let section=byId('documentContextDetails');
  if(!section){section=document.createElement('div');section.id='documentContextDetails';section.className='section';byId('dPurpose').closest('.section').after(section);}
  section.replaceChildren();const heading=document.createElement('h3');heading.textContent=doc.category+' document';section.append(heading);
  for(const link of doc.documentLinks){const p=document.createElement('p'),a=document.createElement('a');a.href=contextHref(link);a.textContent=link.type+': '+link.label;p.append(a);section.append(p);}
  if(doc.category!=='Operational')return;
  try{
   const r=await fetch(API_BASE+'/documents/'+doc.id+'/metadata',{headers:authHeaders({Accept:'application/json'}),cache:'no-store'});
   const metadata=await r.json();
   if(!r.ok||selectedDocument!==doc)return;
   if(metadata.can_download_master){
    const master=document.createElement('button');master.className='btn outline';master.textContent='Download editable master';
    master.onclick=async()=>{
     master.disabled=true;
     try{const result=await fetch(API_BASE+'/documents/'+doc.id+'/master',{headers:authHeaders(),cache:'no-store'});if(!result.ok){const err=await result.json();throw Error(err.message||'Unable to download the editable master.');}
      const blob=await result.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(result.headers.get('Content-Disposition')||'').match(/filename="([^"]+)"/)?.[1]||'document-master';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
     }catch(e){const error=document.createElement('p');error.setAttribute('role','alert');error.textContent=e.message;section.append(error);}finally{master.disabled=false;}
    };section.append(master);
   }
   if(!metadata.can_edit)return;
   if(metadata.link_history?.length){
    const history=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Client and job link history';history.append(summary);
    for(const event of metadata.link_history){const p=document.createElement('p');p.textContent=event.performed_at+' · '+event.performed_by+' · '+event.reason+' — '+event.before.map(x=>x.label).join(', ')+' → '+event.after.map(x=>x.label).join(', ');history.append(p);}section.append(history);
   }
   const button=document.createElement('button');button.className='btn outline';button.textContent='Edit client and job links';button.onclick=()=>editLinks(doc);section.append(button);
  }catch(e){/* The document remains readable when metadata permissions cannot load. */}
 }
 async function editLinks(doc){
  let dialog=byId('documentLinksDialog');if(dialog)dialog.remove();
  dialog=document.createElement('dialog');dialog.id='documentLinksDialog';dialog.style.cssText='width:min(660px,90vw);border:1px solid #ddd;border-radius:12px;padding:24px';
  const heading=document.createElement('h2');heading.textContent='Edit client and job links';
  const select=document.createElement('select');select.multiple=true;select.size=10;select.style.cssText='width:100%;margin-bottom:12px';select.setAttribute('aria-label','Linked clients and jobs');
  const reason=document.createElement('textarea');reason.placeholder='Reason for changing these links';reason.setAttribute('aria-label',reason.placeholder);reason.maxLength=3000;reason.style.cssText='width:100%;box-sizing:border-box';
  const message=document.createElement('p');message.setAttribute('role','status');
  const save=document.createElement('button');save.className='btn green';save.textContent='Save links';save.disabled=true;
  const cancel=document.createElement('button');cancel.className='btn outline';cancel.textContent='Cancel';cancel.onclick=()=>dialog.close();
  dialog.append(heading,select,reason,message,save,cancel);document.body.append(dialog);dialog.showModal();
  try{await loadOptions();renderOptions(select,doc.documentLinks);save.disabled=false;}catch(e){message.textContent=e.message;}
  save.onclick=async()=>{
   const links=Array.from(select.selectedOptions).map(o=>JSON.parse(o.value));
   if(!links.length||!reason.value.trim()){message.textContent='Select at least one link and enter a reason.';return;}
   save.disabled=true;message.textContent='Saving…';
   try{
    const r=await fetch(API_BASE+'/documents/'+doc.id+'/links',{method:'PUT',headers:authHeaders({'Content-Type':'application/json'}),body:JSON.stringify({document_links:links,expected_links:doc.documentLinks,reason:reason.value.trim()})});
    const data=await r.json();if(!r.ok)throw Error(data.message||'Unable to save links.');
    doc.documentLinks=data.document_links;populateFilters();applyDocumentFilters();showDocument(doc);dialog.close();
   }catch(e){message.textContent=e.message;save.disabled=false;}
  };
 }
 byId('documentTableReset').addEventListener('click',()=>{byId('documentCategoryFilter').value='';byId('documentLinkFilter').value='';});
 byId('reqExistingDocument').addEventListener('change',updateRequest);
 return {key,categoryChanged,resetRequest,updateRequest,searchOptions,validateRequest,appendRequest,populateFilters,showDocument,
  accepts:file=>/\.docx$/i.test(file.name)||(category()==='Operational'&&/\.xlsx$/i.test(file.name))};
})();
