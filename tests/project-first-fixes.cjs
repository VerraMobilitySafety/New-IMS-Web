'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const workflow=require('../project-workflow.js');
const html=fs.readFileSync(path.join(__dirname,'../project-workspace.html'),'utf8');
const register=fs.readFileSync(path.join(__dirname,'../project-management.html'),'utf8');
function section(text,start,end){return text.slice(text.indexOf(start),text.indexOf(end,text.indexOf(start)));}
function node(){return {textContent:'',innerHTML:'',hidden:true,disabled:false,value:'selected',files:[],children:[],classList:{toggle(){}},replaceChildren(){this.children=[]},appendChild(child){this.children.push(child)}};}
function app(project={id:7,current_stage:'Project Execution',status:'In Progress',action_required_by:'Assigned PM',action_required_by_user_id:5}){
 project={can_edit:!workflow.resolve(project).terminal,...project};
 const nodes=new Map();const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)};
 const c=vm.createContext({VeroProjectWorkflow:workflow,URLSearchParams,FormData,document:{getElementById:get,createElement:()=>node(),querySelectorAll:()=>[],querySelector:()=>null},console,Number,Date,Intl});
 vm.runInContext("let currentProject=null,currentRequest=null,signedInUser=null; const setText=(id,value)=>document.getElementById(id).textContent=value; const text=x=>x??'—'; const fmtDate=x=>x; const money=x=>x;",c);
 vm.runInContext(section(html,'function renderProject(p)','async function loadProjectDocuments('),c);
 vm.runInContext(section(html,'let projectContractUploadPending=false;','async function viewProjectDocument('),c);
 vm.runInContext("const PROJECTS_API='/projects'; const PROJECT_DOCUMENTS_API=id=>'/projects/'+id+'/documents';",c);
 c.project=project;vm.runInContext('signedInUser={id:5};renderProject(project);',c);
 return {c,get};
}
test('explicit server stages determine lifecycle even when status disagrees',()=>{
 for(const stage of ['New Project Request','Project Approval','Project Setup','Finance Approval','Leadership Approval'])assert.equal(workflow.resolve({current_stage:stage,status:'Completed'}).lifecycle,'initiation');
 for(const stage of ['Project Execution','Project Execution Checklist'])assert.equal(workflow.resolve({current_stage:stage,status:'Planning'}).lifecycle,'execution');
 for(const stage of ['Project Completion','Maintenance Handover','Project Closed','Archived'])assert.equal(workflow.resolve({current_stage:stage,status:'In Progress'}).lifecycle,'completion');
 assert.equal(workflow.resolve({current_stage:'Unexpected Stage',status:'In Progress'}).lifecycle,'unknown');
 assert.equal(workflow.resolve({}).stage,'Workflow unavailable');
 assert.equal(workflow.resolve({status:'Submitted'}).stage,'Project Approval');
});
test('multi-approver ownership stays caller-specific and a missing owner grants no action',()=>{
 assert.equal(workflow.owns({current_stage:'Finance Approval',action_required_by_user_id:5},{id:5}),true);
 assert.equal(workflow.owns({current_stage:'Finance Approval',action_required_by_user_id:null},{id:5}),false);
 assert.equal(workflow.owns({action_required_by_user_id:6},{id:5}),false);
});
test('register uses the same stage, next step and lifecycle as workspace',()=>{
 const c=vm.createContext({VeroProjectWorkflow:workflow});vm.runInContext(section(register,'function normalise(p)','function stageClass('),c);
 const p={id:7,current_stage:'Project Execution',status:'Planning',next_step:'Complete execution checklist',action_required_by:'PM',action_required_by_user_id:5};
 const normal=c.normalise(p),a=app(p);
 assert.equal(normal.stageKey,'execution');assert.equal(normal.stage,a.get('liveStage').textContent);assert.equal(normal.nextStep,a.get('liveNextStep').textContent);
});
test('loading an old request or no request cannot reset execution or approval state',()=>{
 for(const stage of ['Finance Approval','Leadership Approval','Project Execution','Project Completion']){
  const a=app({id:7,current_stage:stage,status:'In Progress',action_required_by:'Finance Approvers',action_required_by_user_id:5,next_step:'Server next action'});
  vm.runInContext("renderRequest({request_status:'Submitted',requested_by:'Old initiator'});",a.c);
  assert.equal(a.get('liveStage').textContent,stage);assert.equal(a.get('overviewDevStage').textContent,stage);assert.equal(a.get('liveResponsible').textContent,'Finance Approvers');assert.equal(a.get('liveNextStep').textContent,'Server next action');
  vm.runInContext('renderNoRequest()',a.c);assert.equal(a.get('liveStage').textContent,stage);
 }
});
test('owned next action navigates back to the existing reviewer workflow, not the request editor',()=>{
 const a=app({id:7,current_stage:'Leadership Approval',action_required_by_user_id:5});
 assert.equal(a.get('nextAction').children.length,1);assert.equal(a.get('nextAction').children[0].href,'project-management.html?project_id=7&action=workflow');
 a.c.project={id:7,current_stage:'Leadership Approval',action_required_by_user_id:6};vm.runInContext('renderProject(project)',a.c);assert.equal(a.get('nextAction').children.length,0);
});
test('refresh after request save reads authoritative updated workflow',async()=>{
 const a=app();a.c.apiFetch=async()=>({ok:true,json:async()=>({projects:[{id:7,current_stage:'Project Approval',action_required_by:'Director',action_required_by_user_id:6}]})});
 await a.c.refreshProjectWorkflow();assert.equal(a.get('liveStage').textContent,'Project Approval');assert.equal(a.get('liveResponsible').textContent,'Director');assert.equal(a.get('nextAction').children.length,0);
});
test('contract upload rejects empty/oversized input without sending a request',async()=>{
 const a=app();let calls=0;a.c.apiFetch=async()=>{calls++};
 for(const file of [{size:0},{size:25*1024*1024+1}]){a.get('projectContractFile').files=[file];await a.c.uploadProjectContract({preventDefault(){}});}
 assert.equal(calls,0);assert.equal(a.get('projectContractUploadButton').disabled,false);
});
test('later-stage upload targets the existing project and refreshes its documents',async()=>{
 const a=app();a.get('projectContractFile').files=[new Blob(['contract'])];a.get('projectContractFile').files[0].name='Master.pdf';
 const calls=[];a.c.apiFetch=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({document:{id:91}})}};
 a.c.loadProjectDocuments=async id=>{assert.equal(id,7);return true};
 await a.c.uploadProjectContract({preventDefault(){}});
 assert.equal(calls[0].url,'/projects/7/documents');assert.equal(calls[0].options.method,'POST');assert.equal(calls[0].options.body.get('document_type'),'Master Contract');assert.equal(calls[0].options.body.get('document_title'),'Master.pdf');
 assert.equal(a.get('projectContractFile').value,'');assert.match(a.get('projectContractUploadStatus').textContent,/available in Project Documents/);assert.equal(a.get('projectContractUploadButton').disabled,false);
});
test('duplicate clicks are blocked during upload and failed refresh does not claim failed upload',async()=>{
 const a=app();const blob=new Blob(['contract']);blob.name='Master.pdf';a.get('projectContractFile').files=[blob];
 let finish,calls=0;a.c.apiFetch=()=>{calls++;return new Promise(resolve=>finish=resolve)};a.c.loadProjectDocuments=async()=>false;
 const first=a.c.uploadProjectContract({preventDefault(){}});await a.c.uploadProjectContract({preventDefault(){}});assert.equal(calls,1);assert.equal(a.get('projectContractUploadButton').disabled,true);
 finish({ok:true,json:async()=>({})});await first;assert.match(a.get('projectContractUploadStatus').textContent,/uploaded, but/);assert.equal(a.get('projectContractUploadButton').disabled,false);
});
test('server upload denial retains selected file and reports no success',async()=>{
 const a=app();const blob=new Blob(['contract']);blob.name='Master.pdf';a.get('projectContractFile').files=[blob];
 a.c.apiFetch=async()=>({ok:false,status:403,json:async()=>({message:'Not authorised'})});a.c.loadProjectDocuments=async()=>assert.fail('must not refresh on denial');
 await a.c.uploadProjectContract({preventDefault(){}});assert.equal(a.get('projectContractFile').value,'selected');assert.match(a.get('projectContractUploadStatus').textContent,/Not authorised/);assert.equal(a.get('projectContractUploadButton').disabled,false);
});
test('late upload response cannot refresh or change a different project',async()=>{
 const a=app();const blob=new Blob(['contract']);blob.name='Master.pdf';a.get('projectContractFile').files=[blob];let finish;
 a.c.apiFetch=()=>new Promise(resolve=>finish=resolve);a.c.loadProjectDocuments=async()=>assert.fail('must not refresh different project');
 const pending=a.c.uploadProjectContract({preventDefault(){}});a.c.project={id:8,current_stage:'Project Execution'};vm.runInContext('renderProject(project)',a.c);
 finish({ok:true,json:async()=>({})});await pending;assert.equal(a.get('projectContractFile').value,'selected');assert.equal(a.get('projectContractUploadButton').disabled,false);
});
test('workflow deep links only open a matching action owned by the signed-in user',async()=>{
 const source=section(register,'let requestedWorkflowOpened=false;','async function loadProjects(');
 for(const owned of [true,false]){
  const c=vm.createContext({URLSearchParams,location:{search:'?project_id=7&action=workflow'},projects:[{raw:{id:7}}],ownsProjectAction:()=>owned,calls:[],openProjectAction:async index=>c.calls.push(index)});
  vm.runInContext(source,c);await c.openRequestedWorkflow();await c.openRequestedWorkflow();assert.equal(c.calls.length,owned?1:0);
 }
});
test('terminal projects do not offer or submit a later contract upload',async()=>{
 const a=app({id:7,current_stage:'Project Closed'});assert.equal(a.get('projectContractUpload').hidden,true);a.c.apiFetch=async()=>assert.fail('must not upload');await a.c.uploadProjectContract({preventDefault(){}});
});
test('view-only projects never offer or send uploads even with a signed-in account',async()=>{
 const a=app({id:7,current_stage:'Project Execution',can_edit:false});
 assert.equal(a.get('projectContractUpload').hidden,true);
 a.c.apiFetch=async()=>assert.fail('viewer cannot upload');await a.c.uploadProjectContract({preventDefault(){}});
});
test('server Administrator capability permits document management on a closed project',()=>{
 const a=app({id:7,current_stage:'Project Closed',can_edit:true});
 assert.equal(a.get('projectContractUpload').hidden,false);
});
test('hidden workspace deep link stops before requesting documents or related data',async()=>{
 const a=app();let calls=0;a.c.location={search:'?id=99'};a.get('loadError').style={};
 a.c.apiFetch=async()=>{calls++;return{ok:true,json:async()=>({projects:[]})}};
 vm.runInContext(section(html,'const initialWorkspaceLoads=[];','function field('),a.c);
 await a.c.loadProject();assert.equal(calls,1);assert.match(a.get('loadError').textContent,/not found/);
});
test('project pages load the shared helper and all inline scripts compile',()=>{
 for(const dir of ['.']){
  for(const file of ['project-management.html','project-workspace.html']){
   const source=fs.readFileSync(path.join(__dirname,'..',dir,file),'utf8');assert.match(source,/src="project-workflow.js\?v=/);
   for(const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(match[1],{filename:dir+'/'+file});
   assert.doesNotMatch(source,/Implementation Register|Back to Implementation|VERO — Implementation/);
  }
 }
});
