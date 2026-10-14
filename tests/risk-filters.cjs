'use strict';
// Execute the shipped controllers with an offline DOM and authorised API fixtures.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {test}=require('node:test');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'risk.html'),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(x=>x[1]);
const dashboard=scripts.find(x=>x.includes("const matrix=document.getElementById('veroRiskMatrix')"));
const contextFile=path.join(root,'risk-context.js');
const contextCode=fs.existsSync(contextFile)?fs.readFileSync(contextFile,'utf8'):
 scripts.find(x=>x.includes("const type=document.getElementById('veroContextTypeFilter')"));

class Target{
 constructor(){this.listeners=new Map();}
 addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(fn);}
 dispatchEvent(event){event.target??=this;for(const fn of this.listeners.get(event.type)||[])fn(event);return true;}
}
class Element extends Target{
 constructor(tag='div'){super();this.tagName=tag.toUpperCase();this.children=[];this.style={};this.attributes={};this.disabled=false;this.hidden=false;this._text='';this._value=undefined;this.className='';this.classList={add:(name)=>{this.className+=' '+name;},contains:(name)=>this.className.split(' ').includes(name)};}
 get childNodes(){return this.children;}
 cloneNode(deep=false){const copy=new Element(this.tagName);copy._text=this._text;copy._value=this._value;copy.className=this.className;copy.hidden=this.hidden;copy.disabled=this.disabled;copy.attributes={...this.attributes};if(deep)for(const child of this.children)copy.appendChild(child.cloneNode(true));return copy;}
 get value(){return this._value??(this.tagName==='SELECT'?(this.children[0]?.value||''):'');}
 set value(value){value=String(value);this._value=this.tagName==='SELECT'&&!this.children.some(x=>x.value===value)?'':value;}
 set textContent(value){this._text=String(value??'');this.children=[];}
 get textContent(){return this._text+this.children.map(x=>x.textContent).join('');}
 appendChild(child){if(child.tagName==='#FRAGMENT'){for(const node of [...child.children])this.appendChild(node);return child;}this.children.push(child);child.parent=this;return child;}
 append(...nodes){nodes.forEach(node=>this.appendChild(node));}
 replaceChildren(...nodes){this.children=[];this._text='';this._value=undefined;this.append(...nodes);}
 add(node){this.appendChild(node);}
 setAttribute(name,value){this.attributes[name]=String(value);}
 getAttribute(name){return this.attributes[name];}
 querySelectorAll(selector){if(selector==='option:not(:first-child)')return this.children.slice(1);throw Error('Unhandled selector '+selector);}
 remove(){this.parent.children=this.parent.children.filter(x=>x!==this);}
}
class Option extends Element{constructor(text,value){super('option');this.textContent=text;this.value=value;}}
class CustomEvent{constructor(type,{detail}={}){this.type=type;this.detail=detail;}preventDefault(){}}
const response=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});
const category=(id,tier,parents=[])=>({id,tier,parent_category_ids:parents,status:'Active',category_name:'Category '+id});
const categories=[category(40,4),category(41,4),category(30,3,[40]),category(31,3,[41]),category(32,3,[40,41]),category(20,2,[30]),category(21,2,[31]),category(22,2,[32]),category(10,1,[20]),category(11,1,[21]),category(12,1,[20,22]),category(13,1,[22]),{...category(99,3,[40]),status:'Archived'}];
const risk=(id,title,t1,t2,t3,t4,likelihood,impact,register=1)=>({id,risk_code:'R-'+id,risk_title:title,risk_description:'Description '+title,risk_category:'Category '+t2,register_id:register,register_name:'Master',status:'Draft',tier_1_ids:t1,tier_2_ids:t2,tier_3_ids:t3,tier_4_ids:t4,residual_likelihood:likelihood,residual_impact:impact,inherent_likelihood:5,inherent_impact:5});
const risks=[risk(1,'Alpha',[10],[20],[30],[40],1,1),risk(2,'Beta',[12],[20,22],[30,32],[40,41],5,5),risk(3,'Gamma',[11],[21],[31],[41],3,3),risk(4,'Delta',[13],[22],[32],[40,41],2,2),risk(5,'Unassessed',[10],[20],[30],[40],null,null),risk(6,'Unassigned',[10],[20],[30],[40],1,1),risk(99,'Local register',[],[],[],[],1,1,2)];
const assignments={1:[{id:1,context_type:'Project',context_id:101,status:'Applicable'}],2:[{id:2,context_type:'Project',context_id:102,status:'Applicable'}],3:[{id:3,context_type:'Maintenance Contract',context_id:101,status:'Applicable'}],4:[{id:4,context_type:'VM Site',context_id:301,status:'Applicable'}],5:[{id:5,context_type:'Project',context_id:101,status:'Not Applicable'}],6:[]};
const contexts={context_types:['Project','Contract','VM Location'],projects:[{id:101,name:'Project A'},{id:102,name:'Project B'}],contracts:[{id:101,name:'Contract A'}],vm_locations:[{id:301,name:'Location A'}],sites:[{id:501,name:'Site A'}],project_sites:[{context_id:101,site_id:501}],contract_sites:[],vm_location_sites:[]};
async function settle(){for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));}
function setup(override,{delayContext=false}={}){
 const document=new Target(),elements=new Map();
 for(const match of html.matchAll(/<(\w+)\b[^>]*\bid=["']([^"']+)["'][^>]*>/g)){
  const el=new Element(match[1]);el.disabled=/\bdisabled\b/.test(match[0]);el.hidden=/\bhidden\b/.test(match[0]);elements.set(match[2],el);
 }
 for(const match of html.matchAll(/<select\b[^>]*id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/select>/g)){
  const el=elements.get(match[1]);for(const option of match[2].matchAll(/<option\b[^>]*value=["']([^"']*)["'][^>]*>(.*?)<\/option>/g))el.add(new Option(option[2],option[1]));
 }
 // Baseline comparison may lack the new status/retry controls.
 for(const id of ['veroContextStatus','veroContextRetry'])if(!elements.has(id))elements.set(id,new Element());
 document.getElementById=id=>{assert.ok(elements.has(id),'Missing element '+id);return elements.get(id);};
 document.createElement=tag=>new Element(tag);
 document.createDocumentFragment=()=>new Element('#fragment');
 const calls=[];
 const fetch=async(url,options)=>{
  const parsed=new URL(url),route=parsed.pathname.replace(/^\/api/,'');calls.push({route,url:parsed,options});
  const custom=override?.(route,parsed,options);if(custom!==undefined)return custom;
  if(route==='/risk-registers')return response({registers:[{id:1,register_code:'RISK-GLOBAL',register_name:'Master'},{id:2,register_code:'LOCAL',register_name:'Local'}]});
  if(route==='/risks')return response({risks});
  if(route==='/risk/master-aggregation')return response({aggregations:[]});
  if(route==='/risk-tiers')return response({categories});
  if(route==='/risk/operational-contexts')return response(contexts);
  if(route==='/risk/hierarchical-register'){
   const parent=Number(parsed.searchParams.get('parent_id'));
   return response({rows:categories.filter(c=>c.status==='Active'&&(parent?c.parent_category_ids.includes(parent):c.tier===4)).map(c=>({kind:'category',id:c.id,tier:c.tier,name:c.category_name}))});
  }
  const match=route.match(/^\/risks\/(\d+)\/applicability$/);if(match)return response({assignments:assignments[match[1]]||[]});
  throw Error('Unexpected request '+route);
 };
 const scope=vm.createContext({document,window:{},localStorage:{getItem:()=> 'offline-test-token'},fetch,Option,CustomEvent,URLSearchParams,AbortController,console:{warn(){},error(){}}});
 vm.runInContext(dashboard,scope,{filename:'risk.html:dashboard'});
 const startContext=()=>vm.runInContext(contextCode,scope,{filename:'risk-context.js'});
 if(!delayContext)startContext();
 vm.runInContext(fs.readFileSync(path.join(root,'risk-hierarchy.js'),'utf8'),scope,{filename:'risk-hierarchy.js'});
 const el=id=>document.getElementById(id);
 const change=(id,value)=>{el(id).value=value;el(id).dispatchEvent(new CustomEvent('change'));};
 const cells=()=>el('veroRiskMatrix').children.filter(x=>x.className.startsWith('vero-matrix-cell'));
 return {document,el,calls,change,cells,startContext,table:()=>el('veroRiskTableBody').textContent,ids:id=>el(id).children.map(x=>x.value),scope};
}

