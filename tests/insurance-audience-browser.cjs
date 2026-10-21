const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {mockInsurance,savedPolicy}=require('./insurance-mock.cjs');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.INSURANCE_BROWSER?{executablePath:process.env.INSURANCE_BROWSER}:{})});try{
for(const scenario of ['denied','observer','action-denied','revoked','adapter-unavailable']){
 const context=await browser.newContext(),page=await context.newPage();
 const server=await mockInsurance(page,{audienceDenied:scenario==='denied',readOnly:scenario==='observer',financialWriteAccess:scenario!=='observer',canEdit:scenario!=='observer',noAdapter:scenario==='adapter-unavailable',policies:[savedPolicy({policy_name:'Private policy',policy_number:'PRIVATE',status:'Active'},1)]});
 await page.goto('https://vero.test/insurance.html');
 if(scenario==='adapter-unavailable'){assert.equal(await page.locator('#insurancePanel').isVisible(),false)}
 else if(scenario==='denied'){await page.getByText('You do not have access to Insurance.',{exact:true}).waitFor();assert.equal(await page.locator('#insurancePanel').isVisible(),false);assert.equal(await page.locator('.insurance-actions').isVisible(),false);assert.equal(await page.locator('a[href="insurance.html"]').first().isVisible(),false)}
 else{
  await page.locator('#insuranceApiStatus[data-state=ready]').waitFor({state:'attached'});
  assert.equal(await page.locator('#insurancePanel').isVisible(),true);
  if(scenario==='observer'){assert.equal(await page.getByRole('button',{name:'+ Register Policy',exact:true}).isVisible(),false);await page.locator('tr[data-policy-index]').click();assert.equal(await page.getByRole('button',{name:'Edit policy',exact:true}).count(),0)}
  else{
   if(scenario==='revoked')server.audienceDenied=true;
   server.canEdit=false;await page.locator('tr[data-policy-index]').click();await page.getByRole('button',{name:'Edit policy',exact:true}).click();
   if(scenario==='revoked'){await page.waitForFunction(()=>document.body.classList.contains('insurance-access-denied'));assert.equal(await page.locator('#insurancePanel').isVisible(),false);assert.equal(await page.locator('#modal').isVisible(),false)}
   else{await page.getByText(/Edit permission denied/).waitFor();assert.equal(await page.locator('#insurancePanel').isVisible(),true);assert.equal(await page.locator('#modal').isVisible(),true)}
  }
 }
 assert.equal(server.posts.length,0);assert.equal((server.uploads||[]).length,0);console.log('PASS audience '+scenario);await context.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
