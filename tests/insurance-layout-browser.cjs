// Synthetic local preview; all external requests intercepted, no live records.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../preview');
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.INSURANCE_BROWSER?{executablePath:process.env.INSURANCE_BROWSER}:{})});
 try{
 for(const width of [1440,1024,768,390]){
  const context=await browser.newContext({viewport:{width,height:1100}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const server=await require('./insurance-mock.cjs').mockInsurance(page);
  await page.goto('https://vero.test/insurance.html');
  await page.locator('#insuranceApiStatus').filter({hasText:'policies loaded.'}).waitFor();
  await page.evaluate(()=>window.VeroPageLoader?.ready('account'));
  if(width<750){
   await page.getByRole('button',{name:'Menu',exact:true}).click();
   assert.equal(await page.locator('#insuranceSidebar').isVisible(),true);
   await page.getByRole('button',{name:'Menu',exact:true}).click();
   assert.equal(await page.locator('#insuranceSidebar').isVisible(),false);
  }
  assert.equal(await page.getByLabel('Insurance view',{exact:true}).inputValue(),'Overview');
  assert.equal(await page.locator('.insurance-sections').count(),0);
  await page.getByLabel('Insurance view',{exact:true}).selectOption('Policies');
  const add=async(number,status,expiry)=>{
   await page.getByRole('button',{name:'+ Register Policy',exact:true}).click();
   assert.equal(await page.locator('main').evaluate(e=>e.inert),true);
   await page.keyboard.press('Shift+Tab');assert.equal(await page.getByRole('button',{name:'Save Draft'}).evaluate(e=>e===document.activeElement),true);
   await page.keyboard.press('Tab');assert.equal(await page.getByLabel('Policy Name',{exact:true}).evaluate(e=>e===document.activeElement),true);
   await page.getByLabel('Policy Name',{exact:true}).fill('Synthetic '+number);
   await page.getByLabel('Policy Number',{exact:true}).fill(number);
   assert.equal(await page.getByLabel('Status',{exact:true}).inputValue(),'Draft');
   await page.getByLabel('Insurance Class',{exact:true}).fill('Liability');
   await page.getByLabel('Inception Date',{exact:true}).fill('2019-01-01');
   await page.getByLabel('Insurer',{exact:true}).fill('Example insurer');
   await page.getByLabel('Broker',{exact:true}).fill('Hidden broker '+number);
   await page.getByLabel('Expiry Date',{exact:true}).fill(expiry);
   await page.getByRole('button',{name:'Save Draft'}).click();
   await page.locator('#modal.open').waitFor({state:'hidden'});
   await page.locator('#insuranceApiStatus').filter({hasText:'policies loaded.'}).waitFor();
    assert.equal(await page.getByRole('button',{name:'+ Register Policy',exact:true}).evaluate(e=>e===document.activeElement),true);
    assert.equal(await page.locator('main').evaluate(e=>e.inert),false);
   server.policies.find(p=>p.policy_number===number).status=status;
   await page.getByRole('button',{name:'Refresh policies',exact:true}).click();
   await page.locator('#insuranceApiStatus').filter({hasText:'policies loaded.'}).waitFor();
  };
  const due=new Date();due.setDate(due.getDate()+30);
  await add('TEST-001','Active',due.toISOString().slice(0,10));
  await add('TEST-002','Expired','2020-01-01');
  assert.equal(await page.locator('#content tbody tr').count(),2);
  assert.deepEqual(await page.locator('#content th').allTextContents(),['Policy','Insurer','Expiry Date','Status']);
  await page.getByLabel('Search insurance register').fill('Hidden broker TEST-002');
  assert.equal(await page.locator('#content tbody tr').count(),1,'search retains fields removed from table');
  await page.locator('#content tbody tr').click();
  assert.match(await page.locator('#policyDetails').innerText(),/Hidden broker TEST-002/);
  assert.equal(await page.locator('#policyDetails dt').count(),14);
  for(const key of ['Tab','Shift+Tab','Tab']){await page.keyboard.press(key);assert.equal(await page.getByRole('button',{name:'Close',exact:true}).evaluate(e=>e===document.activeElement),true)}
  await page.evaluate(()=>document.querySelector('#search').focus());assert.equal(await page.getByRole('button',{name:'Close',exact:true}).evaluate(e=>e===document.activeElement),true);
  assert.equal(await page.locator('main').evaluate(e=>e.inert),true);
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByLabel('Search insurance register').fill('');
  await page.locator('#content tbody tr').filter({hasText:'TEST-001'}).focus();
  await page.keyboard.press('Enter');
  assert.match(await page.locator('#policyDetails').innerText(),/TEST-001/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#content tbody tr').filter({hasText:'TEST-001'}).evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#policyDetails').isVisible(),true);
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:'Active',exact:true}).click();
  assert.equal(await page.locator('#content tbody tr').count(),1);
  await page.getByLabel('Filter by status').selectOption('Expired');
  assert.equal(await page.locator('#content tbody tr').count(),0,'filters combine');
  await page.getByRole('button',{name:'All Policies',exact:true}).click();
  assert.equal(await page.locator('#content tbody tr').count(),1);
  await page.getByLabel('Filter by status').selectOption('');
  await page.getByLabel('Search insurance register').fill('TEST-001');
  assert.equal(await page.locator('#content tbody tr').count(),1);
  await page.getByLabel('Search insurance register').fill('');
  await page.getByRole('button',{name:'Due within 90 days'}).click();
  assert.equal(await page.locator('#content tbody tr').count(),1);
  await page.getByRole('button',{name:'All Policies',exact:true}).click();
  await page.screenshot({path:path.join(out,`insurance-simple-${width}.png`),fullPage:true});
  const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
  assert.ok(fits,'page does not overflow horizontally');
  await page.locator('#insuranceMore summary').click();
  await page.getByRole('button',{name:'+ Register Claim',exact:true}).click();
  assert.equal(await page.locator('#modal.open').count(),1);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#insuranceMore summary').evaluate(e=>e===document.activeElement),true);
  await page.locator('#insuranceMore summary').click();await page.getByRole('button',{name:'+ Register Claim',exact:true}).click();
  await page.getByLabel('Claim Reference').fill('CLAIM-TEST');
  await page.getByLabel('Policy Number',{exact:true}).fill('TEST-001');
  await page.getByRole('button',{name:'Add to Prototype'}).click();
  await page.getByLabel('Insurance view',{exact:true}).selectOption('Claims');
  assert.equal(await page.locator('#content tbody tr').count(),1);
  assert.equal(await page.locator('#insuranceViews').isVisible(),false);
  await page.locator('#insuranceMore summary').click();
  await page.getByRole('button',{name:'+ Plan Renewal',exact:true}).click();
  await page.getByLabel('Policy Number',{exact:true}).fill('TEST-001');
  await page.getByLabel('Stage',{exact:true}).fill('Quotation');
  await page.getByRole('button',{name:'Add to Prototype'}).click();
  await page.getByLabel('Insurance view',{exact:true}).selectOption('Renewals');
  await page.getByLabel('Filter by stage').selectOption('Quotation');
  assert.equal(await page.locator('#content tbody tr').count(),1);
  for(const section of ['Overview','Documents','Analytics']){
   await page.getByLabel('Insurance view',{exact:true}).selectOption(section);
   assert.equal(await page.locator('#insuranceToolbar').isVisible(),true);
   assert.equal(await page.locator('#search').isVisible(),false);
   assert.equal(await page.locator('#insuranceStatus').isVisible(),false);
   assert.ok((await page.locator('#content').innerText()).length>20);
  }
  await page.getByLabel('Insurance view',{exact:true}).selectOption('Overview');
  assert.equal(await page.locator('.kpi').count(),4);
  assert.ok((await page.locator('main').innerText()).includes('prototype only'));
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: policy create/search/combined filters, claims/renewals, sections, disclaimer, no page overflow or script errors`);
  await context.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
