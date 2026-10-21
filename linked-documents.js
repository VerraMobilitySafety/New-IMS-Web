/* Display the current DMS releases in a job without copying their files. */
window.VeroLinkedDocuments={async mount(element,link,fetcher,base,request){
 if(!element)return;
 const generation={};element._documentGeneration=generation;element.replaceChildren();
 const heading=document.createElement('h3');heading.textContent='Controlled operational documents';
 const manage=document.createElement('a');manage.className='btn outline';manage.textContent='Open DMS / request document';
 manage.href='documents.html?'+new URLSearchParams({category:'Operational',link_type:link.type,link_value:link.type==='Client'?link.name:link.id,link_label:link.label||''});
 const list=document.createElement('div');list.setAttribute('role','status');list.textContent='Loading controlled documents…';
 element.append(heading,manage,list);
 const query=new URLSearchParams({entity_type:'Operational',status:'Current',link_type:link.type,link_value:link.type==='Client'?link.name:link.id});
 try{
  let data;
  if(request)data=await request('/documents?'+query);
  else{const result=await fetcher(base+'/documents?'+query,{cache:'no-store'});data=await result.json();if(!result.ok)throw Error(data.message||'Unable to load controlled documents.');}
  if(element._documentGeneration!==generation)return;
  list.replaceChildren();
  const docs=data.documents||[];
  if(!docs.length){list.textContent='No current operational documents linked yet.';return;}
  for(const doc of docs){
   const row=document.createElement('p'),a=document.createElement('a'),small=document.createElement('small');
   a.href='documents.html?'+new URLSearchParams({document:doc.id});a.textContent=[doc.document_number,doc.document_title].filter(Boolean).join(' · ');
   small.textContent=' — Version '+doc.version_number+' · '+(doc.document_owner_name||doc.document_owner||'Unassigned');
   row.append(a,small);list.append(row);
  }
 }catch(error){if(element._documentGeneration===generation){list.textContent=error.message;const retry=document.createElement('button');retry.textContent='Retry';retry.onclick=()=>this.mount(element,link,fetcher,base,request);list.append(document.createTextNode(' '),retry);}}
}};
