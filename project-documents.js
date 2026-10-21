/* Files remain in their source system; IDs are scoped by source kind. */
window.VeroProjectDocuments={async mount(element,projectId,request,base,count){
 const generation={};element._projectDocumentsGeneration=generation;element.replaceChildren();
 const panel=document.createElement('section');panel.style.padding='18px';element.append(panel);
 const note=document.createElement('p');note.textContent='Project uploads, current controlled documents and linked records, including shared client and site documents you can access. Each item opens from its original location.';
 const manage=document.createElement('a');manage.className='btn outline';manage.textContent='Request a controlled document';manage.href='documents.html?'+new URLSearchParams({category:'Operational',link_type:'Project',link_value:projectId});
 const controls=document.createElement('div');controls.style.cssText='display:flex;flex-wrap:wrap;gap:12px;margin:16px 0';
 const search=document.createElement('input');search.type='search';search.placeholder='Search documents and records…';search.setAttribute('aria-label','Search project documents');search.style.cssText='flex:1;min-width:160px;padding:10px';
 const filter=document.createElement('select');filter.setAttribute('aria-label','Document or record type');filter.style.padding='10px';
 for(const [value,label] of [['','All documents and records'],['upload','Project uploads'],['document','Controlled documents'],['record','Records']])filter.add(new Option(label,value));
 controls.append(search,filter);
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Loading documents and records…';
 const wrap=document.createElement('div');wrap.style.overflowX='auto';
 const table=document.createElement('table');table.style.cssText='width:100%;min-width:680px;text-align:left;border-spacing:12px';
 const head=document.createElement('thead'),header=document.createElement('tr');
 for(const text of ['Document / record','Type','Version / status','Linked through','Open']){const th=document.createElement('th');th.scope='col';th.textContent=text;header.append(th);}head.append(header);
 const body=document.createElement('tbody');table.append(head,body);wrap.append(table);panel.append(note,manage,controls,status,wrap);
 const active=()=>element._projectDocumentsGeneration===generation&&element.contains(panel);
 if(count)count.textContent='Loading…';
 let items=[];
 function render(){
  if(!active())return;
  const q=search.value.trim().toLowerCase(),rows=items.filter(x=>(!filter.value||x.kind===filter.value)&&[x.title,x.code,x.filename,x.type,...x.linked].some(v=>String(v||'').toLowerCase().includes(q)));
  status.textContent=rows.length+' of '+items.length+' documents and records';if(count)count.textContent=items.length+' documents and records';body.replaceChildren();
  if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=5;td.textContent=items.length?'No matching documents or records.':'No documents or accessible records linked yet.';tr.append(td);body.append(tr);return;}
  for(const item of rows){
   const row=document.createElement('tr');
   for(const text of [[item.code,item.title].filter(Boolean).join(' · '),item.type,item.version,item.linked.join(' · ')]){const td=document.createElement('td');td.textContent=text;row.append(td);}
   const actions=document.createElement('td');
   if(item.kind==='upload'){
    const button=document.createElement('button');button.type='button';button.className='btn outline';button.textContent='Open file';button.dataset.projectDocumentId=item.id;button.dataset.fileName=item.filename||item.title;
    button.onclick=()=>window.VeroProjectDocumentViewer.open({contentUrl:base+'/projects/'+encodeURIComponent(projectId)+'/documents/'+encodeURIComponent(item.id)+'/content',fileName:item.filename||item.title,fetch:request});actions.append(button);
   }else{
    const link=document.createElement('a');link.textContent=item.kind==='document'?'Open document':'View record';link.href=item.kind==='document'?'documents.html?'+new URLSearchParams({document:item.id}):'records.html?'+new URLSearchParams({record_id:item.id});actions.append(link);
   }
   row.append(actions);body.append(row);
  }
 }
 search.oninput=render;filter.onchange=render;
 try{
  const response=await request(base+'/projects/'+encodeURIComponent(projectId)+'/document-index',{cache:'no-store'});
  const data=await response.json();if(!response.ok)throw Error(data.message||'Unable to load documents and records.');
  if(!active())return false;
  const seen=new Set();
  function add(item){const key=item.kind+':'+item.id;if(!seen.has(key)){seen.add(key);items.push(item);}}
  for(const d of data.documents||[])add({kind:'document',id:d.id,code:d.document_number,title:d.document_title,type:d.document_type||'Controlled document',version:'Version '+(d.version_number||1)+' · '+(d.status||'Current'),linked:d.linked_via||[]});
  for(const r of data.records||[])add({kind:'record',id:r.id,code:r.record_code,title:r.title,type:r.kind||'Record',version:r.status||'Record',linked:r.linked_via||[],filename:r.filename});
  for(const u of data.uploads||[])add({kind:'upload',id:u.id,title:u.title,type:u.kind||'Project file',version:'Version '+(u.version_number||1)+' · '+(u.status||'Current'),linked:u.linked_via||[],filename:u.filename});
  items.sort((a,b)=>String(a.title).localeCompare(String(b.title)));render();return true;
 }catch(error){
  if(!active())return false;if(count)count.textContent='Unable to load';status.textContent=error.message;
  const retry=document.createElement('button');retry.type='button';retry.textContent='Retry';retry.onclick=()=>this.mount(element,projectId,request,base,count);status.append(document.createTextNode(' '),retry);return false;
 }
}};