test('Tier 4 → 1 cascades support multiple parents and exclude archived categories',async()=>{
 const app=setup();await settle();
 assert.equal(app.el('veroTier3Filter').disabled,true);
 app.change('veroTier4Filter',40);assert.deepEqual(app.ids('veroTier3Filter'),['','30','32']);
 app.change('veroTier3Filter',30);assert.deepEqual(app.ids('veroTier2Filter'),['','20']);
 app.change('veroTier2Filter',20);assert.deepEqual(app.ids('veroTier1Filter'),['','10','12']);
 app.change('veroTier1Filter',10);await settle();
 assert.match(app.table(),/Alpha/);assert.doesNotMatch(app.table(),/Beta/);
 assert.equal(app.el('veroMatrixStatus').textContent,'3');
 app.change('veroTier4Filter',41);await settle();
 assert.deepEqual(app.ids('veroTier3Filter'),['','31','32']);
 for(const id of ['veroTier3Filter','veroTier2Filter','veroTier1Filter'])assert.equal(app.el(id).value,'');
 assert.equal(app.el('veroTier2Filter').disabled,true);assert.equal(app.el('veroTier1Filter').disabled,true);
 app.change('veroTier4Filter','');await settle();
 assert.equal(app.el('veroTier3Filter').disabled,true);assert.equal(app.el('veroMatrixStatus').textContent,'7');
});

