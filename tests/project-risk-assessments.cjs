'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','project-workspace.html'),'utf8');
const source=html.slice(html.indexOf('async function openProjectRiskDeepLink'),html.indexOf('async function openProjectAssessment'));
async function run(search,risks=[{id:91,applicability_id:55,risk_title:'Existing project exposure'}]){
 const opened=[],messages=[],reads=[];
 const scope=vm.createContext({URLSearchParams,location:{search},currentProject:{id:33},API_BASE:'https://fixture/api',document:{querySelectorAll:()=>[]},showTab:()=>{},projectListMessage:(id,text)=>messages.push(text),projectRiskLinkMessage:text=>{if(text!=='Opening requested Project Risk…'&&text)messages.push(text);},projectRiskFetch:async url=>{reads.push(url);return {risks};},openProjectAssessment:async(...args)=>opened.push(['assessment',...args]),openProjectSubmission:async(...args)=>opened.push(['package',...args])});vm.runInContext(source,scope);await scope.openProjectRiskDeepLink();return {opened,messages,reads};
}
test('Project assessment review deep link selects actual requested revision after verifying project applicability',async()=>{
 const a=await run('?risk_id=91&risk_action=assessment_review&applicability_id=55&projectRiskAssessmentId=77');assert.deepEqual(a.opened,[['assessment',55,'Existing project exposure',77]]);assert.equal(a.reads[0],'https://fixture/api/projects/33/risk-applicability');
});
test('returned correction and Draft submission route to ordinary assessment, never package approval',async()=>{
 for(const mode of ['assessment_correct','assessment_submit']){const a=await run('?risk_id=91&risk_action='+mode+'&applicability_id=55&projectRiskAssessmentId=77');assert.equal(a.opened[0][0],'assessment');assert.equal(a.opened[0][3],77);}
});
test('mismatched risk/applicability is rejected without opening another record',async()=>{
 const a=await run('?risk_id=91&risk_action=assessment_review&applicability_id=999&projectRiskAssessmentId=77');assert.equal(a.opened.length,0);assert.match(a.messages[0],/not linked to this authorised project/);
});
test('malformed assessment IDs cannot trigger API mutation or package fallback',async()=>{
 const a=await run('?risk_id=91&risk_action=assessment_review&applicability_id=55&projectRiskAssessmentId=not-a-number');assert.equal(a.opened.length,0);assert.equal(a.reads.length,0);assert.match(a.messages[0],/Invalid/);
});
test('package review retains package route without assessment parameters',async()=>{
 const a=await run('?risk_id=91&risk_action=review');assert.equal(a.opened[0][0],'package');assert.equal(a.reads.length,0);
});
test('assessment drawer shows stored four ratings and summaries, gates decisions and returns a new linked revision',()=>{
 const history=html.slice(html.indexOf('async function loadProjectAssessmentHistory'),html.indexOf('let projectSubmissionVersion'));
 for(const field of ['inherent_likelihood','inherent_impact','residual_likelihood','residual_impact','controls_summary','treatments_summary','owner_user_id'])assert.ok(history.includes(field),field);
 assert.match(history,/capability.administrator_override===true/);assert.match(history,/item.status==='Draft'&&\(own\|\|administratorOverride\)&&capability.can_create/);assert.match(history,/item.status==='Submitted'&&\(!own\|\|administratorOverride\)&&capability.can_approve/);assert.match(history,/item.status==='Returned'&&\(Number\(item.owner_user_id\)===userId\|\|administratorOverride\)&&capability.can_create/);
 const editor=html.slice(html.indexOf('async function openProjectAssessment'),html.indexOf('async function assignApprovedProjectRisk'));assert.match(editor,/payload.returned_assessment_id=Number/);assert.match(editor,/loadProjectAssessmentHistory\(overlay.dataset.applicabilityId,result.id\)/);assert.doesNotMatch(editor,/project-draft-prefill/);
});

test('late assessment decision cannot overwrite a newly opened applicability',async()=>{
 const source=html.slice(html.indexOf('async function projectAssessmentDecision'),html.indexOf('let projectAssessmentLoadVersion'));
 const status={textContent:''},overlay={dataset:{applicabilityId:'55'},classList:{contains:()=>true}},history=[];let finish;
 const pending=new Promise(resolve=>finish=resolve);
 const scope=vm.createContext({document:{getElementById:id=>id==='projectAssessmentMessage'?status:overlay},currentProject:{id:33},projectAssessmentLoadVersion:1,window:{prompt:()=> 'Reason'},API_BASE:'https://fixture/api',apiFetch:async()=>{await pending;return {ok:true,json:async()=>({assessment_status:'Approved'})};},loadProjectAssessmentHistory:async(...args)=>history.push(args),loadProjectRisks:async()=>{}});
 vm.runInContext(source,scope);const save=scope.projectAssessmentDecision(77,'Approve',55);assert.equal(overlay.dataset.saving,'1');scope.projectAssessmentLoadVersion=2;overlay.dataset.applicabilityId='99';status.textContent='New assessment';finish();await save;assert.equal(status.textContent,'New assessment');assert.equal(history.length,0);assert.equal(overlay.dataset.saving,undefined);
});
