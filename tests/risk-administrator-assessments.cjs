'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'project-workspace.html'),'utf8');
const historyCode=html.slice(html.indexOf('let projectAssessmentLoadVersion=0;'),html.indexOf('let projectSubmissionVersion=0;'));
const operationalCode=fs.readFileSync(path.join(root,'risk-operational.js'),'utf8');
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.listeners={};this.attributes={};this.dataset={};this.style={};this.value='';this.hidden=false;this.disabled=false;this._text='';}
 set textContent(value){this._text=String(value);this.children=[];}get textContent(){return this._text+this.children.map(el=>el.textContent).join('');}
 appendChild(el){this.children.push(el);el.parent=this;if(this.tagName==='select'&&this.children.length===1)this.value=el.value;return el;}
 append(...els){els.forEach(el=>this.appendChild(el));}replaceChildren(...els){this.children=[];this._text='';this.append(...els);}
 insertBefore(el,before){const index=this.children.indexOf(before);this.children.splice(index<0?this.children.length:index,0,el);el.parent=this;return el;}
 setAttribute(key,value){this.attributes[key]=String(value);}addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 async emit(type,event={}){const e={target:this,preventDefault(){},...event};await Promise.all((this.listeners[type]||[]).map(fn=>fn(e)));if(this['on'+type])await this['on'+type](e);}
 click(){return this.disabled?Promise.resolve():this.emit('click');}
 all(){return this.children.flatMap(el=>[el,...el.all()]);}querySelectorAll(selector){return this.all().filter(el=>selector.startsWith('#')?el.id===selector.slice(1):el.tagName===selector);}querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 createTHead(){return this.appendChild(new Element('thead'));}createTBody(){return this.appendChild(new Element('tbody'));}insertRow(){return this.appendChild(new Element('tr'));}insertCell(){return this.appendChild(new Element('td'));}
 scrollIntoView(){}closest(selector){return this.tagName===selector?this:this.parent?.closest(selector)||null;}
}
const response=(data,status=200)=>({ok:status<400,status,json:async()=>data});
const assessment=(status='Draft',owner=22)=>({id:77,revision:2,status,owner_user_id:owner,inherent_likelihood:4,inherent_impact:5,residual_likelihood:2,residual_impact:3,controls_summary:'Stored current controls',treatments_summary:'Stored treatment notes'});
const granted={can_create:true,can_approve:true,administrator_override:true};
function documentFor(elements){
 const document=new Element('document');document.createElement=tag=>new Element(tag);document.createTextNode=text=>{const el=new Element('#text');el.textContent=text;return el;};document.getElementById=id=>elements[id]||null;return document;
}
async function projectApp({row=assessment(),capability=granted,capabilityStatus=200,user={id:11,vero_role:'User'}}={}){
 const overlay=new Element(),host=new Element(),form=new Element('form');overlay.dataset.applicabilityId='55';form.id='projectAssessmentForm';overlay.appendChild(form);
 for(const id of ['projectAssessIL','projectAssessIC','projectAssessRL','projectAssessRC','projectAssessControls','projectAssessTreatments','projectAssessmentMessage']){const field=new Element();field.id=id;overlay.appendChild(field);}
 const document=documentFor({projectAssessmentOverlay:overlay,projectAssessmentHistory:host}),calls=[];
 const apiFetch=async url=>url.endsWith('/assessments')?response({assessments:row?[row]:[]}):url.endsWith('/capabilities')?response(capability,capabilityStatus):response({user});
 const scope=vm.createContext({document,API_BASE:'https://fixture/api',apiFetch,projectAssessmentDecision:(...args)=>calls.push(args)});
 vm.runInContext(historyCode,scope);await scope.loadProjectAssessmentHistory(55);
 return {host,overlay,form,calls,button:label=>host.querySelectorAll('button').find(el=>el.textContent===label),labels:()=>host.querySelectorAll('button').map(el=>el.textContent)};
}
async function operationalApp({row=assessment(),capability=granted,capabilityStatus=200,user={id:11,vero_role:'User'},contextType='Project'}={}){
 const host=new Element(),overlay=new Element(),document=documentFor({veroRiskDetailsContent:host,veroRiskDetailsOverlay:overlay}),calls=[];
 const fetch=async(url,init={})=>{
  const route=new URL(url).pathname.slice(4);calls.push({route,method:init.method||'GET',body:init.body?JSON.parse(init.body):undefined});
  if(init.method==='POST')return response({});
  if(route==='/risks/91/applicability')return response({assignments:[{id:55,context_type:contextType,context_id:33,status:'Applicable'}]});
  if(route.endsWith('/capabilities'))return response(capability,capabilityStatus);
  if(route.endsWith('/assessments'))return response({assessments:row?[row]:[]});
  if(route==='/auth/me')return response({user});
  throw Error('Unexpected route: '+route);
 };
 const scope=vm.createContext({document,fetch,localStorage:{getItem:()=> 'fixture-token'},window:{confirm:()=>true,prompt:()=> 'Required return rationale'},console});vm.runInContext(operationalCode,scope);
 await document.emit('vero-risk-operational-tab',{detail:{tab:'assessments',risk:{id:91}}});
 return {host,calls,button:label=>host.querySelectorAll('button').find(el=>el.textContent===label),labels:()=>host.querySelectorAll('button').map(el=>el.textContent)};
}
const surfaces=[['Project workspace',projectApp,{submit:'Submit',approve:'Approve',back:'Return'}],['Enterprise operational drawer',operationalApp,{submit:'Submit for approval',approve:'Approve assessment',back:'Return for changes'}]];
for(const [name,app,labels] of surfaces){
 test(name+': server-verified Administrator can submit another owner’s draft and approve their own assessment',async()=>{
  const draft=await app({row:assessment('Draft',22)});assert.ok(draft.button(labels.submit));await draft.button(labels.submit).click();
  if(name==='Project workspace')assert.deepEqual(draft.calls,[[77,'Submit',55]]);else assert.deepEqual(draft.calls.find(c=>c.method==='POST'),{route:'/risk/assessments/77/decision',method:'POST',body:{decision:'Submit'}});
  const own=await app({row:assessment('Submitted',11)});assert.ok(own.button(labels.approve));assert.ok(own.button(labels.back));await own.button(labels.approve).click();
  if(name==='Project workspace')assert.deepEqual(own.calls,[[77,'Approve',55]]);else assert.deepEqual(own.calls.find(c=>c.method==='POST').body,{decision:'Approve'});
 });
 test(name+': Administrator correction of another owner’s returned assessment retains its source and stored values',async()=>{
  const a=await app({row:assessment('Returned',22)});assert.ok(a.button('Revise returned assessment'));await a.button('Revise returned assessment').click();
  if(name==='Project workspace'){
   assert.equal(a.overlay.dataset.returnedAssessmentId,'77');assert.equal(a.form.hidden,false);assert.equal(a.overlay.querySelector('#projectAssessIL').value,4);assert.equal(a.overlay.querySelector('#projectAssessControls').value,'Stored current controls');
  }else{
   const form=a.host.querySelector('form');assert.deepEqual(form.querySelectorAll('textarea').map(el=>el.value),['Stored current controls','Stored treatment notes']);await form.emit('submit');const post=a.calls.find(c=>c.method==='POST');assert.equal(post.route,'/risk/applicability/55/assessments');assert.deepEqual(post.body,{inherent_likelihood:4,inherent_impact:5,residual_likelihood:2,residual_impact:3,controls_summary:'Stored current controls',treatments_summary:'Stored treatment notes',returned_assessment_id:77});
  }
 });
 test(name+': ordinary users retain ownership and independent-approval restrictions',async()=>{
  const capability={can_create:true,can_approve:true};
  assert.equal((await app({row:assessment('Draft',22),capability})).button(labels.submit),undefined);
  assert.ok((await app({row:assessment('Draft',11),capability})).button(labels.submit));
  assert.equal((await app({row:assessment('Submitted',11),capability})).button(labels.approve),undefined);
  assert.ok((await app({row:assessment('Submitted',22),capability})).button(labels.approve));
  assert.equal((await app({row:assessment('Returned',22),capability})).button('Revise returned assessment'),undefined);
  assert.ok((await app({row:assessment('Returned',11),capability})).button('Revise returned assessment'));
 });
 test(name+': profile Administrator claims and non-boolean override values cannot enable an exception',async()=>{
  for(const administrator_override of [undefined,false,'true',1]){
   const options={capability:{can_create:true,can_approve:true,administrator_override},user:{id:11,vero_role:'Administrator'}};
   assert.equal((await app({...options,row:assessment('Draft',22)})).button(labels.submit),undefined);
   assert.equal((await app({...options,row:assessment('Submitted',11)})).button(labels.approve),undefined);
   assert.equal((await app({...options,row:assessment('Returned',22)})).button('Revise returned assessment'),undefined);
  }
 });
 test(name+': override never replaces per-operation grants, successful capability lookup, or allowed assessment state',async()=>{
  for(const options of [{capability:{can_create:false,can_approve:false,administrator_override:true}},{capability:granted,capabilityStatus:403}]){
   assert.equal((await app({...options,row:assessment('Draft',22)})).button(labels.submit),undefined);
   assert.equal((await app({...options,row:assessment('Submitted',11)})).button(labels.approve),undefined);
   assert.equal((await app({...options,row:assessment('Returned',22)})).button('Revise returned assessment'),undefined);
  }
  for(const status of ['Approved','Superseded']){const a=await app({row:assessment(status,11)});assert.equal(a.button(labels.submit),undefined);assert.equal(a.button(labels.approve),undefined);assert.equal(a.button('Revise returned assessment'),undefined);}
 });
}
test('Enterprise operational drawer never applies Administrator ownership exceptions to a Site or Maintenance Contract',async()=>{
 for(const contextType of ['VM Site','Maintenance Contract']){
  assert.equal((await operationalApp({contextType,row:assessment('Draft',22)})).button('Submit for approval'),undefined);
  assert.equal((await operationalApp({contextType,row:assessment('Submitted',11)})).button('Approve assessment'),undefined);
  assert.equal((await operationalApp({contextType,row:assessment('Returned',22)})).button('Revise returned assessment'),undefined);
  assert.ok((await operationalApp({contextType,row:assessment('Draft',11)})).button('Submit for approval'));
  assert.ok((await operationalApp({contextType,row:assessment('Submitted',22)})).button('Approve assessment'));
 }
});
