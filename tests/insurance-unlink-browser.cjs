const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {mockInsurance,savedPolicy}=require('./insurance-mock.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.INSURANCE_BROWSER?{executablePath:process.env.INSURANCE_BROWSER}:{})});
 try{for(const scenario of ['success','cancel','denied','uncertain','observer']){
  const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const server=await mockInsurance(page,{policies:[savedPolicy({policy_name:'Synthetic NT',policy_number:'NT',insurance_class:'Liability',currency:'AUD'},1)],
   canRemove:scenario!=='observer',records:[{link_id:8,record_id:28,record_code:'REC-000028',title:'Synthetic Vic',attachment_type:'Certificate of Currency',status:'Active',file_name:'vic.pdf'},
    {link_id:9,record_id:26,record_code:'REC-000026',title:'Keep',attachment_type:'Policy Schedule',status:'Active',file_name:'nt.pdf'}]});
  const deletes=[];
  await page.route('**/api/insurance/policies/*/record-links/*',route=>{
   assert.equal(route.request().method(),'DELETE');deletes.push(route.request().postDataJSON());
   if(scenario==='denied'||scenario==='uncertain')return route.fulfill({status:scenario==='denied'?403:503,json:{message:'Synthetic removal not confirmed'}});
   const id=Number(new URL(route.request().url()).pathname.split('/').pop());const record=server.records.find(r=>r.link_id===id);server.records=server.records.filter(r=>r.link_id!==id);
   return route.fulfill({json:{status:'success',removed_link_id:id,record_id:record.record_id,record_preserved:true}});
  });
  page.on('dialog',async dialog=>{if(scenario==='cancel')return dialog.dismiss();assert.match(dialog.message(),/Remove|Reason/);await dialog.accept(dialog.type()==='prompt'?'Wrong policy':undefined)});
  await page.goto('https://vero.test/insurance.html');await page.locator('#insuranceApiStatus[data-state=ready]').waitFor({state:'attached'});
  await page.getByRole('button',{name:'Current policies',exact:true}).click();
  const columns=await page.locator('#content thead th').count();
  await page.locator('#content tr[data-policy-index]').first().click();
  await page.locator('.insurance-file-card').first().waitFor();
  const remove=page.getByRole('button',{name:'Remove from this policy',exact:true});
  if(scenario==='observer')assert.equal(await remove.count(),0);
  else{
   await remove.first().click();
   if(scenario==='success'){
    await page.waitForFunction(()=>document.querySelectorAll('.insurance-file-card').length===1);
    assert.deepEqual(deletes[0],{record_id:28,record_code:'REC-000028',reason:'Wrong policy'});
    assert.equal(await page.locator('#content thead th').count(),columns);
    await remove.first().click();await page.getByText('No accessible files attached.',{exact:true}).waitFor();
    assert.equal(await page.locator('#content thead th').count(),columns);
   }else if(scenario==='cancel')assert.equal(deletes.length,0);
   else{await page.getByRole('alert').filter({hasText:'Removal not confirmed:'}).waitFor();assert.equal(await page.locator('.insurance-file-card').count(),2);assert.equal(deletes.length,1)}
  }
  assert.deepEqual(errors,[]);console.log('PASS unlink '+scenario);await context.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
