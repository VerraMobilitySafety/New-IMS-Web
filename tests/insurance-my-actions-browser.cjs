const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {mockInsurance}=require('./insurance-mock.cjs');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.INSURANCE_BROWSER?{executablePath:process.env.INSURANCE_BROWSER}:{})});try{
 for(const timezoneId of ['America/Los_Angeles','Pacific/Auckland']){
  const context=await browser.newContext({timezoneId}),page=await context.newPage();
  await mockInsurance(page);
  await page.clock.install({time:new Date('2027-07-01T23:59:59Z')});
  await page.clock.setFixedTime(new Date('2027-07-01T23:59:59Z')); 
  const insurance={id:'insurance-renewal-1',source:'Insurance',action_type:'Insurance Renewal',title:'Review insurance renewal',description:'Synthetic Motor',status:'Open',due_date:'2027-07-01',due_at:'2027-07-02T00:00:00Z',target:'insurance.html?renewals=1'};
  const unrelated={id:'record-1',source:'Records',action_type:'Record Request',title:'Existing Records task',status:'Open',due_at:'2027-07-01T00:00:00Z'};
  let actions=[insurance,unrelated],denied=false;
  await page.route('**/api/my-actions',route=>route.fulfill(denied?{status:401,json:{message:'Synthetic session revoked'}}:{json:{status:'success',actions}}));
  await page.goto('https://vero.test/my-actions.html');await page.locator('.full-action').first().waitFor();
  assert.equal(await page.locator('.full-action').count(),2);
  assert.match(await page.locator('.full-action').filter({hasText:'Insurance'}).innerText(),/Due 01 Jul(?:y)? 2027/);
  await page.locator('[data-filter=insurance]').click();assert.equal(await page.locator('.full-action').count(),1);
  await page.locator('[data-filter=records]').click();assert.match(await page.locator('#fullActionList').innerText(),/Existing Records task/);
  await page.locator('[data-filter=overdue]').click();assert.equal(await page.locator('.full-action').count(),1);assert.doesNotMatch(await page.locator('#fullActionList').innerText(),/Insurance/);
  await page.clock.setFixedTime(new Date('2027-07-02T00:00:00Z'));
  await page.locator('[data-filter=overdue]').click();assert.equal(await page.locator('.full-action').count(),2);assert.match(await page.locator('.full-action').filter({hasText:'Insurance'}).innerText(),/Overdue 01 Jul(?:y)? 2027/);
  await page.locator('[data-filter=insurance]').click();await page.locator('.full-action').click();await page.waitForURL('**/insurance.html?renewals=1');await page.getByText('No accessible renewal cycles.').waitFor();
  await page.goto('https://vero.test/my-actions.html');await page.locator('.full-action').first().waitFor();
  // Server returns only authorised tasks after Manager membership is revoked.
  actions=[unrelated];await page.evaluate(()=>loadActions());await page.locator('[data-filter=insurance]').click();assert.equal(await page.locator('.full-action').count(),0);
  await page.locator('[data-filter=all]').click();assert.equal(await page.locator('.full-action').count(),1);
  denied=true;await page.evaluate(()=>loadActions());assert.equal(await page.locator('.full-action').count(),0);await page.getByText('Unable to load your actions right now.').waitFor();
  console.log('PASS Insurance My Actions dates, UTC boundary, filters, revocation and navigation '+timezoneId);await context.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
