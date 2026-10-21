/* One maintenance file index; the files stay controlled by their source system. */
window.VeroMaintenanceDocuments={async mount(element,contract,request,base){
 const generation={};element._maintenanceDocumentGeneration=generation;element.replaceChildren();
 const panel=document.createElement('section');panel.className='maintenance-documents';element.append(panel);
 const heading=document.createElement('h3');heading.textContent='Documents and linked records';
 const note=document.createElement('p');note.className='note';note.textContent='Current controlled documents for this contract, its sites and shared client use, plus linked records. Each item opens from its original location.';
 const manage=document.createElement('a');manage.className='btn outline';manage.textContent='Request a controlled document';manage.href='documents.html?'+new URLSearchParams({category:'Operational',link_type:'Contract',link_value:contract.id,link_label:contract.contract_name||''});
 const controls=document.createElement('div');controls.style.cssText='display:flex;flex-wrap:wrap;gap:12px;margin:16px 0';
 const search=document.createElement('input');search.type='search';search.placeholder='Search documents, records or sites…';search.setAttribute('aria-label','Search linked documents');search.style.cssText='flex:1;min-width:180px;padding:10px';
 const filter=document.createElement('select');filter.setAttribute('aria-label','Document or record type');filter.style.cssText='padding:10px';
 for(const [value,label] of [['','All documents and records'],['document','Controlled documents'],['record','Records']])filter.add(new Option(label,value));
 controls.append(search,filter);
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Loading linked documents and records…';
 const wrap=document.createElement('div');wrap.style.overflowX='auto';
 const table=document.createElement('table');table.className='contract-site-table';table.style.minWidth='680px';
 const head=document.createElement('thead'),header=document.createElement('tr');
 for(const text of ['Document / record','Type','Version / status','Linked through','Open']){const th=document.createElement('th');th.scope='col';th.textContent=text;header.append(th);}head.append(header);
 const body=document.createElement('tbody');table.append(head,body);wrap.append(table);panel.append(heading,note,manage,controls,status,wrap);
 const active=()=>element._maintenanceDocumentGeneration===generation&&element.contains(panel);
 let items=[];
 function render(){
  if(!active())return;
  const q=search.value.trim().toLowerCase();const rows=items.filter(x=>(!filter.value||x.kind===filter.value)&&[x.title,x.code,x.type,...x.linked].some(v=>String(v||'').toLowerCase().includes(q)));
  status.textContent=rows.length+' of '+items.length+' linked documents and records';body.replaceChildren();
  if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=5;td.textContent=items.length?'No matching documents or records.':'No current documents or accessible records linked yet.';tr.append(td);body.append(tr);return;}
  for(const item of rows){
   const row=document.createElement('tr');
   for(const text of [[item.code,item.title].filter(Boolean).join(' · '),item.type,item.version,item.linked.join(' · ')]){const td=document.createElement('td');td.textContent=text;row.append(td);}
   const actions=document.createElement('td'),link=document.createElement('a');link.textContent=item.kind==='document'?'Open document':'View record';link.href=item.kind==='document'?'documents.html?'+new URLSearchParams({document:item.id}):'records.html?'+new URLSearchParams({record_id:item.id});actions.append(link);
   if(item.contentPath){
    const button=document.createElement('button');button.type='button';button.textContent='Open file';button.style.marginLeft='10px';
    button.onclick=()=>window.VeroProjectDocumentViewer.open({contentUrl:base+item.contentPath,fileName:item.filename||item.title,fetch:(url,options={})=>fetch(url,{...options,headers:{...options.headers,Authorization:'Bearer '+localStorage.getItem('vero_session_token')}})});
    actions.append(button);
   }
   row.append(actions);body.append(row);
  }
 }
 search.oninput=render;filter.onchange=render;
 try{
  const data=await request('/maintenance-contracts/'+encodeURIComponent(contract.id)+'/documents');
  if(!active())return;
  const seen=new Set();
  for(const d of data.documents||[]){const key='document:'+d.id;if(seen.has(key))continue;seen.add(key);items.push({kind:'document',id:d.id,code:d.document_number,title:d.document_title,type:d.document_type||'Controlled document',version:'Version '+d.version_number,linked:d.linked_via||[]});}
  for(const r of data.records||[]){const key='record:'+r.id;if(seen.has(key))continue;seen.add(key);items.push({kind:'record',id:r.id,code:r.record_code,title:r.title,type:r.kind||'Record',version:'Record',linked:r.linked_via||[],contentPath:r.content_path,filename:r.filename});}
  items.sort((a,b)=>String(a.title).localeCompare(String(b.title)));render();
 }catch(error){
  if(!active())return;status.textContent=error.message;const retry=document.createElement('button');retry.type='button';retry.textContent='Retry';retry.onclick=()=>this.mount(element,contract,request,base);status.append(document.createTextNode(' '),retry);
 }
}};
