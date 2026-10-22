/* Repeatable assessments; one change approval and one Records entry cover the entire list. */
window.VeroChangeRiskList=(()=>{'use strict';
function mount(host,config){
 const rows=[];let locked=false,busy=false,destroyed=false;
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(label,fn)=>{const b=node('button',label,'secondary');b.type='button';b.onclick=fn;return b;};
 const list=node('div',null,'change-risk-list'),add=button('+ Add another risk',()=>addRisk());add.id='changeAddRisk';
 const review=node('section',null,'change-risk-ai'),feedback=node('p');review.hidden=true;feedback.setAttribute('role','status');
 const suggest=button('Suggest risks from this change',suggestRisks);suggest.id='changeSuggestRisks';
 const tools=node('div',null,'change-risk-list-tools'),count=node('span');tools.append(suggest,add,count);host.replaceChildren(tools,review,feedback,list);
 function changed(){config.onDirty?.();summarise();}
 function summarise(){rows.forEach((row,i)=>{
  const r=row.editor.getValue();row.summary.textContent='Risk '+(i+1)+' · '+(r.risk_title||'New risk')+(r.residual?' · Residual '+(r.residual.likelihood*5*r.residual.impact):' · Not assessed');
  row.remove.hidden=rows.length===1||locked;row.help.hidden=locked;
 });count.textContent=rows.length+' risk'+(rows.length===1?'':'s')+' · expand a risk to review it';add.hidden=locked;add.disabled=busy||rows.length>=20;suggest.hidden=locked;suggest.disabled=busy;}
 async function suggestRisks(){
  if(locked||busy)return;
  const context=config.getContext();
  if(!String(context.scope||context.title||'').trim()){feedback.textContent='Describe the proposed change first.';return;}
  const content=Object.entries(context).map(([k,v])=>k+': '+String(v)).join('\n');
  if(content.length>12000){feedback.textContent='The change description is too long for one AI review. Shorten it to 12,000 characters or less, then retry. Your form is retained.';return;}
  const messages=[];for(let i=0;i<content.length;i+=4000)messages.push({role:'user',content:content.slice(i,i+4000)});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),120000);
  review.hidden=true;review.replaceChildren();config.setBusy(true);feedback.textContent='Identifying distinct risks and proposed actions from the whole change…';
  try{
   const result=await config.assist({mode:'suggest_risks',messages},controller.signal);if(destroyed)return;
   if(result.stage==='question'){feedback.textContent=result.question+' Add the answer to the change description, then try again.';return;}
   const entries=result.draft?.risks;if(!Array.isArray(entries)||!entries.length)throw Error('The AI did not return a risk list.');
   feedback.textContent='Review these suggestions before adding them. Your existing assessments will be retained.';
   review.append(node('h4','Suggested risks · review before adding'),node('p','AI may miss risks. Check the descriptions, controls, ratings and proposed actions. Select the risks to add; you can edit them afterwards.'));
   const choices=[];
   for(const entry of entries){
    const r=entry.assessment,box=node('input'),label=node('label'),card=node('article',null,'change-risk-suggestion');box.type='checkbox';
    const duplicate=rows.some(row=>row.editor.getValue().risk_title.trim().toLowerCase()===r.risk_title.trim().toLowerCase());box.checked=!duplicate;box.disabled=duplicate;
    label.append(box,node('strong',r.risk_title+(duplicate?' · already included':'')));card.append(label,node('p',r.risk_description));
    card.append(node('p',['inherent','residual','target'].map((k,i)=>['Inherent','Current residual','Target'][i]+': '+r[k].likelihood*5*r[k].impact).join(' · ')),node('p','Existing controls: '+(r.controls_summary||'Confirm existing controls.')),node('p','Proposed controls: '+(r.treatments_summary||'Review required.')));
    const detail=node('details');detail.append(node('summary','Rating explanations and proposed actions'),node('p',r.justification));
    for(const action of r.treatment_actions||[])detail.append(node('p','Action: '+action.title+' · select owner and due date after adding'));
    card.append(detail);review.append(card);choices.push({box,entry});
   }
   for(const gap of result.gaps||[])review.append(node('p',gap));
   for(const source of result.sources||[]){const a=node('a',source.title);a.href='documents.html?document='+encodeURIComponent(source.document_id||String(source.id).split('-')[1]);a.target='_blank';a.rel='noopener';review.append(a);}
   const apply=button('Add selected risks',()=>{
    if(busy||locked)return;
    const chosen=choices.filter(c=>c.box.checked&&!c.box.disabled);if(!chosen.length){feedback.textContent='Select at least one suggested risk.';return;}
    const first=rows.length===1?rows[0]:null,r=first?.editor.getValue();
    const blank=r&&!r.risk_title&&!r.risk_description&&!r.risk_owner_user_id&&!r.inherent&&!r.residual&&!r.target&&!r.controls_summary&&!r.treatments_summary&&!r.justification&&!r.classification_path.length&&!r.treatment_actions.length&&!r.control_ids.length&&!r.document_ids.length;
    if(rows.length+chosen.length-(blank?1:0)>20){feedback.textContent='A change supports up to 20 risks. Select fewer suggestions.';return;}
    if(blank){first.editor.setValue(chosen.shift().entry.assessment);}
    rows.forEach(row=>row.details.open=false);
    chosen.forEach(c=>addRisk({id:crypto.randomUUID(),assessment:c.entry.assessment},false));
    rows[blank?0:rows.length-chosen.length].details.open=true;
    review.hidden=true;review.replaceChildren();feedback.textContent='Selected risks added. Review each assessment and assign an owner and due date to every treatment action before submitting.';changed();
   });
   const discard=button('Discard suggestions',()=>{review.hidden=true;review.replaceChildren();feedback.textContent='Suggestions discarded. Your assessments are unchanged.';});review.append(apply,discard);review.hidden=false;
  }catch(e){feedback.textContent=(e.name==='AbortError'?'AI suggestions timed out.':e.message)+' Your existing assessments are unchanged. Retry or add risks manually.';}
  finally{clearTimeout(timer);config.setBusy(false);}
 }

 function addRisk(entry={id:crypto.randomUUID(),assessment:{}},opening=true){
  if(rows.length>=20||locked||busy)return;
  if(opening)rows.forEach(r=>r.details.open=false);
  const details=node('details',null,'change-risk-entry'),summary=node('summary'),toolbar=node('div',null,'change-risk-tools'),body=node('div',null,'change-risk-body'),editorHost=node('div');
  details.open=opening;details.append(summary,body);body.append(toolbar,editorHost);list.append(details);
  const row={id:entry.id,details,summary,editor:null,messages:[],pending:null};
  details.addEventListener('toggle',()=>{if(details.open)rows.filter(r=>r!==row).forEach(r=>r.details.open=false);});
  const help=button('AI help for this risk',()=>{ai.hidden=!ai.hidden;if(!ai.hidden)answer.focus();});
  const remove=button('Remove risk',()=>{if(locked||busy||rows.length===1)return;if(!confirm('Remove this risk from the unsaved change?'))return;row.editor.destroy();details.remove();rows.splice(rows.indexOf(row),1);changed();});
  row.help=help;row.remove=remove;toolbar.append(help,remove);
  const linked=(config.linkedRisks||[]).find(r=>r.risk_key===entry.id);
  if(linked){const a=node('a','Open Master Risk');a.href='risk.html?risk_id='+encodeURIComponent(linked.risk_id);toolbar.append(a);}
  const ai=node('section',null,'change-risk-ai');ai.hidden=true;ai.setAttribute('aria-label','AI help for this risk');
  const intro=node('p','Describe this risk and what is already controlled. Vero will ask questions, then suggest an assessment for this risk only.'),chat=node('div'),label=node('label','Your answer'),answer=node('textarea'),send=button('Ask Vero',ask),feedback=node('p'),apply=button('Apply draft to this risk',()=>{
   if(!row.pending||busy||locked)return;const existing=row.editor.getValue();
   row.editor.setValue({...row.pending,risk_owner_user_id:existing.risk_owner_user_id,treatment_actions:[...(existing.treatment_actions||[]),...(row.pending.treatment_actions||[]).filter(a=>!(existing.treatment_actions||[]).some(e=>e.title===a.title))]});
   row.pending=null;apply.hidden=true;feedback.textContent='AI draft applied. Review its classification, all three ratings, controls and justification.';changed();
  });
  answer.maxLength=1500;label.append(answer);feedback.setAttribute('role','status');apply.hidden=true;
  ai.append(intro,chat,label,send,feedback,apply);toolbar.after(ai);
  row.editor=window.VeroRiskAssessmentForm.mount(editorHost,{options:config.options,idPrefix:rows.length?'change-risk-'+entry.id:'change',layout:'compact',embedded:true,initial:entry.assessment||{}});
  rows.push(row);editorHost.addEventListener('input',changed);editorHost.addEventListener('change',changed);editorHost.addEventListener('click',()=>queueMicrotask(summarise));
  async function ask(){
   const input=answer.value.trim();if(!input||locked||busy)return;
   const r=row.editor.getValue(),context=config.getContext(),first=row.messages.length===0;
   const content=first?['Assess only this one risk within the proposed change.',
    'Change: '+String(context.title||'').slice(0,300),
    'Scope: '+String(context.scope||'').slice(0,300),
    'Affected: '+String(context.affected||'').slice(0,300),
    'Risk: '+String(r.risk_title||'').slice(0,255)+' '+String(r.risk_description||'').slice(0,400),
    'Confirmed existing controls: '+String(r.controls_summary||'').slice(0,300),input].join('\n'):input;
   const pending=[...row.messages,{role:'user',content}];const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
   row.pending=null;apply.hidden=true;config.setBusy(true);feedback.textContent='Preparing help for this risk…';
   try{
    const result=await config.assist({mode:'risk',messages:pending},controller.signal);if(destroyed)return;
    row.messages=pending;answer.value='';chat.replaceChildren();
    if(result.stage==='question'){row.messages.push({role:'assistant',content:result.question});chat.append(node('p',result.question));feedback.textContent='';}
    else if(result.stage==='draft'){
     row.pending=result.draft.risk;apply.hidden=false;
     row.messages.push({role:'assistant',content:('Prepared an assessment for '+row.pending.risk_title+': '+row.pending.risk_description).slice(0,3500)});
     feedback.textContent='Draft ready for this risk. Applying it will replace this assessment; your selected owner and existing treatment actions will be retained.';
     chat.append(node('strong',row.pending.risk_title),node('p',row.pending.risk_description));
     for(const gap of result.gaps||[])chat.append(node('p',gap));
     for(const source of result.sources||[]){const d=node('details'),s=node('summary',source.title),a=node('a','Open supporting document');a.href='documents.html?document='+encodeURIComponent(source.document_id||String(source.id).split('-')[1]);a.target='_blank';a.rel='noopener';d.append(s,node('p',source.excerpt),a);chat.append(d);}
    }else throw Error('AI response could not be read.');
   }catch(e){feedback.textContent=(e.name==='AbortError'?'AI help timed out.':e.message)+' Your answer is retained. Retry or complete this risk manually.';}
   finally{clearTimeout(timer);config.setBusy(false);}
  }
  row.ai=ai;row.apply=apply;row.answer=answer;row.send=send;
  summarise();if(opening){row.editor.focus();changed();}
 }
 const initial=config.initial?.length?config.initial:[{id:config.changeId,assessment:{}}];
 initial.forEach((entry,i)=>addRisk(entry,i===0));
 return {
  getValue:()=>rows[0].editor.getValue(),getRisks:()=>rows.map(r=>({id:r.id,assessment:r.editor.getValue()})),
  setBusy(value){busy=value;rows.forEach(r=>{r.editor.setBusy(value||locked);r.help.disabled=r.remove.disabled=r.send.disabled=r.answer.disabled=r.apply.disabled=value||locked;});summarise();},
  setLocked(value){locked=value;if(locked){review.hidden=true;review.replaceChildren();}this.setBusy(busy);},
  destroy(){destroyed=true;rows.forEach(r=>r.editor.destroy());host.replaceChildren();}
 };
}
return {mount};
})();
