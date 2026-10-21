/* Accessible monthly charts over permission-scoped server aggregates. */
(()=>{'use strict';
const types=['Hazard','Near Miss','Incident','Unverified'],selectedMonths=new Set(),eventListSort={key:'newest',direction:-1};
let eventListSearch='';
const eventListCollator=new Intl.Collator('en-AU',{numeric:true,sensitivity:'base'});
const label={Hazard:'Hazards','Near Miss':'Near Misses',Incident:'Incidents',Unverified:'Unverified'};
const monthLabel=value=>new Date(value+'-01T00:00:00Z').toLocaleDateString('en-AU',{month:'short',year:'numeric',timeZone:'UTC'});
window.VeroMonthlyReports={renderEvents({results,events,esc,users=[],openEvent,onError=()=>{}}){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const state=e=>e.status==='Complete'?'Closed':e.report?.classification?.due_date&&e.report.classification.due_date<today?'Overdue':'Open';
 const owner=e=>users.find(u=>String(u.id)===String(e.investigator_id))?.name||e.investigator_name||'Unassigned';
 const ref=e=>String(e.legacy?.event_reference||e.id.slice(0,8)),description=e=>e.legacy?.register_description?.trim()||e.report?.description||'';
 const occurred=e=>{const date=e.report?.occurred_date;if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return null;const base=Date.parse(date+'T00:00:00Z');if(!Number.isFinite(base)||new Date(base).toISOString().slice(0,10)!==date)return null;const time=String(e.report?.occurred_time||'').match(/(?:^|T)([0-2]\d:[0-5]\d(?::[0-5]\d)?)/)?.[1]||'00:00';const stamp=Date.parse(date+'T'+time+(time.length===5?':00':'')+'Z');return Number.isFinite(stamp)?stamp:base;};
 const newest=(a,b)=>{const left=occurred(a),right=occurred(b);return left===null&&right!==null?1:right===null&&left!==null?-1:(right??0)-(left??0)||eventListCollator.compare(ref(b),ref(a))||String(a.id).localeCompare(String(b.id));};
 results.innerHTML='<label class="event-list-search">Search Events<input type="search" placeholder="Search Ref Number, Description or Owner" aria-label="Search Events"></label><p class="event-search-count" role="status"></p><div class="event-list-table"></div>';
 const search=results.querySelector('input[type="search"]'),table=results.querySelector('.event-list-table'),count=results.querySelector('.event-search-count');
 search.value=eventListSearch;search.oninput=()=>{eventListSearch=search.value;draw();};
 function draw(){
 const value={ref,description,status:state,owner};const query=eventListSearch.trim().toLocaleLowerCase('en-AU');const matches=events.filter(e=>!query||[ref(e),description(e),e.report?.description||'',owner(e)].some(v=>v.toLocaleLowerCase('en-AU').includes(query)));count.textContent=query?matches.length+' of '+events.length+' Events':'';count.hidden=!query;const sorted=matches.sort((a,b)=>eventListSort.key==='newest'?newest(a,b):eventListSort.direction*eventListCollator.compare(value[eventListSort.key](a),value[eventListSort.key](b))||newest(a,b));
 table.innerHTML='<p class="sr-only" role="status">'+(eventListSort.key==='newest'?'Newest events first':esc(eventListSort.key)+' '+(eventListSort.direction===1?'ascending':'descending'))+'</p><div class="table-wrap"><table class="event-register-table"><thead><tr>'+[['ref','Ref Number'],['description','Event'],['status','Status'],['owner','Owner']].map(([key,label])=>`<th scope="col" aria-sort="${eventListSort.key===key?(eventListSort.direction===1?'ascending':'descending'):'none'}"><button type="button" class="event-list-sort" data-event-sort="${key}">${label}<span aria-hidden="true">${eventListSort.key===key?(eventListSort.direction===1?'↑':'↓'):'↕'}</span></button></th>`).join('')+'</tr></thead><tbody>'+sorted.map(e=>`<tr><td>${esc(e.legacy?.event_reference||e.id.slice(0,8))}</td><td><button type="button" class="chart-event-open" data-chart-event="${esc(e.id)}">${esc(e.legacy?.register_description?.trim()||e.report?.description||'')}</button>${e.report?.vm_site_review?.status==='Unverified'?'<span class="badge">Site Unverified</span>':''}</td><td>${state(e)}</td><td>${esc(owner(e))}</td></tr>`).join('')+(matches.length?'':'<tr><td colspan="4">'+(query?'No events match your search.':'No events in this selection.')+'</td></tr>')+'</tbody></table></div>';
 results.querySelectorAll('[data-chart-event]').forEach(b=>b.onclick=async()=>{try{await openEvent(b.dataset.chartEvent);}catch(error){onError(error);}});
 results.querySelectorAll('[data-event-sort]').forEach(b=>b.onclick=()=>{const key=b.dataset.eventSort;eventListSort.direction=eventListSort.key===key?-eventListSort.direction:1;eventListSort.key=key;draw();results.querySelector('[data-event-sort="'+key+'"]').focus({preventScroll:true});});
 }
 draw();
},render({data:d,content,esc,tabs,period,navigate,bind,periodParams,context='',api,users=[],openEvent,listPath='/incidents'}){
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
  count.textContent=months.map(m=>monthLabel(m.month)).join(' · ');panel.setAttribute('aria-busy','true');
  try{
   const groups=await Promise.all((months.length?months:[null]).map(m=>{const key=m?.month||'all';if(!cache.has(key)){const p=new URLSearchParams({reporting:'monthly',...(m?{date_from:m.date_from,date_to:m.date_to}:{})});if(d.type)p.set('type',d.type);if(d.domain)p.set('domain',d.domain);for(const key of ['contract_name','vm_site']){const value=new URLSearchParams(location.search).get(key);if(value)p.set(key,value);}const contract=new URLSearchParams(location.search).get('contract_id');const endpoint=contract?'/maintenance-contracts/'+encodeURIComponent(contract)+'/events':'/incidents';const pending=api(m?endpoint+'?'+p:listPath+(listPath.includes('?')?'&':'?')+'reporting=monthly').then(data=>data.events||[]).catch(error=>{cache.delete(key);throw error;});cache.set(key,pending);}return cache.get(key);}));
   if(version!==request||!root.isConnected)return;
   const events=[...new Map(groups.flat().map(e=>[e.id,e])).values()].sort((a,b)=>String(b.report?.occurred_date||'').localeCompare(String(a.report?.occurred_date||''))||String(a.id).localeCompare(String(b.id)));
   count.textContent=events.length+' '+(events.length===1?'Event':'Events')+(months.length?' · '+months.map(m=>monthLabel(m.month)).join(' · '):'');
   window.VeroMonthlyReports.renderEvents({results,events,esc,users,openEvent,onError:error=>{count.textContent=error.message;}});
  }catch(error){if(version===request&&root.isConnected){results.textContent='Events could not be loaded. '+error.message;const retry=document.createElement('button');retry.type='button';retry.textContent='Try Again';retry.onclick=update;results.append(retry);}}
  finally{if(version===request)panel.removeAttribute('aria-busy');}
 }
 root.querySelectorAll('.month-column').forEach(b=>b.onclick=()=>{hide();const month=d.months[Number(b.dataset.month)].month;if(selectedMonths.has(month))selectedMonths.delete(month);else selectedMonths.add(month);update();});
 update();
}};
})();
