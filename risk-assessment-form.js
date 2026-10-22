/* Shared VERO assessment editor. Module controllers own permissions, persistence and approval. */
window.VeroRiskAssessmentForm=(()=>{'use strict';
function mount(host,config={}){
 if(!host||!config.options)throw Error('Assessment host and options are required');
 const cleanups=[];
 function listen(target,type,handler){target.addEventListener(type,handler);cleanups.push(()=>target.removeEventListener(type,handler));}
const criteria=window.VeroRiskAssessmentCriteria;
const names=['Rare','Unlikely','Possible','Likely','Almost Certain'];
const impacts=['Insignificant','Minor','Moderate','Major','Catastrophic'];
const stages=['Inherent','Current Residual','Target'];
const bands=[['Low','Low','Low','Moderate','Moderate'],['Low','Moderate','Moderate','Moderate','High'],['Low','Moderate','High','High','Significant'],['Moderate','Moderate','High','Significant','Significant'],['Moderate','High','Significant','Significant','Significant']];
const colours={Low:'#A8C63D',Moderate:'#21869B',High:'#D1B443',Significant:'#BF302D'};
let controlNotes=null;
let options=config.options,owner=null,stage=0,ratings=[null,null,null],busy=false,ownerMatches=[],ownerIndex=-1;
const compact=config.layout==='compact',traditional=config.layout==='traditional'||compact,worksheetRatings=[];
function node(tag,text,cls){const el=document.createElement(tag);if(text!=null)el.textContent=['label','h3','h4','summary'].includes(tag)?String(text).replace(/\b[a-z]/g,c=>c.toUpperCase()):text;if(cls)el.className=cls;return el;}
function button(text,cls){const b=node('button',text,cls);b.type='button';return b;}
function uuid(){return crypto.randomUUID();}
function field(label,type='input'){const wrap=node('div');const id=(config.idPrefix||'central')+'-'+label.toLowerCase().replace(/[^a-z0-9]+/g,'-');const lab=node('label',label);lab.htmlFor=id;const el=node(type);el.id=id;wrap.append(lab,el);return {wrap,el};}
host.replaceChildren();host.classList.add('vero-central');
const identification=node('div',null,'fields');
const title=field('Risk title'),description=field('Risk description','textarea');title.el.maxLength=255;description.el.maxLength=10000;description.wrap.classList.add('full');
const ownerField=field('Risk Owner');ownerField.el.placeholder='Search VERO users by name or email';ownerField.el.autocomplete='off';ownerField.el.setAttribute('role','combobox');ownerField.el.setAttribute('aria-expanded','false');ownerField.el.setAttribute('aria-autocomplete','list');
const ownerList=node('div',null,'owner-options');ownerList.id=(config.idPrefix||'central')+'-owner-options';ownerList.setAttribute('role','listbox');ownerList.hidden=true;ownerField.el.setAttribute('aria-controls',ownerList.id);
const ownerNote=node('p','Select an active VERO user.','muted owner-note');ownerNote.setAttribute('aria-live','polite');const ownerAnchor=node('div',null,'picker-anchor');ownerAnchor.append(ownerField.el,ownerList);ownerField.wrap.append(ownerAnchor,ownerNote);
const review=field('Next review date');review.el.type='date';const reviewHelp=node('p','', 'muted');reviewHelp.setAttribute('aria-live','polite');review.wrap.append(reviewHelp);identification.append(title.wrap,ownerField.wrap,description.wrap,review.wrap);
const tierBox=node('div',null,'tiers'),tierFields=[];
for(let i=0;i<4;i++){const f=field('Tier '+(4-i)+' '+['Risk Domain','Risk Stream','Risk Category','Risk Event'][i],'select');tierFields.push(f.el);tierBox.append(f.wrap);if(config.projectMode&&i<2)f.wrap.hidden=true;f.el.onchange=()=>renderTiers(i+1);}
if(config.fixedCategory){tierBox.hidden=true;title.el.readOnly=true;}
if(config.assessmentOnly){tierBox.hidden=true;title.wrap.hidden=true;description.wrap.hidden=true;}
const tierHelp=node('p',config.classificationHelp||(config.projectMode?'Project Execution · Choose Tier 2 and Tier 1 for this project risk.':'Choose Tier 4, then stop at that tier or continue down to a more specific classification.'),'muted full');tierBox.append(tierHelp);
const tabs=node('div',null,'stages');tabs.setAttribute('aria-label','Assessment stages');
for(let i=0;i<3;i++){const b=button('','stage');b.append(node('b',(i+1)+' '+stages[i]),node('span',['Before controls','With existing controls','After further controls'][i]));b.onclick=()=>{stage=i;renderAssessment();};tabs.append(b);}
const columns=node('div',null,'columns'),panel=node('section',null,'panel'),summary=node('aside',null,'panel summary');
const existing=field('Existing controls','textarea'),further=field('Further controls and treatments','textarea');existing.el.maxLength=further.el.maxLength=config.projectMode?10000:20000;
const controlSearch=field('Find enterprise controls');controlSearch.el.type='search';
const controlList=node('div',null,'control-options');const controlsSection=node('div');controlsSection.append(existing.wrap,controlSearch.wrap,controlList);
const actionRows=[];const actionList=node('div');const addAction=button(compact?'+ Add control / action':'+ Add treatment action','button');
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
const notes=field('Assessment notes and justification','textarea'),footer=node('div',null,'footer'),cancel=button('Cancel','button'),save=button(config.submitLabel||'Save Risk · Make live','button primary'),status=node('p',null,'status');status.setAttribute('role','status');
notes.el.maxLength=config.notesMaxLength||20000;if(config.embedded)footer.hidden=true;footer.append(cancel,save);host.append(identification,tierBox,tabs,columns,notes.wrap,footer,status);
const fullCriteria=node('details');fullCriteria.append(node('summary','View full rating criteria'));
for(let l=5;l>=1;l--){fullCriteria.append(node('h4',names[l-1]),node('p',criteria.likelihood[names[l-1]]));}
for(const group of Object.keys(criteria.impact['1'])){const block=node('details');block.append(node('summary',group));for(let impact=5;impact>=1;impact--)block.append(node('h4',impacts[impact-1]),node('p',criteria.impact[String(impact)][group]));fullCriteria.append(block);}summary.append(fullCriteria);
const selectedControls=new Set();
if(traditional){
 host.classList.add('risk-worksheet');
 const tableWrap=node('div',null,'risk-worksheet-table-wrap'),table=node('table',null,'risk-worksheet-ratings');
 table.append(node('caption','Risk rating assessment'));
 const head=node('thead'),headRow=node('tr');
 for(const label of ['Assessment','Basis','Likelihood','Consequence','Risk rating']){const th=node('th',label);th.scope='col';headRow.append(th);}head.append(headRow);table.append(head);
 const body=node('tbody');
 for(let i=0;i<3;i++){
  const row=node('tr'),heading=node('th',stages[i]);heading.scope='row';
  row.append(heading,node('td',['Before controls','With existing controls','After proposed controls'][i]));
  const selects=[];
  for(const [axis,labels] of [['likelihood',names],['impact',impacts]]){
   const cell=node('td'),select=node('select');select.setAttribute('aria-label',stages[i]+' '+(axis==='impact'?'consequence':axis));
   select.append(node('option','Select…'));select.firstChild.value='';
   labels.forEach((label,n)=>{const option=node('option',label);option.value=String(n+1);select.append(option);});
   select.onchange=()=>{const l=selects[0].value,c=selects[1].value;ratings[i]=l&&c?{likelihood:Number(l),impact:Number(c)}:null;stage=i;if(l&&c)renderAssessment();else{worksheetRatings[i].badge.textContent='Not assessed';worksheetRatings[i].badge.removeAttribute('style');updateReview();}host.dispatchEvent(new Event('change',{bubbles:true}));};
   selects.push(select);cell.append(select);row.append(cell);
  }
  const result=node('td'),badge=node('span','Not assessed','badge');result.setAttribute('aria-live','polite');result.append(badge);row.append(result);body.append(row);worksheetRatings.push({selects,badge});
 }
 table.append(body);tableWrap.append(table);
 const controls=node('section',null,'risk-worksheet-controls');controls.append(controlsSection,targetSection);
 const guide=node('details',null,'risk-worksheet-guide');guide.append(node('summary','Risk matrix and rating definitions'),tabs,columns);
 host.replaceChildren(identification,tierBox,controls,tableWrap,notes.wrap,guide,footer,status);
 summaries.hidden=true;summary.querySelector('h3').hidden=true;
 if(compact){
  host.classList.add('risk-compact');identification.append(review.wrap,description.wrap);
  headRow.replaceChildren();const ratingRow=node('tr');
  worksheetRatings.forEach((row,i)=>{
   const th=node('th',stages[i]);th.scope='col';headRow.append(th);
   const cell=node('td'),axes=node('div',null,'compact-rating-axes');
   row.selects.forEach((select,n)=>{const label=node('label',n?'Consequence':'Likelihood');label.append(select);axes.append(label);});
   cell.append(axes,row.badge);ratingRow.append(cell);
  });body.replaceChildren(ratingRow);
  const advanced=node('details',null,'risk-compact-advanced');advanced.append(node('summary','Justification and supporting controls'),notes.wrap,
   controlSearch.wrap,controlList,documentSearch.wrap,documentList,guide);
  controls.replaceChildren(controlsSection);controls.classList.add('risk-compact-existing');
  further.wrap.querySelector('label').textContent='Additional control notes (optional)';
  controlNotes=node('details',null,'risk-compact-control-notes');controlNotes.append(node('summary','Additional control notes'),further.wrap);
  const treatments=node('section',null,'risk-compact-actions');treatments.append(node('h4','Further controls and actions'),node('p','List each further control or action once, with its owner and due date. After Risk Manager approval, it appears in the selected owner’s My Actions.','muted'),actionList,addAction,controlNotes);
  host.replaceChildren(identification,tierBox,controls,tableWrap,treatments,advanced,footer,status);
 }
}
function addPicker(search,list,selection,items,label){
 const anchor=node('div',null,'picker-anchor'),added=node('div',null,'added-items');
 anchor.append(search.el,list);search.wrap.append(anchor,added);list.className='add-options';list.hidden=true;list.id=search.el.id+'-options';list.setAttribute('role','listbox');search.el.setAttribute('role','combobox');search.el.setAttribute('aria-autocomplete','list');search.el.setAttribute('aria-controls',list.id);search.el.setAttribute('aria-expanded','false');search.el.autocomplete='off';search.el.placeholder='Search and add one at a time';
 let matches=[],active=-1;
 function hide(){list.hidden=true;search.el.setAttribute('aria-expanded','false');search.el.removeAttribute('aria-activedescendant');}
 function renderSelected(){added.replaceChildren();for(const id of selection){const item=items().find(x=>x.id===id);const itemLabel=item?label(item):'Unavailable Selection #'+id;const row=node('div',null,'added-item'),remove=button('Remove');remove.setAttribute('aria-label','Remove '+itemLabel);remove.onclick=()=>{selection.delete(id);renderSelected();};row.append(node('span',itemLabel),remove);added.append(row);}}
 function choose(item){selection.add(item.id);search.el.value='';renderSelected();search.el.focus();hide();}
 function show(){if(busy)return;active=-1;const q=search.el.value.trim().toLowerCase();matches=items().filter(x=>!selection.has(x.id)&&label(x).toLowerCase().includes(q)).slice(0,50);list.replaceChildren();for(const item of matches){const b=button('Add '+label(item),'add-option');b.id=list.id+'-'+item.id;b.setAttribute('role','option');b.setAttribute('aria-selected','false');b.onclick=()=>choose(item);list.append(b);}if(!matches.length)list.append(node('p','No matching items available to add.','picker-empty'));list.hidden=false;search.el.setAttribute('aria-expanded','true');}
 search.el.oninput=show;search.el.onfocus=show;
 search.el.onkeydown=e=>{if(e.key==='Escape'){hide();e.stopPropagation();return;}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(list.hidden)show();active=Math.max(0,Math.min(matches.length-1,active+(e.key==='ArrowDown'?1:-1)));[...list.querySelectorAll('button')].forEach((b,i)=>b.setAttribute('aria-selected',String(i===active)));if(matches[active])search.el.setAttribute('aria-activedescendant',list.id+'-'+matches[active].id);}else if(e.key==='Enter'&&active>=0&&!list.hidden){e.preventDefault();choose(matches[active]);}};
 listen(document,'click',e=>{if(!search.wrap.contains(e.target))hide();});
 return {render(){renderSelected();hide();},hide};
}
const enterprisePicker=addPicker(controlSearch,controlList,selectedControls,()=>options?.controls||[],c=>c.code+' · '+c.title);
const documentPicker=addPicker(documentSearch,documentList,selectedDocuments,()=>options?.documents||[],d=>d.code+' · '+d.title+' · Version '+d.version);
function renderDocuments(){documentPicker.render();}
function renderActions(){actionList.replaceChildren();for(const action of actionRows){const row=node('div',null,'fields panel'),label=field((compact?'Control / action ':'Treatment title ')+action.key),assigned=field((compact?'Action owner ':'Treatment owner ')+action.key,'select'),due=field((compact?'Due date ':'Treatment due date ')+action.key);label.el.maxLength=255;label.el.value=action.title;label.el.oninput=()=>action.title=label.el.value;const blank=node('option','Select authorised owner');blank.value='';assigned.el.append(blank);for(const u of options.treatment_owners||[]){const opt=node('option',u.name+' · '+u.email);opt.value=String(u.id);assigned.el.append(opt);}assigned.el.value=String(action.owner_user_id||'');assigned.el.onchange=()=>action.owner_user_id=Number(assigned.el.value)||null;due.el.type='date';due.el.value=action.due_date;due.el.oninput=()=>action.due_date=due.el.value;const remove=button('Remove action','button');remove.onclick=()=>{actionRows.splice(actionRows.indexOf(action),1);renderActions();};row.append(label.wrap,assigned.wrap,due.wrap);
if(config.projectMode){const detail=field('Treatment Description '+action.key,'textarea'),priority=field('Treatment Priority '+action.key,'select');detail.el.value=action.description||'';detail.el.oninput=()=>action.description=detail.el.value;for(const name of ['Normal','Low','High','Critical']){const opt=node('option',name);opt.value=name;priority.el.append(opt);}priority.el.value=action.priority||'Normal';priority.el.onchange=()=>action.priority=priority.el.value;row.append(detail.wrap,priority.wrap);}
row.append(remove);actionList.append(row);}}
let actionKey=0;addAction.onclick=()=>{actionRows.push({key:++actionKey,title:'',owner_user_id:null,due_date:''});renderActions();};
function renderControls(){enterprisePicker.render();}
function renderTiers(from=0){if(config.projectMode){tierFields[0].value='';const fixed=node('option','Project Execution');fixed.value=config.classificationMode==='category-event'?'':String(config.fixedTier3Id);tierFields[1].replaceChildren(fixed);tierFields[1].value=fixed.value;from=Math.max(2,from);}for(let index=from;index<4;index++){const select=tierFields[index];select.replaceChildren();select.value='';const placeholder=node('option',config.projectMode?'Select Tier '+(4-index):(index?'Stop at Tier '+(5-index)+' or select Tier '+(4-index):'Select Tier 4'));placeholder.value='';select.append(placeholder);
 let unique;
 if(Array.isArray(options.classification_categories)&&Array.isArray(options.classification_relationships)){
  const parent=index?Number(tierFields[index-1].value):null;
  const children=new Set(options.classification_relationships.filter(r=>r.parent_id===parent).map(r=>r.child_id));
  unique=new Map(options.classification_categories.filter(c=>c.tier===4-index&&(!index||(config.classificationMode==='category-event'&&index===2)||children.has(c.id))).map(c=>[c.id,c.name]));
 }else{const paths=options.classifications.filter(p=>p.path_ids.slice(0,index).every((id,j)=>String(id)===tierFields[j].value));unique=new Map(paths.map(p=>[p.path_ids[index],p.path_names[index]]));}
 for(const [id,name] of unique){const opt=node('option',name);opt.value=String(id);select.append(opt);}select.disabled=(index>0&&!tierFields[index-1].value&&!(config.classificationMode==='category-event'&&index===2))||busy;
 if(index>0&&tierFields[index-1].value&&!unique.size)placeholder.textContent='No active Tier '+(4-index)+' entries under this selection';
}}
function chooseOwner(user){owner=user.id;ownerField.el.value=user.name+' · '+user.email;ownerNote.textContent='Selected: '+user.name;ownerList.hidden=true;ownerField.el.setAttribute('aria-expanded','false');ownerField.el.removeAttribute('aria-activedescendant');}
function searchOwners(){ownerIndex=-1;const q=owner?'':ownerField.el.value.toLowerCase();ownerMatches=options.users.filter(u=>(u.name+' '+u.email).toLowerCase().includes(q));ownerList.replaceChildren();for(const u of ownerMatches.slice(0,50)){const b=button(u.name,'owner-option');b.id=(config.idPrefix||'central')+'-owner-'+u.id;b.setAttribute('role','option');b.setAttribute('aria-selected','false');b.append(node('small',u.email));b.onclick=()=>chooseOwner(u);ownerList.append(b);}if(!ownerMatches.length)ownerList.append(node('p','No matching active users.'));ownerList.hidden=false;ownerField.el.setAttribute('aria-expanded','true');}
ownerField.el.oninput=()=>{owner=null;ownerNote.textContent='Select a user from the search results.';searchOwners();};
ownerField.el.onfocus=()=>{if(options)searchOwners();};
listen(document,'click',e=>{if(!ownerField.wrap.contains(e.target)){ownerList.hidden=true;ownerField.el.setAttribute('aria-expanded','false');ownerField.el.removeAttribute('aria-activedescendant');}});
ownerField.el.onkeydown=e=>{if(e.key==='Escape'){ownerList.hidden=true;ownerField.el.setAttribute('aria-expanded','false');e.stopPropagation();}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();ownerIndex=Math.max(0,Math.min(Math.min(ownerMatches.length,50)-1,ownerIndex+(e.key==='ArrowDown'?1:-1)));[...ownerList.querySelectorAll('button')].forEach((b,i)=>b.setAttribute('aria-selected',String(i===ownerIndex)));if(ownerMatches[ownerIndex])ownerField.el.setAttribute('aria-activedescendant',(config.idPrefix||'central')+'-owner-'+ownerMatches[ownerIndex].id);}if(e.key==='Enter'&&ownerIndex>=0&&!ownerList.hidden){e.preventDefault();chooseOwner(ownerMatches[ownerIndex]);}};
function showExplanation(value,axis){explanation.replaceChildren();if(!value){explanation.append(node('p','Select a cell or a rating label to see the definitions.'));return;}if(axis!=='impact'){explanation.append(node('h4',names[value.likelihood-1]),node('p',criteria.likelihood[names[value.likelihood-1]]));}if(axis!=='likelihood'){explanation.append(node('h4',impacts[value.impact-1]),node('p',criteria.impact[String(value.impact)][category.el.value]));}}
function updateReview(){if(!options.review_policy||!window.VeroRiskReviewPolicy)return;review.el.readOnly=true;const r=ratings[1];if(!r){review.el.value='';reviewHelp.textContent='Calculated from the Current Residual rating.';return;}const plan=window.VeroRiskReviewPolicy.schedule(r.likelihood,r.impact,options.review_policy);review.el.value=plan.next_review_date;reviewHelp.textContent=plan.residual_rating+' · '+plan.default_interval_months+' month default'+(plan.constraints.length?' · '+plan.constraints.join('; '):'')+(plan.immediate_escalation?' · Immediate escalation is also required.':'');}
function colour(el,band){el.style.background=colours[band];el.style.color=['Moderate','Significant'].includes(band)?'#fff':'#292725';}
function renderAssessment(){updateReview();[...tabs.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===stage)));controlsSection.hidden=!traditional&&stage!==1;targetSection.hidden=!traditional&&stage!==2;inherentNote.hidden=traditional||stage!==0;matrixHeading.textContent=stages[stage]+' Risk Assessment';matrix.replaceChildren();matrix.append(node('span'),node('span'));for(let impact=1;impact<=5;impact++){const b=button(impacts[impact-1],'axis-label');b.onmouseenter=b.onfocus=b.onclick=()=>showExplanation({impact,likelihood:1},'impact');matrix.append(b);}matrix.append(node('span'),node('span','L / C','axis like-number'));for(let i=1;i<=5;i++)matrix.append(node('span',String(i),'axis'));
for(let l=5;l>=1;l--){const b=button(names[l-1],'axis-label like');b.onmouseenter=b.onfocus=b.onclick=()=>showExplanation({likelihood:l,impact:1},'likelihood');matrix.append(b,node('span',String(l*5),'axis like-number'));for(let impact=1;impact<=5;impact++){const band=bands[l-1][impact-1],cell=button('','cell');cell.dataset.l=String(l);cell.dataset.i=String(impact);colour(cell,band);cell.append(node('span',String(l*5*impact),'score'),node('small',band));const selected=ratings[stage]?.likelihood===l&&ratings[stage]?.impact===impact;cell.setAttribute('aria-pressed',String(selected));cell.setAttribute('aria-label',names[l-1]+', '+impacts[impact-1]+', '+(l*5*impact)+' '+band);cell.tabIndex=selected||(!ratings[stage]&&l===5&&impact===1)?0:-1;cell.onclick=()=>{ratings[stage]={likelihood:l,impact};renderAssessment();matrix.querySelector(`[data-l="${l}"][data-i="${impact}"]`).focus();};cell.onkeydown=e=>{let nl=l,ni=impact;if(e.key==='ArrowRight')ni=Math.min(5,impact+1);else if(e.key==='ArrowLeft')ni=Math.max(1,impact-1);else if(e.key==='ArrowDown')nl=Math.max(1,l-1);else if(e.key==='ArrowUp')nl=Math.min(5,l+1);else return;e.preventDefault();matrix.querySelector(`[data-l="${nl}"][data-i="${ni}"]`).focus();};matrix.append(cell);}}
worksheetRatings.forEach((row,i)=>{const r=ratings[i];if(r){row.selects[0].value=String(r.likelihood);row.selects[1].value=String(r.impact);}row.badge.textContent=r?r.likelihood*5*r.impact+' · '+bands[r.likelihood-1][r.impact-1]:'Not assessed';if(r)colour(row.badge,bands[r.likelihood-1][r.impact-1]);else row.badge.removeAttribute('style');});summaries.replaceChildren();ratings.forEach((r,i)=>{const group=node('div');group.append(node('small',stages[i]));const badge=node('span',r?r.likelihood*5*r.impact+' · '+bands[r.likelihood-1][r.impact-1]:'Not assessed','badge');if(r)colour(badge,bands[r.likelihood-1][r.impact-1]);group.append(badge);summaries.append(group);});const r=ratings[stage];selection.textContent=r?names[r.likelihood-1]+' × '+impacts[r.impact-1]+' = '+r.likelihood*5*r.impact:'Select a cell';showExplanation(r);}

