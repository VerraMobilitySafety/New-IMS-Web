/* Accessible monthly charts over permission-scoped server aggregates. */
(()=>{'use strict';
const types=['Hazard','Near Miss','Incident','Unverified'],selectedMonths=new Set();
const label={Hazard:'Hazards','Near Miss':'Near Misses',Incident:'Incidents',Unverified:'Unverified'};
const monthLabel=value=>new Date(value+'-01T00:00:00Z').toLocaleDateString('en-AU',{month:'short',year:'numeric',timeZone:'UTC'});
window.VeroMonthlyReports={renderEvents({results,events,esc,users=[],openEvent,onError=()=>{}}){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const state=e=>e.status==='Complete'?'Closed':e.report?.classification?.due_date&&e.report.classification.due_date<today?'Overdue':'Open';
 const owner=e=>users.find(u=>String(u.id)===String(e.investigator_id))?.name||e.investigator_name||'Unassigned';
 results.innerHTML='<div class="table-wrap"><table class="event-register-table"><thead><tr><th>Ref Number</th><th>Event</th><th>Status</th><th>Owner</th></tr></thead><tbody>'+events.map(e=>`<tr><td>${esc(e.legacy?.event_reference||e.id.slice(0,8))}</td><td><button type="button" class="chart-event-open" data-chart-event="${esc(e.id)}">${esc(e.legacy?.register_description?.trim()||e.report?.description||'')}</button>${e.report?.vm_site_review?.status==='Unverified'?'<span class="badge">Site Unverified</span>':''}</td><td>${state(e)}</td><td>${esc(owner(e))}</td></tr>`).join('')+(events.length?'':'<tr><td colspan="4">No events in this selection.</td></tr>')+'</tbody></table></div>';
 results.querySelectorAll('[data-chart-event]').forEach(b=>b.onclick=async()=>{try{await openEvent(b.dataset.chartEvent);}catch(error){onError(error);}});
},render({data:d,content,esc,tabs,period,navigate,bind,periodParams,context='',api,users=[],openEvent}){
 const peak=Math.max(1,...d.months.map(m=>m.total));
 const currentMonth=(d.as_of||new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())).slice(0,7),current=m=>m.month===currentMonth,validationNote="These events haven’t been validated yet.";

 content.innerHTML=`<section id="monthly-event-dashboard" aria-label="Monthly event reporting">${tabs}${period}${context}<div class="monthly-heading"><div class="monthly-filters"><label>Event type<select id="monthly-type"><option value="">All event types</option>${types.map(t=>`<option value="${esc(t)}" ${d.type===t?'selected':''}>${label[t]}</option>`).join('')}</select></label></div></div><div class="dashboard-kpis">${[['Events in period',d.total],['Hazards',d.types.Hazard],['Near Misses',d.types['Near Miss']],['Incidents',d.types.Incident]].map(([title,count])=>`<article class="dashboard-kpi"><h3>${title}</h3><strong>${count}</strong></article>`).join('')}</div><section class="card"><div class="chart-legend">${types.filter(t=>t!=='Unverified'||d.unverified).map((t,i)=>`<button type="button" data-type-filter="${esc(t)}" class="legend-${i}" aria-pressed="${d.type===t}"><span></span>${label[t]}</button>`).join('')}</div><div class="monthly-chart-scroll"><div class="monthly-chart" style="--month-count:${Math.max(1,d.months.length)}">${d.months.map((m,i)=>`<button type="button" class="month-column" data-month="${i}" aria-label="${monthLabel(m.month)}: ${m.total} events. ${types.map(t=>`${m.types[t]} ${label[t]}`).join(', ')}${current(m)?". These events have not been validated yet":""}. Show events." title="${monthLabel(m.month)} · ${m.total} events"><strong>${m.total}</strong><span class="month-bar" style="height:${Math.max(2,m.total/peak*190)}px">${types.map((t,j)=>m.types[t]?`<span class="series-${j}" style="flex-grow:${m.types[t]}"></span>`:'').join('')}</span><span class="month-caption">${monthLabel(m.month)}${m.partial?' *':''}</span></button>`).join('')}</div></div></section>${d.undated||d.unverified?`<p class="note">${d.undated} events without a confirmed date are excluded from monthly counts. ${d.unverified} dated events have an unverified classification.</p>`:''}</section>`;
 bind();
 const filter=(type,domain)=>navigate({report_view:'monthly',...periodParams(),type,domain});
 document.getElementById('monthly-type').onchange=e=>filter(e.target.value,d.domain||'');
 content.querySelectorAll('[data-type-filter]').forEach(b=>b.onclick=()=>filter(d.type===b.dataset.typeFilter?'':b.dataset.typeFilter,d.domain||''));
 const tooltip=document.createElement('div');tooltip.id='monthly-chart-tooltip';tooltip.className='monthly-tooltip';tooltip.setAttribute('role','tooltip');tooltip.hidden=true;content.querySelector('#monthly-event-dashboard').append(tooltip);
 const hide=()=>{tooltip.hidden=true;};
 const show=(button,m)=>{tooltip.innerHTML=`<strong>${monthLabel(m.month)}</strong>${current(m)?`<span class="tooltip-validation">${validationNote}</span>`:''}<span class="tooltip-total">Total <b>${m.total}</b></span>${types.filter(t=>t!=='Unverified'||m.types[t]).map((t,i)=>`<span class="tooltip-count"><i class="series-${i}"></i>${label[t]}<b>${m.types[t]}</b></span>`).join('')}`;tooltip.hidden=false;const anchor=button.getBoundingClientRect(),width=tooltip.offsetWidth||220,height=tooltip.offsetHeight||150;tooltip.style.left=Math.max(12,Math.min(window.innerWidth-width-12,anchor.left+anchor.width/2-width/2))+'px';tooltip.style.top=Math.max(12,Math.min(window.innerHeight-height-12,anchor.top-height-10))+'px';};
 content.querySelectorAll('.month-column').forEach(button=>{const m=d.months[Number(button.dataset.month)];button.setAttribute('aria-describedby',tooltip.id);button.removeAttribute('title');button.onmouseenter=()=>show(button,m);button.onmouseleave=hide;button.onfocus=()=>show(button,m);button.onblur=hide;button.onkeydown=event=>{if(event.key==='Escape')hide();};});
 content.querySelector('.monthly-chart-scroll').onscroll=hide;
 const root=content.querySelector('#monthly-event-dashboard'),panel=document.createElement('section');panel.className='card chart-events';panel.setAttribute('aria-label','Selected Events');root.append(panel);
 const available=new Set(d.months.map(m=>m.month));for(const month of selectedMonths)if(!available.has(month))selectedMonths.delete(month);
 const cache=new Map();let request=0;
 async function update(){
  const version=++request,months=d.months.filter(m=>selectedMonths.has(m.month));
  root.querySelectorAll('.month-column').forEach(b=>b.setAttribute('aria-pressed',String(selectedMonths.has(d.months[Number(b.dataset.month)].month))));
  panel.innerHTML='<div class="chart-events-heading"><h3>Events</h3><button type="button" id="clear-chart-months" '+(months.length?'':'hidden')+'>Clear Selection</button></div><p class="chart-event-count" role="status"></p><div class="chart-event-results"></div>';
  panel.querySelector('#clear-chart-months').onclick=()=>{selectedMonths.clear();update();};
  const count=panel.querySelector('.chart-event-count'),results=panel.querySelector('.chart-event-results');
  if(!months.length){panel.removeAttribute('aria-busy');count.textContent='Select month bars to show events.';return;}
  count.textContent=months.map(m=>monthLabel(m.month)).join(' · ');panel.setAttribute('aria-busy','true');
  try{
   const groups=await Promise.all(months.map(m=>{if(!cache.has(m.month)){const p=new URLSearchParams({reporting:'monthly',date_from:m.date_from,date_to:m.date_to});if(d.type)p.set('type',d.type);if(d.domain)p.set('domain',d.domain);for(const key of ['contract_name','vm_site']){const value=new URLSearchParams(location.search).get(key);if(value)p.set(key,value);}const contract=new URLSearchParams(location.search).get('contract_id');const endpoint=contract?'/maintenance-contracts/'+encodeURIComponent(contract)+'/events':'/incidents';const pending=api(endpoint+'?'+p).then(data=>data.events||[]).catch(error=>{cache.delete(m.month);throw error;});cache.set(m.month,pending);}return cache.get(m.month);}));
   if(version!==request||!root.isConnected)return;
   const events=[...new Map(groups.flat().map(e=>[e.id,e])).values()].sort((a,b)=>String(b.report?.occurred_date||'').localeCompare(String(a.report?.occurred_date||''))||String(a.id).localeCompare(String(b.id)));
   count.textContent=events.length+' '+(events.length===1?'Event':'Events')+' · '+months.map(m=>monthLabel(m.month)).join(' · ');
   window.VeroMonthlyReports.renderEvents({results,events,esc,users,openEvent,onError:error=>{count.textContent=error.message;}});
  }catch(error){if(version===request&&root.isConnected){results.textContent='Events could not be loaded. '+error.message;const retry=document.createElement('button');retry.type='button';retry.textContent='Try Again';retry.onclick=update;results.append(retry);}}
  finally{if(version===request)panel.removeAttribute('aria-busy');}
 }
 root.querySelectorAll('.month-column').forEach(b=>b.onclick=()=>{hide();const month=d.months[Number(b.dataset.month)].month;if(selectedMonths.has(month))selectedMonths.delete(month);else selectedMonths.add(month);update();});
 update();
}};
})();
