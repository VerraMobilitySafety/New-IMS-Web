/* Ask Vero: all answer content is text; links are constrained to known Vero pages. */
(()=>{
 'use strict';
 const form=document.getElementById('veroHelpForm');if(!form)return;
 const input=document.getElementById('homeAI'),button=document.getElementById('veroHelpSubmit'),result=document.getElementById('veroHelpResult');
 const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
 const pages=new Set(['incident-management.html','project-management.html','documents.html','my-actions.html','maintenance-management.html','compliance.html','risk.html','sites.html']);
 function text(tag,value,parent){const el=document.createElement(tag);el.textContent=value;parent.appendChild(el);return el;}
 function safeLink(href){
  if(typeof href!=='string'||!/^[-a-z]+\.html(?:\?document=[1-9]\d*)?$/.test(href))return false;
  const [page,query]=href.split('?');return pages.has(page)&&(!query||page==='documents.html');
 }
 function message(value){result.hidden=false;result.replaceChildren();text('p',value,result);}
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(button.disabled)return;
  const question=input.value.trim();
  if(!question||question.length>1000){message('Enter a question of 1 to 1,000 characters.');input.focus();return;}
  const token=localStorage.getItem('vero_session_token');
  if(!token){message('Please sign in to ask Vero a question.');return;}
  button.disabled=true;result.setAttribute('aria-busy','true');message('Finding the right place in Vero…');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  try{
   const response=await fetch(API+'/help/ask',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({question}),signal:controller.signal,cache:'no-store'});
   if(response.status===401)throw Error('Your session has expired. Please sign in again.');
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(data.message||'Ask Vero is unavailable right now. Please try again.');
   if(!Array.isArray(data.sources)||typeof data.message!=='string')throw Error('Vero could not read this answer. Please try again.');
   message(data.message);
   if(data.mode==='search')text('small','Matched Vero guidance · AI routing is currently unavailable.',result);
   for(const source of data.sources.slice(0,3)){
    if(!safeLink(source.href)||typeof source.title!=='string'||typeof source.summary!=='string')continue;
    const card=document.createElement('article');card.className='vero-help-card';result.appendChild(card);
    const heading=text('h4','',card),link=text('a',source.title,heading);link.href=source.href;
    text('p',source.summary,card);
    if(Array.isArray(source.steps)&&source.steps.length){const list=document.createElement('ol');card.appendChild(list);source.steps.slice(0,6).forEach(step=>{if(typeof step==='string')text('li',step,list);});}
   }
  }catch(error){message(error.name==='AbortError'?'That took too long. Your question is still here—please try again.':error.message||'Ask Vero is unavailable right now. Please try again.');}
  finally{clearTimeout(timer);button.disabled=false;result.setAttribute('aria-busy','false');}
 });
})();