function closePickers(){enterprisePicker.hide();documentPicker.hide();ownerList.hidden=true;ownerField.el.setAttribute('aria-expanded','false');}
function setBusy(value){busy=value;host.querySelectorAll('input,textarea,select,button').forEach(el=>el.disabled=value);if(!value)tierFields.forEach((el,i)=>el.disabled=config.projectMode&&i<2?true:i>0&&!tierFields[i-1].value&&!(config.classificationMode==='category-event'&&i===2));config.onBusy?.(value);}
function value(){return {risk_title:title.el.value.trim(),risk_description:description.el.value.trim(),
 classification_path:config.fixedCategory?[config.fixedCategory.id]:tierFields.filter(s=>s.value).map(s=>Number(s.value)),risk_owner_user_id:owner,
 inherent:ratings[0],residual:ratings[1],target:ratings[2],controls_summary:existing.el.value,
 treatments_summary:further.el.value,justification:notes.el.value,next_review_date:review.el.value,
 control_ids:[...selectedControls].sort((a,b)=>a-b),document_ids:[...selectedDocuments].sort((a,b)=>a-b),
 treatment_actions:actionRows.map(a=>({title:a.title.trim(),owner_user_id:a.owner_user_id,due_date:a.due_date,...(config.projectMode?{description:a.description||'',priority:a.priority||'Normal'}:{})}))};}
