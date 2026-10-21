const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {mockInsurance,savedPolicy}=require('./insurance-mock.cjs');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.INSURANCE_BROWSER?{executablePath:process.env.INSURANCE_BROWSER}:{})});try{
for(const scenario of ['register','edit','legacy','country change']){
 const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const policy=savedPolicy({policy_name:'Existing',policy_number:'POL-1',insurance_class:'Cyber',insurer_name:'Insurer',currency:'AUD',inception_date:'2026-01-01',expiry_date:'2027-01-01',country_code:'AU',...(scenario==='legacy'?{}:{state_territory:'NSW'})},1);
 const server=await mockInsurance(page,{policies:scenario==='register'?[]:[policy],canEdit:true});
 await page.goto('https://vero.test/insurance.html');
 await page.locator('#insuranceApiStatus[data-state=ready]').waitFor({state:'attached'});
 if(scenario==='register'){
  await page.getByRole('button',{name:'+ Register Policy',exact:true}).click();
  assert.equal(await page.getByLabel('State / territory',{exact:true}).isDisabled(),true);
  for(const [name,value] of Object.entries({name:'New',number:'P-2',insurer:'Insurer',inception:'2026-01-01',expiry:'2027-01-01',country:'AU'}))await page.locator('#f'+name).fill(value);
  await page.locator('#fclass').selectOption('Cyber');
  assert.deepEqual(await page.locator('#fstate option').evaluateAll(es=>es.map(e=>e.value)),['','ACT','NSW','NT','QLD','SA','TAS','VIC','WA']);
  assert.equal((await page.locator('#fstate').innerText()).includes('\uFFFD'),false);
  assert.ok((await page.locator('#fstate').innerText()).includes('ACT - Australian Capital Territory'));
  await page.locator('#fstate').selectOption('NSW');await page.getByRole('button',{name:'Save Draft',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('#modal').classList.contains('open'));
  assert.equal(server.posts[0].state_territory,'NSW');assert.equal(server.posts[0].country_code,'AU');
 }else{
  if(scenario!=='legacy'){await page.locator('#search').fill('NSW');assert.equal(await page.locator('tr[data-policy-index]').count(),1);await page.locator('#search').fill('VIC');assert.equal(await page.locator('tr[data-policy-index]').count(),0);await page.locator('#search').fill('');}
  await page.locator('tr[data-policy-index]').first().click();
  assert.match(await page.locator('.insurance-policy-details').innerText(),scenario==='legacy'?/State \/ territory/i:/NSW/);
  await page.getByRole('button',{name:'Edit policy',exact:true}).click();await page.getByRole('button',{name:'Save policy changes',exact:true}).waitFor();
  assert.equal(await page.locator('#fstate').inputValue(),scenario==='legacy'?'':'NSW');
  if(scenario==='country change'){
   await page.locator('#fcountry').fill('NZ');assert.equal(await page.locator('#fstate').inputValue(),'');
   await page.locator('#fstate').fill('Wellington');
  }else await page.locator('#fstate').selectOption(scenario==='legacy'?'ACT':'');
  await page.getByRole('button',{name:'Save policy changes',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#modal').classList.contains('open'));
  assert.deepEqual(server.edits[0],{expected_updated_at:'revision-1',...(scenario==='country change'?{country_code:'NZ',state_territory:'Wellington'}:{state_territory:scenario==='legacy'?'ACT':null})});
 }
 assert.deepEqual(errors,[]);console.log('PASS jurisdiction '+scenario);await context.close();
}
for(const width of [1440,390])for(const manager of [true,false]){
 const context=await browser.newContext({viewport:{width,height:1100}}),page=await context.newPage();
 await mockInsurance(page,{canUpload:true,canRegisterActive:manager});
 await page.goto('https://vero.test/insurance.html');await page.locator('#insuranceApiStatus[data-state=ready]').waitFor({state:'attached'});
 await page.getByRole('button',{name:'+ Register Policy',exact:true}).click();
 assert.equal(await page.locator('#fstatus').inputValue(),manager?'Active':'Draft');
 if(manager){assert.equal(await page.locator('[name=purchased_in_force]').isChecked(),false);assert.equal(await page.locator('[name=purchased_in_force]').getAttribute('required'),'');}
 for(const pair of [['fcountry','fstate'],['finception','fexpiry'],['flimit','fexcess'],['fpremium','fcurrency'],['registrationPdf','registrationFileTitle']]){
  const [a,b]=await Promise.all(pair.map(id=>page.locator('#'+id).boundingBox()));
  if(width>500){assert.equal(Math.round(a.y),Math.round(b.y),pair.join('/'));assert.ok(b.x>a.x);}
  else{assert.equal(Math.round(a.x),Math.round(b.x));assert.ok(b.y>a.y);}
 }
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 console.log('PASS paired jurisdiction/date/cost/PDF layout '+width+' manager='+manager);await context.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
