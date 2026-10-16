(() => {
 const byId=id=>document.getElementById(id);
 const collator=new Intl.Collator('en-AU',{numeric:true,sensitivity:'base'});
 let sortKey='',direction=1;
 const text=value=>String(value??'').trim();
 const day=value=>{if(!value)return '';const date=new Date(value);return Number.isFinite(date.getTime())?String(value).slice(0,10):'';};
 const valueFor=(doc,key)=>({document:doc.documentNumber,version:doc.controlledVersion,owner:doc.documentOwner,published:day(doc.effectiveDate||doc.createdAt),review:day(doc.nextReviewDate)})[key];
 const missing=value=>!text(value)||text(value)==='—';
 window.transformDocumentTable=documents=>{
  let rows=documents;
  if(sortKey)rows=[...rows].sort((a,b)=>{
   const av=valueFor(a,sortKey),bv=valueFor(b,sortKey);
   if(missing(av)!==missing(bv))return missing(av)?1:-1;
   return (collator.compare(text(av),text(bv))*direction)||collator.compare(text(a.documentNumber),text(b.documentNumber))||collator.compare(text(a.id),text(b.id));
  });
  byId('documentTableCount').textContent=`${rows.length} of ${currentDocuments().length} documents`;
  for(const th of document.querySelectorAll('[data-doc-sort]')){
   const active=th.dataset.docSort===sortKey;
   th.setAttribute('aria-sort',active?(direction===1?'ascending':'descending'):'none');
   th.querySelector('.doc-sort-mark').textContent=active?(direction===1?'↑':'↓'):'↕';
  }
  return rows;
 };
 for(const button of document.querySelectorAll('[data-doc-sort-button]'))button.addEventListener('click',()=>{const key=button.dataset.docSortButton;direction=sortKey===key?-direction:1;sortKey=key;applyDocumentFilters();});
 byId('documentTableReset').addEventListener('click',()=>{
  for(const id of ['documentSearch','documentTypeFilter'])byId(id).value='';
  sortKey='';direction=1;
  documentView='all';document.querySelectorAll('.document-view').forEach(button=>button.classList.toggle('active',button.dataset.view==='all'));
  applyDocumentFilters();
 });
})();



