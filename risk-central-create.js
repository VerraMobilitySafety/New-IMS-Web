/* Central Add Risk. Role checks are enforced again by the API on every write. */
(()=>{'use strict';
const API='https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api';
const launch=document.getElementById('veroAddRiskButton'),overlay=document.getElementById('veroRiskDrawerOverlay');
if(!launch||!overlay)return;
launch.hidden=true;
const host=overlay.querySelector('.vero-risk-drawer-body');host.className='vero-risk-drawer-body vero-central';
const oldFooter=overlay.querySelector('.vero-risk-drawer-footer');if(oldFooter)oldFooter.remove();
const criteria=window.VeroRiskAssessmentCriteria;
const names=['Rare','Unlikely','Possible','Likely','Almost Certain'];
const impacts=['Insignificant','Minor','Moderate','Major','Catastrophic'];
const stages=['Inherent','Current Residual','Target'];
const bands=[['Low','Low','Low','Moderate','Moderate'],['Low','Moderate','Moderate','Moderate','High'],['Low','Moderate','High','High','Significant'],['Moderate','Moderate','High','Significant','Significant'],['Moderate','High','Significant','Significant','Significant']];
const colours={Low:'#A8C63D',Moderate:'#21869B',High:'#D1B443',Significant:'#BF302D'};
let options=null,owner=null,stage=0,ratings=[null,null,null],busy=false,requestId=null,ownerMatches=[],ownerIndex=-1;
function node(tag,text,cls){const el=document.createElement(tag);if(text!=null)el.textContent=['label','h3','h4','summary'].includes(tag)?String(text).replace(/\b[a-z]/g,c=>c.toUpperCase()):text;if(cls)el.className=cls;return el;}
function button(text,cls){const b=node('button',text,cls);b.type='button';return b;}
function uuid(){return crypto.randomUUID();}
async function api(path,body){const response=await fetch(API+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+localStorage.getItem('vero_session_token'),Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'});let data;try{data=await response.json();}catch{throw Error('The server returned an unreadable response. Your form has been kept.');}if(!response.ok)throw Error(data.message||'Unable to complete request');return data;}
function field(label,type='input'){const wrap=node('div');const id='central-'+label.toLowerCase().replace(/[^a-z0-9]+/g,'-');const lab=node('label',label);lab.htmlFor=id;const el=node(type);el.id=id;wrap.append(lab,el);return {wrap,el};}
host.replaceChildren();
const identification=node('div',null,'fields');
const title=field('Risk title'),description=field('Risk description','textarea');description.wrap.classList.add('full');
const ownerField=field('Risk Owner');ownerField.el.placeholder='Search VERO users by name or email';ownerField.el.autocomplete='off';ownerField.el.setAttribute('role','combobox');ownerField.el.setAttribute('aria-expanded','false');ownerField.el.setAttribute('aria-autocomplete','list');
const ownerList=node('div',null,'owner-options');ownerList.id='central-owner-options';ownerList.setAttribute('role','listbox');ownerList.hidden=true;ownerField.el.setAttribute('aria-controls',ownerList.id);
const ownerNote=node('p','Select an active VERO user.','muted owner-note');ownerNote.setAttribute('aria-live','polite');const ownerAnchor=node('div',null,'picker-anchor');ownerAnchor.append(ownerField.el,ownerList);ownerField.wrap.append(ownerAnchor,ownerNote);
const review=field('Next review date');review.el.type='date';identification.append(title.wrap,ownerField.wrap,description.wrap,review.wrap);
const tierBox=node('div',null,'tiers'),tierFields=[];
for(let i=0;i<4;i++){const f=field('Tier '+(4-i)+' '+['Risk Domain','Risk Stream','Risk Category','Risk Event'][i],'select');tierFields.push(f.el);tierBox.append(f.wrap);f.el.onchange=()=>renderTiers(i+1);}
const tierHelp=node('p','Choose Tier 4, then stop at that tier or continue down to a more specific classification.','muted full');tierBox.append(tierHelp);
const tabs=node('div',null,'stages');tabs.setAttribute('aria-label','Assessment stages');
for(let i=0;i<3;i++){const b=button('','stage');b.append(node('b',(i+1)+' '+stages[i]),node('span',['Before controls','With existing controls','After further controls'][i]));b.onclick=()=>{stage=i;renderAssessment();};tabs.append(b);}
const columns=node('div',null,'columns'),panel=node('section',null,'panel'),summary=node('aside',null,'panel summary');
const existing=field('Existing controls','textarea'),further=field('Further controls and treatments','textarea');
const controlSearch=field('Find enterprise controls');controlSearch.el.type='search';
const controlList=node('div',null,'control-options');const controlsSection=node('div');controlsSection.append(existing.wrap,controlSearch.wrap,controlList);
const actionRows=[];const actionList=node('div');const addAction=button('+ Add treatment action','button');
const targetSection=node('div');targetSection.append(further.wrap,node('p','The target is a planned position, not evidence that further controls are implemented.','muted'));
targetSection.append(actionList,addAction);
const documentSearch=field('Find Document Library controls');documentSearch.el.type='search';const documentList=node('div',null,'control-options');controlsSection.append(documentSearch.wrap,documentList);
const selectedDocuments=new Set();
const matrixHeading=node('h3'),scroll=node('div',null,'matrix-scroll'),matrix=node('div',null,'matrix');scroll.append(matrix);matrix.setAttribute('aria-label','Select likelihood and consequence');
const selection=node('p');selection.setAttribute('aria-live','polite');
const inherentNote=node('p','Assess the risk before any controls are applied.');
panel.append(inherentNote,controlsSection,targetSection,matrixHeading,scroll,selection,node('p','Hover, focus or tap a rating label for its meaning. Arrow keys move between cells; Enter or Space selects.','muted'));
const summaries=node('div',null,'summary-ratings'),category=field('Consequence category','select'),explanation=node('div',null,'guidance');
Object.keys(criteria.impact['1']).forEach(name=>{const o=node('option',name);o.value=name;category.el.append(o);});category.el.value='Health, Safety, Environment';
summary.append(node('h3','Assessment summary'),summaries,node('h3','Rating definitions'),category.wrap,explanation);
category.el.onchange=()=>showExplanation(ratings[stage]);columns.append(panel,summary);
const notes=field('Assessment notes and justification','textarea'),footer=node('div',null,'footer'),cancel=button('Cancel','button'),save=button('Save Risk · Make live','button primary'),status=node('p',null,'status');status.setAttribute('role','status');
footer.append(cancel,save);host.append(identification,tierBox,tabs,columns,notes.wrap,footer,status);
const fullCriteria=node('details');fullCriteria.append(node('summary','View full rating criteria'));
for(let l=5;l>=1;l--){fullCriteria.append(node('h4',names[l-1]),node('p',criteria.likelihood[names[l-1]]));}
for(const group of Object.keys(criteria.impact['1'])){const block=node('details');block.append(node('summary',group));for(let impact=5;impact>=1;impact--)block.append(node('h4',impacts[impact-1]),node('p',criteria.impact[String(impact)][group]));fullCriteria.append(block);}summary.append(fullCriteria);
const selectedControls=new Set();
function addPicker(search,list,selection,items,label){
 const anchor=node('div',null,'picker-anchor'),added=node('div',null,'added-items');
 anchor.append(search.el,list);search.wrap.append(anchor,added);list.className='add-options';list.hidden=true;list.id=search.el.id+'-options';list.setAttribute('role','listbox');search.el.setAttribute('role','combobox');search.el.setAttribute('aria-autocomplete','list');search.el.setAttribute('aria-controls',list.id);search.el.setAttribute('aria-expanded','false');search.el.autocomplete='off';search.el.placeholder='Search and add one at a time';
 let matches=[],active=-1;
 function hide(){list.hidden=true;search.el.setAttribute('aria-expanded','false');search.el.removeAttribute('aria-activedescendant');}
 function renderSelected(){added.replaceChildren();for(const id of selection){const item=items().find(x=>x.id===id);if(!item)continue;const row=node('div',null,'added-item'),remove=button('Remove');remove.setAttribute('aria-label','Remove '+label(item));remove.onclick=()=>{selection.delete(id);renderSelected();};row.append(node('span',label(item)),remove);added.append(row);}}
 function choose(item){selection.add(item.id);search.el.value='';renderSelected();search.el.focus();hide();}
 function show(){if(busy)return;active=-1;const q=search.el.value.trim().toLowerCase();matches=items().filter(x=>!selection.has(x.id)&&label(x).toLowerCase().includes(q)).slice(0,50);list.replaceChildren();for(const item of matches){const b=button('Add '+label(item),'add-option');b.id=list.id+'-'+item.id;b.setAttribute('role','option');b.setAttribute('aria-selected','false');b.onclick=()=>choose(item);list.append(b);}if(!matches.length)list.append(node('p','No matching items available to add.','picker-empty'));list.hidden=false;search.el.setAttribute('aria-expanded','true');}
 search.el.oninput=show;search.el.onfocus=show;
 search.el.onkeydown=e=>{if(e.key==='Escape'){hide();e.stopPropagation();return;}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(list.hidden)show();active=Math.max(0,Math.min(matches.length-1,active+(e.key==='ArrowDown'?1:-1)));[...list.querySelectorAll('button')].forEach((b,i)=>b.setAttribute('aria-selected',String(i===active)));if(matches[active])search.el.setAttribute('aria-activedescendant',list.id+'-'+matches[active].id);}else if(e.key==='Enter'&&active>=0&&!list.hidden){e.preventDefault();choose(matches[active]);}};
 document.addEventListener('click',e=>{if(!search.wrap.contains(e.target))hide();});
 return {render(){renderSelected();hide();},hide};
}
const enterprisePicker=addPicker(controlSearch,controlList,selectedControls,()=>options?.controls||[],c=>c.code+' · '+c.title);
const documentPicker=addPicker(documentSearch,documentList,selectedDocuments,()=>options?.documents||[],d=>d.code+' · '+d.title+' · Version '+d.version);
function renderDocuments(){documentPicker.render();}
function renderActions(){actionList.replaceChildren();for(const action of actionRows){const row=node('div',null,'fields panel'),label=field('Treatment title '+action.key),assigned=field('Treatment owner '+action.key,'select'),due=field('Treatment due date '+action.key);label.el.value=action.title;label.el.oninput=()=>action.title=label.el.value;const blank=node('option','Select authorised owner');blank.value='';assigned.el.append(blank);for(const u of options.treatment_owners||[]){const opt=node('option',u.name+' · '+u.email);opt.value=String(u.id);assigned.el.append(opt);}assigned.el.value=String(action.owner_user_id||'');assigned.el.onchange=()=>action.owner_user_id=Number(assigned.el.value)||null;due.el.type='date';due.el.value=action.due_date;due.el.oninput=()=>action.due_date=due.el.value;const remove=button('Remove action','button');remove.onclick=()=>{actionRows.splice(actionRows.indexOf(action),1);renderActions();};row.append(label.wrap,assigned.wrap,due.wrap,remove);actionList.append(row);}}
let actionKey=0;addAction.onclick=()=>{actionRows.push({key:++actionKey,title:'',owner_user_id:null,due_date:''});renderActions();};
function renderControls(){enterprisePicker.render();}
function renderTiers(from=0){for(let index=from;index<4;index++){const select=tierFields[index];select.replaceChildren();select.value='';const placeholder=node('option',index?'Stop at Tier '+(5-index)+' or select Tier '+(4-index):'Select Tier 4');placeholder.value='';select.append(placeholder);
 let unique;
 if(Array.isArray(options.classification_categories)&&Array.isArray(options.classification_relationships)){
  const parent=index?Number(tierFields[index-1].value):null;
  const children=new Set(options.classification_relationships.filter(r=>r.parent_id===parent).map(r=>r.child_id));
  unique=new Map(options.classification_categories.filter(c=>c.tier===4-index&&(!index||children.has(c.id))).map(c=>[c.id,c.name]));
 }else{const paths=options.classifications.filter(p=>p.path_ids.slice(0,index).every((id,j)=>String(id)===tierFields[j].value));unique=new Map(paths.map(p=>[p.path_ids[index],p.path_names[index]]));}
 for(const [id,name] of unique){const opt=node('option',name);opt.value=String(id);select.append(opt);}select.disabled=(index>0&&!tierFields[index-1].value)||busy;
 if(index>0&&tierFields[index-1].value&&!unique.size)placeholder.textContent='No active Tier '+(4-index)+' entries under this selection';
}}
function chooseOwner(user){owner=user.id;ownerField.el.value=user.name+' · '+user.email;ownerNote.textContent='Selected: '+user.name;ownerList.hidden=true;ownerField.el.setAttribute('aria-expanded','false');ownerField.el.removeAttribute('aria-activedescendant');}
function searchOwners(){ownerIndex=-1;const q=owner?'':ownerField.el.value.toLowerCase();ownerMatches=options.users.filter(u=>(u.name+' '+u.email).toLowerCase().includes(q));ownerList.replaceChildren();for(const u of ownerMatches.slice(0,50)){const b=button(u.name,'owner-option');b.id='central-owner-'+u.id;b.setAttribute('role','option');b.setAttribute('aria-selected','false');b.append(node('small',u.email));b.onclick=()=>chooseOwner(u);ownerList.append(b);}if(!ownerMatches.length)ownerList.append(node('p','No matching active users.'));ownerList.hidden=false;ownerField.el.setAttribute('aria-expanded','true');}
ownerField.el.oninput=()=>{owner=null;ownerNote.textContent='Select a user from the search results.';searchOwners();};
ownerField.el.onfocus=()=>{if(options)searchOwners();};
document.addEventListener('click',e=>{if(!ownerField.wrap.contains(e.target)){ownerList.hidden=true;ownerField.el.setAttribute('aria-expanded','false');ownerField.el.removeAttribute('aria-activedescendant');}});
ownerField.el.onkeydown=e=>{if(e.key==='Escape'){ownerList.hidden=true;ownerField.el.setAttribute('aria-expanded','false');e.stopPropagation();}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();ownerIndex=Math.max(0,Math.min(Math.min(ownerMatches.length,50)-1,ownerIndex+(e.key==='ArrowDown'?1:-1)));[...ownerList.querySelectorAll('button')].forEach((b,i)=>b.setAttribute('aria-selected',String(i===ownerIndex)));if(ownerMatches[ownerIndex])ownerField.el.setAttribute('aria-activedescendant','central-owner-'+ownerMatches[ownerIndex].id);}if(e.key==='Enter'&&ownerIndex>=0&&!ownerList.hidden){e.preventDefault();chooseOwner(ownerMatches[ownerIndex]);}};
function showExplanation(value,axis){explanation.replaceChildren();if(!value){explanation.append(node('p','Select a cell or a rating label to see the definitions.'));return;}if(axis!=='impact'){explanation.append(node('h4',names[value.likelihood-1]),node('p',criteria.likelihood[names[value.likelihood-1]]));}if(axis!=='likelihood'){explanation.append(node('h4',impacts[value.impact-1]),node('p',criteria.impact[String(value.impact)][category.el.value]));}}
function colour(el,band){el.style.background=colours[band];el.style.color=['Moderate','Significant'].includes(band)?'#fff':'#292725';}
function renderAssessment(){[...tabs.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===stage)));controlsSection.hidden=stage!==1;targetSection.hidden=stage!==2;inherentNote.hidden=stage!==0;matrixHeading.textContent=stages[stage]+' Risk Assessment';matrix.replaceChildren();matrix.append(node('span'),node('span'));for(let impact=1;impact<=5;impact++){const b=button(impacts[impact-1],'axis-label');b.onmouseenter=b.onfocus=b.onclick=()=>showExplanation({impact,likelihood:1},'impact');matrix.append(b);}matrix.append(node('span'),node('span','L / C','axis like-number'));for(let i=1;i<=5;i++)matrix.append(node('span',String(i),'axis'));
for(let l=5;l>=1;l--){const b=button(names[l-1],'axis-label like');b.onmouseenter=b.onfocus=b.onclick=()=>showExplanation({likelihood:l,impact:1},'likelihood');matrix.append(b,node('span',String(l*5),'axis like-number'));for(let impact=1;impact<=5;impact++){const band=bands[l-1][impact-1],cell=button('','cell');cell.dataset.l=String(l);cell.dataset.i=String(impact);colour(cell,band);cell.append(node('span',String(l*5*impact),'score'),node('small',band));const selected=ratings[stage]?.likelihood===l&&ratings[stage]?.impact===impact;cell.setAttribute('aria-pressed',String(selected));cell.setAttribute('aria-label',names[l-1]+', '+impacts[impact-1]+', '+(l*5*impact)+' '+band);cell.tabIndex=selected||(!ratings[stage]&&l===5&&impact===1)?0:-1;cell.onclick=()=>{ratings[stage]={likelihood:l,impact};renderAssessment();matrix.querySelector(`[data-l="${l}"][data-i="${impact}"]`).focus();};cell.onkeydown=e=>{let nl=l,ni=impact;if(e.key==='ArrowRight')ni=Math.min(5,impact+1);else if(e.key==='ArrowLeft')ni=Math.max(1,impact-1);else if(e.key==='ArrowDown')nl=Math.max(1,l-1);else if(e.key==='ArrowUp')nl=Math.min(5,l+1);else return;e.preventDefault();matrix.querySelector(`[data-l="${nl}"][data-i="${ni}"]`).focus();};matrix.append(cell);}}
summaries.replaceChildren();ratings.forEach((r,i)=>{const group=node('div');group.append(node('small',stages[i]));const badge=node('span',r?r.likelihood*5*r.impact+' · '+bands[r.likelihood-1][r.impact-1]:'Not assessed','badge');if(r)colour(badge,bands[r.likelihood-1][r.impact-1]);group.append(badge);summaries.append(group);});const r=ratings[stage];selection.textContent=r?names[r.likelihood-1]+' × '+impacts[r.impact-1]+' = '+r.likelihood*5*r.impact:'Select a cell';showExplanation(r);}
function close(){if(busy)return;enterprisePicker.hide();documentPicker.hide();ownerList.hidden=true;ownerField.el.setAttribute('aria-expanded','false');overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');launch.focus();}
cancel.onclick=close;document.getElementById('veroCloseRiskDrawer').onclick=close;overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
document.addEventListener('keydown',e=>{if(!overlay.classList.contains('open'))return;if(e.key==='Escape')close();if(e.key==='Tab'){const all=[...overlay.querySelectorAll('button,input,select,textarea,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);if(!all.length)return;const first=all[0],last=all[all.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
launch.onclick=async()=>{if(!options||busy)return;overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');title.el.focus();};
function setBusy(value){busy=value;host.querySelectorAll('input,textarea,select,button').forEach(el=>el.disabled=value);document.getElementById('veroCloseRiskDrawer').disabled=value;if(!value)tierFields.forEach((el,i)=>el.disabled=i>0&&!tierFields[i-1].value);}
save.onclick=async()=>{if(busy)return;status.textContent='';if(!title.el.value.trim()||!description.el.value.trim()||!owner||!tierFields[0].value||ratings.some(r=>!r)||!review.el.value||!notes.el.value.trim()){status.textContent='Complete the title, description, Risk Owner, a risk classification, all three ratings, review date and assessment notes.';return;}const body={risk_title:title.el.value.trim(),risk_description:description.el.value.trim(),classification_path:tierFields.filter(s=>s.value).map(s=>Number(s.value)),risk_owner_user_id:owner,inherent:ratings[0],residual:ratings[1],target:ratings[2],controls_summary:existing.el.value,treatments_summary:further.el.value,justification:notes.el.value,next_review_date:review.el.value,control_ids:[...selectedControls].sort((a,b)=>a-b),document_ids:[...selectedDocuments].sort((a,b)=>a-b),treatment_actions:actionRows.map(({title,owner_user_id,due_date})=>({title:title.trim(),owner_user_id,due_date}))};if(body.treatment_actions.some(a=>!a.title||!a.owner_user_id||!a.due_date)){status.textContent='Complete each treatment title, owner and due date, or remove the empty action.';return;}if(!requestId)requestId=uuid();setBusy(true);status.textContent='Saving risk and assessment…';try{const result=await api('/risks/central',{...body,request_id:requestId});status.textContent='Risk '+result.risk_id+' saved ('+result.risk_status+'). Refreshing the register…';window.location.reload();}catch(error){status.textContent=error.message;setBusy(false);}};
async function init(){try{options=await api('/risk/central-creation-options');if(!options.can_create)return;launch.hidden=false;launch.disabled=!options.schema_ready;launch.title=options.schema_ready?'Create a live risk':'Risk assessment database update is required';if(!options.schema_ready)return;renderTiers();renderControls();renderDocuments();renderAssessment();}catch{launch.hidden=true;}}
init();
})();
