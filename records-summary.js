/* Records-only personal summaries. Display counts never grant access. */
(()=>{
 let identity=null;
 const id=value=>/^[1-9]\d*$/.test(String(value??''))?String(value):null;
 function render(){
  const set=(key,value,note)=>{const el=document.getElementById(key);el.textContent=value;el.nextElementSibling.textContent=note};
  const rows=window.recordsSummarySnapshot;
  const requests=window.recordsSummaryCopyCount;
  const validRequests=Array.isArray(rows)&&Number.isSafeInteger(requests)&&requests>=0;
  set('kpiCopyRequests',validRequests?String(requests):'—',validRequests?'Your submitted or under-review copy requests.':'Your request total is currently unavailable.');
  if(!Array.isArray(rows)){
   for(const key of ['kpiTotalRecords','kpiMyRecords','kpiClassifiedRecords','kpiDueDisposal'])set(key,'—','Waiting for a successful records load.');
   return;
  }
  set('kpiTotalRecords',String(rows.length),'Records available to your account; independent of filters.');
  if(!id(identity?.id)){
   for(const key of ['kpiMyRecords','kpiClassifiedRecords','kpiDueDisposal'])set(key,'—','Verified account identity unavailable.');
   return;
  }
  const mine=rows.filter(r=>id(r.owner?.user_id)===id(identity.id));
  const unknownOwner=rows.some(r=>!r.owner||!Object.hasOwn(r.owner,'user_id')||(r.owner.user_id!==null&&!id(r.owner.user_id)));
  const count=(n,unknown)=>String(n)+(unknown?' known':'');
  const ownerNote=unknownOwner?' Some record ownership is unavailable.':'';
  set('kpiMyRecords',count(mine.length,unknownOwner),'Records assigned to your account.'+ownerNote);
  const classified=mine.filter(r=>['Public','Confidential'].includes(r.security_classification)).length;
  set('kpiClassifiedRecords',count(classified,unknownOwner||mine.some(r=>!Object.hasOwn(r,'security_classification'))),'Your Public or Confidential records.'+ownerNote);
  const today=new Date();today.setHours(0,0,0,0);let due=0,unknownDue=unknownOwner;
  for(const r of mine){
   if(r.status==='Disposed'||r.has_active_hold===true)continue;
   if(typeof r.has_active_hold!=='boolean'||typeof r.status!=='string'||!r.retention||!Object.hasOwn(r.retention,'disposal_due_date')){unknownDue=true;continue}
   const raw=r.retention.disposal_due_date;if(raw===null)continue;
   const date=/^\d{4}-\d{2}-\d{2}$/.test(raw)?new Date(raw+'T00:00:00'):null;
   if(!date||!Number.isFinite(date.getTime())||`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`!==raw){unknownDue=true;continue}
   if(date<=today)due++;
  }
  set('kpiDueDisposal',count(due,unknownDue),'Due today or earlier; excludes disposed records and active holds.'+(unknownDue?' Some eligibility data is unavailable.':''));
 }
 function init(){
  // Move the existing nodes after the shared adapter has installed their handlers.
  const panel=document.getElementById('recordsRegisterPanel'),more=panel.querySelector('details.vr-more'),body=more?.querySelector('.vr-more-body');
  if(body){
   const view=panel.querySelector('select[aria-label="View"]')?.closest('label');
   if(view)body.prepend(view);
   body.append(document.getElementById('categoryFilter'));
   // Categories remain accessible to ordinary users; management-only children keep their gates.
   more.classList.remove('records-manager-filter');
  }
  render();
  const token=localStorage.getItem('vero_session_token');if(!token)return;
  fetch('https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api/auth/me',{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store'})
   .then(r=>{if(!r.ok)throw Error('Identity unavailable');return r.json()})
   .then(data=>{identity=data.user||data;render()}).catch(()=>{identity=null;render()});
 }
 window.addEventListener('records-summary-change',render);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
