/* Contract-scoped work selectors and read-only site history for Take 5. */
window.VeroTake5WorkContext=function({request,changed,getAssessment,readonly}){
 const $=id=>document.getElementById(id),node=(tag,text)=>{const el=document.createElement(tag);if(text!=null)el.textContent=text;return el;};
 let swms=[],contracts=[],siteTicket=0,contextTicket=0,cache=new Map();
 function fill(select,items,value,placeholder){select.replaceChildren(new Option(placeholder,''));items.forEach(([label,id])=>select.append(new Option(label,String(id))));select.value=value==null?'':String(value);}
 const label=d=>[d.reference,d.title].filter(Boolean).join(' · ');
 function task(){const p=getAssessment().payload,select=$('take5_swms'),items=swms.map(d=>[label(d),d.id]);
  if(p.swms_id&&!items.some(x=>String(x[1])===String(p.swms_id)))items.push([p.task||'Saved SWMS',p.swms_id]);
  let selected=p.task_other?'other':p.swms_id;
  if(!selected&&p.task){items.push([p.task,'legacy']);selected='legacy';}
  items.push(['Other','other']);fill(select,items,selected,'Select a SWMS…');
  $('take5_other_task').hidden=!p.task_other;$('take5_task').value=p.task_other?p.task:'';$('take5_task').required=!!p.task_other;
 }
 function sites(cid,selected){const items=(cache.get(String(cid))||[]).map(s=>[[s.site_code,s.site_name].filter(Boolean).join(' · '),s.id]);const p=getAssessment().payload;
  if(selected&&!items.some(x=>String(x[1])===String(selected)))items.push([p.site||'Saved site',selected]);
  if(!selected&&p.site){items.push([p.site,'legacy']);selected='legacy';}
  fill($('take5_site'),items,selected,cid?'Select a site…':'Select a contract first');$('take5_site').disabled=!cid;
 }
 async function loadSites(cid,selected){const ticket=++siteTicket;if(!cid){sites(null,null);return;}
  sites(cid,selected);$('take5_site').disabled=true;$('take5WorkStatus').textContent='Loading contract sites…';
  try{const data=await request('/maintenance-contracts/'+cid+'/sites');if(ticket!==siteTicket||getAssessment().payload.contract_id!==cid)return;cache.set(String(cid),data.sites||[]);sites(cid,selected);$('take5WorkStatus').textContent=(data.sites||[]).length?'':'No sites are linked to this contract.';}
  catch(e){if(ticket===siteTicket){$('take5WorkStatus').textContent=e.message;$('take5WorkStatus').append(retry('Retry sites',()=>loadSites(cid,selected)));}}
 }
 function retry(text,fn){const b=node('button',text);b.type='button';b.className='secondary';b.onclick=fn;return b;}
 function historyList(title,items,empty,url){const section=node('section');section.append(node('h4',title));if(items===null){section.append(node('p','These risk details are not available to your account.'));return section;}
  if(!items.length)section.append(node('p',empty));else{const ul=node('ul');items.forEach(item=>{const li=node('li'),a=node('a',item.title);a.href=url(item);a.target='_blank';a.rel='noopener';li.append(a,node('small',item.detail));ul.append(li);});section.append(ul);}return section;}
 async function context(){const p=getAssessment().payload,ticket=++contextTicket,root=$('take5SiteContext');root.replaceChildren();root.hidden=!p.site_id||!p.contract_id;if(root.hidden)return;
  root.append(node('p','Loading known site risks and events…'));
  try{const data=await request('/take5/site-context?'+new URLSearchParams({contract_id:p.contract_id,site_id:p.site_id}));if(ticket!==contextTicket)return;
   root.replaceChildren(node('h3','Known risks and previous events'));root.append(node('p',data.site.site+(data.site.address?' · '+data.site.address:'')));
   const risks=data.risks===null?null:(data.risks||[]).map(r=>({...r,title:[r.code,r.title].filter(Boolean).join(' · '),detail:r.score==null?'Awaiting approved assessment':'Approved residual score: '+r.score}));
   root.append(historyList('Known site risks',risks,'No applicable risks recorded for this site.',r=>'risk.html?risk_id='+encodeURIComponent(r.id)));
   const events=(data.events||[]).map(e=>({...e,detail:[e.date,e.status].filter(Boolean).join(' · ')}));
   root.append(historyList(data.events_scope||'Events you can access',events,'No previous events are visible for this site.',e=>'incident-management.html?event='+encodeURIComponent(e.id)));
   if(data.event_total>events.length)root.append(node('p','Showing the latest '+events.length+' of '+data.event_total+' accessible events.'));
  }catch(e){if(ticket===contextTicket){root.replaceChildren(node('p','Unable to load site history: '+e.message),retry('Retry site history',context));}}
 }
 function render(){task();const p=getAssessment().payload,items=contracts.map(c=>[c.contract_name,c.id]);let cid=p.contract_id;
  if(cid&&!items.some(x=>String(x[1])===String(cid)))items.push([p.contract||'Saved contract',cid]);
  if(!cid&&p.contract){items.push([p.contract,'legacy']);cid='legacy';}
  fill($('take5_contract'),items,cid,'Select a contract…');void loadSites(p.contract_id,p.site_id);void context();}
 async function load(){try{const data=await Promise.all([request('/swms'),request('/maintenance-contracts')]);swms=(data[0].items||[]).filter(d=>d.kind==='document'&&d.status==='Current');contracts=data[1].contracts||[];$('take5WorkStatus').textContent='';render();}
  catch(e){$('take5SourcesStatus').replaceChildren(node('span','Unable to load work choices: '+e.message+' '),retry('Retry work choices',load));}}
 $('take5_swms').addEventListener('change',()=>{const p=getAssessment().payload,v=$('take5_swms').value;if(v==='legacy')return;const wasOther=p.task_other;p.task_other=v==='other';p.swms_id=v&&v!=='other'?Number(v):null;p.task=p.task_other?(wasOther?p.task:''):(swms.find(d=>String(d.id)===v)?label(swms.find(d=>String(d.id)===v)):'');changed();task();});
 $('take5_contract').addEventListener('change',()=>{const p=getAssessment().payload,v=$('take5_contract').value;if(v==='legacy')return;p.contract_id=v?Number(v):null;p.contract=contracts.find(c=>String(c.id)===v)?.contract_name||'';p.site_id=null;p.site='';contextTicket++;$('take5SiteContext').hidden=true;$('take5SiteContext').replaceChildren();changed();void loadSites(p.contract_id,null);});
 $('take5_site').addEventListener('change',()=>{const p=getAssessment().payload,v=$('take5_site').value;if(v==='legacy')return;p.site_id=v?Number(v):null;const site=(cache.get(String(p.contract_id))||[]).find(s=>String(s.id)===v);p.site=site?[site.site_code,site.site_name].filter(Boolean).join(' · '):'';changed();void context();});
 return {render,load};
};
