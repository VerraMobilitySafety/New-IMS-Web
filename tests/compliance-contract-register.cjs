const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
let chromium;try{({chromium}=require('playwright'));}catch(e){if(process.platform!=='win32')throw e;({chromium}=require('C:/Users/dbleasel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=path.join(__dirname,'..');
test('contract-specific view supports pagination, filtering, empty contracts, search, retry and common-view switching',async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try{
  const page=await browser.newPage();let fail=true;
  const contracts=[{id:1,code:'A',name:'Contract A'},{id:2,code:'B',name:'Contract B'},{id:3,code:'C',name:'No requirements'}];
  const requirements=Array.from({length:360},(_,i)=>({contract_id:i<210?1:2,obligation_id:10,obligation_code:'CM-01',common_requirement:'Safety',assessment_status:'Not assessed',activity:{instance_id:'CO-'+i,verra_action:i===0?'Control <img src=x onerror=alert(1)>':'Requirement '+i,timing_or_trigger:'Within 5 Business Days',conditions_and_exceptions:'Only when requested',clause_reference:'Clause '+i,pdf_pages:[2]}}));
  await page.route('**/api/compliance/contract-requirements',route=>route.fulfill({status:fail?503:200,headers:{'Access-Control-Allow-Origin':'*'},json:fail?{message:'Unavailable'}:{contracts,requirements}}));
  await page.setContent('<section class="panel" id="commonPanel"><input id="complianceSearch" value="preserved common filter"></section><script>const COMPLIANCE_API="https://example.invalid/api";function complianceAuthHeaders(){return {}}window.openLiveObligation=id=>window.openedRequirement=id;</script>');
  await page.addStyleTag({path:path.join(root,'compliance-contract-register.css')});await page.addScriptTag({path:path.join(root,'compliance-contract-register.js')});
  assert.equal(await page.locator('#commonPanel').isVisible(),true);
  await page.getByRole('button',{name:'Contract-specific requirements',exact:true}).click();
  await page.getByRole('button',{name:'Retry loading'}).waitFor({state:'visible'});
  assert.ok((await page.locator('#contractRequirementCount').innerText()).includes('Unable to load'));
  fail=false;await page.getByRole('button',{name:'Retry loading'}).click();
  await page.getByText('360 contract-specific requirements across 2 contracts · showing 1–50',{exact:true}).waitFor();
  assert.equal(await page.locator('#contractRequirementRows tr').count(),50);
  assert.equal(await page.locator('#contractRequirementRows img').count(),0);
  await page.getByRole('button',{name:'Next',exact:true}).click();assert.equal(await page.locator('#contractRequirementPage').innerText(),'Page 2 of 8');
  await page.locator('#contractRequirementFilter').selectOption('2');assert.ok((await page.locator('#contractRequirementCount').innerText()).startsWith('150 contract-specific requirements for B'));
  assert.equal(await page.locator('#contractRequirementPage').innerText(),'Page 1 of 3');
  await page.locator('#contractRequirementSearch').fill('Clause 250');assert.equal(await page.locator('#contractRequirementRows tr').count(),1);
  await page.locator('#contractRequirementRows summary').click();assert.ok((await page.locator('#contractRequirementRows').innerText()).includes('Only when requested'));
  await page.getByRole('button',{name:'Open common requirement',exact:true}).click();assert.equal(await page.evaluate(()=>window.openedRequirement),10);
  await page.locator('#contractRequirementSearch').fill('');await page.locator('#contractRequirementFilter').selectOption('3');
  assert.ok((await page.locator('#contractRequirementCount').innerText()).startsWith('0 contract-specific requirements for C'));
  assert.ok((await page.locator('#contractRequirementRows').innerText()).includes('No contract-specific requirements match'));
  await page.getByRole('button',{name:'Common requirements',exact:true}).click();assert.equal(await page.locator('#commonPanel').isVisible(),true);
  assert.equal(await page.locator('#complianceSearch').inputValue(),'preserved common filter');
  await page.getByRole('button',{name:'Contract-specific requirements',exact:true}).click();assert.equal(await page.locator('#commonPanel').isVisible(),false);
 }finally{await browser.close();}
});

