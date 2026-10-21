const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {mockInsurance,savedPolicy}=require('./insurance-mock.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.INSURANCE_BROWSER?{executablePath:process.env.INSURANCE_BROWSER}:{})});
 async function check(name,options,test){
  const context=await browser.newContext(),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const server=await mockInsurance(page,{policies:[savedPolicy({policy_name:'Synthetic',policy_number:'TEST',insurance_class:'Liability',currency:'AUD'},1)],...options});
  try{await page.goto('https://vero.test/insurance.html');await page.locator('#insuranceApiStatus[data-state=ready]').waitFor({state:'attached'});
   await page.getByLabel('Insurance view',{exact:true}).selectOption('Documents');await test(page,server);assert.deepEqual(errors,[]);console.log('PASS '+name);
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
   await page.getByLabel('Insurance view',{exact:true}).selectOption('Overview');
   await page.getByLabel('Insurance view',{exact:true}).selectOption('Documents');
   await page.getByRole('button',{name:'Retry same upload',exact:true}).waitFor();
   server.uploadMode='ok';await page.getByRole('button',{name:'Retry same upload',exact:true}).click();
   await page.locator('a[href="records.html?record_id=9"]').waitFor();
   const id=body=>body.match(/name="request_id"\r\n\r\n([^\r]+)/)[1];
   assert.equal(id(server.uploads[0]),id(server.uploads[1]));assert.match(server.uploads[0],/Synthetic attachment/);
   assert.match(await page.locator('#content').innerText(),/Retention pending/);
  });
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
