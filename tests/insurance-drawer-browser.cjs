const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {mockInsurance,savedPolicy}=require('./insurance-mock.cjs');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.INSURANCE_BROWSER?{executablePath:process.env.INSURANCE_BROWSER}:{})});try{
for(const width of [1440,1024,768,390])for(const role of ['manager','observer']){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const policy=savedPolicy({policy_name:'Synthetic public liability policy',policy_number:'SYNTHETIC-001',insurance_class:'Public Liability',insurer_name:'Example insurer',broker_name:'Example broker',insured_entity_name:'Example business',currency:'AUD',country_code:'AU',inception_date:'2026-01-01',expiry_date:'2027-01-01',status:'Active',annual_premium:'1250.00',coverage_limit:'20000000.00',deductible_amount:'1000.00'},1);
 const server=await mockInsurance(page,{policies:[policy],canEdit:role==='manager',canUpload:role==='manager',readOnly:role==='observer',records:[{record_id:900,record_code:'REC-SYNTHETIC',title:'Certificate of Currency - synthetic fixture',attachment_type:'Certificate of Currency',status:'Active',file_name:'synthetic.pdf',retention_pending:true}]});
 await page.goto('https://vero.test/insurance.html');const row=page.locator('tr[data-policy-index]').first();await row.focus();await page.keyboard.press('Enter');await page.locator('#policyDetails a[href="records.html?record_id=900"]').waitFor();
 const box=await page.locator('.dialog').boundingBox();assert.ok(Math.abs(box.x+box.width-width)<1);assert.equal(box.y,0);assert.equal(box.height,900);assert.ok(box.width<=690||width<500);
 assert.equal(await page.getByRole('button',{name:'Close',exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'Edit policy',exact:true}).count(),role==='manager'?1:0);
 assert.equal(await page.locator('#insuranceUpload').count(),role==='manager'?1:0);
 assert.match(await page.locator('#modal').evaluate(e=>getComputedStyle(e).fontFamily),/Montserrat/);
 await page.evaluate(()=>modalFocusables().at(-1).focus());await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement===modalFocusables()[0]),true);
 await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement===modalFocusables().at(-1)),true);
 await page.locator('.insurance-drawer-body').evaluate(e=>e.scrollTop=e.scrollHeight);
 const close=await page.getByRole('button',{name:'Close',exact:true}).boundingBox();assert.ok(close.y>=0&&close.y<100);
 assert.equal(await page.locator('.insurance-drawer-body').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
 await page.locator('.insurance-drawer-body').evaluate(e=>e.scrollTop=0);
 const out=path.resolve(__dirname,'../../preview');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,`insurance-drawer-${role}-${width}.png`)});
 if(role==='manager'){
  await page.getByRole('button',{name:'Edit policy',exact:true}).click();await page.getByRole('button',{name:'Save policy changes',exact:true}).waitFor();
  assert.equal(await page.locator('#fname').inputValue(),policy.policy_name);await page.locator('#fname').fill('Unsaved local change');
  await page.screenshot({path:path.join(out,`insurance-drawer-edit-${width}.png`)});
  await page.keyboard.press('Escape');assert.equal((server.edits||[]).length,0);assert.equal(server.posts.length,0);assert.equal((server.uploads||[]).length,0);
 }else await page.keyboard.press('Escape');
 assert.equal(await page.locator('#modal').evaluate(e=>e.classList.contains('open')),false);assert.equal(await row.evaluate(e=>e===document.activeElement),true);assert.deepEqual(errors,[]);
 console.log(`PASS drawer ${role} ${width}: right alignment, scroll, focus, Escape, permissions and no saves`);await context.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
