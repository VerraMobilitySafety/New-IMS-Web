'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','project-workspace.html'),'utf8');
const listSource=html.slice(html.indexOf('async function loadProjectRisks('),html.indexOf('async function loadProjectSubmissionCapability('));
const capabilitySource=html.slice(html.indexOf('async function loadProjectSubmissionCapability('),html.indexOf('async function loadProjectGovernance('));
function listApp({risks=[],drafts=[],failureAt}={}){
 const reads=[],messages=[],tables=[],errors=[];
 const scope=vm.createContext({
  document:{getElementById:()=>null,querySelector:()=>null},API_BASE:'https://fixture/api',
  projectListMessage:(host,message)=>messages.push({host,message}),projectTable:(host,columns,rows,renderers)=>tables.push({host,columns,rows,cells:rows.map(row=>renderers.map(render=>render(row)))}),fmtDate:value=>value||'—',
  projectRiskFetch:async url=>{reads.push(url);if(reads.length===failureAt)throw Error('Fixture request failure');return reads.length===1?{risks}:{drafts};},
  console:{error:(...args)=>errors.push(args)}
 });
 vm.runInContext(listSource,scope);
 return {load:()=>scope.loadProjectRisks(33),reads,messages,tables,errors};
}
test('Project Risks header keeps + Add Risk, fail-closed creation and deep-link status without a count badge',()=>{
 const header=/<section id="risks"[\s\S]*?<\/section>/.exec(html)?.[0];assert.ok(header);
 assert.match(header,/<button\b[^>]*\bid="projectRiskCreateOpen"[^>]*\bdisabled\b[^>]*\bonclick="openProjectRiskCreator\(\)"[^>]*>\+ Add Risk<\/button>/);
 assert.doesNotMatch(html,/\bid=["']projectRiskCount["']/);
 assert.match(header,/<div id="projectRiskDeepLinkStatus" role="status"><\/div>/);
});
test('empty Project Risks load successfully with the count badge absent',async()=>{
 const a=listApp();await a.load();assert.equal(a.reads.length,2);assert.equal(a.errors.length,0);assert.equal(a.tables.length,0);
 assert.equal(a.messages.at(-1).message,'No project risks or pending Draft Risks yet.');
});
test('linked and project-originated risks render with the count badge absent',async()=>{
 const linked={id:91,applicability_id:55,risk_code:'R-001',risk_title:'Linked risk',status:'Open',assessed:true};
 const draft={id:92,risk_code:'R-002',risk_title:'New risk',status:'Draft'};
 const a=listApp({risks:[linked],drafts:[linked,draft]});await a.load();assert.equal(a.errors.length,0);assert.equal(a.tables.length,1);
 assert.deepEqual(Array.from(a.tables[0].rows,row=>row.id),[91,92]);assert.equal(a.tables[0].cells[0][3],'Assessed');assert.equal(a.tables[0].cells[1][3],'Submitted with risk');
});
test('either Project Risks request can fail safely without a count badge',async()=>{
 for(const failureAt of [1,2]){
  const a=listApp({failureAt});await a.load();assert.equal(a.reads.length,failureAt);assert.equal(a.errors.length,1);assert.equal(a.tables.length,0);
  assert.equal(a.messages.at(-1).message,'Unable to load complete project risks: Fixture request failure');
 }
});
test('malformed Project Risks responses report the original error without a count badge',async()=>{
 for(const [response,message] of [[{risks:null},'Invalid project risk response'],[{drafts:null},'Invalid project Draft Risk response']]){
  const a=listApp(response);await a.load();assert.equal(a.errors.length,1);assert.equal(a.tables.length,0);assert.equal(a.messages.at(-1).message,'Unable to load complete project risks: '+message);
 }
});
test('+ Add Risk remains disabled until server capability grants access and fails closed otherwise',async()=>{
 for(const [data,ok] of [[{can_submit:true},true],[{can_submit:false},true],[{},true],[{can_submit:true,message:'Access unavailable'},false]]){
  const button={disabled:false};let finish;const response=new Promise(resolve=>finish=resolve);
  const scope=vm.createContext({document:{getElementById:id=>id==='projectRiskCreateOpen'?button:null},currentProject:{id:33},API_BASE:'https://fixture/api',apiFetch:()=>response});
  vm.runInContext(capabilitySource,scope);const loading=scope.loadProjectSubmissionCapability(33);assert.equal(button.disabled,true);
  finish({ok,json:async()=>data});await loading;assert.equal(button.disabled,!(ok&&data.can_submit===true));
  if(ok)assert.equal(button.hidden,data.can_submit!==true);else assert.equal(button.title,'Access unavailable');
 }
});
