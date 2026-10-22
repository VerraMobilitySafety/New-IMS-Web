/* One shared page menu, backed by the controlled document register. */
(()=>{
 'use strict';
 const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
 function init(){
  const main=document.querySelector('main');if(!main)return;
  const page=location.pathname.split('/').pop()||'index.html';
  const targets={'change-management.html':'#changeContent > .actions','continual-improvement-management.html':'.improvement-actions','documents.html':'.document-actions','records.html':'.records-toolbar','risk.html':'.vero-risk-primary-actions','incident-management.html':'#new-report'};
  Object.assign(targets,{'project-management.html':'.project-toolbar','maintenance-management.html':'.project-toolbar','asset-management.html':'#assetAdd','client-services-sites.html':'.site-register-actions'});
  let row=targets[page]?main.querySelector(targets[page]):main.querySelector(':scope > .actions');
  if(page==='incident-management.html')row=row?.closest('.toolbar');
  if(page==='asset-management.html')row=row?.closest('.vr-actions');
  if(page==='risk.html'&&row){const filters=main.querySelector('#veroCompactFilterBarV3');if(filters?.contains(row))filters.before(row);}
  if(!row){row=document.createElement('div');row.className='actions';const hero=main.querySelector(':scope > .global-hero,:scope > .workspace-hero,:scope > .hero');if(hero)hero.after(row);else main.prepend(row);}
  row.classList.add('vero-related-action-row');
  const menu=document.createElement('details');menu.className='vero-related-documents';
  const summary=document.createElement('summary');summary.textContent='Related documents';
  const list=document.createElement('div');list.className='vero-related-document-list';list.setAttribute('aria-label','Related documents');
  menu.append(summary,list);row.append(menu);
  if(page==='asset-management.html'){
   const types=main.querySelector('#assetTypesDialog'),register=main.querySelector('#assetRegisterView');
   if(types&&register){const move=()=>{const target=(!types.hidden?types:register).querySelector('.vr-actions');if(target&&menu.parentElement!==target){target.classList.add('vero-related-action-row');target.append(menu);}};new MutationObserver(move).observe(types,{attributes:true,attributeFilter:['hidden']});move();}
  }
  const style=document.createElement('style');style.textContent='.vero-related-documents{position:relative;margin-left:auto;align-self:center;font:600 12px Montserrat,Arial,sans-serif}.vero-related-documents>summary{list-style:none;cursor:pointer;background:#fff;color:#3d3935;border:1px solid #d7d3d0;border-radius:8px;padding:12px 16px}.vero-related-documents>summary::-webkit-details-marker{display:none}.vero-related-documents>summary:after{content:" ▾"}.vero-related-document-list{position:absolute;right:0;top:calc(100% + 7px);width:350px;max-width:calc(100vw - 48px);max-height:360px;overflow:auto;background:white;color:#3d3935;border:1px solid #ddd;border-radius:10px;box-shadow:0 8px 24px #0002;z-index:100;padding:10px}.vero-related-document-list a{display:block;color:inherit;text-decoration:none;padding:12px;border-radius:6px;line-height:1.6}.vero-related-document-list a:hover,.vero-related-document-list a:focus{background:#f1f4e5}.vero-related-document-list small{display:block;color:#706b66;font-weight:400}.vero-related-document-list p{padding:8px;margin:0;line-height:1.6}.vero-related-document-list button{font:inherit;margin:8px}.vero-related-documents:focus-within>summary{outline-offset:3px}@media(max-width:600px){.vero-related-documents{margin-left:auto}}';document.head.append(style);
  style.textContent+='main .vero-related-action-row{display:flex;align-items:center;flex-wrap:wrap;gap:9px;width:100%;box-sizing:border-box;margin-bottom:20px}main .vero-related-action-row>.vero-related-documents{display:block;order:100;flex:0 0 auto;width:max-content;max-width:100%;margin-left:auto;margin-bottom:0}main .vero-related-documents>summary{width:auto;white-space:nowrap}main .vero-related-documents:not([open])>.vero-related-document-list{display:none}';
  let loading=false;
  async function load(){
   if(loading)return;loading=true;list.replaceChildren();const message=document.createElement('p');message.setAttribute('role','status');message.textContent='Loading related documents…';list.append(message);
   try{
    const token=localStorage.getItem('vero_session_token');if(!token)throw Error('Sign in to view related documents.');
    const page=location.pathname.split('/').pop()||'index.html';
    const response=await fetch(API+'/document-pages?'+new URLSearchParams({page}),{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store'});
    const data=await response.json();if(!response.ok)throw Error(data.message||'Unable to load related documents.');
    list.replaceChildren();
    if(!data.documents?.length){message.textContent='No documents linked to this page yet.';list.append(message);}
    for(const doc of data.documents||[]){const a=document.createElement('a'),version=document.createElement('small');a.href='documents.html?'+new URLSearchParams({document:doc.id});a.textContent=[doc.document_number,doc.document_title].filter(Boolean).join(' · ');version.textContent='Version '+(doc.version_number||'—');a.append(version);list.append(a);}
   }catch(error){list.replaceChildren(message);message.textContent=error.message;const retry=document.createElement('button');retry.type='button';retry.textContent='Retry';retry.onclick=load;list.append(retry);}finally{loading=false;}
  }
  menu.addEventListener('toggle',()=>{if(menu.open)load();});
  document.addEventListener('click',event=>{if(!menu.contains(event.target))menu.open=false;});
  menu.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.open=false;summary.focus();}});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
