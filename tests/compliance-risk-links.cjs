const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
for(const width of [1500,390])test(`Risk Links isolated editor lifecycle at ${width}px`,async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width,height:1100}}),errors=[],writes=[];
  page.setDefaultTimeout(5000);
  let getStatus=200,patchStatus=200,getDelay=0;
  let options={available:true,register_id:1,compliance_category_id:480,tier:2,aggregation_enabled:false,
   paths:[{ids:[1,489],label:'Operations / Sustainability'},{ids:[7,14],label:'Legal / Regulatory'}],
   current:{revision:1,parent_paths:[[1,489]],history:[]}};
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   if(!route.request().url().includes('/risk-links'))return route.fulfill({body:''});
   const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,PATCH,OPTIONS','Access-Control-Allow-Headers':'content-type'};
   if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
   if(route.request().method()==='PATCH'){
    const data=route.request().postDataJSON();writes.push(data);
    await new Promise(r=>setTimeout(r,100));
    if(patchStatus!==200)return route.fulfill({status:patchStatus,headers,json:{message:'Parent selections changed; reopen and review before saving'}});
    options={...options,current:{revision:options.current.revision+1,parent_paths:data.routing.parent_paths,history:[{revision:2,actor_user_id:20,created_at:'2026-10-20T00:00:00Z',change_reason:data.reason,selected_routing:data.routing}]}};
   }else if(getDelay)await new Promise(r=>setTimeout(r,getDelay));
   return route.fulfill({status:getStatus,headers,json:getStatus===200?options:{message:getStatus===503?'Risk Links database update required before editing':'Only an active Administrator or Compliance Controller may edit Risk Links'}});
  });
  await page.setContent(fs.readFileSync(path.join(root,'compliance.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  await page.addScriptTag({content:`
   var currentLiveObligationId=40;
   function prepareComplianceRiskAssessment(){} function readComplianceRiskPosition(){return {}} function complianceRiskHandleClose(){} function complianceRiskSummary(){return ''}
   function closeModal(id){complianceRiskHandleClose(id);document.getElementById(id).classList.remove('show')}
   async function complianceRiskRequest(url,opts){const r=await fetch('https://example.test'+url,opts);const data=await r.json();if(!r.ok)throw Error(data.message);return data}
   document.getElementById('obligationTitle').textContent='Synthetic Not Applicable requirement';
   document.getElementById('obligationModal').classList.add('show');
  `});
  await page.addScriptTag({path:path.join(root,'compliance-parent-routing.js')});
  await page.addScriptTag({path:path.join(root,'compliance-risk-links.js')});
  await page.addStyleTag({path:path.join(root,'compliance-risk-links.css')});
  const open=()=>page.evaluate(()=>openComplianceRiskLinks());
  const save=page.locator('#riskLinksSave'),reason=page.locator('#riskLinksReason'),checks=page.locator('#riskLinksFields fieldset input');
  await open();await checks.first().waitFor().catch(async e=>{throw Error(e.message+" UI: "+await page.locator("#complianceRiskLinksModal").innerText()+" errors: "+JSON.stringify(errors))});assert.equal(await checks.first().isChecked(),true);
  assert.match(await page.locator('#riskLinksFields').innerText(),/Compliance . Tier 2/);
  assert.match(await page.locator('#complianceRiskLinksModal').innerText(),/Clearing all links is not supported/);
  assert.match(await page.locator('#complianceRiskLinksModal').innerText(),/Saving an unchanged selection records a new audit revision/);
  const bounds=await page.locator('#complianceRiskLinksModal .drawer').boundingBox();assert.ok(bounds.x>=-1&&bounds.x+bounds.width<=width+1);
  await save.click();assert.match(await page.locator('#riskLinksMessage').innerText(),/Enter a reason/);assert.equal(writes.length,0);
  await reason.fill('Correct parent link');await checks.first().uncheck();await save.click();assert.match(await page.locator('#riskLinksMessage').innerText(),/at least one/);assert.equal(writes.length,0);
  await checks.nth(1).check();await reason.fill('Reviewed <img src=x onerror=alert(1)> links');
  await page.evaluate(()=>{document.getElementById('riskLinksSave').click();document.getElementById('riskLinksSave').click()});
  await page.getByText('Risk Links saved. No assessment was created.',{exact:true}).waitFor();assert.equal(writes.length,1);
  assert.deepEqual(writes[0].routing,{register_id:1,compliance_category_id:480,expected_revision:1,parent_paths:[[7,14]]});
  assert.deepEqual(Object.keys(writes[0]).sort(),['reason','routing']);
  assert.equal(await page.locator('#riskLinksFields img').count(),0);
  assert.equal(await page.locator('#obligationTitle').textContent(),'Synthetic Not Applicable requirement');
  // A conflict must retain the originally reviewed revision until explicit reload.
  patchStatus=409;await reason.fill('Another correction');await save.click();await page.getByText(/Parent selections changed; reopen/).waitFor();
  await save.click();await page.getByText(/Parent selections changed; reopen/).waitFor();
  assert.equal(writes[1].routing.expected_revision,2);assert.equal(writes[2].routing.expected_revision,2);
  options.current.revision=3;await page.locator('#riskLinksReload').click();await checks.first().waitFor();
  patchStatus=200;await reason.fill('Reviewed fresh links');await save.click();await page.getByText('Risk Links saved. No assessment was created.',{exact:true}).waitFor();
  assert.equal(writes[3].routing.expected_revision,3);
  // Pre-migration/forbidden GET disables all saves, with a usable retry.
  for(const status of [503,403]){
   await page.locator('#riskLinksClose').click();getStatus=status;await open();await page.getByText(status===503?/database update required/:/Only an active Administrator/).waitFor();assert.equal(await save.isDisabled(),true);
  }
  getStatus=200;await page.locator('#riskLinksReload').click();await checks.first().waitFor();
  // Closing or switching requirements invalidates loaded state and pending loads.
  await page.evaluate(()=>{currentLiveObligationId=41});await reason.fill('Must not save against another requirement');await save.click();assert.equal(writes.length,4);
  await page.locator('#riskLinksClose').click();getDelay=200;await open();await page.locator('#riskLinksClose').click();await page.waitForTimeout(250);assert.equal(await save.isDisabled(),true);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
