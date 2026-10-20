/* Counts describe the authorised current-document register, independent of filters. */
(()=>{
 function reviewDay(value){
  const match=/^(\d{4})-(\d{2})-(\d{2})(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d))?$/.exec(String(value||''));
  if(!match)return null;
  const year=Number(match[1]),month=Number(match[2])-1,day=Number(match[3]),date=new Date(Date.UTC(year,month,day));
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month&&date.getUTCDate()===day?date.getTime()/86400000:null;
 }
 function render(){
  const root=document.getElementById('documentsSummary');if(!root)return;
  const set=(key,value,note)=>{root.querySelector('[data-count="'+key+'"]').textContent=value;root.querySelector('[data-note="'+key+'"]').textContent=note};
  if(documentLoadState!=='ready'){
   for(const key of ['total','mine','due'])set(key,'—',documentLoadState==='error'?'Unavailable — refresh to retry':'Loading documents…');
   return;
  }
  const docs=currentDocuments();set('total',String(docs.length),'Current documents you can access');
  if(!documentIdentity){for(const key of ['mine','due'])set(key,'—','Confirming your account…');return}
  if(!documentIdentity.id&&!String(documentIdentity.email||'').trim()){for(const key of ['mine','due'])set(key,'—','Account identity unavailable');return}
  const owned=docs.filter(documentIsMine),unresolved=docs.filter(d=>!(Number.isInteger(Number(d.documentOwnerUserId))&&Number(d.documentOwnerUserId)>0)&&!String(d.documentOwnerEmail||'').trim()).length;
  set('mine',String(owned.length)+(unresolved?' known':''),unresolved?unresolved+' document'+(unresolved===1?' has':'s have')+' unconfirmed ownership':'Current documents assigned to you');
  const now=new Date(),today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())/86400000;
  const dates=owned.map(d=>reviewDay(d.nextReviewDate)),unknown=dates.filter(d=>d===null).length;
  const due=dates.filter(d=>d!==null&&d>=today&&d<today+30).length;
  set('due',String(due)+(unknown||unresolved?' known':''),'Upcoming reviews, excluding overdue'+(unknown?'; '+unknown+' owned documents lack a valid date':'')+(unresolved?'; some ownership unknown':''));
  root.querySelector('[data-count="due"]').parentElement.title='Next Review date is today or within the next 29 calendar days. Overdue documents are excluded.';
 }
 function init(){
  const root=document.createElement('section');root.id='documentsSummary';root.className='vr-summary';root.setAttribute('aria-label','Document summary');root.setAttribute('aria-live','polite');
  for(const [key,label] of [['total','Total Documents'],['mine','My Documents'],['due','Mine Due in 30 Days']]){
   const card=document.createElement('div');card.className='vr-card';const value=document.createElement('b'),title=document.createElement('span'),note=document.createElement('small');
   value.dataset.count=key;value.textContent='—';title.textContent=label;note.dataset.note=key;card.append(value,title,note);root.append(card);
  }
  document.querySelector('.document-actions').after(root);render();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
 }
 window.addEventListener('documents-summary-change',render);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