test('changing Tier 3 or Tier 2 clears every descendant before rendering',async()=>{
 const app=setup();await settle();app.change('veroTier4Filter',40);app.change('veroTier3Filter',30);app.change('veroTier2Filter',20);app.change('veroTier1Filter',12);
 app.change('veroTier3Filter',32);assert.equal(app.el('veroTier2Filter').value,'');assert.equal(app.el('veroTier1Filter').value,'');assert.equal(app.el('veroTier1Filter').disabled,true);
 app.change('veroTier2Filter',22);assert.deepEqual(app.ids('veroTier1Filter'),['','12','13']);app.change('veroTier1Filter',13);app.change('veroTier2Filter','');await settle();
 assert.equal(app.el('veroTier1Filter').value,'');assert.equal(app.el('veroTier1Filter').disabled,true);assert.equal(app.el('veroMatrixStatus').textContent,'2');
});

test('matrix selections, repeated click, clear and search retain the detailed risk list',async()=>{
 const app=setup();await settle();app.cells()[20].dispatchEvent(new CustomEvent('click'));await settle();
 assert.match(app.table(),/Alpha/);assert.match(app.table(),/Unassigned/);assert.doesNotMatch(app.table(),/Category 40|Beta|Unassessed/);assert.equal(app.el('veroRiskListStatus').textContent,'3');
 app.cells()[20].dispatchEvent(new CustomEvent('click'));await settle();assert.match(app.table(),/Category 40/);
 app.cells()[4].dispatchEvent(new CustomEvent('click'));await settle();assert.match(app.table(),/Beta/);
 app.el('veroClearMatrixSelection').dispatchEvent(new CustomEvent('click'));await settle();assert.match(app.table(),/Category 40/);
 app.el('veroRiskSearch').value='R-2';app.el('veroRiskSearch').dispatchEvent(new CustomEvent('input'));await settle();assert.match(app.table(),/Beta/);assert.doesNotMatch(app.table(),/Alpha|Category 40/);assert.equal(app.el('veroMatrixStatus').textContent,'1');
 app.el('veroRiskSearch').value='';app.el('veroRiskSearch').dispatchEvent(new CustomEvent('input'));app.change('veroRiskLevelFilter','Low');await settle();assert.match(app.table(),/Alpha/);assert.doesNotMatch(app.table(),/Beta|Unassessed/);
});

test('late hierarchy response cannot overwrite a newer matrix or search selection',async()=>{
 const pending=[];const app=setup(route=>route==='/risk/hierarchical-register'?new Promise(resolve=>pending.push(resolve)):undefined);await settle();
 assert.ok(pending.length);app.cells()[20].dispatchEvent(new CustomEvent('click'));await settle();
 pending.forEach(resolve=>resolve(response({rows:[{kind:'category',id:40,tier:4,name:'Stale hierarchy'}]})));await settle();
 assert.match(app.table(),/Alpha/);assert.doesNotMatch(app.table(),/Stale hierarchy/);
});

