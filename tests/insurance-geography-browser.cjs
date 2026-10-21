const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {mockInsurance,savedPolicy}=require('./insurance-mock.cjs');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.INSURANCE_BROWSER?{executablePath:process.env.INSURANCE_BROWSER}:{})});try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const server=await mockInsurance(page,{canEdit:true});await page.goto('https://vero.test/insurance.html');await page.locator('#insuranceApiStatus[data-state=ready]').waitFor({state:'attached'});
  await page.getByRole('button',{name:'+ Register Policy',exact:true}).click();
  for(const [key,value] of Object.entries({name:'Motor source',number:'SOURCE-1',insurer:'Insurer',country:'AU',inception:'2026-07-01',expiry:'2027-07-01'}))await page.locator('#f'+key).fill(value);
  await page.locator('#fclass').selectOption('Motor');
  assert.equal(await page.locator('#fcurrency').inputValue(),'');assert.equal(await page.getByLabel('Currency not stated in source').isChecked(),true);
  assert.equal(await page.getByLabel('Policy owner',{exact:true}).inputValue(),'unknown');
  await page.getByLabel('Coverage geography',{exact:true}).selectOption('Countries');
  for(const code of ['AU','NZ']){await page.getByRole('button',{name:'Add covered country',exact:true}).click();await page.getByLabel('Covered country code',{exact:true}).last().fill(code);}
  await page.getByLabel('Covered states or territories',{exact:true}).first().fill('NSW, VIC');
  await page.getByLabel('Certificate term wording (optional)',{exact:true}).fill('1 July 2026 to 1 July 2027 at 4 pm local');
  await page.getByRole('button',{name:'Save Draft',exact:true}).click();await page.locator('#modal.open').waitFor({state:'hidden'});
  assert.equal(server.posts.length,1);const payload=server.posts[0];assert.equal(payload.currency,null);assert.equal(payload.currency_unknown,true);assert.equal(payload.owner_unknown,true);assert.equal(payload.country_code,'AU');
  assert.deepEqual(payload.coverage_geography,{scope:'Countries',countries:[{country_code:'AU',states:['NSW','VIC']},{country_code:'NZ',states:[]}]});
  await page.getByLabel('Search insurance register').fill('NZ');assert.equal(await page.locator('tr[data-policy-index]').count(),1);
  await page.locator('tr[data-policy-index]').click();await page.getByRole('button',{name:'Edit policy',exact:true}).click();await page.getByRole('button',{name:'Save policy changes',exact:true}).waitFor();
  assert.equal(await page.getByLabel('Covered country code',{exact:true}).count(),2);assert.equal(await page.getByLabel('Certificate term wording (optional)',{exact:true}).inputValue(),payload.source_term_text);
  await page.locator('#fname').fill('Motor corrected');await page.getByRole('button',{name:'Save policy changes',exact:true}).click();await page.locator('#modal.open').waitFor({state:'hidden'});
  assert.deepEqual(server.edits[0],{expected_updated_at:'revision-1',policy_name:'Motor corrected'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  assert.equal(await page.evaluate(()=>insurancePremiumTotal([{currency:'AUD',premium:'10.00'},{currency:null,premium:'20.00'}])),'AUD 10.00 / 1 premium with currency unstated (not totalled)');
  assert.deepEqual(errors,[]);console.log('PASS descriptive geography/unknown values/edit/search '+width);await context.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
