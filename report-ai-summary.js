/* Only the aggregate figures already displayed in the current report leave this page. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const button=$('generateAiSummary'),panel=$('aiSummaryPanel'),status=$('aiSummaryStatus'),body=$('aiSummaryBody'),copy=$('copyAiSummary');
let snapshot=null,controller=null,version=0,copyText='';
function clear(){version++;controller?.abort();controller=null;snapshot=null;button.disabled=true;button.textContent='AI summary';panel.hidden=true;body.replaceChildren();status.textContent='';copy.disabled=true;copyText='';}
function ready(meta){clear();const output=$('reportOutput');if(output.querySelector('.report-empty'))return;
 const facts=[];
 const add=(element,text)=>{if(facts.length>=100)return;const id=String(facts.length);element.id='report-evidence-'+id;facts.push({id,text:text.slice(0,600)});};
 output.querySelectorAll('.report-kpi').forEach(el=>add(el,el.querySelector('span').textContent+': '+el.querySelector('strong').textContent+(el.querySelector('small').textContent?' ('+el.querySelector('small').textContent+')':'')));
 output.querySelectorAll('.report-chart-row').forEach(el=>add(el,el.closest('section').querySelector('h3').textContent+' — '+el.querySelector('.report-chart-label span').textContent+': '+el.querySelector('strong').textContent));
 output.querySelectorAll('tbody tr').forEach(el=>{const headers=[...el.closest('table').querySelectorAll('thead th')].map(h=>h.textContent);add(el,[...el.cells].map((cell,i)=>headers[i]+': '+cell.textContent).join('; '));});
 snapshot={report:meta.report,facts,coverage:[...output.querySelectorAll('.report-note')].map(el=>el.textContent),title:meta.title,generated:meta.generated,scope:meta.scope};button.disabled=!facts.length;
}
function list(title,items){const heading=document.createElement('h3');heading.textContent=title;body.append(heading);const ul=document.createElement('ul');for(const item of items){const li=document.createElement('li');li.textContent=typeof item==='string'?item:item.text;if(typeof item==='object'){const link=document.createElement('a');link.href='#report-evidence-'+item.id;link.textContent=' View figures';li.append(link);}ul.append(li);}body.append(ul);}
button.addEventListener('click',async()=>{if(!snapshot||button.disabled)return;const current=snapshot,ticket=version;controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),35000);
 button.disabled=true;button.textContent='Generating…';panel.hidden=false;panel.setAttribute('aria-busy','true');body.replaceChildren();copy.disabled=true;status.textContent='Selecting the key findings from this report…';
 try{const token=localStorage.getItem('vero_session_token');if(!token)throw Error('Please sign in again to generate a summary.');
 const response=await fetch('https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api/reports/ai-summary',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({report:current.report,facts:current.facts,coverage:current.coverage}),signal:controller.signal});
 if(ticket!==version)return;let result;try{result=await response.json()}catch{throw Error('AI summary is unavailable right now. Please try again.');}
 if(ticket!==version)return;if(!response.ok)throw Error(response.status===401?'Your session has expired. Please sign in again.':result.message||'AI summary is unavailable right now. Please try again.');
 const allowed=new Map(current.facts.map(f=>[f.id,f.text]));if(!Array.isArray(result.highlights)||!result.highlights.length||result.highlights.some(f=>!f||allowed.get(f.id)!==f.text)||!Array.isArray(result.actions)||result.actions.some(a=>typeof a!=='string'))throw Error('The summary could not be verified. Please try again.');
 status.textContent=current.title+' · Report run '+current.generated+' · Australia/Sydney';
 const scope=document.createElement('p');scope.className='muted';scope.textContent=current.scope;body.append(scope);
 list('Key findings',result.highlights);if(result.actions.length)list('Suggested follow-up',result.actions);list('Coverage and limitations',current.coverage);
 const review=document.createElement('p');review.className='muted';review.textContent='AI selected these highlights from the displayed figures. Review the source report before sharing. Suggested follow-up does not create or assign actions.';body.append(review);
 copyText=[current.title+' — AI summary (draft)','Report run '+current.generated+' · Australia/Sydney',current.scope,'','Key findings',...result.highlights.map(f=>'• '+f.text),'','Suggested follow-up',...result.actions.map(a=>'• '+a),'','Coverage and limitations',...current.coverage,'','Review the source report before sharing.'].join('\n');copy.disabled=false;
 }catch(error){if(ticket!==version)return;status.textContent=error.name==='AbortError'?'The summary took too long. Please try again.':error.message;body.replaceChildren();}
 finally{clearTimeout(timeout);if(ticket===version){panel.setAttribute('aria-busy','false');button.disabled=false;button.textContent='Generate again';controller=null;}}
});
copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(copyText);copy.textContent='Copied';}catch{status.textContent='Copy is unavailable in this browser. You can select and copy the summary text.';}setTimeout(()=>copy.textContent='Copy summary',2000);});
window.VeroReportSummary={clear,ready};
})();
