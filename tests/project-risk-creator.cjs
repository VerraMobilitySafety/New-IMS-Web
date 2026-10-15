'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'project-workspace.html'),'utf8');
const creator=html.slice(html.indexOf('function readAdditionalProjectTreatments'),html.indexOf('/* Read-only, project-scoped'));
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.listeners={};this.dataset={};this.attributes={};this.options=[];this.value='';this.disabled=false;this.id='';this.type='';this._text='';const classes=new Set();this.classList={add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)};}
 set className(v){this._className=v;v.split(' ').forEach(c=>this.classList.add(c));}get className(){return this._className||'';}
 set innerHTML(value){this.children=[];for(const m of value.matchAll(/<(form|button|input|textarea|select|div|p|h2|label|span)\b([^>]*\bid="([^"]+)"[^>]*)>/g)){const el=new Element(m[1]);el.id=m[3];el.type=/\btype="([^"]+)"/.exec(m[2])?.[1]||'';this.appendChild(el);}}
 set textContent(v){this._text=String(v);this.children=[];}get textContent(){return this._text+this.children.map(x=>x.textContent).join('');}
 setAttribute(k,v){this.attributes[k]=v;}appendChild(el){this.children.push(el);el.parent=this;return el;}append(...els){els.forEach(el=>this.appendChild(el));}replaceChildren(...els){this.children=[];this.options=[];this.append(...els);}
 add(option){this.options.push(option);this.appendChild(option);}remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
 reset(){}focus(){}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}emit(k,event={}){for(const fn of this.listeners[k]||[])fn({preventDefault(){},target:this,...event});}
 all(){return this.children.flatMap(c=>[c,...c.all()]);}
 matches(selector){if(selector.startsWith('#'))return this.id===selector.slice(1);if(selector.startsWith('.'))return this.className.split(' ').includes(selector.slice(1));if(selector==='input[id]'||selector==='select[id]'||selector==='textarea[id]')return this.tagName===selector.split('[')[0]&&!!this.id;if(selector==='input[data-document-id]:checked')return this.tagName==='input'&&this.dataset.documentId&&this.checked;const field=/^\[data-action-field="(.+)"\]$/.exec(selector);if(field)return this.dataset.actionField===field[1];return this.tagName===selector;}
 querySelectorAll(selector){if(selector.includes(','))return [...new Set(selector.split(',').flatMap(s=>this.querySelectorAll(s)))];if(selector.includes(' ')){const [first,...rest]=selector.split(' ');return this.querySelectorAll(first).flatMap(el=>el.querySelectorAll(rest.join(' ')));}return this.all().filter(e=>e.matches(selector));}querySelector(s){return this.querySelectorAll(s)[0]||null;}
}
const tick=async()=>{for(let n=0;n<10;n++)await new Promise(r=>setImmediate(r));};
function app({canSubmit=true,submission,post}={}){
 const body=new Element(),document={body,createElement:tag=>new Element(tag),getElementById:id=>body.all().find(x=>x.id===id)};
 const calls=[],currentProject={id:123,project_name:'Offline project',project_code:'OFFLINE'};
 const docs=[{id:4,document_number:'DOC4',document_title:'Published',version_number:2}];
 const VeroProjectRiskSubmission={node:(tag,text)=>{const el=new Element(tag);if(text)el.textContent=text;return el;},documentPicker:(host,documents,selected)=>{host.replaceChildren();for(const doc of documents){const field=new Element('input');field.dataset.documentId=String(doc.id);field.type='checkbox';field.value=String(doc.id);field.checked=selected.includes(doc.id);host.appendChild(field);}}};
 const apiFetch=async(url,init={})=>{
  const route=url.replace('https://fixture/api','');const request={route,method:init.method||'GET',body:init.body?JSON.parse(init.body):null};calls.push(request);let data={};
  if(route.endsWith('/risk-submission-capabilities'))data={can_submit:canSubmit};
  else if(route.endsWith('/risk-classifications'))data={categories:[{id:3,tier:3,category_name:'Project Execution',status:'Active'},{id:2,tier:2,category_name:'Delivery',status:'Active'},{id:1,tier:1,category_name:'Delay',status:'Active'}],relationships:[{parent_category_id:3,child_category_id:2},{parent_category_id:2,child_category_id:1}]};
  else if(route.endsWith('/risk-treatment-owners'))data={users:[{id:12,name:'Treatment Owner'}]};
  else if(route==='/users/active')data={users:[{id:11,first_name:'Risk',last_name:'Owner'},{id:12,first_name:'Treatment',last_name:'Owner'}]};
  else if(route.endsWith('/risk-control-documents'))data={documents:docs};
  else if(init.method==='POST'){if(post)return post(request);data={risk_id:91,project_id:123};}
  return {ok:true,status:200,json:async()=>data};
 };
 const scope=vm.createContext({document,VeroProjectRiskSubmission,currentProject,API_BASE:'https://fixture/api',apiFetch,Option:function(text,value){const el=new Element('option');el.textContent=text;el.value=value;return el;},crypto:{randomUUID:()=> 'fixed-request-id'},loadProjectRisks:async()=>{},console,window:{},setTimeout,clearTimeout});
 vm.runInContext(creator,scope);const field=id=>document.getElementById(id);
 return {scope,calls,field,open:()=>scope.openProjectRiskCreator(submission?{submission}:{}),submit:()=>field('projectRiskCreateForm').emit('submit'),fill:()=>{for(const [id,value]of Object.entries({projectRiskCreateCategory:'1',projectRiskCreateTitle:'Risk',projectRiskCreateDescription:'Description',projectRiskCreateReason:'Reason',praIL:'4',praIC:'5',praRL:'2',praRC:'3',praCurrent:'Current',praFuture:'Future',praOwner:'11',praTreatmentOwner:'12',praDue:'2026-11-01',praReview:'2027-01-01',praActionTitle:'New action',praActionDescription:'Details',praActionPriority:'High'}))field(id).value=value;field('praDocuments').children[0].checked=true;}};
}
test('authorised project manager with no Risk role submits published documents and all assessment fields',async()=>{
 const a=app();await a.open();a.fill();a.submit();await tick();const post=a.calls.find(c=>c.method==='POST');assert.equal(post.route,'/risks/master-drafts');assert.deepEqual(post.body.proposed_document_ids,[4]);assert.equal(post.body.project_id,123);assert.equal(post.body.request_id,'fixed-request-id');assert.equal(post.body.proposed_assessment.owner_user_id,11);assert.equal(post.body.proposed_assessment.next_review_date,'2027-01-01');assert.equal(post.body.treatment_actions[0].owner_user_id,12);assert.equal(a.field('projectRiskCreateOverlay').classList.contains('show'),false);
});
test('generic project readers are blocked by server capability without role inference',async()=>{
 const a=app({canSubmit:false});await a.open();assert.equal(a.field('projectRiskCreateSave').disabled,true);assert.match(a.field('projectRiskCreateStatus').textContent,/Only authorised managers/);assert.equal(a.calls.some(c=>c.method==='POST'),false);
});
test('correction resubmits same risk/version/hash and confirms successful project association',async()=>{
 const submission={risk_id:91,project_id:123,version:2,package_hash:'hash-2',classification_category_id:1,risk:{risk_title:'Original',risk_description:'Original description'},reason:'Original reason',proposed_assessment:{inherent_likelihood:4,inherent_impact:5,residual_likelihood:2,residual_impact:3,current_controls:'Current',further_controls:'Future',owner_user_id:11,treatment_owner_user_id:12,treatment_due_date:'2026-11-01',next_review_date:'2027-01-01'},documents:[{id:4}],treatment_actions:[],proposed_controls:[]};
 const a=app({submission});await a.open();assert.equal(a.field('praOwner').value,11);assert.equal(a.field('praReview').value,'2027-01-01');a.field('projectRiskCreateTitle').value='Corrected';a.submit();await tick();const post=a.calls.find(c=>c.method==='POST');assert.equal(post.route,'/risks/91/project-submission/resubmit');assert.equal(post.body.version,2);assert.equal(post.body.package_hash,'hash-2');assert.equal(post.body.request_id,undefined);assert.equal(post.body.project_id,undefined);assert.equal(post.body.risk_title,'Corrected');assert.equal(a.field('projectRiskCreateOverlay').classList.contains('show'),false);
});
test('missing document control and incomplete treatment actions never submit',async()=>{
 const a=app();await a.open();a.fill();a.field('praDocuments').children[0].checked=false;a.submit();await tick();assert.equal(a.calls.some(c=>c.method==='POST'),false);a.field('praDocuments').children[0].checked=true;a.field('praDue').value='';a.submit();await tick();assert.equal(a.calls.some(c=>c.method==='POST'),false);
});
test('in-flight double submit only sends one request and retains stable request id after uncertain failure',async()=>{
 let finish;const pending=new Promise(r=>finish=r);const a=app({post:async()=>{await pending;throw Error('Network failure');}});await a.open();a.fill();a.submit();a.submit();finish();await tick();assert.equal(a.calls.filter(c=>c.method==='POST').length,1);assert.equal(a.field('projectRiskCreateOverlay').dataset.requestId,'fixed-request-id');assert.match(a.field('projectRiskCreateStatus').textContent,/outcome is uncertain/);assert.equal(a.field('projectRiskCreateTitle').value,'Risk');
});

