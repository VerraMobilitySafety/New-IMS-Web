/* Fresh headless test profile; every URL intercepted, no real service or account. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const script=fs.readFileSync(path.join(__dirname,'../compliance-correction.js'),'utf8');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.INSURANCE_BROWSER?{executablePath:process.env.INSURANCE_BROWSER}:{})});
 try{for(const width of [1440,390]){
  const ctx=await browser.newContext({viewport:{width,height:1000}}),page=await ctx.newPage(),errors=[],writes=[];
  let fail=true,revision=7;
  const item={id:2,proposed_title:'Synthetic requirement',proposed_description:'Original text',proposed_source_name:'Internal',proposed_source_reference:'REF-1',proposed_frequency:'Annual',proposed_evidence_required:'Report'};
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.origin!=='https://vero.test')return route.abort();
   if(url.pathname==='/compliance-correction.js')return route.fulfill({contentType:'application/javascript',body:script});
   if(url.pathname==='/compliance.html')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width"><script>const COMPLIANCE_API="https://vero.test/api";function complianceAuthHeaders(){return {Authorization:"Bearer synthetic"}}</script><script src="compliance-correction.js"></script>'});
   if(url.pathname==='/api/compliance/requests/1/correction'){
    if(req.method()==='GET')return route.fulfill({json:{request:{id:1,request_code:'CR-1',controller_notes:'Clarify the evidence',revision,status:'Returned'},item}});
    const body=req.postDataJSON();writes.push(body);
    if(fail){fail=false;return route.fulfill({status:500,json:{message:'Synthetic temporary failure'}});}
    Object.assign(item,body.item);revision++;
    return route.fulfill({json:{request:{id:1,request_code:'CR-1',revision,status:body.operation==='resubmit'?'Pending Controller Review':'Returned'}}});
   }
   return route.abort();
  });
  await page.goto('https://vero.test/compliance.html?correct=1');
  const reference=page.getByLabel('Source reference',{exact:true});
  assert.equal(await reference.getAttribute('maxlength'),'255');
  await reference.fill('x'.repeat(255));
  await page.getByLabel('Requirement title',{exact:true}).fill('Corrected requirement');
  await page.getByRole('button',{name:'Save correction draft'}).click();
  await page.getByRole('status').filter({hasText:'Synthetic temporary failure'}).waitFor();
  await page.getByRole('button',{name:'Save correction draft'}).click();
  await page.getByRole('status').filter({hasText:'Correction draft saved'}).waitFor();
  assert.equal(writes[0].operation_id,writes[1].operation_id);assert.equal(writes[1].expected_revision,7);
  assert.equal(writes[1].item.proposed_source_reference.length,255);
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.reload();await page.getByLabel('Requirement title',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('Requirement title',{exact:true}).inputValue(),'Corrected requirement');
  await page.getByLabel('Evidence required',{exact:true}).fill('Corrected evidence');
  await page.getByRole('button',{name:'Resubmit to controller'}).click();
  await page.getByRole('status').filter({hasText:'Resubmitted to the controller'}).waitFor();
  assert.equal(writes[2].expected_revision,8);assert.equal(writes[2].operation,'resubmit');
  assert.deepEqual(Object.keys(writes[2].item).sort(),Object.keys(item).filter(x=>x!=='id').sort());
  assert.equal(await page.getByRole('button',{name:'Resubmit to controller'}).isVisible(),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);console.log('PASS correction draft/retry/resume/resubmit '+width+'px; all network intercepted');await ctx.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
