(() => {
 const byId=id=>document.getElementById(id);
 const collator=new Intl.Collator('en-AU',{numeric:true,sensitivity:'base'});
 const ids=['docColumnDocument','docColumnVersion','docColumnOwner','docColumnPublishedFrom','docColumnPublishedTo','docColumnReviewFrom','docColumnReviewTo'];
 let sortKey='',direction=1;
 const text=value=>String(value??'').trim();
 const day=value=>{if(!value)return '';const date=new Date(value);return Number.isFinite(date.getTime())?String(value).slice(0,10):'';};
 const valueFor=(doc,key)=>({document:doc.documentNumber,version:doc.controlledVersion,owner:doc.documentOwner,published:day(doc.effectiveDate||doc.createdAt),review:day(doc.nextReviewDate)})[key];
 const missing=value=>!text(value)||text(value)==='—';
 window.refreshDocumentColumnOwners=()=>{
  const select=byId('docColumnOwner'),selected=select.value;
  const owners=[...new Set(currentDocuments().map(d=>d.documentOwner).filter(v=>!missing(v)))].sort(collator.compare);
  select.replaceChildren(new Option('All owners',''),...owners.map(owner=>new Option(owner,owner)));
  if(owners.includes(selected))select.value=selected;
 };
 window.transformDocumentTable=documents=>{
  const query=text(byId('docColumnDocument').value).toLowerCase(),version=text(byId('docColumnVersion').value).replace(/^v/i,'').toLowerCase(),owner=byId('docColumnOwner').value;
  const pf=byId('docColumnPublishedFrom').value,pt=byId('docColumnPublishedTo').value,rf=byId('docColumnReviewFrom').value,rt=byId('docColumnReviewTo').value;
  const invalid=(pf&&pt&&pf>pt)||(rf&&rt&&rf>rt);
  const inRange=(date,from,to)=>(!from&&!to)|| (!!date&&(!from||date>=from)&&(!to||date<=to));
  let rows=invalid?[]:documents.filter(d=>(!query||[d.documentNumber,d.documentTitle].some(v=>text(v).toLowerCase().includes(query)))&&(!version||text(d.controlledVersion).toLowerCase().includes(version))&&(!owner||d.documentOwner===owner)&&inRange(valueFor(d,'published'),pf,pt)&&inRange(valueFor(d,'review'),rf,rt));
  if(sortKey)rows=[...rows].sort((a,b)=>{
   const av=valueFor(a,sortKey),bv=valueFor(b,sortKey);
   if(missing(av)!==missing(bv))return missing(av)?1:-1;
   return (collator.compare(text(av),text(bv))*direction)||collator.compare(text(a.documentNumber),text(b.documentNumber))||collator.compare(text(a.id),text(b.id));
  });
  byId('documentTableCount').textContent=invalid?'Check date filters: From must be on or before To.':`${rows.length} of ${currentDocuments().length} documents`;
  for(const th of document.querySelectorAll('[data-doc-sort]')){
   const active=th.dataset.docSort===sortKey;
   th.setAttribute('aria-sort',active?(direction===1?'ascending':'descending'):'none');
   th.querySelector('.doc-sort-mark').textContent=active?(direction===1?'↑':'↓'):'↕';
   const details=th.querySelector('details');details.classList.toggle('has-filter',[...details.querySelectorAll('input,select')].some(el=>!!el.value));
  }
  return rows;
 };
 for(const id of ids)byId(id).addEventListener(byId(id).tagName==='SELECT'?'change':'input',applyDocumentFilters);
 for(const button of document.querySelectorAll('[data-doc-sort-button]'))button.addEventListener('click',()=>{const key=button.dataset.docSortButton;direction=sortKey===key?-direction:1;sortKey=key;applyDocumentFilters();});
 byId('documentTableReset').addEventListener('click',()=>{
  for(const id of [...ids,'documentSearch','documentTypeFilter'])byId(id).value='';
  sortKey='';direction=1;
  document.querySelectorAll('.doc-column-filter').forEach(details=>details.open=false);
  documentView='all';document.querySelectorAll('.document-view').forEach(button=>button.classList.toggle('active',button.dataset.view==='all'));
  applyDocumentFilters();
 });
})();

