'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),code=fs.readFileSync(path.join(root,'project-risk-submission.js'),'utf8');
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.listeners={};this.dataset={};this.attributes={};this._text='';this.className='';this.isConnected=true;this.disabled=false;this.value='';}
 set textContent(value){this._text=String(value);this.children=[];}
 get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
 appendChild(el){this.children.push(el);el.parent=this;return el;}append(...els){els.forEach(e=>this.appendChild(e));}
 replaceChildren(...els){this.children=[];this._text='';this.append(...els);}
 setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k];}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
 click(){if(!this.disabled)this.emit('click');}emit(k){for(const fn of this.listeners[k]||[])fn({target:this});}
 querySelectorAll(selector){return this.children.flatMap(c=>[...(c.tagName===selector?[c]:[]),...c.querySelectorAll(selector)]);}
}
const tick=async()=>{for(let i=0;i<10;i++)await new Promise(r=>setImmediate(r));};
function packageData(){return {available:true,is_live:false,approval_state:'Submitted',submission:{risk_id:91,project_id:33,version:7,package_hash:'version-seven-hash',status:'Submitted',risk:{id:91,risk_code:'MR-91',risk_title:'<script>not markup</script>',risk_description:'Full risk'},submitted_by_user_id:11,submitted_at:'2026-10-15T02:00:00Z',proposed_assessment:{inherent_likelihood:4,inherent_impact:5,residual_likelihood:2,residual_impact:3,current_controls:'Existing notes',further_controls:'Proposed notes',owner_user_id:11,treatment_owner_user_id:12,treatment_due_date:'2026-11-01',next_review_date:'2027-01-01'},documents:[{id:44,document_number:'DOC-44',document_title:'Published procedure',version_number:3}],treatment_actions:[{id:101,version:1,title:'New barrier',description:'Install safely',owner_user_id:12,due_date:'2026-11-01',priority:'High',status:'Open',capabilities:{can_update_status:true,can_verify:false}}]},capabilities:{can_review:true,can_approve:true,can_complete:false,can_request_changes:true,approval_blockers:[]}};}
function app(options={}){
 const calls=[],document={createElement:tag=>new Element(tag)},host=new Element(),data=options.data||packageData();
 const fetch=async(url,init={})=>{calls.push({url,method:init.method||'GET',body:init.body?JSON.parse(init.body):null});if(options.fetch)return options.fetch(url,init);return {ok:true,status:200,json:async()=>data};};
 const window={prompt:()=>options.prompt??'Reviewed package',confirm:()=>true,location:{href:''}};
 const scope=vm.createContext({window,document,fetch,AbortController,setTimeout,clearTimeout,URL,URLSearchParams,localStorage:{getItem:()=> 'fixture'},console});vm.runInContext(code,scope);const api=window.VeroProjectRiskSubmission;
 return {api,host,data,calls,buttons:()=>host.querySelectorAll('button'),button:text=>host.querySelectorAll('button').find(b=>b.textContent===text),render:opts=>api.render(host,data,opts)};
}
test('complete submitted package shows four ratings, document version, owners, dates and treatments before approval',()=>{
 const a=app();a.render();const text=a.host.textContent;for(const expected of ['20 / 25','6 / 25','Existing notes','Proposed notes','2027-01-01','2026-11-01','submitted version 3','Published procedure','New barrier','Install safely','High','11','12'])assert.ok(text.includes(expected),expected);assert.ok(text.includes('<script>not markup</script>'));assert.equal(a.host.querySelectorAll('script').length,0);assert.ok(text.includes('No, required approvals are still pending'));
});
test('review capabilities drive actions without inferring Risk Manager authority',()=>{
 const a=app();a.data.capabilities={can_review:true};a.render();assert.equal(a.buttons().some(b=>/Approve|Return|Revise|Complete/.test(b.textContent)),false);assert.match(a.host.textContent,/Read-only review/);
});
test('definition-only review sends exact version/hash once and retains non-live state',async()=>{
 const a=app();a.render();const button=a.button('Approve risk and assessment');assert.ok(button);button.click();button.click();await tick();const posts=a.calls.filter(c=>c.method==='POST');assert.equal(posts.length,1);assert.equal(posts[0].url.endsWith('/risks/91/project-submission/decision'),true);assert.deepEqual(posts[0].body,{decision:'Approve',reason:'Reviewed package',version:7,package_hash:'version-seven-hash'});assert.match(a.host.textContent,/No, required approvals are still pending/);
});
test('complete approval is exposed only by backend can_complete',()=>{
 const a=app();a.data.capabilities.can_complete=true;a.render();assert.ok(a.button('Approve risk and assessment'));assert.equal(a.button('Approve definition; send assessment for approval'),undefined);
});
test('Administrator package actions follow operation capabilities and retain exact versioned decision payload',async()=>{
 const a=app();a.data.capabilities={...a.data.capabilities,administrator_override:true,can_complete:true};a.render();assert.ok(a.button('Approve risk and assessment'));a.button('Approve risk and assessment').click();await tick();assert.deepEqual(a.calls.find(c=>c.method==='POST').body,{decision:'Approve',reason:'Reviewed package',version:7,package_hash:'version-seven-hash'});
 const denied=app();denied.data.capabilities={administrator_override:true};denied.render();assert.equal(denied.buttons().some(b=>/Approve|Return|Revise|Complete/.test(b.textContent)),false);
});
test('Administrator correction preserves another submitter’s complete returned package and identity',()=>{
 const a=app();a.data.submission.status='Changes Requested';a.data.submission.submitted_by_user_id=22;a.data.capabilities={administrator_override:true,can_resubmit:true};let original;a.render({onRevise:value=>original=value});a.button('Edit and resubmit').click();assert.equal(original,a.data.submission);assert.equal(original.risk_id,91);assert.equal(original.version,7);assert.equal(original.package_hash,'version-seven-hash');assert.equal(original.proposed_assessment.owner_user_id,11);
});
test('return requires nonblank rationale and sends Return against the displayed version',async()=>{
 const blank=app({prompt:'  '});blank.render();blank.button('Return for changes').click();await tick();assert.equal(blank.calls.length,0);
 const a=app();a.render();a.button('Return for changes').click();await tick();assert.equal(a.calls[0].body.decision,'Return');assert.equal(a.calls[0].body.version,7);
});
test('revisions use the existing risk and keep the full original package',()=>{
 const a=app();a.data.capabilities={can_resubmit:true};let original;a.render({onRevise:value=>original=value});a.button('Edit and resubmit').click();assert.equal(original,a.data.submission);assert.equal(original.documents[0].id,44);assert.equal(original.proposed_assessment.owner_user_id,11);
});
test('document picker uses exact IDs and versions; filtering does not clear a selection',()=>{
 const a=app();a.api.documentPicker(a.host,a.data.submission.documents,[44]);const inputs=a.host.querySelectorAll('input'),search=inputs.find(i=>i.type==='search'),checkbox=inputs.find(i=>i.type==='checkbox');assert.equal(checkbox.value,'44');assert.equal(checkbox.checked,true);assert.match(a.host.textContent,/v3/);search.value='not-a-match';search.emit('input');assert.equal(checkbox.checked,true);assert.equal(checkbox.parent.parent.hidden,true);
});
test('treatment mutation is absent while risk is non-live even if action capability is present',()=>{
 const a=app();a.render();assert.equal(a.button('Complete treatment'),undefined);assert.equal(a.button('Start treatment'),undefined);
});
test('live treatment completion uses server capability and owner action endpoint',async()=>{
 const a=app();a.data.is_live=true;a.render();a.button('Complete treatment').click();await tick();assert.equal(a.calls[0].url.endsWith('/project-risk/treatment-actions/101/status'),true);assert.deepEqual(a.calls[0].body,{status:'Completed',notes:'Reviewed package',version:1});
});
test('independent treatment verification uses explicit permission and required rejection notes',async()=>{
 const a=app();a.data.is_live=true;a.data.submission.treatment_actions[0].capabilities={can_verify:true};a.render();assert.equal(a.button('Complete treatment'),undefined);a.button('Return treatment for correction').click();await tick();assert.equal(a.calls[0].url.endsWith('/project-risk/treatment-actions/101/verify'),true);assert.equal(a.calls[0].body.decision,'Rejected');
});
test('late successful decision cannot replace a newer or closed detail',async()=>{
 let finish;const pending=new Promise(resolve=>finish=resolve);const a=app({fetch:async()=>{await pending;return {ok:true,json:async()=>({})};}});let current=true;a.render({isCurrent:()=>current});a.button('Approve risk and assessment').click();current=false;a.host.textContent='Newer risk';finish();await tick();assert.equal(a.host.textContent,'Newer risk');assert.equal(a.calls.length,1);
});
test('API failure remains explicit and never auto-retries the decision',async()=>{
 const a=app({fetch:async()=>({ok:false,status:409,json:async()=>({message:'Package changed; refresh'})})});a.render();a.button('Approve risk and assessment').click();await tick();assert.match(a.host.textContent,/Package changed/);assert.equal(a.calls.length,1);
});
test('creator uses scoped manager capability and published document endpoint; history belongs to actual assessment drawer',()=>{
 const html=fs.readFileSync(path.join(root,'project-workspace.html'),'utf8');const create=html.slice(html.indexOf('async function openProjectRiskCreator'),html.indexOf('/* Read-only, project-scoped'));
 assert.match(create,/risk-submission-capabilities/);assert.match(create,/roles.can_submit!==true/);assert.match(create,/risk-control-documents/);assert.match(create,/risk-classifications/);assert.doesNotMatch(create,/compliance\/controls/);assert.doesNotMatch(create,/role_name==='Risk Manager'/);assert.match(create,/proposed_document_ids/);assert.doesNotMatch(create,/id="projectAssessmentHistory"/);
 const editor=html.slice(html.indexOf('async function openProjectAssessment'),html.indexOf('async function assignApprovedProjectRisk'));assert.match(editor,/id="projectAssessmentHistory"/);
});
test('full row routes to complete package rather than an approval alert or duplicate assessment editor',()=>{
 const html=fs.readFileSync(path.join(root,'project-workspace.html'),'utf8'),register=html.slice(html.indexOf('async function loadProjectRisks'),html.indexOf('async function loadProjectGovernance'));
 assert.match(register,/openProjectSubmission\(risk,applicabilityId\)/);assert.doesNotMatch(register,/window.alert/);assert.match(register,/role','button/);assert.match(register,/event.key==='Enter'/);
});