test('cancel and reopen preserves entered assessment, ownership, document selections and request identity',async()=>{
 const a=app();await a.open();a.fill();a.field('projectRiskCreateClose').onclick();await a.open();assert.equal(a.field('praOwner').value,'11');assert.equal(a.field('praTreatmentOwner').value,'12');assert.equal(a.field('praCurrent').value,'Current');assert.equal(a.field('praReview').value,'2027-01-01');assert.equal(a.field('praDocuments').children[0].checked,true);assert.equal(a.field('projectRiskCreateOverlay').dataset.requestId,'fixed-request-id');assert.equal(a.calls.filter(c=>c.method==='POST').length,0);
});
test('multiple returned treatment actions are editable and preserved in the resubmitted package',async()=>{
 const submission={risk_id:91,project_id:123,version:2,package_hash:'hash-2',classification_category_id:1,risk:{risk_title:'Original',risk_description:'Original description'},reason:'Original reason',proposed_assessment:{inherent_likelihood:4,inherent_impact:5,residual_likelihood:2,residual_impact:3,owner_user_id:11,treatment_owner_user_id:12,treatment_due_date:'2026-11-01'},documents:[{id:4}],proposed_controls:[],treatment_actions:[{title:'First',description:'First description',owner_user_id:12,due_date:'2026-11-01',priority:'High'},{title:'Second',description:'Second description',owner_user_id:12,due_date:'2026-12-01',priority:'Normal'}]};
 const a=app({submission});await a.open();const extra=a.field('praAdditionalActions').querySelector('.project-risk-treatment-editor');assert.ok(extra);extra.querySelector('[data-action-field="description"]').value='Corrected second action';a.submit();await tick();const post=a.calls.find(c=>c.method==='POST');assert.equal(post.body.treatment_actions.length,2);assert.equal(post.body.treatment_actions[1].description,'Corrected second action');assert.equal(post.body.treatment_actions[1].due_date,'2026-12-01');
});
