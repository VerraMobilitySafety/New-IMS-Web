/* Native dashboard over the same scoped survey records used by the register. */
(function(root){'use strict';
const valid=answers=>Array.isArray(answers)&&answers.length>0&&answers.every(x=>Number.isInteger(x)&&x>=1&&x<=5);
function quarter(value){const match=/^(\d{4})-(\d{2})-\d{2}/.exec(String(value||''));if(!match||Number(match[2])<1||Number(match[2])>12)return null;return match[1]+'-Q'+Math.ceil(Number(match[2])/3);}
function summarise(invitations){
 const sent=invitations.filter(i=>i.sent_at||i.responded_at).length;
 const responses=invitations.filter(i=>i.responded_at&&valid(i.answers));
 const ratings=responses.flatMap(i=>i.answers),count=responses.length;
 const satisfied=responses.filter(i=>i.answers[0]>=4).length;
 const neutral=responses.filter(i=>i.answers[0]===3).length;
 const dissatisfied=count-satisfied-neutral;
 return {sent,responses:count,csat:count?satisfied/count*100:null,average:ratings.length?ratings.reduce((a,b)=>a+b,0)/ratings.length:null,
  responseRate:sent?count/sent*100:null,breakdown:[{label:'Satisfied',count:satisfied,tone:'satisfied'},{label:'Neutral',count:neutral,tone:'neutral'},{label:'Dissatisfied',count:dissatisfied,tone:'dissatisfied'}].map(s=>({...s,percentage:count?s.count/count*100:null}))};
}
function calculate(data){
 const invitations=data.invitations||[],rounds=new Map((data.rounds||[]).map(r=>[r.id,r]));
 const groups=new Map();
 for(const round of rounds.values()){const key=quarter(round.scheduled_for);if(key&&!groups.has(key))groups.set(key,[]);}
 for(const invite of invitations){const key=quarter(rounds.get(invite.round_id)?.scheduled_for);if(key&&groups.has(key))groups.get(key).push(invite);}
 return {...summarise(invitations),quarters:[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([key,items])=>({key,label:key.slice(5)+' '+key.slice(0,4),...summarise(items)}))};
}
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const percent=value=>value===null?'—':value.toFixed(1)+'%';
function chart(series,key,title,ticks){
 const available=series.some(s=>s[key]!==null);
 if(!available)return '<div class="cs-chart-empty">No responses yet</div>';
 const w=Math.max(550,series.length*90),h=270,left=52,right=24,top=20,bottom=48,min=key==='csat'?0:1,max=key==='csat'?100:5;
 const x=i=>series.length===1?(left+w-right)/2:left+i*(w-left-right)/(series.length-1);
 const y=v=>top+(max-v)/(max-min)*(h-top-bottom);
 let svg=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"${series.length>6?` style="min-width:${w}px"`:''}>`;
 for(const tick of ticks)svg+=`<line x1="${left}" x2="${w-right}" y1="${y(tick)}" y2="${y(tick)}" class="cs-chart-grid"/><text x="${left-12}" y="${y(tick)+4}" text-anchor="end">${tick}${key==='csat'?'%':''}</text>`;
 let run=[];const flush=()=>{if(run.length>1)svg+=`<polyline points="${run.join(' ')}" class="cs-chart-line"/>`;run=[];};
 series.forEach((s,i)=>{if(s[key]===null){flush();return;}run.push(x(i)+','+y(s[key]));});flush();
 series.forEach((s,i)=>{svg+=`<text x="${x(i)}" y="${h-23}" text-anchor="middle">${esc(s.label)}</text>`;if(s[key]!==null)svg+=`<circle cx="${x(i)}" cy="${y(s[key])}" r="5" class="cs-chart-dot"><title>${esc(s.label)}: ${key==='csat'?percent(s[key]):s[key].toFixed(2)+' / 5'} · ${s.responses} response(s)</title></circle>`;});
 return svg+'</svg>';
}
function render(data){
 const model=calculate(data),count=document.getElementById('csCounts'),report=document.getElementById('csReport');
 count.innerHTML=[['CSAT score',percent(model.csat)],['Average rating',model.average===null?'—':model.average.toFixed(2)+' / 5'],['Response rate',percent(model.responseRate)],['Sent surveys',model.sent]].map(([label,value])=>`<div class="vr-card"><span>${label}</span><strong>${esc(value)}</strong></div>`).join('');
 const breakdown=model.responses?`<div class="cs-breakdown-bar" aria-hidden="true">${model.breakdown.filter(s=>s.count).map(s=>`<span class="${s.tone}" style="width:${s.percentage}%">${percent(s.percentage)}</span>`).join('')}</div><div class="cs-breakdown-labels">${model.breakdown.map(s=>`<div><span class="cs-breakdown-key ${s.tone}"></span><strong>${s.label}</strong><span>${s.count} response(s) · ${percent(s.percentage)}</span></div>`).join('')}</div>`:'<p class="cs-chart-empty">No responses yet</p>';
 report.innerHTML=`<div class="cs-native-charts"><section class="cs-native-chart"><h2>CSAT by Survey Quarter</h2><div class="cs-chart-scroll">${chart(model.quarters,'csat','CSAT by survey quarter',[0,50,100])}</div></section><section class="cs-native-chart"><h2>Average Rating by Survey Quarter</h2><div class="cs-chart-scroll">${chart(model.quarters,'average','Average rating by survey quarter',[1,3,5])}</div></section></div><section class="cs-native-breakdown" aria-label="Satisfaction response breakdown"><h2>Satisfaction breakdown</h2>${breakdown}</section><details class="cs-metric-notes"><summary>How these results are calculated</summary><p>CSAT and the breakdown use the first rating question: 4–5 satisfied, 3 neutral, 1–2 dissatisfied. Average rating includes all rating answers. Response rate is completed responses divided by issued invitations; a received response is evidence of an issued invitation. Sent surveys counts those invitations, not reminders.</p><p>Quarterly charts use the round’s scheduled survey date. Unanswered quarters show a gap, not a zero score. NPS is not calculated because this survey does not collect a 0–10 recommendation score.</p><table><caption>Quarterly survey results</caption><thead><tr><th>Survey quarter</th><th>CSAT</th><th>Average / 5</th><th>Responses</th><th>Issued invitations</th></tr></thead><tbody>${model.quarters.map(q=>`<tr><td>${esc(q.label)}</td><td>${percent(q.csat)}</td><td>${q.average===null?'—':q.average.toFixed(2)}</td><td>${q.responses}</td><td>${q.sent}</td></tr>`).join('')}</tbody></table></details>`;
}
const api={calculate,summarise,quarter,render};if(typeof module==='object'&&module.exports)module.exports=api;else root.VeroSurveyDashboard=api;
})(typeof window==='undefined'?globalThis:window);