test('missing reviewer is explicit on pending packages and cannot trigger approval',()=>{
 const a=app();a.data.reviewer_routing={ready:false,definition_reviewer_count:1,assessment_reviewer_count:0,message:'Assign an independent Project Approver before approval.'};a.render();assert.match(a.host.textContent,/Assign an independent Project Approver/);assert.equal(a.buttons().some(b=>b.textContent.startsWith('Approve')),false);assert.ok(a.button('Return for changes'));
});
test('returned, archived and live packages do not falsely claim an approval queue',()=>{
 for(const state of ['returned','archived','live']){const a=app();a.data.reviewer_routing={ready:false,message:'MISSING REVIEWER SENTINEL'};a.data.capabilities={};if(state==='returned')a.data.submission.status='Changes Requested';if(state==='archived')a.data.risk_status='Archived';if(state==='live')a.data.is_live=true;a.render();assert.doesNotMatch(a.host.textContent,/MISSING REVIEWER SENTINEL|Each remaining approval is routed/);}
});
test('legacy correction preserves same risk identity and exposes complete existing submission',()=>{
 const a=app();a.data.submission.legacy=true;a.data.capabilities={can_resubmit:true};let selected;a.render({onRevise:s=>selected=s});a.button('Complete submission').click();assert.equal(selected.risk_id,91);assert.match(a.host.textContent,/resubmit the same risk/);
});
test('live approved package links verified ordinary assessment history without enabling a new package approval',()=>{
 const a=app();a.data.is_live=true;a.data.capabilities={};let opened=0;a.render({onAssessments:()=>opened++});a.button('View assessment history and revisions').click();assert.equal(opened,1);assert.equal(a.buttons().some(b=>b.textContent.startsWith('Approve')),false);
});
test('submitted document preview uses scoped immutable package document endpoint',async()=>{
 const a=app({fetch:async()=>({ok:false,status:403})});a.render();a.button('View submitted document').click();await tick();assert.equal(a.calls[0].url.endsWith('/risks/91/project-submission/documents/44/content'),true);assert.match(a.host.textContent,/Document unavailable \(403\)/);
});

test('existing shared legacy formal assessment uses explicit assessment-workflow capability without package bypass',()=>{
 const a=app();a.data.capabilities={can_use_assessment_workflow:true};a.data.submission.legacy=true;let opened=0;a.render({onAssessments:()=>opened++});assert.ok(a.button('View assessment history and revisions'));a.button('View assessment history and revisions').click();assert.equal(opened,1);assert.equal(a.buttons().some(b=>b.textContent.startsWith('Approve')),false);
});