test('context filters share current applicability, reset child selections and reuse authorised cache',async()=>{
 const app=setup();await settle();assert.equal(app.calls.some(c=>c.route.endsWith('/applicability')),false,'lazy load');
 app.change('veroContextTypeFilter','Project');await settle();assert.equal(app.el('veroMatrixStatus').textContent,'2');assert.match(app.table(),/Alpha/);assert.match(app.table(),/Beta/);assert.doesNotMatch(app.table(),/Gamma|Unassessed/);
 app.change('veroApplicationFilter',101);await settle();assert.equal(app.el('veroMatrixStatus').textContent,'1');assert.match(app.table(),/Alpha/);assert.doesNotMatch(app.table(),/Beta/);
 app.change('veroContextTypeFilter','Contract');await settle();assert.equal(app.el('veroApplicationFilter').value,'');assert.equal(app.el('veroMatrixStatus').textContent,'1');assert.match(app.table(),/Gamma/);assert.doesNotMatch(app.table(),/Alpha/);
 app.change('veroContextTypeFilter','VM Location');await settle();assert.match(app.table(),/Delta/);
 const reads=app.calls.filter(c=>c.route.endsWith('/applicability'));assert.equal(reads.length,6);assert.equal(reads.some(c=>c.route.includes('/99/')),false,'do not call unsupported local registers');
 assert.equal(app.calls.some(c=>c.route==='/risk/context-assignments'),false,'do not revive legacy assignments');
 assert.equal(app.el('veroSiteFilter').disabled,true);assert.equal(app.el('veroSiteFilter').value,'');assert.match(app.el('veroContextStatus').textContent,/Site-level risk applicability is not available/);
 app.change('veroContextTypeFilter','');await settle();assert.equal(app.el('veroApplicationFilter').disabled,true);assert.equal(app.el('veroMatrixStatus').textContent,'7');
});

test('loading and failed applicability never masquerade as zero; explicit retry works',async()=>{
 let fail=true;const pending=[];
 const app=setup((route)=>route.endsWith('/applicability')&&fail?new Promise(resolve=>pending.push(resolve)):undefined);await settle();app.change('veroContextTypeFilter','Project');await settle();
 assert.equal(app.el('veroMatrixStatus').textContent,'Loading…');assert.match(app.table(),/Loading authorised/);
 pending.forEach((resolve,i)=>resolve(i===0?response({},503):response({assignments:[]})));await settle();
 assert.equal(app.el('veroMatrixStatus').textContent,'Unavailable');assert.match(app.table(),/could not be loaded/);assert.equal(app.el('veroContextRetry').hidden,false);
 fail=false;app.el('veroContextRetry').dispatchEvent(new CustomEvent('click'));await settle();assert.equal(app.el('veroMatrixStatus').textContent,'2');assert.equal(app.el('veroContextRetry').hidden,true);
});

test('successful empty applicability is a real zero with no error or invented assignment',async()=>{
 const app=setup(route=>route.endsWith('/applicability')?response({assignments:[]}):undefined);await settle();app.change('veroContextTypeFilter','Project');await settle();
 assert.equal(app.el('veroMatrixStatus').textContent,'0');assert.equal(app.el('veroRiskListStatus').textContent,'0');assert.match(app.table(),/No risks match/);assert.equal(app.el('veroContextRetry').hidden,true);
});

test('changing context while data is pending uses latest selection and at most six reads',async()=>{
 const pending=[];let active=0,max=0;
 const app=setup(route=>route.endsWith('/applicability')?new Promise(resolve=>{active++;max=Math.max(max,active);pending.push(()=>{active--;const id=route.split('/')[2];resolve(response({assignments:assignments[id]}));});}):undefined);
 await settle();app.change('veroContextTypeFilter','Project');await settle();app.change('veroApplicationFilter',101);app.change('veroContextTypeFilter','Contract');app.change('veroApplicationFilter',101);
 pending.forEach(resolve=>resolve());await settle();assert.ok(max<=6);assert.equal(app.el('veroMatrixStatus').textContent,'1');assert.match(app.table(),/Gamma/);assert.doesNotMatch(app.table(),/Alpha/);
});

