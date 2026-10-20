const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch(e){if(process.platform!=='win32')throw e;({chromium}=require('C:/Users/dbleasel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'compliance.html'),'utf8');
const functions=['filterRegister','setComplianceType','setType','renderComplianceRegister','updateComplianceCounts'].map(name=>html.match(new RegExp('function '+name+'\\([^]*?\\n\\}'))?.[0]||(()=>{throw Error('Missing '+name)})()).join('\n');
const items=[
 {id:1,compliance_type:'Regulatory',obligation_title:'WorkSafe incident notification',applicability:{type:'Jurisdiction'},current_assessment:{status:'Not Assessed'}},
 {id:2,compliance_type:'Internal',obligation_title:'Internal event reporting',applicability:{type:'Organisation'},current_assessment:{status:'Compliant'}},
 {id:3,compliance_type:'Client',obligation_title:'Monthly customer performance report',applicability:{type:'Project'},current_assessment:{status:'Compliant'}}
];
const clientActivities=Array.from({length:360},(_,i)=>({contract_id:1,obligation_id:3,obligation_code:'CM-07',common_requirement:'Customer reporting',assessment_status:'Not assessed',activity:{instance_id:'CO-'+i,verra_action:'Separate client duty '+i,timing_or_trigger:'Monthly',clause_reference:'Clause '+i,pdf_pages:[1]}}));
for(const width of [1440,390])test(`Always-visible requirement types and contract navigation at ${width}px`,async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try{
  const page=await browser.newPage({viewport:{width,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  await page.addStyleTag({path:path.join(root,'compliance-contract-register.css')});
  await page.addScriptTag({content:'var obligationsLive={};const COMPLIANCE_API="https://example.invalid/api";function complianceAuthHeaders(){return {}};function compliancePill(x){return x}function assessmentPill(x){return x||"Not Assessed"}function formatComplianceDate(){return "—"}window.openLiveObligation=()=>{};window.fetch=async()=>({ok:true,status:200,json:async()=>({contracts:[{id:1,code:"1795C",name:"Customer contract"}],requirements:'+JSON.stringify(clientActivities)+'})});'+functions});
  await page.addScriptTag({path:path.join(root,'compliance-contract-register.js')});
  const nav=page.locator('.compliance-type-panel'),common=page.locator('#complianceSearch').locator('xpath=ancestor::section[1]');
  assert.equal(await common.isVisible(),true);
  assert.equal(await nav.isVisible(),true);
  await page.locator('.compliance-view[data-type="Regulatory"]').click();
  // A refresh arriving after the selection must respect it.
  await page.evaluate(data=>renderComplianceRegister(data),items);
  assert.equal(await page.locator('#registerBody tr[data-type]:visible').count(),1);
  assert.match(await page.locator('#registerBody').innerText(),/WorkSafe/);
  assert.equal(await page.locator('.contract-register-views').isVisible(),false);
  for(const type of ['Internal','']){
   await page.locator('.compliance-view[data-type="'+type+'"]').click();
   assert.equal(await page.locator('#registerBody tr[data-type]:visible').count(),type?1:3);
   assert.equal(await page.locator('.compliance-view[aria-pressed="true"]').count(),1);
  }
  await page.locator('.compliance-view[data-type="Client"]').click();
  assert.equal(await common.isVisible(),false);
  assert.equal(await page.locator('#contractRequirementRows tr[data-requirement]').count(),50);
  assert.match(await page.locator('#contractRequirementCount').textContent(),/^360 contract-specific requirements/);
  assert.equal(await page.locator('.compliance-view[data-type="Client"] span').textContent(),'360');
  assert.equal(await page.locator('.contract-register-views').isVisible(),false);
  await page.locator('#contractRequirementNext').click();
  assert.match(await page.locator('#contractRequirementRows').textContent(),/Separate client duty 50/);
  await page.locator('#contractRequirementSearch').fill('Clause 250');
  assert.equal(await page.locator('#contractRequirementRows tr[data-requirement]').count(),1);
  await page.locator('#contractRequirementSearch').fill('');
  await page.evaluate(data=>renderComplianceRegister(data),items);
  assert.equal(await page.locator('.compliance-view[data-type="Client"] span').textContent(),'360');
  await page.locator('.compliance-view[data-type=""]').click();
  await page.locator('#contractRequirementView').click();
  assert.equal(await common.isVisible(),false);assert.equal(await nav.isVisible(),true);
  await page.locator('.compliance-view[data-type="Internal"]').click();
  assert.equal(await common.isVisible(),true);assert.equal(await page.locator('#contractRequirementRegister').isVisible(),false);
  await page.locator('#complianceSearch').fill('WorkSafe');
  assert.equal(await page.locator('#registerBody tr[data-type]:visible').count(),0);
  assert.equal(await page.locator('#complianceFilterEmpty').count(),1);
  assert.equal(await page.locator('#registerCount').textContent(),'Showing 0 common requirements');
  await page.locator('.compliance-view[data-type="Regulatory"]').click();
  assert.equal(await page.locator('#registerBody tr[data-type]:visible').count(),1);
  assert.equal(await page.locator('#complianceFilterEmpty').count(),0);
  await page.locator('#complianceSearch').fill('');
  await page.locator('#statusFilter').selectOption('Compliant');
  assert.equal(await page.locator('#registerBody tr[data-type]:visible').count(),0);
  await page.locator('#statusFilter').selectOption('');
  await page.locator('#applicabilityFilter').selectOption('Organisation');
  assert.equal(await page.locator('#registerBody tr[data-type]:visible').count(),0);
  await page.locator('#applicabilityFilter').selectOption('');
  await page.evaluate(()=>setType('Client'));
  assert.equal(await page.locator('.compliance-view[data-type="Client"]').getAttribute('aria-pressed'),'true');
  assert.equal(await common.isVisible(),false);
  assert.equal(await page.locator('#contractRequirementRegister').isVisible(),true);
  for(const button of await nav.locator('button').all()){
   const box=await button.boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=width+1,'Type button overflows viewport');
  }
  const preview=path.resolve(root,'../../outputs/compliance-type-filter');fs.mkdirSync(preview,{recursive:true});
  await page.locator('.compliance-view[data-type=""]').click();
  await page.screenshot({path:path.join(preview,`compliance-types-${width}.png`),fullPage:false});
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
});
