const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../preview');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.INSURANCE_BROWSER?{executablePath:process.env.INSURANCE_BROWSER}:{})});try{
for(const width of [1440,1024,768,390])for(const file of ['records.html','risk.html','incident-management.html']){
 const context=await browser.newContext({viewport:{width,height:1100}}),page=await context.newPage(),errors=[];let manager=true;page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('vero_session_token','synthetic'));
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='vero.test'){
 if(!u.pathname.startsWith('/api/'))return route.abort();const p=u.pathname.replace('/api','');let data={};
 if(p==='/auth/me')data={user:{id:1,first_name:'Preview',last_name:'User',email:'preview@example.test',vero_role:'User'}};
 if(p==='/auth/my-roles')data={roles:[]};
 if(p==='/records')data={records:[{id:1,record_code:'REC-TEST',record_title:'Synthetic record',record_category:'General',source_module:'Manual',status:'Active',security_classification:'Public',owner:{first_name:'Preview',last_name:'User'},retention:{rule_code:'RET-1'}}],pending_copy_requests:0};
 if(p==='/records/retention-rules')data={rules:[],permissions:{can_manage:manager}};
 if(p==='/records/holds')data={holds:[]};if(p==='/records/dispositions')data={dispositions:[]};
 if(p==='/risk-registers')data={registers:[{id:1,register_code:'RISK-GLOBAL',register_name:'Master'}]};
 if(p==='/risks')data={risks:[]};if(p==='/risk-tiers')data={categories:[{id:4,tier:4,category_name:'Synthetic domain',status:'Active',parent_category_ids:[]}]};
 if(p==='/risk/hierarchical-register')data={rows:[{kind:'category',id:4,tier:4,name:'Synthetic domain',status:'Active'}]};
 if(p==='/risk/master-aggregation')data={aggregations:[]};if(p==='/risk/approved-matrix-positions')data={positions:[]};
 if(p==='/risk/classification-exposure-summary')data={summaries:[]};if(p==='/risk/operational-contexts')data={projects:[],contracts:[],vm_locations:[]};
 if(p==='/incidents/options')data={users:[],unverified:{},administrator:false,injury_register:false};
 if(p==='/incidents')data={events:[{id:'test-event',status:'Under investigation',report:{description:'Synthetic road event',classification:{summary:'Safety',due_date:'2099-01-01'}}},{id:'closed-event',status:'Complete',report:{description:'Synthetic completed event',classification:{summary:'Quality',due_date:'2099-01-01'}}}]};
 if(p==='/incidents/dashboard')data={metrics:{events:2,under_investigation:1,completed:1,awaiting_assignment:0,active_investigations:1,overdue:0}};
 return route.fulfill({json:data});}
 const local=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!local.startsWith(root+path.sep)||!fs.existsSync(local))return route.fulfill({status:404,body:''});return route.fulfill({body:fs.readFileSync(local),contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(local)]||'application/octet-stream'});
 });
 await page.goto('https://vero.test/'+file+(file==='incident-management.html'?'?view=register':''));if(file!=='risk.html')await page.locator('.vr-summary:visible').first().waitFor();
 if(file==='records.html'){
  await page.locator('body[data-records-manager="true"]').waitFor();await page.locator('#recordsTableBody [data-record-id]').waitFor();
  await page.getByText('More filters',{exact:true}).click();assert.equal(await page.locator('#classificationFilter').isVisible(),true);await page.locator('#classificationFilter').selectOption('Confidential');assert.match(await page.locator('#recordsTableBody').innerText(),/No records/);await page.locator('#classificationFilter').selectOption('');await page.getByText('More filters',{exact:true}).click();
  await page.getByLabel('Search records',{exact:true}).fill('missing');assert.match(await page.locator('#recordsTableBody').innerText(),/No records/);await page.getByLabel('Search records',{exact:true}).fill('');
  await page.getByText('More filters',{exact:true}).click();await page.locator('#recordsRegisterPanel').getByLabel('View',{exact:true}).selectOption('retention');assert.equal(await page.locator('#retentionSchedulePanel').isVisible(),true);assert.equal(await page.locator('#recordsRegisterPanel').isVisible(),false);
  await page.locator('#retentionSchedulePanel').getByLabel('View',{exact:true}).selectOption('register');
 }else if(file==='risk.html'){
  await page.locator('#veroRiskTableBody').getByText('Synthetic domain',{exact:false}).first().waitFor();await page.locator('#veroRiskSearch').fill('missing');await page.locator('#veroRiskSearch').fill('');
  assert.equal(await page.locator('#veroTier4Filter').isVisible(),true);assert.equal(await page.locator('#veroSiteFilter').isDisabled(),true);assert.equal(await page.locator('#veroRiskMatrix').isVisible(),true);
  assert.equal(await page.locator('#veroAddRiskButton').isVisible(),false);assert.equal(await page.locator('.vr-summary,.vr-risk-refine').count(),0);assert.equal(await page.locator('body').getAttribute('data-register-layout'),null);
 }else{
  await page.locator('#event-rows a').first().waitFor();await page.getByLabel('Search events',{exact:true}).fill('road');assert.equal(await page.locator('#event-rows a').count(),1);await page.locator('#event-filter').selectOption('complete');assert.equal(await page.locator('#event-rows a').count(),0);await page.getByLabel('Search events',{exact:true}).fill('');assert.equal(await page.locator('#event-rows a').count(),1);await page.locator('#event-filter').selectOption('all');
  assert.equal(await page.getByLabel('View',{exact:true}).locator('option[value="injury-register-button"]').count(),0);
  await page.getByLabel('View',{exact:true}).selectOption('dashboard');await page.locator('#incident-dashboard .vr-summary').waitFor();await page.getByLabel('View',{exact:true}).selectOption('register');await page.locator('#event-rows a').first().waitFor();
 }
 await page.locator('#veroPageLoader').waitFor({state:'hidden'});// Risk deliberately restores its pre-layout mobile behavior.
 if(file!=='risk.html'||width>=768)assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no overflow '+file);
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:path.join(out,file.replace('.html','')+'-register-'+width+'.png'),fullPage:true});
 if(file==='records.html'){manager=false;await page.reload();await page.locator('body[data-records-manager="false"]').waitFor();assert.equal(await page.locator('.records-kpis').isVisible(),false);assert.equal(await page.locator('#addRecordBtn').isVisible(),false);assert.equal(await page.locator('#recordsRegisterPanel').getByLabel('View',{exact:true}).locator('option').count(),1);assert.equal(await page.locator('#classificationFilter').isVisible(),false)}
 assert.deepEqual(errors,[]);console.log('PASS '+file+' '+width+'px layout, existing controls and role visibility');await context.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});

