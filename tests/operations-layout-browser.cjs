const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../preview');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.INSURANCE_BROWSER?{executablePath:process.env.INSURANCE_BROWSER}:{})});try{
for(const width of [1440,390])for(const file of ['maintenance-management.html','sites.html','users.html','my-actions.html','client-services-sites.html']){
 const context=await browser.newContext({viewport:{width,height:1100}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let admin=true;
 await page.addInitScript(()=>localStorage.setItem('vero_session_token','synthetic'));
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.hostname!=='vero.test'){
   if(!u.pathname.startsWith('/api/'))return route.abort();
   const p=u.pathname.replace('/api','');
   if(p==='/auth/me')return route.fulfill({json:{user:{id:1,first_name:'Preview',last_name:'User',email:'preview@example.test',vero_role:admin?'Administrator':'User'}}});
   if(p==='/maintenance-contracts')return route.fulfill({json:{contracts:[{id:1,contract_name:'Synthetic contract',contract_code:'CON-TEST',customer_name:'Example customer',status:'Active',scope:'Preview scope',requirement_count:1,expiry_date:'2099-01-01'},{id:2,contract_name:'Closed contract',contract_code:'CON-CLOSED',status:'Expired',requirement_count:0}],can_edit_owner:false}});
   if(p==='/users')return route.fulfill({json:{users:[{id:2,first_name:'Example',last_name:'Person',email:'person@example.test',vero_role:'User',account_status:'Active',business_roles:[]},{id:3,first_name:'Former',last_name:'Person',email:'former@example.test',account_status:'Disabled',business_roles:[]}]}});
   if(p==='/roles')return route.fulfill({json:{roles:[]}});
   if(p==='/records/confidentiality-groups')return route.fulfill({json:{groups:[]}});
   if(p==='/my-actions')return route.fulfill({json:{actions:[{id:'demo1',title:'Review synthetic document',source:'Documents',status:'Open',action_type:'Document Review',due_at:'2099-01-01'},{id:'demo2',title:'Review synthetic compliance',source:'Compliance',status:'Overdue',due_at:'2020-01-01'}]}});
   if(p==='/client-services-sites')return route.fulfill(admin?{json:{sites:[{id:1,site_code:'SITE-TEST',site_name:'Synthetic site',status:'Active',address:'Example address',source_groups:[],contracts:[{id:1,code:'CON-TEST',name:'Synthetic contract'}],event_summary:{recent:1,open:0,highest_score:1}},{id:2,site_code:'SITE-EMPTY',site_name:'Unlinked site',status:'Inactive',source_groups:[],contracts:[],event_summary:null}],contracts:[],users:[]}}:{status:403,json:{message:'Administrator required'}});
   return route.fulfill({json:{}});
  }
  const local=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!local.startsWith(root+path.sep)||!fs.existsSync(local))return route.fulfill({status:404,body:''});
  return route.fulfill({body:fs.readFileSync(local),contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(local)]||'application/octet-stream'});
 });
 await page.goto('https://vero.test/'+file);await page.locator('.vr-summary').waitFor();
 await page.evaluate(()=>{for(const task of ['account','maintenance','actions'])window.VeroPageLoader?.ready(task)});
 if(file==='maintenance-management.html'){
  await page.locator('#rows tr[data-id]').first().waitFor();await page.getByLabel('Filter contracts').selectOption('active');assert.equal(await page.locator('#rows tr[data-id]').count(),1);
  await page.getByLabel('Search customer contracts').fill('missing');assert.equal(await page.locator('#rows tr[data-id]').count(),0);await page.getByLabel('Search customer contracts').fill('');
  await page.locator('.lifecycle-card').first().click();assert.equal(await page.getByLabel('Filter contracts').inputValue(),'all');assert.equal(await page.locator('#rows tr[data-id]').count(),2);
  assert.match(await page.locator('#rows a').first().getAttribute('href'),/maintenance-workspace.html\?id=1/);
 }else if(file==='sites.html'){
  await page.getByLabel('Search locations').fill('Auckland');assert.equal(await page.locator('.site-card:visible').count(),1);
  assert.match(await page.locator('.site-card:visible').getAttribute('href'),/site.html\?site=auckland/);
  await page.getByLabel('Search locations').fill('missing');assert.equal(await page.locator('.site-card:visible').count(),0);await page.getByLabel('Search locations').fill('');
 }else if(file==='users.html'){
  await page.locator('#userBody tr').first().waitFor();await page.getByLabel('Search users').fill('Former');assert.match(await page.locator('#userCount').innerText(),/^1/);
  await page.getByLabel('Filter user status').selectOption('Active');assert.match(await page.locator('#userCount').innerText(),/^0/);
  await page.getByLabel('Search users').fill('');await page.getByLabel('Filter user status').selectOption('');
  await page.locator('#adminContent>.admin-toolbar button').click();assert.equal(await page.locator('#userPanel').isVisible(),true);await page.evaluate(()=>closeAddUser());
 }else if(file==='my-actions.html'){
  await page.locator('.full-action').first().waitFor();await page.locator('[data-filter="documents"]').click();assert.equal(await page.locator('.full-action').count(),1);
  await page.getByLabel('Search actions').fill('missing');assert.equal(await page.locator('.full-action').count(),0);await page.getByLabel('Search actions').fill('');
  await page.locator('[data-filter="overdue"]').click();assert.equal(await page.locator('.full-action').count(),1);await page.locator('[data-filter="all"]').click();
 }else{
  await page.locator('#siteRows tr').first().waitFor();await page.getByLabel('Search sites').fill('Unlinked');assert.equal(await page.locator('#siteRows tr[data-site-edit]').count(),0);
  assert.match(await page.locator('#siteRows').innerText(),/SITE-EMPTY/);await page.getByLabel('Status',{exact:true}).selectOption('Active');assert.match(await page.locator('#siteRows').innerText(),/No sites/);
  await page.getByLabel('Search sites').fill('');await page.getByLabel('Status',{exact:true}).selectOption('');
  await page.locator('#siteAdd').click();assert.equal(await page.locator('#globalSiteDialog').isVisible(),true);await page.locator('#globalSiteCancel').click();
 }
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no page overflow '+file);
 await page.locator('#veroPageLoader').waitFor({state:'hidden'});
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:path.join(out,file.replace('.html','')+'-register-'+width+'.png'),fullPage:true});
 if(['users.html','client-services-sites.html'].includes(file)){
  admin=false;await page.reload();
  if(file==='users.html'){await page.locator('#accessDenied').waitFor({state:'visible'});assert.equal(await page.locator('#adminContent .vr-summary').isVisible(),false)}
  else{await page.getByText('Administrator access is required to view this page.',{exact:true}).waitFor();assert.equal(await page.locator('#siteRegister .vr-summary').isVisible(),false)}
 }
 assert.deepEqual(errors,[]);console.log('PASS '+file+' '+width+'px filters, layout and applicable role gates');await context.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