test('refresh invalidates old applicability, and stale completion cannot replace the new cache',async()=>{
 let first=true;const pending=[];const app=setup(route=>route.endsWith('/applicability')&&first?new Promise(resolve=>pending.push(resolve)):undefined);
 await settle();app.change('veroContextTypeFilter','Project');await settle();first=false;
 app.document.dispatchEvent(new CustomEvent('vero-risk-register-refresh'));await settle();assert.equal(app.el('veroMatrixStatus').textContent,'2');
 pending.forEach(resolve=>resolve(response({assignments:[]})));await settle();assert.equal(app.el('veroMatrixStatus').textContent,'2');assert.match(app.table(),/Alpha/);
});

test('context option errors are visible and retry restores choices',async()=>{
 let fail=true;const app=setup(route=>route==='/risk/operational-contexts'&&fail?response({},500):undefined);await settle();
 assert.equal(app.el('veroContextTypeFilter').disabled,true);assert.match(app.el('veroContextStatus').textContent,/options could not be loaded/);assert.equal(app.el('veroContextRetry').hidden,false);
 fail=false;app.el('veroContextRetry').dispatchEvent(new CustomEvent('click'));await settle();assert.deepEqual(app.ids('veroContextTypeFilter'),['','Project','Contract','VM Location']);assert.equal(app.el('veroContextTypeFilter').disabled,false);
});

test('late context controller replays already completed authorised risk data',async()=>{
 const app=setup(undefined,{delayContext:true});await settle();
 app.startContext();await settle();app.change('veroContextTypeFilter','Project');await settle();
 assert.equal(app.el('veroMatrixStatus').textContent,'2');assert.match(app.table(),/Alpha/);
 assert.equal(app.calls.filter(c=>c.route.endsWith('/applicability')).length,6);
});

test('late context controller replays initial risk failure and exposes retry',async()=>{
 let fail=true;
 const app=setup(route=>route==='/risks'&&fail?response({},503):undefined,{delayContext:true});await settle();
 app.startContext();await settle();
 assert.equal(app.el('veroMatrixStatus').textContent,'Unavailable');assert.equal(app.el('veroRiskListStatus').textContent,'Unavailable');
 assert.match(app.table(),/Risk data could not be loaded/);assert.doesNotMatch(app.table(),/Category 40/);
 assert.match(app.el('veroContextStatus').textContent,/Risk Register data could not be loaded/);assert.equal(app.el('veroContextRetry').hidden,false);
 assert.equal(app.el('veroOverdueReviews').textContent,'—');
 assert.ok(app.cells().every(c=>c.children.at(-1).textContent==='—'));
 fail=false;app.el('veroContextRetry').dispatchEvent(new CustomEvent('click'));await settle();
 assert.equal(app.el('veroMatrixStatus').textContent,'7');assert.match(app.table(),/Category 40/);
});

test('register read failure remains unavailable without a context selection',async()=>{
 const app=setup(route=>route==='/risk-registers'?response({},503):undefined);await settle();
 assert.equal(app.el('veroMatrixStatus').textContent,'Unavailable');assert.equal(app.el('veroRiskListStatus').textContent,'Unavailable');
 assert.match(app.table(),/Risk data could not be loaded/);assert.equal(app.el('veroContextRetry').hidden,false);
 assert.equal(app.calls.some(c=>c.route==='/risk/hierarchical-register'),false);
});

test('refresh immediately hides old context totals until authorised risk reload completes',async()=>{
 let refresh=false;const pending=[];
 const app=setup(route=>route==='/risks'&&refresh?new Promise(resolve=>pending.push(resolve)):undefined);await settle();
 app.change('veroContextTypeFilter','Project');await settle();assert.equal(app.el('veroMatrixStatus').textContent,'2');
 refresh=true;app.document.dispatchEvent(new CustomEvent('vero-risk-register-refresh'));await settle();
 assert.equal(app.el('veroMatrixStatus').textContent,'Loading…');assert.doesNotMatch(app.table(),/Alpha/);
 pending.forEach(resolve=>resolve(response({risks})));await settle();assert.equal(app.el('veroMatrixStatus').textContent,'2');
});

test('older register response cannot replace the latest reload or its context cache',async()=>{
 const pending=[];let hold=true;
 const app=setup(route=>route==='/risks'&&hold?new Promise(resolve=>pending.push(resolve)):undefined);await settle();
 hold=false;app.document.dispatchEvent(new CustomEvent('vero-risk-register-refresh'));await settle();
 app.change('veroContextTypeFilter','Project');await settle();assert.equal(app.el('veroMatrixStatus').textContent,'2');
 pending.forEach(resolve=>resolve(response({risks:[]})));await settle();
 assert.equal(app.el('veroMatrixStatus').textContent,'2');assert.match(app.table(),/Alpha/);
});

