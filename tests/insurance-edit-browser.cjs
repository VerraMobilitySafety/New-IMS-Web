const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {mockInsurance,savedPolicy}=require('./insurance-mock.cjs');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.INSURANCE_BROWSER?{executablePath:process.env.INSURANCE_BROWSER}:{})});try{
for(const scenario of ['edit','conflict','observer','later PDF','edit PDF retry','cancel','multiple']){
 const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const policy=savedPolicy({policy_name:'Existing',policy_number:'POL-1',insurance_class:'Cyber',insurer_name:'Insurer',currency:'AUD',inception_date:'2026-01-01',expiry_date:'2027-01-01',country_code:'AU',status:'Active',annual_premium:'10.50',insured_entity_name:'Example',coverage_limit:'100.00',deductible_amount:'0.00'},1);
 if(scenario==='multiple'){policy.insured_entities.push('Second');policy.coverages.push({...policy.coverages[0],currency:'USD'})}
 const server=await mockInsurance(page,{policies:[policy],canEdit:scenario!=='observer',readOnly:scenario==='observer',canUpload:scenario!=='observer',editMode:scenario==='conflict'?'error':'ok',uploadMode:scenario==='edit PDF retry'?'error':'ok'});
 await page.goto('https://vero.test/insurance.html');await page.locator('tr[data-policy-index]').first().click();
 await page.getByText('No accessible files attached.',{exact:true}).waitFor();
 if(scenario==='observer'){assert.equal(await page.getByRole('button',{name:'Edit policy',exact:true}).count(),0);assert.equal(await page.locator('#insuranceUpload').count(),0)}
 else if(scenario==='later PDF'){
  await page.getByLabel('File title',{exact:true}).fill('Policy schedule');await page.getByLabel('PDF file',{exact:true}).setInputFiles({name:'policy.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 mock')});
  await page.getByRole('button',{name:'Save file as Record',exact:true}).click();await page.locator('#policyDetails a[href="records.html?record_id=9"]').waitFor();assert.equal((server.edits||[]).length,0);assert.equal(server.uploads.length,1);
 }else{
  await page.getByRole('button',{name:'Edit policy',exact:true}).click();await page.getByRole('button',{name:'Save policy changes',exact:true}).waitFor();
  assert.equal(await page.locator('#fname').inputValue(),'Existing');assert.equal(await page.locator('#fstatus').isVisible(),false);
  if(scenario==='multiple')for(const name of ['entity','limit','excess','currency'])assert.equal(await page.locator('#f'+name).isDisabled(),true);
  await page.locator('#fname').fill('Corrected');
  if(scenario==='cancel'){await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal((server.edits||[]).length,0)}else{
   if(scenario==='edit PDF retry'){await page.locator('#form').getByLabel('File title',{exact:true}).fill('My chosen policy title');await page.getByLabel('Policy PDF (optional)',{exact:true}).setInputFiles({name:'policy.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 mock')});}
   await page.getByRole('button',{name:'Save policy changes',exact:true}).click();
   if(scenario==='conflict'){await page.locator('#insuranceFormStatus').filter({hasText:'Changes not confirmed'}).waitFor();assert.equal(await page.locator('#fname').inputValue(),'Corrected')}
   else if(scenario==='edit PDF retry'){
    await page.getByRole('button',{name:'Retry attachment',exact:true}).waitFor();server.uploadMode='ok';await page.getByRole('button',{name:'Retry attachment',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#modal').classList.contains('open'));
    assert.equal(server.edits.length,1);assert.equal(server.uploads.length,2);for(const body of server.uploads){assert.ok(body.includes('My chosen policy title'));assert.ok(body.includes('filename="policy.pdf"'));}const key=s=>s.match(/name="request_id"\r\n\r\n([^\r]+)/)[1];assert.equal(key(server.uploads[0]),key(server.uploads[1]));
   }else await page.waitForFunction(()=>!document.querySelector('#modal').classList.contains('open'));
   assert.deepEqual(server.edits[0],{expected_updated_at:'revision-1',policy_name:'Corrected'});
  }
 }
 assert.equal(server.posts.length,0);assert.deepEqual(errors,[]);console.log('PASS saved policy '+scenario);await context.close();
}
for(const scenario of ['cancel delayed edit','overlapping upload']){
 const context=await browser.newContext(),page=await context.newPage();let release;const gate=new Promise(r=>release=r);
 const server=await mockInsurance(page,{policies:[savedPolicy({policy_name:'Existing',policy_number:'POL-1',insurance_class:'Cyber',insurer_name:'Insurer',currency:'AUD',inception_date:'2026-01-01',expiry_date:'2027-01-01'},1)],canEdit:true,canUpload:true,...(scenario==='cancel delayed edit'?{editGate:gate}:{uploadGate:gate})});
 await page.goto('https://vero.test/insurance.html');await page.locator('tr[data-policy-index]').first().click();await page.getByText('No accessible files attached.',{exact:true}).waitFor();
 if(scenario==='cancel delayed edit'){
  const requested=page.waitForRequest('**/insurance/policies/1/edit');await page.getByRole('button',{name:'Edit policy',exact:true}).click();await requested;await page.keyboard.press('Escape');
  const response=page.waitForResponse('**/insurance/policies/1/edit');release();await response;await page.waitForTimeout(50);assert.equal(await page.locator('#modal').evaluate(e=>e.classList.contains('open')),false);
 }else{
  await page.getByLabel('File title',{exact:true}).fill('Schedule');await page.getByLabel('PDF file',{exact:true}).setInputFiles({name:'policy.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 mock')});
  const requested=page.waitForRequest(r=>r.url().endsWith('/records')&&r.method()==='POST');await page.getByRole('button',{name:'Save file as Record',exact:true}).click();await requested;
  await page.getByRole('button',{name:'Edit policy',exact:true}).click();await page.locator('#insuranceApiStatus').filter({hasText:'Finish or reconcile'}).waitFor();assert.equal(await page.getByRole('button',{name:'Save policy changes',exact:true}).count(),0);
  release();await page.locator('#policyDetails a[href="records.html?record_id=9"]').waitFor();assert.equal(server.uploads.length,1);assert.equal((server.edits||[]).length,0);
 }
 console.log('PASS saved policy '+scenario);await context.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
