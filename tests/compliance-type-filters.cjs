const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch(e){if(process.platform!=='win32')throw e;({chromium}=require('C:/Users/dbleasel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'compliance.html'),'utf8');
const functions=['filterRegister','setComplianceType','setType','renderComplianceRegister','updateComplianceCounts'].map(name=>html.match(new RegExp('function '+name+'\\([^]*?\\n\\}'))[0]).join('\n');
const common=[{id:1,obligation_code:'COM-CLIENT-CONTRACT-01',compliance_type:'Client',obligation_title:'Grouped reporting parent',current_assessment:{status:'Not Assessed'}},{id:2,compliance_type:'Regulatory',obligation_title:'Regulatory notification',applicability:{type:'Jurisdiction'},current_assessment:{status:'Not Assessed'}},{id:3,compliance_type:'Internal',obligation_title:'Internal event reporting',applicability:{type:'Organisation'},current_assessment:{status:'Not Assessed'}}];
const contracts=[{id:10,code:'1795C',name:'Contract A'},{id:20,code:'1923C',name:'Contract B'},{id:30,code:'EMPTY',name:'Empty contract'}];
const requirements=Array.from({length:360},(_,i)=>({contract_id:i<210?10:20,obligation_id:1,common_requirement:'Grouped reporting parent',assessment_status:'Not assessed',activity:{instance_id:'CO-'+i,verra_action:'Separate client duty '+i,timing_or_trigger:'Monthly',conditions_and_exceptions:'Only where contract applies',clause_reference:'Clause '+i,pdf_pages:[2]}}));
async function setup(width,fail=false){
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:process.env.VERO_TEST_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 const page=await browser.newPage({viewport:{width,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));await page.addStyleTag({path:path.join(root,'vero-shell.css')});await page.addStyleTag({path:path.join(root,'compliance-contract-register.css')});
 await page.addScriptTag({content:'var obligationsLive={};const COMPLIANCE_API="https://example.invalid/api";function complianceAuthHeaders(){return {}};function compliancePill(x){return x}function assessmentPill(x){return x||"Not Assessed"}function formatComplianceDate(){return "—"}window.openLiveObligation=async id=>{window.opened=id;document.getElementById("obligationModal").classList.add("show")};window.failContracts='+fail+';window.fetch=async()=>({ok:!window.failContracts,status:window.failContracts?503:200,json:async()=>('+JSON.stringify({contracts,requirements})+')});'+functions});
 await page.addStyleTag({path:path.join(root,'register-layout.css')});
 await page.addScriptTag({path:path.join(root,'register-layout.js')});
 await page.addScriptTag({path:path.join(root,'compliance-contract-register.js')});await page.evaluate(items=>renderComplianceRegister(items),common);
 return {browser,page,errors};
}
for(const width of [1440,390])test(`Individual All/type views and one shared assessment at ${width}px`,async()=>{
 const {browser,page,errors}=await setup(width);try{
  const count=()=>page.locator('#contractRequirementCount').innerText();
  assert.match(await count(),/^362 requirements/);
  assert.deepEqual(await page.locator('.vr-summary b').allTextContents(),['1','1','360','362']);
  assert.deepEqual(await page.locator('.vr-summary span').allTextContents(),['Regulatory','Internal','Client','Total Requirements']);
  assert.equal(await page.locator('.compliance-view[data-type=""] span').innerText(),'362');
  const out=path.resolve(root,'../preview/compliance-counts');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,`individual-all-${width}.png`)});
  assert.equal(await page.locator('#registerBody').isVisible(),false);
  assert.equal(await page.locator('#commonRequirementView').count(),0);
  assert.equal(await page.locator('#contractRequirementRows tr[data-requirement]').count(),50);
  assert.equal(await page.locator('#contractRequirementRows .contract-requirement-open', {hasText:'Grouped reporting parent'}).count(),0);
  await page.locator('.compliance-view[data-type="Regulatory"]').click();assert.match(await count(),/^1 requirement/);assert.match(await page.locator('#contractRequirementRows').innerText(),/Regulatory notification/);
  await page.locator('.compliance-view[data-type="Internal"]').click();assert.match(await count(),/^1 requirement/);
  await page.locator('.compliance-view[data-type="Client"]').click();assert.match(await count(),/^360 requirements/);
  await page.locator('#contractRequirementNext').click();assert.match(await page.locator('#contractRequirementRows').innerText(),/Separate client duty 50/);
  await page.locator('#contractRequirementFilter').selectOption('20');assert.match(await count(),/^150 requirements/);
  await page.locator('#contractRequirementSearch').fill('Clause 250');assert.equal(await page.locator('#contractRequirementRows tr[data-requirement]').count(),1);
  assert.deepEqual(await page.locator('.vr-summary b').allTextContents(),['1','1','360','362'],'Search, type, contract and pagination never reduce total cards');
  await page.locator('#contractRequirementRows summary').click();await page.getByRole('button',{name:'Review shared assessment',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.opened),1);assert.match(await page.locator('#sharedRequirementNotice').innerText(),/360 individual requirements/);
  await page.locator('#obligationModal').evaluate(el=>el.classList.remove('show'));
  // The existing parent assessment is the single result used by all 360 individual rows.
  await page.evaluate(items=>renderComplianceRegister(items),common.map(r=>r.id===1?{...r,current_assessment:{status:'Compliant'}}:r));
  await page.locator('#contractRequirementSearch').fill('');await page.locator('#contractRequirementFilter').selectOption('');
  await page.locator('#requirementStatusFilter').selectOption('Compliant');assert.match(await count(),/^360 requirements/);
  await page.locator('#requirementStatusFilter').selectOption('Not Assessed');assert.match(await count(),/^0 requirements/);
  await page.locator('#requirementStatusFilter').selectOption('');await page.locator('.compliance-view[data-type=""]').click();assert.match(await count(),/^362 requirements/);
  await page.locator('#contractRequirementFilter').selectOption('30');assert.match(await count(),/^0 requirements/);
  await page.locator('#contractRequirementFilter').selectOption('');
  await page.locator('#requirementApplicabilityFilter').selectOption('Organisation');assert.match(await count(),/^1 requirement/);
  await page.locator('#requirementApplicabilityFilter').selectOption('');
  await page.evaluate(()=>window.setComplianceRegisterError('Assessment data unavailable'));
  assert.match(await count(),/totals are incomplete/);
  assert.deepEqual(await page.locator('.vr-summary b').allTextContents(),['—','—','—','—']);
  assert.equal(await page.locator('.compliance-view[data-type=""] span').innerText(),'—');
  await page.evaluate(items=>renderComplianceRegister(items),common);
  assert.match(await count(),/^362 requirements/);

  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
});
test('Contract load failure is explicit and retry restores individual totals',async()=>{
 const {browser,page}=await setup(1440,true);try{
  await page.locator('#contractRequirementRetry').waitFor({state:'visible'});assert.equal(await page.locator('#contractRequirementRows .contract-requirement-open',{hasText:'Grouped reporting parent'}).count(),0);
  assert.deepEqual(await page.locator('.vr-summary b').allTextContents(),['—','—','—','—']);
  await page.evaluate(()=>window.failContracts=false);await page.locator('#contractRequirementRetry').click();await page.getByText('362 requirements · showing 1–50',{exact:true}).waitFor();
 }finally{await browser.close()}
});
test('IMS maintenance controls are not appended to the page toolbar',()=>{
 const source=fs.readFileSync(path.join(root,'ims-requirements-import.js'),'utf8');
 for(const name of ['button','reviewButton','exportButton','draftButton'])assert.ok(!source.includes("document.querySelector('.actions')?.append("+name+")"));
 assert.ok(source.includes("has('ims_draft')"),'Existing draft deep links remain supported');
});

test('An empty complete dataset displays zero and a reload clears stale totals',async()=>{
 const {browser,page}=await setup(1440);try{
  await page.evaluate(()=>{window.fetch=()=>new Promise(resolve=>window.resolveRequirements=resolve);document.getElementById('contractRequirementRetry').click();});
  assert.deepEqual(await page.locator('.vr-summary b').allTextContents(),['—','—','—','—']);
  await page.evaluate(()=>{window.setComplianceRegisterItems([]);window.resolveRequirements({ok:true,status:200,json:async()=>({contracts:[],requirements:[]})});});
  await page.waitForFunction(()=>document.querySelector('.vr-summary').getAttribute('aria-busy')==='false');
  assert.deepEqual(await page.locator('.vr-summary b').allTextContents(),['0','0','0','0']);
 }finally{await browser.close()}
});
