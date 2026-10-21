const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {mockInsurance,savedPolicy}=require('./insurance-mock.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.INSURANCE_BROWSER?{executablePath:process.env.INSURANCE_BROWSER}:{})});
 const record={record_id:9,record_code:'REC-9',title:'Policy',attachment_type:'Policy Schedule',status:'Active',file_name:'policy.pdf'};
 try{
  for(const scenario of ['none','single','certificate','multiple','superseded','nonpdf','denied']){
   const context=await browser.newContext(),page=await context.newPage();
   const records=scenario==='none'?[]:scenario==='multiple'?[record,{...record,record_id:10,record_code:'REC-10'}]:[{...record,...(scenario==='certificate'?{attachment_type:'Certificate of Currency'}:scenario==='superseded'?{status:'Superseded'}:scenario==='nonpdf'?{file_name:'policy.docx'}:{})}];
   const server=await mockInsurance(page,{policies:[savedPolicy({policy_name:'Synthetic',policy_number:'TEST',insurance_class:'Cyber',currency:'AUD'},1)],records,recordsMode:scenario==='denied'?'error':'ok'});
   let destination=null;await page.route('**/records.html?**',route=>{destination=route.request().url();return route.fulfill({contentType:'text/html',body:'Controlled Records destination'})});
   await page.goto('https://vero.test/insurance.html');await page.getByRole('link',{name:'View Policy',exact:true}).waitFor();
   assert.equal(await page.getByRole('button',{name:'Policy files',exact:true}).count(),0);
   await page.getByRole('link',{name:'View Policy',exact:true}).click();
   if(scenario==='single'||scenario==='certificate'){
    await page.waitForURL('**/records.html?record_id=9&preview=1');assert.match(destination,/record_id=9&preview=1$/);
   }else if(scenario==='multiple'){
    await page.getByText('Multiple active policy PDFs - choose:',{exact:false}).waitFor();
    assert.equal(destination,null);assert.equal(await page.locator('a[href="records.html?record_id=9&preview=1"]').count(),1);
    assert.equal(await page.locator('a[href="records.html?record_id=10&preview=1"]').count(),1);
   }else if(scenario==='denied'){
    await page.getByRole('link',{name:'Retry View Policy',exact:true}).waitFor();assert.equal(destination,null);
    server.recordsMode='ok';server.records=[];await page.getByRole('link',{name:'Retry View Policy',exact:true}).click();await page.getByText('Policy PDF unavailable',{exact:true}).waitFor();
   }else{await page.getByText('Policy PDF unavailable',{exact:true}).waitFor();assert.equal(destination,null)}
   assert.equal(server.posts.length,0);assert.equal((server.uploads||[]).length,0);
   console.log('PASS policy preview '+scenario);await context.close();
  }
  for(const scenario of ['allowed','restricted','disposed','preview denied','closed']){
   const context=await browser.newContext(),page=await context.newPage();let previewRequests=0,release;const gate=new Promise(r=>release=r);
   await mockInsurance(page);
   await page.route('**/api/records**',async route=>{
    const url=new URL(route.request().url());assert.equal(route.request().method(),'GET');
    if(url.pathname==='/api/records/9'&&scenario==='closed')await gate;
    if(url.pathname==='/api/records/9')return route.fulfill({json:{record:{id:9,record_code:'REC9',record_title:'Synthetic policy',file_name:'policy.pdf',storage_type:'Document',status:scenario==='disposed'?'Disposed':'Active'},restricted:scenario==='restricted'}});
    if(url.pathname==='/api/records/9/preview'){
     previewRequests++;assert.equal(route.request().headers().authorization,'Bearer synthetic');
     if(scenario==='preview denied')return route.fulfill({status:403,json:{message:'Content access denied'}});
     if(url.searchParams.get('page')!=='1')return route.fulfill({status:404,json:{message:'End'}});
     return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ1sAAAAASUVORK5CYII=','base64')});
    }
    return route.fulfill({json:{records:[],rules:[],history:[],groups:[],holds:[],dispositions:[],permissions:{can_manage:false}}});
   });
   await page.goto('https://vero.test/records.html?record_id=9&preview=1');
   if(scenario==='closed'){
    await page.getByText('Loading record...',{exact:true}).waitFor();await page.evaluate(()=>window.closeRecordDrawer());
    const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/records/9');release();await response;
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    assert.equal(await page.locator('#recordFullscreenViewer.open').count(),0);assert.equal(previewRequests,0);
   }else if(['allowed','preview denied'].includes(scenario)){
    await page.locator('#recordFullscreenViewer.open').waitFor();
    if(scenario==='allowed')await page.locator('#recordViewerPages img').waitFor();
    else await page.getByText('Content access denied',{exact:true}).waitFor();
    assert.ok(previewRequests>0);
   }else{
    await page.locator('#drawerRecordTitle').filter({hasText:scenario==='restricted'?'Confidential Record':'Synthetic policy'}).waitFor();
    assert.equal(await page.locator('#recordFullscreenViewer.open').count(),0);assert.equal(previewRequests,0);
   }
   console.log('PASS actual Records container '+scenario);await context.close();
  }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
