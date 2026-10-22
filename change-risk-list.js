/* Repeatable assessments; one change approval and one Records entry cover the entire list. */
window.VeroChangeRiskList=(()=>{'use strict';
function mount(host,config){
 const rows=[];let locked=false,busy=false,destroyed=false;
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(label,fn)=>{const b=node('button',label,'secondary');b.type='button';b.onclick=fn;return b;};
 const list=node('div',null,'change-risk-list'),add=button('+ Add another risk',()=>addRisk());add.id='changeAddRisk';
 const tools=node('div',null,'change-risk-list-tools'),count=node('span');tools.append(add,count);host.replaceChildren(tools,list);
 function changed(){config.onDirty?.();summarise();}
 function summarise(){rows.forEach((row,i)=>{
  const r=row.editor.getValue();row.summary.textContent='Risk '+(i+1)+' · '+(r.risk_title||'New risk')+(r.residual?' · Residual '+(r.residual.likelihood*5*r.residual.impact):' · Not assessed');
  row.remove.hidden=rows.length===1||locked;row.help.hidden=locked;
 });count.textContent=rows.length+' risk'+(rows.length===1?'':'s')+' · expand a risk to review it';add.hidden=locked;add.disabled=busy||rows.length>=20;}
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
   row.editor.setValue({...row.pending,risk_owner_user_id:existing.risk_owner_user_id,treatment_actions:existing.treatment_actions||[]});
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
    const result=await config.assist({messages:pending},controller.signal);if(destroyed)return;
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
  setLocked(value){locked=value;this.setBusy(busy);},
  destroy(){destroyed=true;rows.forEach(r=>r.editor.destroy());host.replaceChildren();}
 };
}
return {mount};
})();
