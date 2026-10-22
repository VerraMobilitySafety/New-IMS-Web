/* A single SWMS register over operational DMS releases and document requests. */
(()=>{'use strict';
const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api',el=id=>document.getElementById(id);
const params=new URLSearchParams(location.search),contextId=params.get('contract_id')||'';
let items=[],services=[],busy=false,loaded=false;
const node=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;return n;};
async function request(path,options={}){
 const r=await fetch(API+path,{...options,headers:{Authorization:'Bearer '+localStorage.getItem('vero_session_token'),Accept:'application/json',...options.headers},cache:'no-store'});
 if(r.status===401){location.replace('login.html?return='+encodeURIComponent('safe-work-method-statement.html'+location.search));throw Error('Please sign in again.');}
 const data=await r.json();if(!r.ok)throw Error(data.message||'Unable to complete this request.');return data;
}
const pending=x=>x.kind==='request'&&!['Rejected','Withdrawn','Cancelled'].includes(x.status);
const due=x=>x.kind==='document'&&x.status==='Current'&&x.review_date&&x.review_date.slice(0,10)<=new Date().toLocaleDateString('en-CA');
const serviceLabel=l=>{const current=services.find(s=>String(s.id)===String(l.id));const text=current?.label||l.label||'Client service';return window.VeroContractLabels?.label(text)??text;};
const contractLinks=x=>(x.document_links||[]).filter(l=>l.type==='Contract');
function render(){
 const scoped=items.filter(x=>!el('swmsServiceFilter').value||contractLinks(x).some(l=>String(l.id)===el('swmsServiceFilter').value));
 for(const [id,count] of [['swmsTotal',scoped.length],['swmsCurrent',scoped.filter(x=>x.kind==='document'&&x.status==='Current').length],['swmsPending',scoped.filter(pending).length],['swmsDue',scoped.filter(due).length]])el(id).textContent=count;
 const q=el('swmsSearch').value.trim().toLowerCase(),state=el('swmsStateFilter').value;
 const rows=scoped.filter(x=>(!q||[x.title,x.reference,...(x.document_links||[]).map(l=>l.label)].some(v=>String(v||'').toLowerCase().includes(q)))&&(!state||(state==='pending'?pending(x):state==='due'?due(x):state==='current'?x.kind==='document'&&x.status==='Current':x.status===state)));
 const body=el('swmsRows');body.replaceChildren();el('swmsStatus').textContent=rows.length+' of '+scoped.length+' SWMS';
 if(!rows.length){const tr=node('tr'),td=node('td',scoped.length?'No SWMS match these filters.':'No SWMS saved yet. Generate a SWMS to get started.');td.colSpan=5;tr.append(td);body.append(tr);return;}
 for(const item of rows){
  const tr=node('tr'),title=node('td'),a=node('button',item.title||'Untitled SWMS');a.type='button';a.className='swms-title-button';a.addEventListener('click',event=>{event.preventDefault();window.VeroSwmsDocument.open(item,load);});title.append(a,node('small',item.reference||'—'));if(item.category&&item.category!=='Operational')title.append(node('small','Existing '+item.category.toLowerCase()+' classification'));tr.append(title);
  const links=node('td');for(const l of contractLinks(item)){const a=node('a',serviceLabel(l));a.href='maintenance-workspace.html?id='+encodeURIComponent(l.id);links.append(a,node('br'));}if(!links.childNodes.length)links.textContent='No client service linked';tr.append(links);
  const status=node('td'),badge=node('span',item.status||'—');badge.className='swms-badge';status.append(badge);tr.append(status,node('td',item.version||'—'),node('td',item.review_date?new Date(item.review_date.slice(0,10)+'T12:00:00').toLocaleDateString('en-AU'):'—'));
  tr.className='swms-clickable-row';tr.tabIndex=0;tr.setAttribute('aria-label','Open '+(item.title||'Untitled SWMS'));
  tr.addEventListener('click',event=>{if(event.target.closest('a,button,input,select,textarea')||window.getSelection()?.toString())return;a.click();});
  tr.addEventListener('keydown',event=>{if(event.target===tr&&(event.key==='Enter'||event.key===' ')){event.preventDefault();a.click();}});
  if(item.kind==='request'&&item.file_name){const download=node('button','Download draft');download.type='button';download.className='secondary';download.onclick=()=>downloadDraft(item,download);title.append(download);}
  body.append(tr);
 }
}
async function downloadDraft(item,button){button.disabled=true;try{
 const r=await fetch(API+'/document-requests/'+item.id+'/draft',{headers:{Authorization:'Bearer '+localStorage.getItem('vero_session_token')}});
 if(!r.ok){const data=await r.json();throw Error(data.message||'Unable to download draft.');}
 const url=URL.createObjectURL(await r.blob()),a=node('a');a.href=url;a.download=item.file_name||'SWMS-draft.docx';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}catch(e){el('swmsStatus').textContent=e.message;}finally{button.disabled=false;}}
async function load(){
 el('swmsRefresh').disabled=true;el('swmsStatus').textContent='Loading SWMS…';
 try{const data=await request('/swms'+(contextId?'?contract_id='+encodeURIComponent(contextId):''));items=data.items||[];loaded=true;
  const old=el('swmsServiceFilter').value,seen=new Map(services.map(s=>[String(s.id),s.label]));for(const item of items)for(const l of contractLinks(item)){if(!seen.has(String(l.id)))seen.set(String(l.id),serviceLabel(l));}
  el('swmsServiceFilter').replaceChildren(new Option('All client services',''));for(const [id,label] of [...seen].sort((a,b)=>a[1].localeCompare(b[1])))el('swmsServiceFilter').add(new Option(window.VeroContractLabels?.label(label)??label,id));el('swmsServiceFilter').value=old||contextId;render();
 }catch(e){loaded=false;el('swmsStatus').textContent=e.message;for(const id of ['swmsTotal','swmsCurrent','swmsPending','swmsDue'])el(id).textContent='—';el('swmsRows').replaceChildren();}
 finally{el('swmsRefresh').disabled=false;}
}
function addStep(value={}){
 const host=el('swmsSteps'),fieldset=node('fieldset');fieldset.className='swms-step';fieldset.append(node('legend','Work step '+(host.children.length+1)));
 for(const [key,label,hint] of [['activity','Step','Name this stage of the work'],['action','Action','Describe what is done in this step'],['implementation','Implementation and monitoring','How and when are controls put in place and checked?'],['owner','Responsible person','Who implements and checks these controls?']]){
  const lab=node('label',label+' *'),input=node(key==='owner'?'input':'textarea');input.dataset.field=key;input.required=true;input.maxLength=key==='activity'?500:3000;input.placeholder=hint;input.value=value[key]||'';lab.append(input);fieldset.append(lab);
 }
 const risks=node('div');risks.className='swms-step-risks';fieldset.append(risks);
 for(const risk of value.risks||[{hazards:value.hazards||'',controls:value.controls||''}])addRisk(risks,risk);
 const add=node('button','+ Add risk / hazard');add.type='button';add.className='secondary';add.onclick=()=>{if(document.querySelectorAll('.swms-risk').length<30)addRisk(risks);};fieldset.append(add);
 const remove=node('button','Remove step');remove.type='button';remove.className='secondary';remove.onclick=()=>{fieldset.remove();[...host.children].forEach((f,i)=>f.querySelector('legend').textContent='Work step '+(i+1));};fieldset.append(remove);host.append(fieldset);
}
function addRisk(host,value={}){
 const risk=node('fieldset');risk.className='swms-risk';risk.append(node('legend','Risk / hazard'));
 for(const [key,label] of [['hazards','Risk / hazard'],['controls','Mitigation / controls']]){const lab=node('label',label+' *'),input=node('textarea');input.dataset.riskField=key;input.required=true;input.maxLength=3000;input.value=value[key]||'';lab.append(input);risk.append(lab);}
 const grid=node('div');grid.className='swms-grid';const outputs=[];
 const labels=['Insignificant','Minor','Medium','Major','Catastrophic'],likelihood=['Rare','Unlikely','Possible','Likely','Almost Certain'];
 for(const [prefix,title] of [['initial','Initial'],['residual','Residual']]){
  const inputs=[];for(const [suffix,options] of [['impact',labels],['likelihood',likelihood]]){const lab=node('label',title+' '+suffix+' *'),select=node('select');select.dataset.riskField=prefix+'_'+suffix;select.required=true;select.append(new Option('Select…',''));options.forEach((name,i)=>select.append(new Option(name+' ('+(suffix==='impact'?i+1:(i+1)*5)+')',suffix==='impact'?i+1:(i+1)*5)));select.value=value[prefix+'_'+suffix]||'';lab.append(select);grid.append(lab);inputs.push(select);}
  const output=node('output');output.setAttribute('aria-live','polite');const update=()=>{const score=Number(inputs[0].value)*Number(inputs[1].value);output.textContent=score?title+' risk: '+score+' · '+(score>=75?'Significant':score>=45?'High':score>=20?'Moderate':'Low'):title+' risk: unscored';};inputs.forEach(i=>i.addEventListener('change',update));update();outputs.push(output);
 }
 risk.append(grid,...outputs);const remove=node('button','Remove risk');remove.type='button';remove.className='secondary';remove.onclick=()=>{if(host.children.length>1)risk.remove();};risk.append(remove);host.append(risk);
}
window.VeroSwmsApplyDraft=data=>{for(const [key,value] of Object.entries(data)){if(key==='steps')continue;const field=el('swmsForm').elements.namedItem(key);if(field)field.value=value||'';}el('swmsSteps').replaceChildren();for(const step of data.steps||[])addStep(step);};
window.VeroSwmsAssistant.init();
el('swmsGenerate').onclick=()=>{el('swmsFormStatus').textContent='';el('swmsDialog').showModal();};
el('swmsClose').onclick=()=>{if(!busy)el('swmsDialog').close();};el('swmsDialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
el('swmsAddStep').onclick=()=>{if(el('swmsSteps').children.length<30)addStep();};addStep();
el('swmsForm').onsubmit=async event=>{
 event.preventDefault();if(busy||!el('swmsForm').reportValidity())return;
 if(!el('swmsSteps').children.length){el('swmsFormStatus').textContent='Add at least one work step.';return;}
 const formData=new FormData(el('swmsForm')),data=Object.fromEntries(formData);data.ppe=formData.getAll('ppe');data.competencies=formData.getAll('competencies');data.contract_id=Number(data.contract_id);data.review_confirmed=el('swmsReviewConfirmed').checked;
 try{window.VeroSwmsAssistant.append(data);}catch(error){el('swmsFormStatus').textContent=error.message;return;}
 data.steps=[...el('swmsSteps').children].map(f=>({...Object.fromEntries([...f.querySelectorAll('[data-field]')].map(i=>[i.dataset.field,i.value])),risks:[...f.querySelectorAll('.swms-risk')].map(r=>Object.fromEntries([...r.querySelectorAll('[data-risk-field]')].map(i=>[i.dataset.riskField,i.tagName==='SELECT'?Number(i.value):i.value])))}));
 busy=true;el('swmsSubmit').disabled=true;el('swmsClose').disabled=true;el('swmsFormStatus').textContent='Generating and saving to Operational Documents…';
 try{const result=await request('/swms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  el('swmsDialog').close();el('swmsForm').reset();window.VeroSwmsAssistant.reset();el('swmsSteps').replaceChildren();addStep();if(contextId)el('swmsContract').value=contextId;
  el('swmsSaved').hidden=false;el('swmsSaved').textContent='SWMS saved as Document Request #'+result.request.id+'. It is linked to the selected client service and awaits Document Control review.';await load();
 }catch(e){el('swmsFormStatus').textContent=e.message+' Your entered details are still here. If the connection failed, close this window and refresh the register before resubmitting.';}
 finally{busy=false;el('swmsSubmit').disabled=false;el('swmsClose').disabled=false;}
};
el('swmsRefresh').onclick=load;for(const id of ['swmsSearch','swmsServiceFilter','swmsStateFilter'])el(id).addEventListener(id==='swmsSearch'?'input':'change',()=>{if(loaded)render();});
window.addEventListener('vero-risk-auth-ready',async()=>{
 try{const data=await request('/documents/link-options');services=(data.options||[]).filter(x=>x.type==='Contract');window.VeroSwmsAssistant.services(services,contextId);el('swmsContract').replaceChildren(new Option('Select a client service…',''));for(const s of services)el('swmsContract').add(new Option(window.VeroContractLabels?.choice(s)??(s.label+(s.client?' · '+s.client:'')),s.id));el('swmsContract').value=contextId;el('swmsGenerate').disabled=!services.length;el('swmsGenerate').title=services.length?'':'No accessible client services are available.';await load();}
 catch(e){el('swmsStatus').textContent=e.message;}
 finally{window.dispatchEvent(new Event('vero-risk-resources-settled'));}
},{once:true});
})();
