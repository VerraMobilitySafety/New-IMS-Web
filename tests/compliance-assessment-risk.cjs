const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'compliance.html'),'utf8'),code=fs.readFileSync(path.join(root,'compliance-assessment-risk.js'),'utf8');
const inline=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
new vm.Script(inline.join('\n')+'\n'+code); // One shared global scope catches duplicate let/const declarations.
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'All HTML IDs must be unique');
for(const prefix of ['single','review'])for(const field of ['InherentLikelihood','InherentImpact','ResidualLikelihood','ResidualImpact','Owner','ControlEffectiveness','Justification'])assert.ok(ids.includes(prefix+'Risk'+field));
class Element{
 constructor(tag='DIV'){this.tagName=tag.toUpperCase();this.children=[];this._value='';this.disabled=false;this.hidden=false;this.dataset={};this.style={};this.listeners={};this._html='';this._text='';this.className='';const classes=new Set();this.classList={add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)};}
 set value(value){value=String(value??'');this._value=this.tagName==='SELECT'&&!this.children.some(x=>x.value===value)?'':value;}
 get value(){return this._value;}
 appendChild(el){this.children.push(el);return el;}
 replaceChildren(...children){this.children=children;this._value='';this._text='';this._html='';}
 set innerHTML(value){this._html=String(value);this._text='';}
 get innerHTML(){return this._html;}
 set textContent(value){this._text=String(value);this._html='';}
 get textContent(){return this._text;}
 setAttribute(name,value){this[name]=String(value);}
 addEventListener(name,fn){this.listeners[name]=fn;}
}
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};};
function harness(){
 const elements=new Map();
 for(const match of html.matchAll(/<([a-z]+)\b[^>]*\bid="([^"]+)"[^>]*>/gi))elements.set(match[2],new Element(match[1]));
 for(const match of html.matchAll(/<select\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi)){
  const el=elements.get(match[1]);for(const option of match[2].matchAll(/<option(?:\s+value="([^"]*)")?[^>]*>([^<]*)<\/option>/gi)){const child=new Element('option');child.value=option[1]??option[2];child.textContent=option[2];el.appendChild(child);}
 }
 const calls=[],alerts=[],opened=[],rows=[];
 const context={console,URLSearchParams,Date,document:{getElementById:id=>elements.get(id)||null,createElement:tag=>new Element(tag),querySelectorAll:selector=>selector.startsWith('#reviewRiskFields')?[...elements].filter(([id,el])=>id.startsWith('reviewRisk')&&['SELECT','TEXTAREA'].includes(el.tagName)).map(([,el])=>el):selector==='#projectComplianceList tbody tr'?rows:[]},currentLiveObligationId:7,currentLiveObligation:{id:7},complianceObligationLoadSequence:1,COMPLIANCE_API:'https://fixture.invalid/api',escapeComplianceText:s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'),complianceAuthHeaders:()=>({}),alert:msg=>alerts.push(msg),location:{href:'compliance.html',replace(url){this.href=url;}},window:{open:(...args)=>opened.push(args)},loadComplianceRegister:async()=>{},openLiveObligation:async id=>opened.push(id),apiFetch:async()=>({ok:true,json:async()=>({obligations:[]})})};
 let request=async url=>url==='/users/active'?{users:[{id:4,name:'Risk Owner'}]}:{risks:[]};
 context.complianceRiskRequest=(url,opts)=>{calls.push({url,opts});return request(url,opts);};
 context.fetch=async(url,opts)=>{calls.push({url,opts});return {ok:true,json:async()=>({request:{request_code:'CR-1'}})};};
 vm.createContext(context);vm.runInContext(code,context);
 context.closeModal=id=>{context.complianceRiskHandleClose(id);elements.get(id).classList.remove('show');};
 const review=html.slice(html.indexOf('async function submitComplianceAssessment(){'),html.indexOf('</script>',html.indexOf('async function submitComplianceAssessment(){')));
 vm.runInContext(review,context);
 const submit=html.slice(html.indexOf('async function prototypeSubmit(){'),html.indexOf('function prototypeAnalyse(){'));
 vm.runInContext(submit,context);
 const run=src=>vm.runInContext(src,context);
 const set=(id,value)=>{elements.get(id).value=value;};
 function valid(prefix='review'){
  for(const [suffix,value] of Object.entries({InherentLikelihood:5,InherentImpact:3,ResidualLikelihood:2,ResidualImpact:2,Owner:4,ControlEffectiveness:'Effective',Justification:'Risk of failing the requirement',ControlsSummary:'Supervision',TreatmentsSummary:'Review training'}))set(prefix+'Risk'+suffix,value);
 }
 return {context,elements,calls,alerts,opened,rows,run,set,valid,setRequest:fn=>request=fn};
}
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
test('exact shared matrix across all 25 normalized cells',()=>{
 const h=harness(),expected=[['Low','Low','Low','Moderate','Moderate'],['Low','Moderate','Moderate','Moderate','High'],['Low','Moderate','High','High','Significant'],['Moderate','Moderate','High','Significant','Significant'],['Moderate','High','Significant','Significant','Significant']];
 for(let l=1;l<=5;l++)for(let i=1;i<=5;i++){const value=h.context.complianceRiskScore(l,i);assert.equal(value.score,l*i);assert.equal(value.rating,expected[l-1][i-1]);}
 for(const v of [0,6,1.2,'abc',null])assert.equal(h.context.complianceRiskScore(v,3),null);
});
test('mandatory complete initial assessment and all applicable formal statuses; Not Applicable exempt',async()=>{
 const h=harness();await h.context.prepareComplianceRiskAssessment('review');
 assert.throws(()=>h.context.readComplianceRiskPosition('review','Compliant'),/1 to 5/);
 h.valid();
 for(const status of ['Compliant','Partially Compliant','Non-Compliant']){const p=h.context.readComplianceRiskPosition('review',status);assert.equal(p.inherent_likelihood,5);assert.equal(p.residual_impact,2);assert.equal(p.risk_owner_user_id,4);assert.equal(p.linked_risk_id,null);assert.equal(p.controls_summary,'Supervision');}
 h.set('reviewRiskJustification','');assert.throws(()=>h.context.readComplianceRiskPosition('review','Compliant'),/Risk Justification/);
 assert.equal(h.context.readComplianceRiskPosition('review','Not Applicable'),null);
 await h.context.prepareComplianceRiskAssessment('single');assert.throws(()=>h.context.readComplianceRiskPosition('single'),/1 to 5/);h.valid('single');assert.equal(h.context.readComplianceRiskPosition('single').inherent_impact,3);
});
test('Not Applicable disables scoring, and reopening reenables and clears controls',async()=>{
 const h=harness();await h.context.prepareComplianceRiskAssessment('review');h.valid();h.set('reviewAssessmentStatus','Not Applicable');h.context.updateComplianceRiskExemption();assert.ok(h.elements.get('reviewRiskOwner').disabled);assert.match(h.elements.get('reviewRiskScores').textContent,/exempt/);
 h.context.closeModal('reviewAssessmentModal');h.set('reviewAssessmentStatus','');await h.context.prepareComplianceRiskAssessment('review');assert.equal(h.elements.get('reviewRiskOwner').disabled,false);assert.equal(h.elements.get('reviewRiskJustification').value,'');
});
test('owner-loading errors fail closed, retry keeps entered scores, optional risk failure permits save',async()=>{
 const h=harness();h.setRequest(async()=>{throw Error('Offline');});await h.context.prepareComplianceRiskAssessment('review');assert.equal(h.elements.get('reviewRiskRetry').hidden,false);h.valid();assert.throws(()=>h.context.readComplianceRiskPosition('review','Compliant'),/Risk Owner/);
 h.setRequest(async url=>{if(url==='/users/active')return {users:[{id:4,name:'Owner'}]};throw Error('Optional down');});await h.context.prepareComplianceRiskAssessment('review',false);h.set('reviewRiskOwner',4);assert.equal(h.context.readComplianceRiskPosition('review','Compliant').inherent_likelihood,5);
});
test('stale option responses cannot overwrite a newer assessment',async()=>{
 const h=harness(),old=deferred();h.setRequest(url=>url==='/users/active'?old.promise:Promise.resolve({risks:[]}));const pending=h.context.prepareComplianceRiskAssessment('review');h.context.closeModal('reviewAssessmentModal');
 h.setRequest(async url=>url==='/users/active'?{users:[{id:6,name:'New Owner'}]}:{risks:[]});await h.context.prepareComplianceRiskAssessment('review');old.resolve({users:[{id:4,name:'Old Owner'}]});await pending;assert.equal(h.elements.get('reviewRiskOwner').children[1].value,'6');
});
test('classification cascade requires the entire valid hierarchy and resets descendants',async()=>{
 const h=harness();h.setRequest(async()=>({categories:[{category_id:10,tier:1,is_terminal:true,path_ids:[1,2,3,10],path:'Domain → Stream → Category → Event'},{category_id:20,tier:1,is_terminal:true,path_ids:[5,6,7,20],path:'Other → Other stream → Other category → Other event'},{category_id:99,tier:1,is_terminal:true,path_ids:[1,99],path:'Invalid → Invalid'}]}));await h.context.loadSubmissionRiskClassifications();
 assert.ok(h.elements.get('singleRiskTier3').disabled);assert.equal(h.context.readSubmissionRiskClassification(),null);
 for(const [tier,value] of [[4,1],[3,2],[2,3],[1,10]]){h.set('singleRiskTier'+tier,value);h.context.changeSubmissionRiskTier(tier);}
 assert.equal(h.context.readSubmissionRiskClassification(),10);h.set('singleRiskTier4',5);h.context.changeSubmissionRiskTier(4);assert.equal(h.elements.get('singleRiskTier1').value,'');assert.ok(h.elements.get('singleRiskTier1').disabled);assert.equal(h.context.readSubmissionRiskClassification(),null);
});
test('initial request serializes classification and full risk_position once; duplicate click blocked',async()=>{
 const h=harness();h.setRequest(async url=>url.includes('paths')?{categories:[{category_id:10,tier:1,is_terminal:true,path_ids:[1,2,3,10],path:'D → S → C → E'}]}:{users:[{id:4,name:'Owner'}]});await h.context.loadSubmissionRiskClassifications();await h.context.prepareComplianceRiskAssessment('single');
 for(const [tier,value] of [[4,1],[3,2],[2,3],[1,10]]){h.set('singleRiskTier'+tier,value);h.context.changeSubmissionRiskTier(tier);}h.valid('single');h.set('singleTitle','New requirement');h.set('singleDescription','Description');h.set('singleApplicability','Organisation');
 const response=deferred();h.context.fetch=async(url,opts)=>{h.calls.push({url,opts});return response.promise;};const pending=h.context.prototypeSubmit();await h.context.prototypeSubmit();const sent=h.calls.filter(c=>c.opts?.method==='POST');assert.equal(sent.length,1);const payload=JSON.parse(sent[0].opts.body);assert.deepEqual(payload.risk_classification_ids,[10]);assert.equal(payload.risk_position.justification,'Risk of failing the requirement');assert.equal(payload.risk_position.linked_risk_id,null);
 response.resolve({ok:true,json:async()=>({request:{request_code:'CR-1'}})});await pending;assert.equal(h.elements.get('submitComplianceRequirementButton').disabled,false);
});
test('formal save blocks missing risk and duplicate clicks; carries correct obligation and payload',async()=>{
 const h=harness();await h.context.prepareComplianceRiskAssessment('review');h.set('reviewAssessmentStatus','Partially Compliant');h.set('reviewAssessmentRationale','Some controls missing');await h.context.submitComplianceAssessment();assert.equal(h.calls.filter(c=>c.opts?.method==='POST').length,0);
 h.valid();const response=deferred();h.setRequest(()=>response.promise);const pending=h.context.submitComplianceAssessment();await h.context.submitComplianceAssessment();const sent=h.calls.filter(c=>c.opts?.method==='POST');assert.equal(sent.length,1);assert.equal(sent[0].url,'/compliance/obligations/7/assessments');assert.equal(JSON.parse(sent[0].opts.body).risk_position.residual_likelihood,2);response.resolve({});await pending;assert.equal(h.elements.get('saveComplianceAssessmentButton').disabled,false);
});
test('Not Applicable saves null risk and save failure keeps user input',async()=>{
 const h=harness();await h.context.prepareComplianceRiskAssessment('review');h.set('reviewAssessmentStatus','Not Applicable');h.set('reviewAssessmentRationale','Outside jurisdiction');h.setRequest(async()=>{throw Error('Save failed');});await h.context.submitComplianceAssessment();assert.equal(JSON.parse(h.calls.at(-1).opts.body).risk_position,null);assert.equal(h.elements.get('reviewAssessmentRationale').value,'Outside jurisdiction');assert.match(h.elements.get('reviewAssessmentMessage').textContent,/Save failed/);assert.equal(h.elements.get('saveComplianceAssessmentButton').disabled,false);
});
test('cancel while saving does not reopen or refresh a different obligation',async()=>{
 const h=harness();await h.context.prepareComplianceRiskAssessment('review');h.valid();h.set('reviewAssessmentStatus','Compliant');h.set('reviewAssessmentRationale','Valid');h.elements.get('reviewAssessmentModal').classList.add('show');h.elements.get('obligationModal').classList.add('show');const response=deferred();h.setRequest(()=>response.promise);const pending=h.context.submitComplianceAssessment();h.context.closeModal('reviewAssessmentModal');h.context.currentLiveObligationId=8;response.resolve({});await pending;assert.deepEqual(h.opened,[]);assert.equal(h.elements.get('reviewAssessmentModal').classList.contains('show'),false);
});
test('history distinguishes submission, formal score, and Not Applicable, escaping all user content',async()=>{
 const h=harness();h.setRequest(async()=>({assessments:[{source:'Submission',assessment_date:'2026-10-15',scenario:'Non-compliance or partial compliance',inherent_likelihood:5,inherent_impact:3,residual_likelihood:2,residual_impact:2,justification:'<img src=x onerror=alert(1)>',control_effectiveness:'Effective',risk_owner_name:'<Owner>'},{source:'Assessment',assessment_status:'Not Applicable',assessment_date:'2026-10-15',inherent_score:null,residual_score:null}]}));await h.context.loadComplianceRiskAssessmentHistory(7);const output=h.elements.get('complianceRiskAssessmentHistory').innerHTML;assert.match(output,/Initial submission risk assessment/);assert.match(output,/15 \/ 25/);assert.match(output,/Significant/);assert.match(output,/Not Applicable: risk scoring exempt/);assert.ok(output.includes('&lt;img'));assert.ok(!output.includes('<img'));assert.ok(!output.includes('null/25'));assert.ok(!output.includes('0 / 25'));
});
test('stale history failure cannot replace another obligation result',async()=>{
 const h=harness(),old=deferred();h.setRequest(()=>old.promise);const pending=h.context.loadComplianceRiskAssessmentHistory(7);h.context.currentLiveObligationId=8;h.setRequest(async()=>({assessments:[]}));await h.context.loadComplianceRiskAssessmentHistory(8);old.reject(Error('Old failure'));await pending;assert.match(h.elements.get('complianceRiskAssessmentHistory').innerHTML,/No risk assessments/);
});
test('controller sees initial risk and escaped classifications',()=>{
 const h=harness(),host=new Element();h.context.renderControllerComplianceRisk({risk_classifications:[{category_name:'<Event>'}],risk_position:{inherent_likelihood:4,inherent_impact:4,residual_likelihood:1,residual_impact:2,justification:'Initial rationale'}},host);assert.match(host.children[0].innerHTML,/Initial Risk Assessment/);assert.match(host.children[0].innerHTML,/16 \/ 25/);assert.match(host.children[0].innerHTML,/&lt;Event&gt;/);
});
test('Escape uses cancellation hooks and stale controller responses cannot replace another request',async()=>{
 assert.ok(html.includes('.forEach(m=>closeModal(m.id));'));
 const h=harness(),a=deferred(),b=deferred(),note=new Element('textarea'),owner=new Element('input');note.value='Previous notes';owner.value='99';
 h.elements.get('controllerModal').querySelectorAll=()=>[note,owner];
 const fields=Array.from({length:4},()=>new Element('strong'));
 const sections=[{querySelector:()=>new Element()},{querySelector:()=>new Element()}];
 h.context.document.querySelector=()=>new Element();
 h.context.document.querySelectorAll=selector=>selector.includes('.detail-grid')?fields:selector==='#controllerModal .section'?sections:[];
 h.context.currentComplianceReview=null;h.context.selectedExistingObligationId=55;
 h.context.renderControllerComplianceRisk=item=>h.opened.push('risk:'+item.id);
 h.context.openControllerReview=()=>{h.opened.push('opened');h.elements.get('controllerModal').classList.add('show');};
 h.context.fetch=url=>url.endsWith('/1')?a.promise:b.promise;
 const start=html.indexOf('let complianceControllerLoadSequence=0;'),end=html.indexOf("document.addEventListener('DOMContentLoaded'",start);
 vm.runInContext(html.slice(start,end),h.context);
 const old=h.context.openComplianceRequestFromAction(1),latest=h.context.openComplianceRequestFromAction(2);
 assert.equal(note.value,'');assert.equal(owner.value,'');assert.equal(h.context.selectedExistingObligationId,null);
 const response=id=>({ok:true,json:async()=>({request:{id,request_code:'CR-'+id},items:[{id:id*10,proposed_title:'Request '+id}]})});
 b.resolve(response(2));await latest;a.resolve(response(1));await old;
 assert.equal(h.elements.get('controllerModal').dataset.requestId,2);assert.equal(h.context.currentComplianceReview.id,20);assert.deepEqual(h.opened,['risk:20','opened']);
 const closed=deferred();h.context.fetch=()=>closed.promise;const pending=h.context.openComplianceRequestFromAction(3);
 let escapeHandler;h.context.document.addEventListener=(name,fn)=>{if(name==='keydown')escapeHandler=fn;};
 const escapeStart=html.indexOf("document.addEventListener('keydown',e=>{"),escapeEnd=html.indexOf('</script>',escapeStart);vm.runInContext(html.slice(escapeStart,escapeEnd),h.context);
 escapeHandler({key:'Escape'});closed.resolve(response(3));await pending;assert.deepEqual(h.opened,['risk:20','opened']);assert.equal(h.elements.get('controllerModal').classList.contains('show'),false);
});
test('project compliance whole rows support click and keyboard to the existing detail container',async()=>{
 const h=harness(),project=fs.readFileSync(path.join(root,'project-workspace.html'),'utf8');
 h.elements.set('projectComplianceCount',new Element());h.context.API_BASE='https://fixture.invalid/api';h.context.apiFetch=async()=>({ok:true,json:async()=>({obligations:[{id:17,obligation_code:'COMP-17',applicability:{type:'Project',project_id:9}},{id:18,applicability:{type:'Project',project_id:10}}]})});
 h.context.projectTable=(host,headers,items)=>items.forEach(()=>h.rows.push(new Element('tr')));h.context.projectListMessage=()=>{};
 const start=project.indexOf('async function loadProjectCompliance(id){'),end=project.indexOf('async function projectAssessmentDecision',start);vm.runInContext(project.slice(start,end),h.context);await h.context.loadProjectCompliance(9);assert.equal(h.rows.length,1);const row=h.rows[0];assert.equal(row.role,'link');assert.equal(row.tabIndex,0);row.listeners.click({});assert.equal(h.context.location.href,'compliance.html?obligation_id=17');h.context.location.href='old';let prevented=false;row.listeners.keydown({key:'Enter',preventDefault(){prevented=true;}});assert.ok(prevented);assert.equal(h.context.location.href,'compliance.html?obligation_id=17');row.listeners.click({ctrlKey:true});assert.equal(h.opened[0][0],'compliance.html?obligation_id=17');
});
(async()=>{for(const [name,fn] of tests){await fn();console.log('PASS',name);}console.log(tests.length+' compliance assessment regression checks passed.');})().catch(error=>{console.error(error);process.exitCode=1;});
