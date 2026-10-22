/* Guided intake, source visibility, and review before the existing DMS submit. */
window.VeroSwmsAssistant=(()=>{'use strict';
 const el=id=>document.getElementById(id),API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
 const first='What work are you planning?';
 let messages=[{role:'assistant',content:first}],result=null,active=false,ticket=0,controller=null;
 const node=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;return n;};
 function renderChat(){const log=el('swmsConversation');log.replaceChildren();for(const m of messages){const item=node('article'),label=node('strong',m.role==='assistant'?'Vero':'You'),text=node('p',m.content);item.className='swms-chat-message '+m.role;item.append(label,text);log.append(item);}log.scrollTop=log.scrollHeight;requestAnimationFrame(()=>{log.scrollTop=log.scrollHeight;});}
 function setBusy(value){active=value;for(const id of ['swmsAsk','swmsIntakeContract','swmsAnswer','swmsManual','swmsRestart'])el(id).disabled=value;el('swmsAsk').textContent=value?'Preparing response…':'Send answer';}
 function context(data){const host=el('swmsAiContext');host.replaceChildren();host.hidden=data.stage==='question';if(host.hidden)return;
  host.append(node('h3','DMS sources and review points'));if(data.jurisdiction)host.append(node('p','Work jurisdiction: '+data.jurisdiction));
  if(!data.sources?.length)host.append(node('p','No supporting DMS passages were selected for this response.'));
  for(const source of data.sources||[]){const details=node('details'),summary=node('summary',source.title+' · Version '+(source.version||'—')),p=node('p',source.excerpt||''),a=node('a','Open controlled document');a.href='documents.html?document='+encodeURIComponent(source.document_id);a.target='_blank';a.rel='noopener';details.append(summary,p,a);host.append(details);}
  const list=node('ul');for(const gap of data.gaps||[])list.append(node('li',gap));host.append(list);
  if(data.coverage?.service_unreadable)host.append(node('p','Some service documents could not be read. Check them directly in Document Management.'));
  if(data.coverage?.governance?.pending||data.coverage?.governance?.state==='Preparing')host.append(node('p','Some DMS documents are still being indexed; this is not a complete document search.'));
 }
 function showForm(manual=false){if(manual&&result)manual=false;
  el('swmsIntake').hidden=true;el('swmsForm').hidden=false;el('swmsContract').value=el('swmsIntakeContract').value;
  el('swmsAiReviewLabel').hidden=manual;el('swmsAiConfirmed').required=!manual;el('swmsAiConfirmed').checked=false;el('swmsReviewConfirmed').checked=false;
  if(manual){result=null;el('swmsAiContext').hidden=true;}
  el('swmsFormStatus').textContent='';el('swmsDialog').scrollTop=0;el('swmsForm').querySelector('input[name=title]').focus();
 }
 function startAgain(){if(result){el('swmsForm').reset();window.VeroSwmsApplyDraft({steps:[{}]});el('swmsContract').value=el('swmsIntakeContract').value;}messages=[{role:'assistant',content:first}];result=null;el('swmsAnswer').value='';el('swmsAiStatus').textContent='';el('swmsAiContext').hidden=true;renderChat();}
 function init(){
  renderChat();
  el('swmsManual').onclick=()=>showForm(true);
  el('swmsRestart').onclick=startAgain;
  el('swmsBackToQuestions').onclick=()=>{const changed=el('swmsIntakeContract').value!==el('swmsContract').value;el('swmsForm').hidden=true;el('swmsIntake').hidden=false;el('swmsIntakeContract').value=el('swmsContract').value;if(changed)startAgain();el('swmsDialog').scrollTop=0;};
  el('swmsIntakeContract').onchange=()=>{el('swmsContract').value=el('swmsIntakeContract').value;startAgain();};
  el('swmsForm').addEventListener('input',event=>{if(!['swmsAiConfirmed','swmsReviewConfirmed'].includes(event.target.id)){el('swmsAiConfirmed').checked=false;el('swmsReviewConfirmed').checked=false;}});
  el('swmsDialog').addEventListener('close',()=>{if(active){ticket++;controller?.abort();setBusy(false);el('swmsAiStatus').textContent='AI request stopped. Your answers are retained.';}});
  el('swmsChatForm').onsubmit=async event=>{
   event.preventDefault();if(active)return;
   const cid=Number(el('swmsIntakeContract').value),answer=el('swmsAnswer').value.trim();
   if(!cid){el('swmsAiStatus').textContent='Select the relevant client service first.';el('swmsIntakeContract').focus();return;}
   if(!answer){el('swmsAnswer').focus();return;}
   const pending=[...messages,{role:'user',content:answer}];if(pending.length>24){el('swmsAiStatus').textContent='Start a new conversation or open the form manually to continue.';return;}
   const version=++ticket;controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),60000);
   setBusy(true);el('swmsAiStatus').textContent='Checking relevant DMS documents and preparing the next step…';
   try{
    const response=await fetch(API+'/swms/assist',{method:'POST',signal:controller.signal,headers:{Authorization:'Bearer '+localStorage.getItem('vero_session_token'),'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({contract_id:cid,messages:pending})});
    const data=await response.json();if(!response.ok)throw Error(data.message||'Unable to prepare the AI draft.');
    if(version!==ticket||!el('swmsDialog').open)return;
    if(!['question','draft'].includes(data.stage))throw Error('The AI response could not be read. Please retry.');
    context(data);messages=pending;el('swmsAnswer').value='';
    if(data.stage==='question'){
     messages.push({role:'assistant',content:data.question});renderChat();el('swmsAiStatus').textContent='';el('swmsAnswer').disabled=false;el('swmsAnswer').focus();
    }else{
     result={...data,contractId:cid};window.VeroSwmsApplyDraft(data.draft);messages.push({role:'assistant',content:'The draft is ready. Review the prefilled form, its sources and the outstanding confirmation points before submitting.'});renderChat();showForm();el('swmsAiStatus').textContent='';
    }
   }catch(error){if(version===ticket)el('swmsAiStatus').textContent=(error.name==='AbortError'?'AI assistance timed out.':error.message)+' Your answer is retained. Retry, or open the form manually.';}
   finally{clearTimeout(timeout);if(version===ticket)setBusy(false);}
  };
 }
 return {
  init,
  services(items,selected){el('swmsIntakeContract').replaceChildren(new Option('Select a client service…',''));for(const s of items)el('swmsIntakeContract').add(new Option((window.VeroContractLabels?.label(s.label)??s.label)+(s.client?' · '+s.client:''),s.id));el('swmsIntakeContract').value=selected;},
  append(data){if(active)throw Error('Wait for AI assistance to finish before submitting.');if(result){if(data.contract_id!==result.contractId)throw Error('The client service changed. Return to the questions and prepare a draft for this service.');if(!el('swmsAiConfirmed').checked)throw Error('Review the AI draft and confirm it before submitting.');data.ai_assisted=true;data.ai_review_confirmed=true;data.ai_sources=(result.sources||[]).map(s=>({document_id:s.document_id,version:s.version}));data.ai_gaps=result.gaps||[];}},
  reset(){startAgain();el('swmsForm').hidden=true;el('swmsIntake').hidden=false;el('swmsAiReviewLabel').hidden=true;el('swmsAiConfirmed').required=false;}
 };
})();
