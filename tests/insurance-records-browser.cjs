const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {mockInsurance,savedPolicy}=require('./insurance-mock.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.INSURANCE_BROWSER?{executablePath:process.env.INSURANCE_BROWSER}:{})});
 async function check(name,options,test){
  const context=await browser.newContext(),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const server=await mockInsurance(page,{policies:[savedPolicy({policy_name:'Synthetic',policy_number:'TEST',insurance_class:'Liability',currency:'AUD'},1)],...options});
  try{await page.goto('https://vero.test/insurance.html');await page.locator('#insuranceApiStatus[data-state=ready]').waitFor({state:'attached'});
   await page.getByRole('button',{name:'Policy files',exact:true}).click();await test(page,server);assert.deepEqual(errors,[]);console.log('PASS '+name);
  }finally{await context.close()}
 }
 try{
  await check('observer empty files has no upload',{readOnly:true},async page=>{
   await page.getByText('No accessible files attached.',{exact:true}).waitFor();assert.equal(await page.locator('#insuranceUpload').count(),0);
  });
  await check('failed list exposes retry only',{recordsMode:'error'},async(page,server)=>{
   await page.getByRole('button',{name:'Retry files',exact:true}).waitFor();assert.equal(await page.locator('#insuranceUpload').count(),0);
   server.recordsMode='ok';await page.getByRole('button',{name:'Retry files',exact:true}).click();await page.getByText('No accessible files attached.',{exact:true}).waitFor();
  });
  let release;const gate=new Promise(r=>release=r);
  await check('confirmed invalid file can be corrected',{canUpload:true,uploadMode:'invalid'},async(page,server)=>{
   await page.getByLabel('File title',{exact:true}).fill('Synthetic attachment');
   await page.getByLabel('PDF file',{exact:true}).setInputFiles({name:'bad.pdf',mimeType:'application/pdf',buffer:Buffer.from('invalid')});
   await page.getByRole('button',{name:'Save file as Record',exact:true}).click();
   await page.locator('#insuranceUpload [role=status]').filter({hasText:'File rejected:'}).waitFor();
   assert.equal(await page.getByLabel('PDF file',{exact:true}).isDisabled(),false);
   assert.equal(await page.getByLabel('File title',{exact:true}).isDisabled(),false);
  });
  await check('loading files grants no controls',{recordsGate:gate},async page=>{
   await page.getByText('Loading policy files.',{exact:true}).waitFor();assert.equal(await page.locator('#insuranceUpload').count(),0);release();
   await page.getByText('No accessible files attached.',{exact:true}).waitFor();
  });
  await check('uncertain save retains exact request and opens controlled record',{canUpload:true,uploadMode:'error'},async(page,server)=>{
   await page.getByLabel('File title',{exact:true}).fill('Synthetic attachment');
   await page.getByLabel('PDF file',{exact:true}).setInputFiles({name:'synthetic.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 synthetic')});
   await page.getByRole('button',{name:'Save file as Record',exact:true}).click();
   await page.getByRole('button',{name:'Retry same upload',exact:true}).waitFor();
   assert.equal(await page.locator('a[href="records.html?record_id=9"]').count(),0);
   assert.match(await page.locator('#insuranceUpload [role=status]').innerText(),/Save not confirmed/);
   await page.getByRole('button',{name:'Current policies',exact:true}).click();
   await page.getByRole('button',{name:'Policy files',exact:true}).click();
   await page.getByRole('button',{name:'Retry same upload',exact:true}).waitFor();
   server.uploadMode='ok';await page.getByRole('button',{name:'Retry same upload',exact:true}).click();
   await page.locator('a[href="records.html?record_id=9"]').waitFor();
   const id=body=>body.match(/name="request_id"\r\n\r\n([^\r]+)/)[1];
   assert.equal(id(server.uploads[0]),id(server.uploads[1]));assert.match(server.uploads[0],/Synthetic attachment/);
   assert.match(await page.locator('#content').innerText(),/Retention pending/);
  });

  for(const scenario of ['success','policy failure','upload retry','cancel before','cancel after','revoked','correct rejected','active retry']){
   const context=await browser.newContext(),page=await context.newPage();
   const server=await mockInsurance(page,{canUpload:true,canRegisterActive:scenario==='active retry',postMode:scenario==='policy failure'?'error':'ok',uploadMode:scenario==='correct rejected'?'invalid':['upload retry','cancel after','active retry'].includes(scenario)?'error':'ok'});
   try{
    await page.goto('https://vero.test/insurance.html');await page.locator('#insuranceApiStatus[data-state=ready]').waitFor({state:'attached'});
    if(scenario==='success')await page.evaluate(()=>{tab='Policies';insuranceView='active';render()});
    await page.getByRole('button',{name:'+ Register Policy',exact:true}).click();
    for(const [key,value] of Object.entries({name:'Combined policy',number:'COMBINED',class:'Liability',insurer:'Example',inception:'2026-01-01',expiry:'2027-01-01'})){if(key==='class'){await page.locator('#fclass').selectOption({label:'Other (specify)'});await page.getByLabel('Other insurance type',{exact:true}).fill(value)}else await page.locator('#f'+key).fill(value);}
    await page.getByLabel('Policy PDF (optional)',{exact:true}).setInputFiles({name:'policy.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 synthetic')});
    if(scenario==='active retry'){
     await page.locator('#fstatus').selectOption('Active');
     await page.getByLabel('I confirm this policy is already purchased and currently in force.',{exact:true}).check();
     await page.locator('#finception').fill('2000-01-01');await page.locator('#fexpiry').fill('2099-01-01');
    }
    if(scenario==='cancel before'){
     await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(server.posts.length,0);assert.equal((server.uploads||[]).length,0);
    }else{
     if(scenario==='revoked')server.canUpload=false;
     await page.getByRole('button',{name:scenario==='active retry'?'Register Active policy':'Save Draft',exact:true}).click();
     if(scenario==='success'){
      await page.locator('#modal').waitFor({state:'hidden'});assert.equal(server.posts.length,1);assert.equal(server.uploads.length,1);await page.locator('#content tbody tr').waitFor();assert.equal(await page.evaluate(()=>insuranceView),'all');
     }else if(scenario==='policy failure'){
      await page.locator('#insuranceFormStatus').filter({hasText:'Save could not be confirmed'}).waitFor();assert.equal((server.uploads||[]).length,0);assert.equal(await page.locator('#registrationPdf').isDisabled(),false);
     }else{
      await page.getByRole('button',{name:'Retry attachment',exact:true}).waitFor();
      assert.match(await page.locator('#insuranceFormStatus').innerText(),/Policy 1 is saved/);assert.equal(server.posts.length,1);
      if(scenario==='revoked'){assert.equal((server.uploads||[]).length,0)}else{
       server.uploadMode='ok';
       if(scenario==='correct rejected')await page.getByLabel('Policy PDF (optional)',{exact:true}).setInputFiles({name:'corrected.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 corrected')});
       if(scenario==='cancel after'){
        await page.getByRole('button',{name:'Cancel',exact:true}).click();
        await page.getByRole('button',{name:'Retry same upload',exact:true}).click();
        await page.locator('a[href="records.html?record_id=9"]').waitFor();
       }else{
        await page.getByRole('button',{name:'Retry attachment',exact:true}).click();await page.locator('#modal').waitFor({state:'hidden'});
       }
       assert.equal(server.posts.length,1);assert.equal(server.uploads.length,2);if(scenario==='active retry'){assert.equal(server.posts[0].status,'Active');assert.equal(server.posts[0].purchased_in_force,true)}
       const id=body=>body.match(/name="request_id"\r\n\r\n([^\r]+)/)[1];if(scenario==='correct rejected')assert.notEqual(id(server.uploads[0]),id(server.uploads[1]));else assert.equal(id(server.uploads[0]),id(server.uploads[1]));
      }
     }
    }
    console.log('PASS combined registration '+scenario);
   }finally{await context.close()}
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