function setValue(v={}){
 title.el.value=config.fixedCategory?.name||v.risk_title||'';description.el.value=v.risk_description||'';notes.el.value=v.justification||'';
 existing.el.value=v.controls_summary||'';further.el.value=v.treatments_summary||'';review.el.value=v.next_review_date||'';
 ratings=[v.inherent||null,v.residual||null,v.target||null];worksheetRatings.forEach((row,i)=>{row.selects[0].value=ratings[i]?String(ratings[i].likelihood):'';row.selects[1].value=ratings[i]?String(ratings[i].impact):'';});
 owner=null;ownerField.el.value='';const user=options.users.find(u=>u.id===v.risk_owner_user_id);if(user)chooseOwner(user);
 selectedControls.clear();for(const id of v.control_ids||[])selectedControls.add(id);
 selectedDocuments.clear();for(const id of v.document_ids||[])selectedDocuments.add(id);
 actionRows.splice(0);for(const action of v.treatment_actions||[])actionRows.push({...action,key:++actionKey});
 if(controlNotes)controlNotes.open=!!further.el.value&&!actionRows.length;
 renderTiers();const path=v.classification_path||[];
 const start=config.projectMode?2:0;
 const selected=config.projectMode?path.slice(-2):path;
 selected.forEach((id,index)=>{const fieldIndex=start+index;tierFields[fieldIndex].value=String(id);renderTiers(fieldIndex+1);});
 renderControls();renderDocuments();renderActions();renderAssessment();
}
cancel.onclick=()=>{if(!busy){closePickers();config.onCancel?.();}};
save.onclick=async()=>{
 if(busy)return;status.textContent='';const body=value();
 const validClassification=config.assessmentOnly?true:config.fixedCategory?true:config.projectMode?Boolean(tierFields[2].value&&tierFields[3].value):Boolean(tierFields[0].value);
 if(!body.risk_title||!body.risk_description||!owner||!validClassification||ratings.some(r=>!r)||!body.next_review_date||!body.justification.trim()){
  status.textContent='Complete the title, description, Risk Owner, classification, all three ratings, review date and assessment notes.';return;
 }
 if(config.requireDocument&&!body.document_ids.length){status.textContent='Add at least one current Document Library control.';return;}
 if(config.projectMode&&body.treatment_actions.length>30){status.textContent='A project submission supports up to 30 treatment actions.';return;}
 if(body.treatment_actions.some(a=>!a.title||!a.owner_user_id||!a.due_date)){status.textContent='Complete each treatment title, owner and due date, or remove the empty action.';return;}
 setBusy(true);status.textContent=config.savingMessage||'Saving risk and assessment…';
 try{await config.onSubmit(body);}
 catch(error){status.textContent=error.message;}
 finally{setBusy(false);}
};
renderTiers();renderControls();renderDocuments();renderAssessment();
if(config.initial)setValue(config.initial);
return {getValue:value,setValue,setBusy,isBusy:()=>busy,closePickers,focus:()=>title.el.focus(),
 setStatus(message){status.textContent=message;},destroy(){closePickers();cleanups.forEach(fn=>fn());host.replaceChildren();}};
}
return {mount};
})();

