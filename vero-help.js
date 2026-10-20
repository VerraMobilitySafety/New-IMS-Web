/* Ask Vero: all answer content is text; links are constrained to known Vero pages. */
(()=>{
 'use strict';
 const form=document.getElementById('veroHelpForm');if(!form)return;
 const input=document.getElementById('homeAI'),button=document.getElementById('veroHelpSubmit'),result=document.getElementById('veroHelpResult');
 const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
 const pages=new Set(['incident-management.html','project-management.html','documents.html','my-actions.html','maintenance-management.html','compliance.html','risk.html','sites.html']);
 function text(tag,value,parent){const el=document.createElement(tag);el.textContent=value;parent.appendChild(el);return el;}
 function safeLink(href){
  if(typeof href!=='string'||!/^[-a-z]+\.html(?:\?(?:document=[1-9]\d*|document_id=[1-9]\d*&page=[1-9]\d*))?$/.test(href))return false;
  const [page,query]=href.split('?');return pages.has(page)&&(!query||page==='documents.html');
 }
 function scrollChat(){result.scrollTop=result.scrollHeight;}
 function initials(){
  try{const user=JSON.parse(localStorage.getItem('vero_current_user')||'null');const value=((user?.first_name||'').charAt(0)+(user?.last_name||'').charAt(0)).toUpperCase();if(value)return value;}catch{}
  return document.getElementById('veroAccountAvatar')?.textContent.trim()||'You';
 }
 function bubble(value,user=false){
  result.hidden=false;
  const row=text('div','',result);row.className='vero-chat-message '+(user?'vero-chat-user':'vero-chat-vero');
  text('span',user?initials():'V',row).className='vero-chat-avatar';
  const content=text('div','',row);content.className='vero-chat-content';
  text('span',user?initials():'Vero',content).className='vero-chat-name';
  const body=text('div','',content);body.className='vero-chat-bubble';
  if(value)text('p',value,body);scrollChat();return body;
 }
 function message(value){bubble(value);scrollChat();}
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(button.disabled)return;
  const question=input.value.trim();
  if(!question||question.length>1000){message('Enter a question of 1 to 1,000 characters.');input.focus();return;}
  const token=localStorage.getItem('vero_session_token');
  if(!token){message('Please sign in to ask Vero a question.');return;}
  bubble(question,true);input.value='';
  button.disabled=true;result.setAttribute('aria-busy','true');const reply=bubble('Vero is thinking…');reply.classList.add('vero-chat-pending');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  try{
   const response=await fetch(API+'/help/ask',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({question}),signal:controller.signal,cache:'no-store'});
   if(response.status===401)throw Error('Your session has expired. Please sign in again.');
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(data.message||'Ask Vero is unavailable right now. Please try again.');
   if(!Array.isArray(data.sources)||typeof data.message!=='string')throw Error('Vero could not read this answer. Please try again.');
   reply.replaceChildren();reply.classList.remove('vero-chat-pending');
   const sources=data.sources.slice(0,3);
   const guide=sources.find(source=>safeLink(source.href)&&Array.isArray(source.steps)&&source.steps.length);
   const hasAnswer=typeof data.answer==='string'&&data.answer.trim();
   if(hasAnswer)text('p',data.answer,reply).className='vero-help-answer';
   else if(guide){
    text('p',guide.summary,reply);
    const steps=text('ol','',reply);steps.className='vero-chat-steps';
    guide.steps.slice(0,6).forEach(step=>{if(typeof step==='string')text('li',step,steps);});
    const link=text('a','Open '+guide.title,reply);link.href=guide.href;link.className='vero-chat-action';
   }else if(data.mode==='search'&&sources.length){
    text('p','I couldn’t generate an answer just now. These source passages may help:',reply);
   }else text('p',data.message,reply);
   const documentSources=sources.filter(source=>typeof source.excerpt==='string');
   const coverage=data.document_search;
   if(coverage&&documentSources.length){
    const notes=[];
    if(coverage.state==='Preparing'||coverage.pending>0)notes.push('Some document contents are still being indexed.');
    if(notes.length)text('small',notes.join(' '),reply);
   }
   const sourceBox=sources.length&&!guide?text('details','',reply):null;
   if(sourceBox){sourceBox.className='vero-chat-sources';sourceBox.open=!hasAnswer;text('summary','Sources',sourceBox);}
   for(const source of sources){
    if(!sourceBox)continue;
    if(!safeLink(source.href)||typeof source.title!=='string'||typeof source.summary!=='string')continue;
    const card=document.createElement('article');card.className='vero-help-card';sourceBox.appendChild(card);
    const heading=text('h4','',card),link=text('a',source.title,heading);link.href=source.href;
    text('p',source.summary,card);
    const quotes=Array.isArray(data.quotes)?data.quotes.filter(q=>q.id===source.id&&typeof q.text==='string'):[];
    if(quotes.length){for(const quote of quotes)text('blockquote',quote.text,card);}
    else if(typeof source.excerpt==='string')text('blockquote',source.excerpt,card);
    if(Array.isArray(source.steps)&&source.steps.length){const list=document.createElement('ol');card.appendChild(list);source.steps.slice(0,6).forEach(step=>{if(typeof step==='string')text('li',step,list);});}
   }
  }catch(error){input.value=question;reply.replaceChildren();reply.classList.remove('vero-chat-pending');text('p',error.name==='AbortError'?'That took too long. Your question is still here—please try again.':error.message||'Ask Vero is unavailable right now. Please try again.',reply);}
  finally{clearTimeout(timer);button.disabled=false;result.setAttribute('aria-busy','false');scrollChat();}
 });
})();

