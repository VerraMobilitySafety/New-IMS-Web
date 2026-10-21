const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {mockInsurance,savedPolicy}=require('./insurance-mock.cjs');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.INSURANCE_BROWSER?{executablePath:process.env.INSURANCE_BROWSER}:{})});try{
 for(const scenario of ['preview','observer','assigned','start-error','error','late','mobile']){
  const context=await browser.newContext({viewport:scenario==='mobile'?{width:390,height:844}:{width:1440,height:900}}),page=await context.newPage();
  const server=await mockInsurance(page,{readOnly:scenario==='observer',policies:[savedPolicy({policy_name:'Motor',policy_number:'MOTOR',status:'Active'},1)]});let starts=0,release;
  const gate=scenario==='late'?new Promise(r=>release=r):null;
  await page.route('**/api/insurance/renewals**',async route=>{
   if(route.request().method()==='POST'){starts++;if(scenario==='start-error')return route.fulfill({status:409,json:{message:'Synthetic conflict'}});return route.fulfill({json:{status:'success'}})}
   if(gate)await gate;
   if(scenario==='error')return route.fulfill({status:503,json:{message:'Synthetic renewal unavailable'}});
   return route.fulfill({json:{status:'success',enabled:['assigned','start-error'].includes(scenario),can_start:['assigned','start-error'].includes(scenario),renewals:[{kind:'policy',target_id:1,title:'Motor',expiry_date:'2027-07-01',stage:'Due within 30 days',policy_ids:[1],cycle_id:1,can_start:['assigned','start-error'].includes(scenario),task_status:starts?'In Progress':'Open'},{kind:'programme',target_id:3,title:'Cyber',expiry_date:'2027-07-01',stage:'Overdue',policy_ids:[2,3,4,5,6,7,8],cycle_id:2,can_start:false,task_status:'Open'}]}});
  });
  await page.goto('https://vero.test/insurance.html');await page.locator('#insuranceApiStatus[data-state=ready]').waitFor({state:'attached'});
  await page.locator('#insuranceMore summary').click();await page.getByRole('button',{name:'Renewal tracking',exact:true}).click();
  if(scenario==='late'){await page.keyboard.press('Escape');release();await page.waitForTimeout(80);assert.equal(await page.locator('#modal').isVisible(),false)}
  else if(scenario==='error'){await page.getByText(/Renewals could not be loaded/).waitFor();assert.equal(await page.getByRole('button',{name:'Retry renewals'}).count(),1)}
  else{
   await page.getByRole('heading',{name:'Cyber',exact:true}).waitFor();assert.equal(await page.locator('.insurance-renewal-cycle').count(),2);
   if(['assigned','start-error'].includes(scenario)){await page.getByRole('button',{name:'Start assigned renewal'}).click();if(scenario==='start-error'){await page.getByRole('alert').waitFor();assert.equal(await page.getByRole('button',{name:'Start assigned renewal'}).isEnabled(),true)}else await page.getByText(/In Progress/).waitFor();assert.equal(starts,1)}
   else{assert.equal(await page.getByRole('button',{name:'Start assigned renewal'}).count(),0);await page.getByText(/Reminder generation is disabled/).waitFor()}
   await page.getByRole('searchbox',{name:'Search renewal cycles'}).fill('motor');assert.equal(await page.locator('.insurance-renewal-cycle').count(),1);
   if(scenario==='mobile')assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  assert.equal(server.posts.length,0);assert.equal((server.uploads||[]).length,0);console.log('PASS renewal '+scenario);await context.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
