/* Existing approved PDF migration. Server remains responsible for authorization. */
(() => {
 const el=id=>document.getElementById(id), dialog=el('approvedImport');
 const types=['Policy','Procedure','Standard','Work Instruction','Safe Work Method Statement','Management Plan','Form','Template','Guideline'];
 let rows=[], inventory=[], busy=false;
 const key=value=>String(value||'').trim().toUpperCase();
 const message=value=>{el('approvedImportMessage').textContent=value;};
 window.openApprovedImport=()=>dialog.showModal();
 el('approvedImportClose').onclick=()=>dialog.close();
 dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 function render(){
  el('approvedImportRows').replaceChildren();
  for(const row of rows){
   const tr=document.createElement('tr'), td=document.createElement('td'); td.textContent=row.file.name;tr.append(td);
   for(const field of ['document_number','document_title','document_type','version_number','document_owner','approval_date','effective_date','review_date']){
    const cell=document.createElement('td'), input=document.createElement(field==='document_type'?'select':'input');
    if(field==='document_type')for(const type of types){const option=document.createElement('option');option.value=type;option.textContent=type;input.append(option);}
    if(field.endsWith('_date'))input.type='date';
    input.value=row[field]||'';input.setAttribute('aria-label',field.replaceAll('_',' ')+' for '+row.file.name);input.style.width=field==='document_title'?'220px':'130px';input.disabled=busy||row.locked;
    input.oninput=()=>{row[field]=input.value;};cell.append(input);tr.append(cell);
   }
   const result=document.createElement('td');result.style.minWidth='190px';result.textContent=row.result||'Ready for review';tr.append(result);el('approvedImportRows').append(tr);
  }
  for(const id of ['approvedImportFiles','approvedImportInventory','approvedImportSubmit','approvedImportClose','approvedImportConfirm'])el(id).disabled=busy;
 }
 function applyInventory(){for(const row of rows){if(row.locked)continue;const matches=inventory.filter(item=>item.file_name===row.file.name);if(matches.length===1)for(const field of ['document_number','document_title','document_type','version_number','document_owner','approval_date','effective_date','review_date'])if(matches[0][field])row[field]=String(matches[0][field]);}render();}
 el('approvedImportInventory').onchange=async event=>{
  try{const file=event.target.files[0];if(!file)return;const data=JSON.parse(await file.text());if(!Array.isArray(data)||data.some(item=>!item||typeof item!=='object'))throw Error('Expected an inventory array.');inventory=data;applyInventory();message('Inventory matched by exact filename. Check all details before importing.');}catch(error){message('Inventory could not be read: '+error.message);}
 };
 el('approvedImportFiles').onchange=event=>{
  // Retain attempted rows so selecting files again cannot silently resubmit them.
  const retained=rows.filter(row=>row.locked);
  rows=[...retained,...Array.from(event.target.files).filter(file=>!retained.some(row=>row.file.name===file.name)).map(file=>{
   const match=file.name.match(/^(IMS\.\S+)\s+(.+)\.pdf$/i), code=match?.[1]||'';
   return {file,document_number:code,document_title:match?.[2]||file.name.replace(/\.pdf$/i,''),document_type:({POL:'Policy',PRO:'Procedure',FRM:'Form',TMP:'Template'})[code.split('.')[3]]||'Procedure',version_number:'',document_owner:'',approval_date:'',effective_date:'',review_date:''};
  })];el('approvedImportConfirm').checked=false;applyInventory();message('Review the details for each selected PDF.');
 };
 el('approvedImportSubmit').onclick=async()=>{
  if(busy)return;
  const pending=rows.filter(row=>!row.locked);
  if(!pending.length)return message('Select PDFs to import.');
  if(!el('approvedImportConfirm').checked)return message('Confirm the existing approval and document details before importing.');
  if(!getToken())return message('Sign in to VERO before importing.');
  busy=true;render();
  try{
   const capability=await fetch(API_BASE+'/documents/import-capabilities',{headers:authHeaders({Accept:'application/json'}),cache:'no-store'});
   if(!capability.ok)throw Error('Approved import service is unavailable. No files imported.');
   const support=await capability.json();
   if(!support.can_import)throw Error('Document Controller permission is required to import approved documents.');
   if(!['approval_date','effective_date','review_date'].every(field=>support.date_fields?.includes(field)))throw Error('The import service does not support all document dates yet. No files imported.');
   for(const row of pending){
    if(!row.file.name.toLowerCase().endsWith('.pdf')||row.file.size===0||row.file.size>25*1024*1024)throw Error('Each file must be a non-empty PDF no larger than 25 MB: '+row.file.name);
    const header=new Uint8Array(await row.file.slice(0,5).arrayBuffer());if(String.fromCharCode(...header)!=='%PDF-')throw Error('Invalid PDF: '+row.file.name);
    for(const field of ['document_number','document_title','version_number','document_owner','approval_date','effective_date','review_date']){row[field]=String(row[field]||'').trim();if(!row[field])throw Error('Missing '+field.replaceAll('_',' ')+' for '+row.file.name);}
    for(const field of ['approval_date','effective_date','review_date']){
     const value=row[field], date=new Date(value+'T00:00:00Z');
     if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw Error('Enter a valid '+field.replaceAll('_',' ')+' for '+row.file.name);
    }
    if(row.approval_date>row.effective_date)throw Error('Approval date cannot be after effective date: '+row.file.name);
    if(row.review_date<=row.effective_date)throw Error('Review date must be after effective date: '+row.file.name);
    if(!types.includes(row.document_type))throw Error('Choose a supported type for '+row.file.name);
   }
   const numbers=new Set();for(const row of rows){const number=key(row.document_number);if(numbers.has(number))throw Error('Repeated document number in this batch: '+row.document_number);numbers.add(number);}
   message('Checking the current library for existing document numbers…');
   const response=await fetch(DOCUMENTS_API,{headers:authHeaders({Accept:'application/json'}),cache:'no-store'});
   if(!response.ok)throw Error('Cannot check the library ('+response.status+'). No files imported.');
   const data=await response.json();if(!Array.isArray(data.documents))throw Error('Unexpected library response. No files imported.');
   const conflicts=(doc,row)=>key(doc.document_number)===key(row.document_number)&&(!['superseded','withdrawn'].includes(String(doc.status||'').toLowerCase())||String(doc.version_number||'').trim()===row.version_number);
   for(const row of pending)if(data.documents.some(doc=>conflicts(doc,row))){const matches=data.documents.filter(doc=>conflicts(doc,row));throw Error('Document number already exists in VERO: '+row.document_number+'. Existing records: '+matches.map(doc=>'ID '+doc.id+' | '+(doc.document_title||doc.file_name||'Untitled')+' | version '+(doc.version_number||'unknown')+' | status '+(doc.status||'unknown')+' | owner '+(doc.document_owner_name||doc.document_owner||'unknown')+' | approval '+(doc.approval_date||'unknown')+' | effective '+(doc.effective_date||'unknown')+' | review '+(doc.review_date||'unknown')).join('; ')+'. Use the revision workflow for existing documents.');}
   for(const row of pending){
    const form=new FormData();for(const field of ['document_number','document_title','document_type','version_number','document_owner','approval_date','effective_date','review_date'])form.append(field,row[field]);
    for(const [field,value]of Object.entries({import_approved:'true',entity_type:'Governance',status:'Current',access_level:'Internal',allow_view:'true',allow_download:'false',ai_searchable:'false',description:'Migrated existing approved document.'}))form.append(field,value);
    form.append('file',row.file,row.file.name);row.locked=true;row.result='Importing';render();
    try{
     const uploaded=await fetch(API_BASE+'/documents',{method:'POST',headers:authHeaders(),body:form});
     if(!uploaded.ok)throw Error('Upload returned '+uploaded.status);
     const saved=await uploaded.json();
     if(!saved.document||!['approval_date','effective_date','review_date'].every(field=>saved.document[field]===row[field]))throw Error('The service did not confirm the saved dates');
     row.result='Imported';render();
    }catch(error){row.result='Outcome unconfirmed — check library before retrying';throw Error(row.file.name+': '+error.message+'. Import stopped; check the library before retrying this file.');}
   }
   message('Imported '+pending.length+' approved document(s).');await loadDocuments();
  }catch(error){message(error.message);await loadDocuments();}
  finally{busy=false;render();}
 };
})();

