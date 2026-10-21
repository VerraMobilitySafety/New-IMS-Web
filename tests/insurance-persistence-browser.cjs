const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {mockInsurance,savedPolicy}=require('./insurance-mock.cjs');
const fields={name:'Synthetic policy',number:'TEST-001',class:'Liability',insurer:'Example insurer',
 broker:'Example broker',entity:'Example entity',country:'AU',inception:'2026-01-01',
 expiry:'2027-01-01',limit:'1000000',excess:'0',premium:'1234.56',currency:'AUD'};
const payload={policy_name:fields.name,policy_number:fields.number,insurance_class:fields.class,
 insurer_name:fields.insurer,broker_name:fields.broker,insured_entity_name:fields.entity,
 currency:'AUD',inception_date:fields.inception,expiry_date:fields.expiry,policy_scope:'Local',
 country_code:'AU',status:'Draft',coverage_limit:'1000000',deductible_amount:'0',annual_premium:'1234.56'};
async function fill(page){
 await page.getByRole('button',{name:'+ Register Policy',exact:true}).click();
 assert.equal(await page.locator('#insuranceJurisdictions option').getAttribute('value'),'AU');
 assert.equal(await page.locator('#insuranceJurisdictions option').getAttribute('label'),'Australia');
 for(const [key,value] of Object.entries(fields)){if(key==='class'){await page.locator('#fclass').selectOption({label:'Other (specify)'});await page.getByLabel('Other insurance type',{exact:true}).fill(value)}else await page.locator('#f'+key).fill(value);}
 assert.equal(await page.locator('#fstatus').inputValue(),'Draft');
 assert.equal(await page.locator('#fstatus').getAttribute('readonly'),'');
}
async function ready(page){
 await page.locator('#insuranceApiStatus[data-state=ready]').waitFor({state:'attached'});
}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.INSURANCE_BROWSER?{executablePath:process.env.INSURANCE_BROWSER}:{})});
 const check=async(name,options,run)=>{
  const context=await browser.newContext(),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const server=await mockInsurance(page,options);
  try{await page.goto('https://vero.test/insurance.html');await run(page,server);
   assert.deepEqual(errors,[]);console.log('PASS '+name)}
  finally{await context.close()}
 };
 try{
  await check('empty register offers common Insurance types and Other',{},async(page,server)=>{
   await ready(page);await page.getByRole('button',{name:'+ Register Policy',exact:true}).click();
   const values=await page.locator('#fclass option').allTextContents();
   for(const name of ['Public Liability','Professional Indemnity','Property','Motor','Workers Compensation','Management Liability','Cyber','Business Travel','Other (specify)'])assert.ok(values.includes(name),name);
   assert.equal(values.length,10); // Placeholder, eight conveniences, Other.
   await page.getByLabel('Insurance type',{exact:true}).selectOption('Cyber');
   assert.equal(await page.getByLabel('Other insurance type',{exact:true}).isVisible(),false);
   assert.equal(server.posts.length,0);
  });
  await check('Insurance type preserves custom stored values and Other validation',{policies:[savedPolicy({...payload,insurance_class:'Special custom cover'},81)]},async(page,server)=>{
   await ready(page);await fill(page);
   const dropdown=page.getByLabel('Insurance type',{exact:true});
   await dropdown.selectOption('Special custom cover');
   assert.equal(await page.getByLabel('Other insurance type',{exact:true}).isVisible(),false);
   await dropdown.selectOption({label:'Other (specify)'});await page.getByLabel('Other insurance type',{exact:true}).fill('   ');
   await page.getByRole('button',{name:'Save Draft',exact:true}).click();
   assert.equal(server.posts.length,0);
   await dropdown.selectOption('Special custom cover');
   await page.getByRole('button',{name:'Save Draft',exact:true}).click();await page.locator('#modal.open').waitFor({state:'hidden'});
   assert.equal(server.posts[0].insurance_class,'Special custom cover');
   assert.equal(server.posts[0].status,'Draft');
  });
  await check('current policy list preserves upstream layout and search',{policies:[savedPolicy(payload,81)]},async page=>{
   await ready(page);assert.equal(await page.locator('#insuranceApiStatus').isVisible(),false);
   assert.equal(await page.locator('#insuranceRefresh').isVisible(),false);
   assert.equal(await page.locator('#content .tile').count(),0);
   await page.getByLabel('Search insurance register').fill('Example broker');
   await page.locator('#content tbody tr').click();assert.match(await page.locator('#policyDetails').innerText(),/Synthetic policy/);
   await page.keyboard.press('Escape');await page.getByLabel('Search insurance register').fill('no-match');
   assert.equal(await page.locator('#content tbody tr').count(),0);
   await page.getByLabel('Insurance view',{exact:true}).selectOption('Documents',{force:true});await page.getByText('No accessible files attached.',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Current policies',exact:true}).click();
  });
  await check('Leadership and Finance view financial details without mutation controls',{
   financialAccess:true,financialWriteAccess:false,readOnly:true,policies:[savedPolicy(payload,81)]
  },async(page,server)=>{
   await ready(page);
   assert.equal(await page.getByRole('button',{name:'+ Register Policy',exact:true}).count(),0);
   await page.getByLabel('Insurance view',{exact:true}).selectOption('Policies',{force:true});
   assert.equal(await page.locator('#insurancePolicyWorkflow').count(),0);
   await page.locator('#content tbody tr').first().click();
   assert.match(await page.locator('#policyDetails').innerText(),/1234.56/);
   await page.keyboard.press('Escape');await page.evaluate(()=>openForm('policies'));
   assert.equal(await page.locator('#modal.open').count(),0);
   assert.deepEqual(server.posts,[]);assert.deepEqual(server.decisions,[]);
  });
  await check('Administrator financial access alone does not expose link controls',{
   office:true,financialAccess:true,linkingAccess:false,policies:[savedPolicy(payload,81)]
  },async page=>{
   await ready(page);await fill(page);
   assert.equal(await page.locator('#fparent_policy_id').count(),0);
   assert.equal(await page.locator('[name="programme_id"]').count(),0);
  });
  await check('Office plus observer retains nonfinancial form without writable financial fields on refresh',{
   office:true,financialAccess:true,financialWriteAccess:false,readOnly:false
  },async(page,server)=>{
   await ready(page);await page.getByRole('button',{name:'+ Register Policy',exact:true}).click();
   assert.equal(await page.locator('#fpremium').isDisabled(),true);
   await page.evaluate(()=>document.querySelector('#insuranceRefresh').click());await ready(page);
   assert.equal(await page.locator('#fpremium').isDisabled(),true);
   assert.equal(await page.locator('#fpremium').isVisible(),false);
   assert.deepEqual(server.posts,[]);
  });
  await check('manager links only a loaded visible parent during creation',{
   linkingAccess:true,policies:[savedPolicy(payload,81)]
  },async(page,server)=>{
   await ready(page);await fill(page);
   assert.deepEqual(await page.locator('#fparent_policy_id option').evaluateAll(options=>options.map(o=>o.value)),['','81']);
   assert.equal(await page.locator('[name="programme_id"]').count(),0);
   await page.locator('#fparent_policy_id').selectOption('81');
   await page.getByRole('button',{name:'Save Draft',exact:true}).click();
   await page.locator('#modal.open').waitFor({state:'hidden'});await ready(page);
   assert.deepEqual(server.posts,[{...payload,parent_policy_id:81}]);
   await page.reload();await ready(page);
   await page.getByLabel('Insurance view',{exact:true}).selectOption('Policies',{force:true});
   await page.locator('#content tbody tr').first().click();
   assert.equal(await page.locator('#policyDetails dt').last().innerText(),'Parent policy');
   assert.equal(await page.locator('#policyDetails dd').last().innerText(),'TEST-001 - Synthetic policy');
   await page.keyboard.press('Escape');server.policies=server.policies.filter(p=>p.id!==81);
   await page.reload();await ready(page);
   await page.getByLabel('Insurance view',{exact:true}).selectOption('Policies',{force:true});
   await page.locator('#content tbody tr').click();
   assert.equal(await page.locator('#policyDetails dd').last().innerText(),'Linked policy (not in the loaded register)');
  });
  for(const failure of ['membership removed','target unavailable']){
   await check('link save fails safely when '+failure,{
    linkingAccess:true,policies:[savedPolicy(payload,81)]
   },async(page,server)=>{
    await ready(page);await fill(page);await page.locator('#fparent_policy_id').selectOption('81');
    if(failure==='membership removed')server.linkingAccess=false;else server.policies=[];
    await page.getByRole('button',{name:'Save Draft',exact:true}).click();
    await page.locator('#insuranceFormStatus').filter({hasText:'Save could not be confirmed'}).waitFor();
    assert.equal(await page.locator('#modal.open').count(),1);
    assert.equal(await page.locator('#fname').inputValue(),fields.name);
    assert.equal(server.posts.length,1);
    assert.equal(server.policies.length,failure==='membership removed'?1:0);
   });
  }
  await check('restricted financial list/detail/summary and non-financial create',{
   financialAccess:false,office:true,policies:[savedPolicy({...payload,annual_premium:'987654.32'},1)]
  },async(page,server)=>{
   await ready(page);
   assert.equal(await page.locator('#premium').innerText(),'Restricted');
   assert.equal(await page.evaluate(()=>Object.hasOwn(data.policies[0],'premium')),false);
   await page.getByLabel('Insurance view',{exact:true}).selectOption('Policies',{force:true});
   await page.locator('#content tbody tr').click();
   const details=await page.locator('#policyDetails').innerText();
   for(const value of ['Annual Premium','Coverage Limit','Deductible / Excess','987654.32','1000000'])assert.ok(!details.includes(value));
   assert.ok(details.includes('Example entity'));
   await page.keyboard.press('Escape');
   await page.getByRole('button',{name:'+ Register Policy',exact:true}).click();
   for(const [key,value] of Object.entries(fields)){
    if(['limit','excess','premium'].includes(key)){assert.equal(await page.locator('#f'+key).count(),0);continue}
    {if(key==='class'){await page.locator('#fclass').selectOption({label:'Other (specify)'});await page.getByLabel('Other insurance type',{exact:true}).fill(value)}else await page.locator('#f'+key).fill(value);}
   }
   await page.getByRole('button',{name:'Save Draft',exact:true}).click();
   await page.locator('#modal.open').waitFor({state:'hidden'});await ready(page);
   assert.equal(server.posts.length,1);
   for(const key of ['annual_premium','coverage_limit','deductible_amount','coverages'])assert.equal(Object.hasOwn(server.posts[0],key),false);
   assert.equal(await page.locator('#premium').innerText(),'Restricted');
  });
  await check('financial access removal clears loaded detail and derived totals',{
   policies:[savedPolicy(payload,1)]
  },async(page,server)=>{
   await ready(page);await page.getByLabel('Insurance view',{exact:true}).selectOption('Policies',{force:true});
   await page.locator('#content tbody tr').click();
   assert.match(await page.locator('#policyDetails').innerText(),/1234.56/);
   server.financialAccess=false;
   await page.evaluate(()=>document.querySelector('#insuranceRefresh').click());
   await ready(page);
   assert.equal(await page.locator('#modal.open').count(),0);
   assert.equal(await page.locator('#premium').innerText(),'Restricted');
   assert.equal(await page.evaluate(()=>Object.hasOwn(data.policies[0],'premium')),false);
   assert.ok(!(await page.locator('#policyDetails').innerText()).includes('1234.56'));
  });
  await check('premium totals preserve large amounts, cents, zero and separate currencies',{
   policies:[
    savedPolicy({...payload,annual_premium:'999999999999999999.99'},1),
    savedPolicy({...payload,annual_premium:'0.01'},2),
    savedPolicy({...payload,currency:'USD',annual_premium:'0.10'},3),
    savedPolicy({...payload,currency:'USD',annual_premium:'0.20'},4),
    savedPolicy({...payload,currency:'NZD',annual_premium:'0.00'},5)
   ]
  },async page=>{
   await ready(page);
   assert.equal(await page.locator('#premium').innerText(),
    'AUD 1,000,000,000,000,000,000.00 / USD 0.30 / NZD 0.00');
   assert.equal(await page.evaluate(()=>insurancePremiumTotal([{currency:'AUD',premium:null}])),'—');
   assert.equal(await page.evaluate(()=>insurancePremiumTotal([{currency:'AUD',premium:'invalid'}])),'Unavailable');
  });
  let release;
  await check('loading, empty, error, retry and malformed list states',{getGate:new Promise(r=>release=r)},async(page,server)=>{
   await page.getByLabel('Insurance view',{exact:true}).selectOption('Policies',{force:true});
   assert.match(await page.locator('#content').innerText(),/Loading policies/);
   assert.equal(await page.locator('#active').innerText(),'—');
   await page.getByRole('button',{name:'+ Register Policy',exact:true}).click();
   assert.equal(await page.locator('#modal.open').count(),0,'do not build incomplete financial form before access resolves');
   release();server.getGate=null;await ready(page);
   await fill(page);
   for(const name of ['limit','excess','premium'])assert.equal(await page.locator('#f'+name).isVisible(),true);
   await page.keyboard.press('Escape');
   assert.match(await page.locator('#content').innerText(),/No records found/);
   assert.equal(await page.locator('#active').innerText(),'0');
   server.getMode='error';await page.evaluate(()=>document.getElementById('insuranceRefresh').click());
   await page.locator('#insuranceApiStatus').filter({hasText:'Synthetic unavailable'}).waitFor();
   assert.match(await page.locator('#content').innerText(),/could not be loaded/);
   assert.equal(await page.locator('#active').innerText(),'—');
   server.getMode='malformed';await page.getByRole('button',{name:'Retry loading policies',exact:true}).click();
   await page.locator('#insuranceApiStatus').filter({hasText:'Invalid policy list'}).waitFor();
   server.getMode='ok';await page.getByRole('button',{name:'Retry loading policies',exact:true}).click();await ready(page);
  });
  await check('complete save payload, single POST, reload round trip and single workflow',{},async(page,server)=>{
   await ready(page);await fill(page);
   let finish;server.postGate=new Promise(r=>finish=r);
   await page.getByRole('button',{name:'Save Draft',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('#form [type="submit"]').disabled);
   await page.evaluate(()=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))});
   assert.equal(await page.locator('#modal.open').count(),1);
   finish();await page.locator('#modal.open').waitFor({state:'hidden'});
   await ready(page);assert.deepEqual(server.posts,[payload]);
   assert.equal(await page.locator('#content tbody tr').count(),1);
   assert.equal(await page.locator('#insurancePolicyWorkflow').count(),0);
   await page.locator('#content tbody tr').click();
   const details=await page.locator('#policyDetails').innerText();
   for(const value of ['Example entity','1000000','1234.56','Draft'])assert.ok(details.includes(value));
   const excess=await page.locator('#policyDetails dd').nth(10).innerText();assert.equal(excess,'0');
   await page.keyboard.press('Escape');
   await page.reload();await ready(page);
   await page.getByLabel('Insurance view',{exact:true}).selectOption('Policies',{force:true});
   assert.equal(await page.locator('#content tbody tr').count(),1);
   assert.equal(await page.locator('#insurancePolicyWorkflow').count(),0);
   assert.equal(await page.getByRole('button',{name:'Submit',exact:true}).count(),0);
  });
  for(const mode of ['error','network','malformed']){
   await check('failed '+mode+' save never adds an in-memory row',{postMode:mode},async(page,server)=>{
    await ready(page);await fill(page);await page.getByRole('button',{name:'Save Draft',exact:true}).click();
    await page.locator('#insuranceFormStatus').filter({hasText:'Save could not be confirmed'}).waitFor();
    assert.equal(await page.locator('#modal.open').count(),1);
    assert.equal(await page.locator('#fname').inputValue(),fields.name);
    assert.equal(await page.evaluate(()=>data.policies.length),0);
    assert.equal(server.policies.length,0);assert.deepEqual(server.posts,[payload]);
   });
  }
  await check('successful save followed by failed reload is not reported as failed save',{failReload:true},async(page,server)=>{
   await ready(page);await fill(page);await page.getByRole('button',{name:'Save Draft',exact:true}).click();
   await page.locator('#insuranceApiStatus').filter({hasText:'Policy saved. Policies could not be loaded'}).waitFor();
   assert.equal(await page.locator('#modal.open').count(),0);
   assert.equal(server.policies.length,1);assert.equal(await page.evaluate(()=>data.policies.length),0);
   assert.match(await page.locator('#content').innerText(),/could not be loaded/);
  });
  await check('missing adapter cannot fall back to prototype policy save',{noAdapter:true},async(page,server)=>{
   await page.getByRole('button',{name:'+ Register Policy',exact:true}).click();
   assert.equal(await page.locator('#form [type="submit"]').isDisabled(),true);
   await page.evaluate(()=>document.querySelector('#form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
   assert.equal(await page.evaluate(()=>data.policies.length),0);
   assert.match(await page.locator('#insuranceFormStatus').innerText(),/Nothing was saved/);
   assert.deepEqual(server.posts,[]);
  });
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
