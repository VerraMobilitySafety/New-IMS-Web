'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {test}=require('node:test');
const {randomUUID}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'risk-master-draft.js'),'utf8');
class Event{
 constructor(type,{detail,cancelable=false}={}){this.type=type;this.detail=detail;this.cancelable=cancelable;this.defaultPrevented=false;}
 preventDefault(){if(this.cancelable)this.defaultPrevented=true;}
}
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.listeners={};this.attributes={};this.value='';this.hidden=false;this.disabled=false;this._text='';this.className='';this.style={};this.dataset={};}
 set innerHTML(value){this.replaceChildren();for(const match of value.matchAll(/<(button|span)\b([^>]*)>(.*?)<\/\1>/g)){const el=new Element(match[1]);el.textContent=match[3];el.id=/id="([^"]+)"/.exec(match[2])?.[1];el.hidden=/\bhidden\b/.test(match[2]);this.appendChild(el);}}
 set textContent(value){this._text=String(value);this.children=[];}
 get textContent(){return this._text+this.children.map(x=>x.textContent).join('');}
 appendChild(el){this.children.push(el);el.parent=this;return el;}
 append(...els){els.forEach(el=>this.appendChild(el));}
 replaceChildren(...els){this.children=[];this._text='';this.append(...els);}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 dispatchEvent(event){event.target??=this;for(const fn of this.listeners[event.type]||[])fn(event);return !event.defaultPrevented;}
 getAttribute(name){return this.attributes[name];}
 setAttribute(name,value){this.attributes[name]=String(value);if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);}
 click(){if(!this.disabled)this.dispatchEvent(new Event('click'));}
 before(el){const index=this.parent.children.indexOf(this);this.parent.children.splice(index,0,el);el.parent=this.parent;}
 prepend(el){this.children.unshift(el);el.parent=this;}
 closest(selector){return this.matches(selector)?this:this.parent?.closest(selector)||null;}
 matches(selector){if(selector.startsWith('#'))return this.id===selector.slice(1);if(selector.startsWith('.'))return this.className.split(' ').includes(selector.slice(1));if(selector.startsWith('[')){const [name,value]=selector.slice(1,-1).split('=');const actual=this.attributes[name]??this[name];return value===undefined?actual!==undefined:String(actual)===value.replace(/[\"']/g,'');}return this.tagName===selector;}
 focus(){this.focused=true;}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 querySelectorAll(selector){return this.children.flatMap(el=>[...(el.matches(selector)?[el]:[]),...el.querySelectorAll(selector)]);}
}
const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
const tick=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
const category={id:11,tier:1,name:'Roadside operations'};
const draft={id:71,risk_title:'Vehicle conflict',risk_description:'Traffic exposure',risk_code:'MR-123',status:'Draft',tier_1_ids:[11]};
function app(override,options={}){
 const document=new Element(),content=new Element(),overlay=new Element(),title=new Element(),subtitle=new Element();
 const elements={veroRiskDetailsOverlay:overlay,veroRiskDetailsContent:content,veroRiskDetailsTitle:title,veroRiskDetailsCode:subtitle};
 document.getElementById=id=>elements[id]||document.querySelector('#'+id);document.createElement=tag=>new Element(tag);document.createTextNode=text=>{const el=new Element('#text');el.textContent=text;return el;};document.body={style:{}};
 const calls=[],events=[],prompts=[];
 for(const type of ['vero-risk-create-master','vero-risk-register-refresh','vero-risk-open-details','vero-risk-open-classification'])document.addEventListener(type,event=>events.push(event));
 const fetch=async(url,init={})=>{
  const route=new URL(url).pathname.slice(4),call={route,...init};calls.push(call);
  const result=override?.(call);if(result!==undefined)return result;
  if(route.endsWith('/project-submission'))return response({available:false});
  if(route==='/auth/my-roles')return response({roles:[{role_name:'Risk Manager'}]});
  if(route==='/risks/master-drafts')return response({status:'success',created:true,risk_id:71,risk_code:'MR-123',risk_status:'Draft',tier1_category_id:11},201);
  if(route==='/risks')return response({risks:[draft]});
  throw Error('Unexpected API '+route);
 };
 const scope=vm.createContext({document,fetch,crypto:options.crypto??{randomUUID},localStorage:{getItem:()=> 'offline-token'},CustomEvent:Event,console,window:{addEventListener:(type,fn)=>document.addEventListener('window:'+type,fn),prompt:()=> 'Reviewed and approved',confirm:message=>{prompts.push(message);return options.confirm??true;}}});
 if(options.integration){
  document.appendChild(overlay);overlay.append(title,subtitle,content);
  const tabs=new Element();tabs.className='vero-risk-details-tabs';overlay.appendChild(tabs);
  for(const name of ['overview','ownership','applicability','assessments','controls','history','related']){const button=new Element('button');button.setAttribute('data-risk-tab',name);button.textContent=name;tabs.appendChild(button);}
  const close=new Element('button');close.id='veroRiskDetailsClose';overlay.appendChild(close);
  const html=fs.readFileSync(path.join(root,'risk.html'),'utf8');const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(x=>x[1]);
  vm.runInContext(scripts.find(s=>s.includes("let risk=null,active='overview'")),scope,{filename:'risk.html:details'});
  vm.runInContext(scripts.find(s=>s.includes("const nav=make('div','');nav.className='vero-risk-classification-tabs'")),scope,{filename:'risk.html:classification'});
  scope.window.VeroProjectRiskSubmission={render:()=>{},load:async id=>{const r=await fetch('https://vero.test/api/risks/'+id+'/project-submission');return r.json();}};scope.VeroProjectRiskSubmission=scope.window.VeroProjectRiskSubmission;
  vm.runInContext(fs.readFileSync(path.join(root,'risk-office.js'),'utf8'),scope,{filename:'risk-office.js'});
 }
 vm.runInContext(code,scope,{filename:'risk-master-draft.js'});
 function open(item=category){overlay.hidden=false;const nav=new Element();nav.className='vero-risk-classification-tabs';if(!options.integration)content.replaceChildren(nav);document.dispatchEvent(new Event('vero-risk-open-classification',{detail:{category:item}}));return options.integration?content.querySelector('.vero-risk-classification-tabs'):nav;}
 function click(el){el.dispatchEvent(new Event('click'));}
 function emit(type,detail){document.dispatchEvent(new Event(type,{detail}));}
 function form(){return content.querySelector('form');}
 function field(name){return form().querySelector('[name='+name+']');}
 function feedback(){return content.querySelector('[role=status]').textContent;}
 async function start(){const nav=open();await tick();click(nav.querySelectorAll('button').find(el=>el.textContent==='+ Create Draft Master Risk'));return form();}
 function fill({title=' Vehicle conflict ',description=' Traffic exposure ',reason=' New activity identified '}={}){field('risk_title').value=title;field('risk_description').value=description;field('reason').value=reason;}
 function submit(){form().dispatchEvent(new Event('submit'));}
 return {document,content,overlay,title,subtitle,calls,events,prompts,open,click,emit,form,field,feedback,start,fill,submit};
}

test('creation control is limited to Tier 1 and an authorised Risk Manager',async()=>{
 for(const roles of [[],[{role_name:'Global Admin'}],[{role_name:'Risk Assessor'}]]){
  const a=app(call=>call.route==='/auth/my-roles'?response({roles}):undefined);const nav=a.open();await tick();assert.equal(nav.querySelector('button').hidden,true);a.click(nav.querySelector('button'));assert.equal(a.form(),null);
 }
 const denied=app(call=>call.route==='/auth/my-roles'?response({},503):undefined);const nav=denied.open();await tick();assert.equal(nav.querySelector('button').hidden,true);
 const a=app();const tier2=a.open({...category,tier:2});await tick();assert.equal(tier2.children.length,0);assert.equal(a.calls.length,0);
});

test('late role responses cannot enable a button after newer navigation',async()=>{
 let finish;const a=app(call=>call.route==='/auth/my-roles'?new Promise(resolve=>finish=resolve):undefined);
 const old=a.open();a.emit('vero-risk-open-details',{risk:draft});finish(response({roles:[{role_name:'Risk Manager'}]}));await tick();assert.equal(old.querySelector('button').hidden,true);
});

test('creation validates and atomically submits only the supported contract, then opens the saved Draft',async()=>{
 const a=app();await a.start();a.fill();a.submit();await tick();
 const calls=a.calls.filter(call=>call.route==='/risks/master-drafts');assert.equal(calls.length,1);
 const body=JSON.parse(calls[0].body);assert.match(body.request_id,/^[0-9a-f-]{36}$/);assert.deepEqual({...body,request_id:undefined},{request_id:undefined,risk_title:'Vehicle conflict',risk_description:'Traffic exposure',tier1_category_id:11,reason:'New activity identified'});
 assert.equal(calls[0].method,'POST');assert.ok(calls[0].headers.Authorization.startsWith('Bearer '));
 assert.equal(a.events.filter(e=>e.type==='vero-risk-register-refresh').length,1);
 assert.equal(a.events.find(e=>e.type==='vero-risk-open-details').detail.risk,draft);
});

test('blank Draft description is allowed, but blank title or reason cannot submit',async()=>{
 const a=app();await a.start();a.fill({title:'   '});a.submit();await tick();assert.equal(a.calls.some(c=>c.method==='POST'),false);
 a.fill({reason:'  '});a.submit();await tick();assert.equal(a.calls.some(c=>c.method==='POST'),false);
 a.fill({description:''});a.submit();await tick();assert.equal(JSON.parse(a.calls.find(c=>c.method==='POST').body).risk_description,'');
});

test('in-flight double submission is disabled and produces exactly one POST',async()=>{
 let finish;const a=app(call=>call.method==='POST'?new Promise(resolve=>finish=resolve):undefined);await a.start();a.fill();a.submit();a.submit();
 assert.equal(a.form().querySelector('button').disabled,true);assert.equal(a.field('risk_title').disabled,true);assert.equal(a.calls.filter(c=>c.method==='POST').length,1);
 finish(response({risk_id:71,risk_code:'MR-123'},201));await tick();
});

test('definitive validation errors retain editable fields and do not report success',async()=>{
 const a=app(call=>call.method==='POST'?response({message:'Tier 1 is no longer active'},409):undefined);await a.start();a.fill();a.submit();await tick();
 assert.equal(a.feedback(),'Tier 1 is no longer active');assert.equal(a.field('risk_title').value,' Vehicle conflict ');assert.equal(a.field('risk_title').disabled,false);
 assert.equal(a.events.some(e=>e.type==='vero-risk-register-refresh'),false);
});

test('unknown save outcomes lock the original data and replay the same idempotency key',async()=>{
 let attempt=0;const a=app(call=>call.method==='POST'&&++attempt===1?Promise.reject(Error('Network lost')):undefined);await a.start();a.fill();a.submit();await tick();
 assert.match(a.feedback(),/outcome is unconfirmed/);assert.equal(a.field('risk_title').disabled,true);a.submit();await tick();
 const bodies=a.calls.filter(c=>c.method==='POST').map(c=>c.body);assert.equal(bodies.length,2);assert.equal(bodies[0],bodies[1]);
});

test('saved draft read failure retries GET only and preserves saved confirmation',async()=>{
 let fail=true;const a=app(call=>call.route==='/risks'&&fail?response({},503):undefined);await a.start();a.fill();a.submit();await tick();
 assert.match(a.feedback(),/MR-123 was saved and linked/);assert.equal(a.form().querySelector('button').textContent,'Retry Opening Draft');
 fail=false;a.submit();await tick();assert.equal(a.calls.filter(c=>c.method==='POST').length,1);assert.equal(a.calls.filter(c=>c.route==='/risks').length,2);
 assert.equal(a.events.filter(e=>e.type==='vero-risk-open-details').length,1);
});

test('unsaved cancellation asks before discarding and returns to linked records without a POST',async()=>{
 const a=app();await a.start();a.fill();a.click(a.form().querySelectorAll('button')[1]);await tick();
 assert.match(a.prompts[0],/Discard this unsaved/);assert.equal(a.events.at(-1).type,'vero-risk-open-classification');assert.equal(a.events.at(-1).detail.page,'Terminal Risks');assert.equal(a.calls.some(c=>c.method==='POST'),false);
 const retained=app(undefined,{confirm:false});await retained.start();retained.fill();retained.click(retained.form().querySelectorAll('button')[1]);assert.ok(retained.form());assert.equal(retained.events.filter(e=>e.type==='vero-risk-open-classification').length,1);
 const close=new Event('vero-risk-before-close',{cancelable:true});retained.document.dispatchEvent(close);assert.equal(close.defaultPrevented,true);
});

test('late successful creation refreshes data after dismissal without reopening or overwriting a newer drawer',async()=>{
 let finish;const a=app(call=>call.method==='POST'?new Promise(resolve=>finish=resolve):undefined);await a.start();a.fill();a.submit();
 a.emit('vero-risk-details-close');a.overlay.hidden=true;a.content.textContent='Newer screen';
 finish(response({risk_id:71,risk_code:'MR-123'},201));await tick();
 assert.equal(a.content.textContent,'Newer screen');assert.equal(a.events.filter(e=>e.type==='vero-risk-register-refresh').length,1);assert.equal(a.events.some(e=>e.type==='vero-risk-open-details'),false);assert.equal(a.calls.some(c=>c.route==='/risks'),false);
});

test('missing secure UUID generation is an explicit unavailable state with no mutation',async()=>{
 const a=app(undefined,{crypto:{}});await a.start();assert.equal(a.form().querySelector('button').disabled,true);assert.match(a.feedback(),/unavailable.*secure connection/);assert.equal(a.calls.some(c=>c.method==='POST'),false);
});

test('shipped drawer controllers complete create → saved Draft → Risk Office approval and hide actions on classifications',async()=>{
 const saved={...draft};
 const a=app(call=>{
  if(call.route==='/risks')return response({risks:[saved]});
  if(call.route==='/risks/71/office-decision')return response({status:'success',risk_status:'Open'});
 },{integration:true});
 await a.start();a.fill();a.submit();await tick();
 assert.equal(a.title.textContent,'Vehicle conflict');assert.match(a.content.textContent,/Master Risk.*DescriptionTraffic exposure.*StatusDraft/);
 const edit=a.document.getElementById('veroRiskOfficeEdit'),approve=a.document.getElementById('veroRiskOfficeApprove');
 assert.equal(edit.hidden,false);assert.equal(approve.hidden,false);assert.equal(a.overlay.querySelector('.vero-risk-office-actions').hidden,false);
 a.click(approve);await tick();assert.equal(saved.status,'Open');assert.equal(a.overlay.hidden,true);
 assert.equal(a.calls.filter(c=>c.route==='/risks/71/office-decision').length,1);
 a.open();await tick();assert.equal(edit.hidden,true);assert.equal(approve.hidden,true);assert.equal(a.overlay.querySelector('.vero-risk-office-actions').hidden,true);
});

test('shipped classification list refreshes counts, alphabetical names and existing drawer records after creation',async()=>{
 let created=false;
 const a=app(call=>{
  if(call.route==='/risks/master-drafts'){created=true;return response({risk_id:71,risk_code:'MR-123'},201);}
  if(call.route==='/risks')return response({risks:created?[draft,{...draft,id:72,risk_title:'Alpha risk'}]:[]});
 },{integration:true});
 await a.start();a.fill();a.submit();await tick();a.document.getElementById('veroRiskDetailsClose').click();
 a.emit('vero-risk-open-classification',{category,page:'Terminal Risks'});await tick();
 assert.match(a.content.textContent,/Linked Master Risks \(2\)/);
 const names=a.content.querySelectorAll('.vero-risk-classification-open');assert.deepEqual(names.map(el=>el.textContent),['Alpha risk','Vehicle conflict']);
 a.click(names[1]);await tick();assert.equal(a.title.textContent,'Vehicle conflict');assert.equal(a.document.getElementById('veroRiskOfficeEdit').hidden,false);
});

test('shipped Close, Escape and backdrop honour unsaved cancellation without submitting',async()=>{
 const a=app(undefined,{integration:true,confirm:false});await a.start();a.fill();
 a.document.getElementById('veroRiskDetailsClose').click();assert.equal(a.overlay.hidden,false);assert.ok(a.form());
 const escape=new Event('keydown');escape.key='Escape';a.document.dispatchEvent(escape);assert.equal(a.overlay.hidden,false);
 a.overlay.dispatchEvent(new Event('click'));assert.equal(a.overlay.hidden,false);assert.equal(a.prompts.length,3);assert.equal(a.calls.some(c=>c.method==='POST'),false);
});

test('late shipped classification reads cannot replace a create form or reopen dismissed content',async()=>{
 let finish;const a=app(call=>call.route==='/risks'?new Promise(resolve=>finish=resolve):undefined,{integration:true});
 a.emit('vero-risk-open-classification',{category,page:'Terminal Risks'});await tick();
 a.click(a.content.querySelectorAll('button').find(el=>el.textContent==='+ Create Draft Master Risk'));a.fill();
 finish(response({risks:[draft]}));await tick();assert.ok(a.form());assert.equal(a.field('risk_title').value,' Vehicle conflict ');
 a.document.getElementById('veroRiskDetailsClose').click();assert.equal(a.overlay.hidden,true);
});

test('closing an in-flight save resumes the same form and cannot start another UUID',async()=>{
 let finish;const a=app(call=>call.method==='POST'?new Promise(resolve=>finish=resolve):undefined,{integration:true});
 await a.start();a.fill();a.submit();
 a.click(a.form().querySelectorAll('button').find(b=>b.textContent==='Cancel'));await tick();
 const resume=a.content.querySelectorAll('button').find(b=>b.textContent==='Resume Pending Master Risk');assert.ok(resume);a.click(resume);a.submit();
 assert.equal(a.calls.filter(c=>c.method==='POST').length,1);
 finish(response({risk_id:71,risk_code:'MR-123'},201));await tick();
 assert.ok(a.events.some(e=>e.type==='vero-risk-open-details'));
});

test('a detached unknown save settles into a usable same-request retry',async()=>{
 let fail,attempt=0;const a=app(call=>call.method==='POST'&&++attempt===1?new Promise((resolve,reject)=>fail=reject):undefined,{integration:true});
 await a.start();a.fill();a.submit();a.click(a.form().querySelectorAll('button').find(b=>b.textContent==='Cancel'));await tick();
 fail(Error('Connection lost'));await tick();
 a.click(a.content.querySelectorAll('button').find(b=>b.textContent==='Resume Pending Master Risk'));
 assert.equal(a.form().querySelector('button').disabled,false);assert.equal(a.field('risk_title').disabled,true);assert.match(a.feedback(),/unconfirmed/);
 a.submit();await tick();const posts=a.calls.filter(c=>c.method==='POST');assert.equal(posts.length,2);assert.equal(posts[0].body,posts[1].body);
});

test('late successful closed save refreshes linked records and clears unresolved request',async()=>{
 let finish;const a=app(call=>call.method==='POST'?new Promise(resolve=>finish=resolve):undefined,{integration:true});
 await a.start();a.fill();a.submit();a.click(a.form().querySelectorAll('button').find(b=>b.textContent==='Cancel'));await tick();
 finish(response({risk_id:71,risk_code:'MR-123'},201));await tick();
 assert.ok(a.content.querySelectorAll('button').some(b=>b.textContent==='+ Create Draft Master Risk'));
 assert.match(a.content.textContent,/Linked Master Risks/);assert.equal(a.calls.filter(c=>c.method==='POST').length,1);
});


test('settled approved Project Risk retains authorised archive without restoring definition-only approval',async()=>{
 const a=app(call=>call.route.endsWith('/project-submission')?response({available:true,is_live:true,approval_state:'Approved',risk_status:'Open',submission:{status:'Approved'}}):undefined,{integration:true});
 a.emit('vero-risk-open-details',{risk:{...draft,status:'Open'}});await tick();assert.equal(a.document.getElementById('veroRiskOfficeArchive').hidden,false);assert.equal(a.document.getElementById('veroRiskOfficeApprove').hidden,true);assert.equal(a.document.getElementById('veroRiskOfficeEdit').hidden,true);
});
test('pending Project Risk and unavailable package remain fail-closed for archive',async()=>{
 for(const reply of [response({available:true,is_live:false,approval_state:'Submitted',submission:{status:'Submitted'}}),{ok:false,status:500,json:async()=>{throw Error('Unavailable')}}]){
  const a=app(call=>call.route.endsWith('/project-submission')?reply:undefined,{integration:true});a.emit('vero-risk-open-details',{risk:draft});await tick();assert.equal(a.document.getElementById('veroRiskOfficeArchive').hidden,true);
 }
});
