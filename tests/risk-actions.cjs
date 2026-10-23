const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const helper = fs.readFileSync(path.join(root, 'risk-actions.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'my-actions.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
 .map(match => match[1]).filter(code => code.trim());
const homeHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const homeScripts = [...homeHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
 .map(match => match[1]).filter(code => code.trim());

function setup(pageScripts=scripts) {
 const elements = new Map();
 function element() {
  return {style:{},dataset:{},value:'',textContent:'',innerHTML:'',children:[],
   classList:{add(){},remove(){},toggle(){}},
   replaceChildren(){this.children=[];},appendChild(child){this.children.push(child);},
   querySelector(){return element();},querySelectorAll(){return [];},
   addEventListener(){},setAttribute(){}};
 }
 const listeners = {};
 const context = vm.createContext({URLSearchParams,Date,console,
  document:{visibilityState:'visible',body:element(),
   getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},
   createElement(){return element();},querySelectorAll(){return [];},
   addEventListener(type,fn){listeners[type]=fn;}},
  localStorage:{getItem(){return 'test-token';}},
  location:{href:''},setTimeout(){},clearTimeout(){},
  fetch(){throw Error('Unexpected network call');},
  window:{addEventListener(type,fn){listeners[type]=fn;}}
 });
 vm.runInContext(helper, context);
 const controller=pageScripts.find(code=>/async function load(?:My)?Actions\(/.test(code));
 assert.ok(controller,'Find the actions controller independently of shell/bootstrap script order');
 vm.runInContext(controller, context);
 return {context,api:context.window.VeroRiskActions,elements,listeners};
}
const risk = extra => ({id:'project-risk-review-21-v1',source:'Risks',
 action_type:'Project Risk Review',project_id:12,risk_id:21,submission_id:21,
 risk_code:'R-21',description:'Test risk',status:'Submitted',...extra});

test('all inline scripts and risk helper compile; helper loads before feed',()=>{
 scripts.forEach((code,i)=>new vm.Script(code,{filename:`my-actions-inline-${i}.js`}));
 new vm.Script(helper);
 assert.ok(html.indexOf('src="risk-actions.js"')<html.indexOf("const API="));
});
test('legacy risk feed normalization fixes filter and due fields, preserving unrelated workflows',()=>{
 const {api}=setup();
 const compliance={id:'c-1',source:'Compliance',due_date:'2026-01-01'};
 const normalized=api.normaliseActions([risk({source:'Risk',due_date:'2026-10-20'}),compliance]);
 assert.equal(normalized[0].source,'Risks');
 assert.equal(normalized[0].due_at,'2026-10-20');
 assert.equal(normalized[1],compliance);
});
test('same canonical action is shown once, but different lifecycle actions remain distinct',()=>{
 const {api}=setup();
 const normalized=api.normaliseActions([risk(),risk({source:'Risk'}),risk({id:'project-risk-correct-21-v2'})]);
 assert.equal(normalized.length,2);
 assert.equal(api.normaliseActions(null).length,0);
});
test('review and correction destinations carry only validated internal identifiers',()=>{
 const {api}=setup();
 const output=api.destination(risk({target:'https://attacker.invalid'}));
 assert.equal(output.href,'project-workspace.html?id=12&risk_id=21&risk_action=review&submission_id=21');
 assert.match(api.destination(risk({action_type:'Project Risk Correction'})).href,/risk_action=correct/);
});
test('treatment and verification carry their action identifier, never the old project_id route',()=>{
 const {api}=setup();
 for(const [action_type,mode] of [['Project Risk Treatment','treatment'],['Project Risk Treatment Verification','verify']]){
  const output=api.destination(risk({action_type,source_id:9}));
  assert.equal(output.href,`project-workspace.html?id=12&risk_id=21&risk_action=${mode}&treatment_action_id=9`);
 }
});
test('standalone assessment actions route to the exact existing assessment drawer',()=>{
 const {api}=setup();
 for(const [kind,mode] of [['Review','assessment_review'],['Correction','assessment_correct'],['Submission','assessment_submit']]){
  const output=api.destination(risk({action_type:'Project Risk Assessment '+kind,assessment_id:31,applicability_id:16}));
  assert.equal(output.href,`project-workspace.html?id=12&risk_id=21&risk_action=${mode}&projectRiskAssessmentId=31&applicability_id=16`);
  assert.doesNotMatch(output.href,/submission_id/);
 }
});
test('standalone assessment routes fail closed on missing or invalid assessment context',()=>{
 const {api}=setup();
 const item=risk({action_type:'Project Risk Assessment Review',assessment_id:31,applicability_id:16});
 for(const change of [{assessment_id:null},{assessment_id:'31&bad=1'},{applicability_id:0},{applicability_id:true}]){
  assert.equal(api.destination({...item,...change}),null);
 }
});
test('invalid, missing, unsafe, unsupported, and inherited targets cannot become links',()=>{
 const {api}=setup();
 for(const input of [risk({project_id:'12&evil=1'}),risk({risk_id:true}),risk({risk_id:-1}),
  risk({risk_id:'1.1'}),risk({risk_id:'9007199254740992'}),risk({submission_id:null}),
  risk({action_type:'toString'}),risk({action_type:'__proto__'}),risk({source:'Projects'})]){
  assert.equal(api.destination(input),null);
 }
});
test('risk filter, search and displayed due date use normalized feed values',()=>{
 const {context,elements}=setup();
 context.fixture=risk({source:'Risk',due_date:'2026-01-01'});
 vm.runInContext("allActions=window.VeroRiskActions.normaliseActions([fixture]);currentFilter='risks';renderActions()",context);
 assert.match(elements.get('fullActionList').innerHTML,/R-21/);
 assert.match(elements.get('fullActionList').innerHTML,/Due/);
 assert.equal(vm.runInContext('filteredActions().length',context),1);
 elements.get('actionSearch').value='R-21';
 assert.equal(vm.runInContext('filteredActions().length',context),1);
 vm.runInContext("currentFilter='overdue'",context);
 assert.equal(vm.runInContext('filteredActions().length',context),1);
});
test('risk details offer a governed link and never reuse document approval controls',()=>{
 const {context,elements}=setup();
 context.fixture=risk({reason:'Returned <script>payload</script>'});
 vm.runInContext('allActions=[fixture];openActionDetail(0)',context);
 assert.equal(elements.get('actionDetailAdditional').children.length,1);
 assert.match(elements.get('actionDetailAdditional').children[0].href,/risk_action=review/);
 assert.equal(elements.get('actionDecisionActions').style.display,'none');
 assert.equal(elements.get('projectActionActions').style.display,'none');
 assert.equal(elements.get('actionDetailReason').textContent,'Returned <script>payload</script>');
});
test('malformed risk details explain missing route instead of navigating arbitrary target',()=>{
 const {context,elements}=setup();
 context.fixture=risk({risk_id:null,target:'javascript:alert(1)'});
 vm.runInContext('allActions=[fixture];openActionDetail(0)',context);
 assert.equal(elements.get('actionDetailAdditional').children.length,0);
 assert.match(elements.get('actionDetailAdditional').textContent,/cannot be opened/);
});
test('refresh removes decided tasks and closes their stale drawer',async()=>{
 const {context}=setup();
 context.fixture=risk();
 vm.runInContext('allActions=[fixture];openActionDetail(0)',context);
 context.fetch=async()=>({ok:true,json:async()=>({actions:[]})});
 await vm.runInContext('loadActions()',context);
 assert.equal(vm.runInContext('allActions.length',context),0);
 assert.equal(vm.runInContext('currentAction',context),null);
});
test('late action loads cannot resurrect already completed work',async()=>{
 const {context}=setup();
 const pending=[];
 context.fetch=()=>new Promise(resolve=>pending.push(resolve));
 const old=vm.runInContext('loadActions()',context);
 const latest=vm.runInContext('loadActions()',context);
 pending[1]({ok:true,json:async()=>({actions:[]})});
 await latest;
 pending[0]({ok:true,json:async()=>({actions:[risk()]})});
 await old;
 assert.equal(vm.runInContext('allActions.length',context),0);
});
test('return navigation refreshes the authoritative feed',()=>{
 const {listeners}=setup();
 assert.equal(typeof listeners.pageshow,'function');
 assert.equal(typeof listeners.focus,'function');
 assert.equal(typeof listeners.visibilitychange,'function');
});
test('Home scripts compile and use the same dispatcher before the existing feed',()=>{
 homeScripts.forEach((code,i)=>new vm.Script(code,{filename:`home-inline-${i}.js`}));
 assert.ok(homeHtml.indexOf('src="risk-actions.js"')<homeHtml.indexOf('let homeActionLoadSequence'));
 assert.match(homeHtml,/\/api\/my-actions/);
});
test('Home normalizes risk source and due date, deduplicates only matching action ids',()=>{
 const {context,elements}=setup(homeScripts);
 context.fixtures=[risk({source:'Risk',due_date:'2026-10-20'}),risk({source:'Risk',due_date:'2026-10-20'})];
 vm.runInContext('renderMyActions(fixtures)',context);
 assert.equal(context.window.myActions.length,1);
 assert.equal(context.window.myActions[0].source,'Risks');
 assert.equal(context.window.myActions[0].due_at,'2026-10-20');
 assert.match(elements.get('myActionsList').innerHTML,/action-dot teal/);
 assert.match(elements.get('myActionsList').innerHTML,/Due/);
 assert.equal(elements.get('myActionsCount').textContent,'1 outstanding');
});
test('Home opens the shared safe risk destination with unrelated decision buttons hidden',()=>{
 const {context,elements}=setup(homeScripts);
 context.fixture=risk({target:'https://attacker.invalid'});
 vm.runInContext('renderMyActions([fixture]);openActionDetail(0)',context);
 assert.match(elements.get('actionDetailAdditional').children[0].href,/^project-workspace\.html\?id=12&risk_id=21/);
 assert.equal(elements.get('actionDecisionActions').style.display,'none');
 assert.equal(elements.get('projectActionActions').style.display,'none');
 assert.equal(vm.runInContext('actionTarget({...fixture,risk_id:null})',context),'#');
});
test('Home decision return refresh removes completed risk work and its stale drawer',async()=>{
 const {context}=setup(homeScripts);
 context.fixture=risk();
 vm.runInContext('renderMyActions([fixture]);openActionDetail(0)',context);
 context.fetch=async()=>({ok:true,status:200,json:async()=>({actions:[]})});
 await vm.runInContext('loadMyActions()',context);
 assert.equal(context.window.myActions.length,0);
 assert.equal(context.window.currentAction,null);
});
test('Home late loads do not resurrect decided work',async()=>{
 const {context}=setup(homeScripts);
 const pending=[];
 context.fetch=()=>new Promise(resolve=>pending.push(resolve));
 const old=vm.runInContext('loadMyActions()',context);
 const latest=vm.runInContext('loadMyActions()',context);
 pending[1]({ok:true,status:200,json:async()=>({actions:[]})});await latest;
 pending[0]({ok:true,status:200,json:async()=>({actions:[risk()]})});await old;
 assert.equal(context.window.myActions.length,0);
});

test('central treatments use validated risk/action identifiers without a project',()=>{
 const {api}=setup();
 const action={source:'Risks',action_type:'Central Risk Treatment',risk_id:21,treatment_action_id:9,target:'https://attacker.invalid'};
 assert.equal(api.destination(action).href,'risk.html?risk_id=21&central_treatment_id=9');
 for(const value of [null,0,-1,'../bad',true])assert.equal(api.destination({...action,treatment_action_id:value}),null);
});


test('maintenance work uses contract identifiers and the maintenance workspace',()=>{
 const {context}=setup();
 const action={source:'Risks',action_type:'Maintenance Risk Review',contract_id:42,risk_id:7,submission_id:7};
 const result=context.window.VeroRiskActions.destination(action);
 assert.equal(result.href,'maintenance-workspace.html?id=42&risk_id=7&risk_action=review&submission_id=7');
 assert.equal(context.window.VeroRiskActions.destination({...action,contract_id:null,project_id:42}),null);
 assert.equal(context.window.VeroRiskActions.destination({...action,contract_id:'javascript:bad'}),null);
});

test('asset type review opens only the server-assigned assessment with validated identifiers',()=>{
 const {api}=setup();
 const action={source:'Risks',action_type:'Asset Type Assessment Review',assessment_id:7,target:'https://unsafe.example'};
 assert.equal(api.destination(action).href,'asset-management.html?assessment=7');
 for(const id of [null,0,-1,true,'7&admin=1','https://unsafe.example'])assert.equal(api.destination({...action,assessment_id:id}),null);
});

test('publication loads active owner choices independently of the administrator approver list',async()=>{
 const {context,elements}=setup();
 const requests=[];
 context.fetch=async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({users:[{id:7,first_name:'Alex',last_name:'Owner',email:'alex@example.test'}]})};};
 await vm.runInContext('loadPublicationOwnerUsers(7)',context);
 const select=elements.get('publicationDocumentOwner');
 assert.match(requests[0].url,/\/users\/lookup$/);
 assert.equal(requests[0].options.headers.Authorization,'Bearer test-token');
 assert.match(select.innerHTML,/value="7">Alex Owner/);
 assert.equal(select.value,'7');assert.equal(select.disabled,false);
 assert.equal(elements.get('publicationOwnerRetry').hidden,true);
 assert.match(html,/loadPublicationOwnerUsers\(\s*action.document_owner_user_id/);
});

test('publication owner lookup failure can be retried without reopening the action',async()=>{
 const {context,elements}=setup();let fail=true;
 context.fetch=async()=>({ok:!fail,json:async()=>fail?{message:'Service unavailable'}:{users:[{id:9,email:'owner@example.test'}]}});
 await vm.runInContext('loadPublicationOwnerUsers()',context);
 const select=elements.get('publicationDocumentOwner'),retry=elements.get('publicationOwnerRetry');
 assert.equal(select.disabled,true);assert.equal(retry.hidden,false);
 assert.match(select.innerHTML,/Unable to load owners/);
 fail=false;await retry.onclick();
 assert.equal(select.disabled,false);assert.equal(retry.hidden,true);
 assert.match(select.innerHTML,/owner@example.test/);
});

test('late owner responses do not replace the newly opened action owner',async()=>{
 const {context,elements}=setup();let finishFirst;
 context.fetch=()=>new Promise(resolve=>{finishFirst=resolve;});
 const first=vm.runInContext('loadPublicationOwnerUsers(7)',context);
 context.fetch=async()=>({ok:true,json:async()=>({users:[{id:9,email:'new@example.test'}]})});
 await vm.runInContext('loadPublicationOwnerUsers(9)',context);
 finishFirst({ok:true,json:async()=>({users:[{id:7,email:'old@example.test'}]})});await first;
 assert.equal(elements.get('publicationDocumentOwner').value,'9');
 assert.doesNotMatch(elements.get('publicationDocumentOwner').innerHTML,/old@example.test/);
});
