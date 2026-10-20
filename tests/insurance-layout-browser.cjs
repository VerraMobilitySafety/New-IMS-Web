// Synthetic local preview; all external requests intercepted, no live records.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../preview');
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.INSURANCE_BROWSER?{executablePath:process.env.INSURANCE_BROWSER}:{})});
 try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1100}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('vero_session_token','synthetic'));
  await page.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.pathname.endsWith('/auth/me'))return route.fulfill({json:{user:{first_name:'Preview',last_name:'User',vero_role:'User'}}});
   if(u.hostname!=='vero.test')return route.abort();
   const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   return route.fulfill({body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream'});
  });
  await page.goto('https://vero.test/insurance.html');
  await page.evaluate(()=>window.VeroPageLoader?.ready('account'));
  if(width<750){
   await page.getByRole('button',{name:'Menu',exact:true}).click();
   assert.equal(await page.locator('#insuranceSidebar').isVisible(),true);
   await page.getByRole('button',{name:'Menu',exact:true}).click();
   assert.equal(await page.locator('#insuranceSidebar').isVisible(),false);
  }
  await page.getByRole('button',{name:'Policies',exact:true}).click();
  const add=async(number,status,expiry)=>{
   await page.getByRole('button',{name:'+ Register Policy',exact:true}).click();
   await page.getByLabel('Policy Name',{exact:true}).fill('Synthetic '+number);
   await page.getByLabel('Policy Number',{exact:true}).fill(number);
   await page.getByLabel('Status',{exact:true}).fill(status);
   await page.getByLabel('Expiry Date',{exact:true}).fill(expiry);
   await page.getByRole('button',{name:'Add to Prototype'}).click();
  };
  const due=new Date();due.setDate(due.getDate()+30);
  await add('TEST-001','Active',due.toISOString().slice(0,10));
  await add('TEST-002','Expired','2020-01-01');
  assert.equal(await page.locator('#content tbody tr').count(),2);
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
  await page.screenshot({path:path.join(out,`insurance-${width}.png`),fullPage:true});
  const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
  assert.ok(fits,'page does not overflow horizontally');
  await page.locator('#insuranceMore summary').click();
  await page.getByRole('button',{name:'+ Register Claim',exact:true}).click();
  assert.equal(await page.locator('#modal.open').count(),1);
  await page.getByLabel('Claim Reference').fill('CLAIM-TEST');
  await page.getByLabel('Policy Number',{exact:true}).fill('TEST-001');
  await page.getByRole('button',{name:'Add to Prototype'}).click();
  await page.getByRole('button',{name:'Claims',exact:true}).click();
  assert.equal(await page.locator('#content tbody tr').count(),1);
  assert.equal(await page.locator('#insuranceViews').isVisible(),false);
  await page.locator('#insuranceMore summary').click();
  await page.getByRole('button',{name:'+ Plan Renewal',exact:true}).click();
  await page.getByLabel('Policy Number',{exact:true}).fill('TEST-001');
  await page.getByLabel('Stage',{exact:true}).fill('Quotation');
  await page.getByRole('button',{name:'Add to Prototype'}).click();
  await page.getByRole('button',{name:'Renewals',exact:true}).click();
  await page.getByLabel('Filter by stage').selectOption('Quotation');
  assert.equal(await page.locator('#content tbody tr').count(),1);
  for(const section of ['Overview','Documents','Analytics']){
   await page.getByRole('button',{name:section,exact:true}).click();
   assert.equal(await page.locator('#insuranceToolbar').isVisible(),false);
   assert.ok((await page.locator('#content').innerText()).length>20);
  }
  await page.getByRole('button',{name:'Overview',exact:true}).click();
  assert.equal(await page.locator('.kpi').count(),4);
  assert.ok((await page.locator('main').innerText()).includes('Prototype only'));
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: policy create/search/combined filters, claims/renewals, sections, disclaimer, no page overflow or script errors`);
  await context.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