test('applicability decision invalidates cache and removes a withdrawn assignment',async()=>{
 let withdrawn=false;
 const app=setup(route=>withdrawn&&route==='/risks/1/applicability'?response({assignments:[]}):undefined);await settle();
 app.change('veroContextTypeFilter','Project');await settle();assert.equal(app.el('veroMatrixStatus').textContent,'2');
 withdrawn=true;app.document.dispatchEvent(new CustomEvent('vero-risk-applicability-changed',{detail:{riskId:1}}));await settle();
 assert.equal(app.el('veroMatrixStatus').textContent,'1');assert.match(app.table(),/Beta/);assert.doesNotMatch(app.table(),/Alpha/);
 assert.equal(app.calls.filter(c=>c.route.endsWith('/applicability')).length,12);
});

test('shipped applicability submit invalidates after success even when drawer has closed',async()=>{
 const code=fs.readFileSync(path.join(root,'risk-operational.js'),'utf8');
 const prefix="form.addEventListener('submit',";
 const start=code.indexOf(prefix)+prefix.length;
 const end=code.indexOf(');\n    governance.appendChild(form);',start);
 assert.ok(start>=prefix.length&&end>start,'Locate shipped applicability submission handler');
 const events=[],requests=[];let reject=false;
 const scope=vm.createContext({
  record:{value:'101'},rationale:{value:'Recorded reason'},save:{},message:{},
  type:{value:'Project'},action:{value:'Withdraw'},risk:{id:1},seq:1,sequence:2,overlay:{hidden:true},
  API:'https://example.invalid/api',CustomEvent,
  document:{dispatchEvent:event=>events.push(event)},
  json:async(url,options)=>{requests.push({url,options});if(reject)throw Error('Denied');return {};},
  showApplicability:async()=>{throw Error('Closed drawer must not redraw');}
 });
 const submit=vm.runInContext('('+code.slice(start,end)+')',scope);
 await submit({preventDefault(){}});
 assert.equal(requests[0].options.method,'POST');assert.equal(events.length,1);
 assert.equal(events[0].type,'vero-risk-applicability-changed');assert.equal(events[0].detail.riskId,1);
 reject=true;await submit({preventDefault(){}});assert.equal(events.length,1,'Failed writes do not invalidate as successful decisions');
});

test('Tier 3 and Tier 2 preserve category rows until a detailed risk filter is selected',async()=>{
 const app=setup();await settle();app.change('veroTier4Filter',40);app.change('veroTier3Filter',30);await settle();
 assert.match(app.table(),/Category 20/);assert.doesNotMatch(app.table(),/Alpha/);
 app.change('veroTier2Filter',20);await settle();
 assert.match(app.table(),/Category 10/);assert.match(app.table(),/Category 12/);assert.doesNotMatch(app.table(),/Alpha/);
 app.change('veroTier1Filter',10);await settle();assert.match(app.table(),/Alpha/);assert.doesNotMatch(app.table(),/Category 12/);
});


test('register refresh preserves valid Tier 4 to Tier 1, context, search and matrix filters',async()=>{
 const app=setup();await settle();
 app.change('veroTier4Filter',40);app.change('veroTier3Filter',30);app.change('veroTier2Filter',20);app.change('veroTier1Filter',10);
 app.change('veroContextTypeFilter','Project');await settle();app.change('veroApplicationFilter',101);await settle();
 app.el('veroRiskRegisterFilter').value='1';app.el('veroRiskSearch').value='Alpha';app.el('veroRiskSearch').dispatchEvent(new CustomEvent('input'));
 app.document.dispatchEvent(new CustomEvent('vero-risk-register-refresh',{detail:{riskId:7,created:true}}));await settle();
 for(const [id,value] of Object.entries({veroTier4Filter:'40',veroTier3Filter:'30',veroTier2Filter:'20',veroTier1Filter:'10',veroContextTypeFilter:'Project',veroApplicationFilter:'101',veroRiskRegisterFilter:'1',veroRiskSearch:'Alpha'}))assert.equal(app.el(id).value,value,id);
 assert.match(app.table(),/Alpha/);assert.doesNotMatch(app.table(),/Beta|Gamma/);assert.equal(app.el('veroMatrixStatus').textContent,'1');
});
