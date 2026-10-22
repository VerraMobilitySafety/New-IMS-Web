const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch(e){({chromium}=require('C:/Users/dbleasel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=path.join(__dirname,'..');


test('contract compliance lists individual requirements with search paging and central assessment links',async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try{for(const width of [1500,390]){
  const page=await browser.newPage({viewport:{width,height:950}});page.setDefaultTimeout(12000);
  await page.addInitScript(()=>localStorage.setItem('vero_session_token','mock-only'));
  const activity=i=>({instance_id:'REQ-'+i,verra_action:'Requirement '+i,timing_or_trigger:'Every month',conditions_and_exceptions:i===0?'<Site-specific condition>':'Condition '+i,clause_reference:'Clause '+i,pdf_pages:[i+1]});
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.pathname.endsWith('/maintenance-contracts'))return route.fulfill({json:{contracts:[{id:4,contract_code:'TEST-M',contract_name:'Test agreement',status:'Draft',requirement_count:2},{id:5,contract_code:'EMPTY',contract_name:'Empty contract',status:'Draft',requirement_count:0}],can_edit_owner:false}});
   if(u.pathname.endsWith('/details'))return route.fulfill({json:{sources:[],requirements:u.pathname.includes('/4/')?[{id:42,code:'COM-42',title:'Shared requirement',activities:Array.from({length:52},(_,i)=>activity(i))}]:[]}});
   if(u.hostname!=='vero.test')return route.abort();
   const file=path.resolve(root,'.'+u.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   let body=fs.readFileSync(file);if(file.endsWith('.html'))body=body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>','<script src="customer-contracts.js"></script><script>loadContractWorkspace()</script></body>');
   return route.fulfill({contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream',body});
  });
  await page.goto('https://vero.test/maintenance-workspace.html?id=4');
  await page.getByRole('button',{name:'Compliance',exact:true}).click();
  const rows=page.locator('#contractComplianceRows');await rows.getByRole('link',{name:'Requirement 0',exact:true}).waitFor();
  assert.equal(await rows.locator('tr').count(),50);
  assert.equal(await rows.getByRole('link',{name:'Requirement 0',exact:true}).getAttribute('href'),'compliance.html?obligation_id=42');
  assert.equal(await rows.getByRole('link',{name:'Open assessment',exact:true}).first().getAttribute('href'),'compliance.html?obligation_id=42');
  await rows.locator('summary').first().click();await rows.getByText('<Site-specific condition>',{exact:false}).waitFor();
  await page.locator('#contractComplianceNext').click();await rows.getByRole('link',{name:'Requirement 50',exact:true}).waitFor();
  assert.equal(await rows.locator('tr').count(),2);
  await page.locator('#contractComplianceSearch').fill('Clause 51');await rows.getByRole('link',{name:'Requirement 51',exact:true}).waitFor();
  assert.equal(await rows.locator('tr').count(),1);
  assert.equal(await page.locator('#contractCompliancePrevious').isDisabled(),true);
  await page.locator('#contractComplianceSearch').fill('unmatched');await rows.getByText('No requirements match your search.',{exact:true}).waitFor();
  await page.goto('https://vero.test/maintenance-workspace.html?id=5');
  await page.getByRole('button',{name:'Compliance',exact:true}).click();await page.getByText('No requirements linked to this contract.',{exact:true}).waitFor();
  await page.close();
 }}finally{await browser.close();}
});

test('administrators edit contract owners only in the workspace with retained failed saves',async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try{for(const width of [1500,390]){
  const page=await browser.newPage({viewport:{width,height:950}}),posts=[];let fail=true,statusFail=true,admin=true;
  page.setDefaultTimeout(12000);
  const c={id:4,contract_code:'TEST-M',contract_name:'Test agreement',customer_name:'Customer',status:'Draft',requirement_count:0,source_count:0,owner_user_id:null,owner_version:0};
  await page.addInitScript(()=>localStorage.setItem('vero_session_token','mock-only'));
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.pathname.endsWith('/maintenance-contracts'))return route.fulfill({json:{contracts:[c],can_edit_owner:admin}});
   if(u.pathname.endsWith('/import-options'))return route.fulfill({json:{can_import:false,units:[]}});
   if(u.pathname.endsWith('/details'))return route.fulfill({json:{sources:[],requirements:[]}});
   if(u.pathname.endsWith('/status')){
    if(req.method()==='GET')return route.fulfill({json:{statuses:['Draft','Active','Inactive','Expired'],status:c.status,status_version:c.status_version||0}});
    const data=req.postDataJSON();if(statusFail)return route.fulfill({status:503,json:{message:'Temporary status failure'}});
    c.status=data.status;c.status_version=(c.status_version||0)+1;return route.fulfill({json:{status:c.status,status_version:c.status_version}});
   }
   if(u.pathname.endsWith('/owner')){
    if(req.method()==='GET')return route.fulfill({json:{users:[{id:2,name:'Selected Owner',email:'owner@example.test'}],owner_user_id:c.owner_user_id,owner_version:c.owner_version}});
    const data=req.postDataJSON();posts.push(data);
    if(fail)return route.fulfill({status:503,json:{message:'Temporary save failure'}});
    c.owner_user_id=data.owner_user_id;c.owner_name=data.owner_user_id?'Selected Owner':null;c.owner_version++;return route.fulfill({json:{owner_user_id:c.owner_user_id,owner_name:c.owner_name,owner_version:c.owner_version}});
   }
   if(u.hostname!=='vero.test')return route.abort();const file=path.resolve(root,'.'+u.pathname);
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   let body=fs.readFileSync(file);
   if(file.endsWith('.html'))body=body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>','<script src="customer-contracts.js"></script><script>'+(u.pathname.includes('workspace')?'loadContractWorkspace()':'load()')+'</script></body>');
   return route.fulfill({contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream',body});
  });
  await page.goto('https://vero.test/maintenance-management.html');
  await page.getByRole('link',{name:'Test agreement',exact:true}).waitFor();
  assert.equal(await page.locator('[data-owner-edit]').count(),0);
  await page.getByRole('link',{name:'Test agreement',exact:true}).click();
  await page.getByRole('button',{name:'Edit owner',exact:true}).click();
  const dialog=page.locator('#contractOwnerDialog');
  await dialog.getByLabel('Contract owner',{exact:true}).selectOption('2');
  assert.equal(await dialog.evaluate(el=>el.getBoundingClientRect().width<=innerWidth),true);
  await dialog.getByRole('button',{name:'Save owner',exact:true}).click();
  await dialog.getByRole('alert').filter({hasText:'Temporary save failure'}).waitFor();
  assert.equal(await dialog.getByLabel('Contract owner',{exact:true}).inputValue(),'2');
  fail=false;await dialog.getByRole('button',{name:'Save owner',exact:true}).click();
  await page.locator('#contractSummary').getByText('Selected Owner',{exact:true}).waitFor();
  assert.equal(posts[1].owner_version,0);
  await page.reload();await page.getByRole('button',{name:'Edit owner',exact:true}).click();
  await dialog.getByLabel('Contract owner',{exact:true}).locator('option:checked').filter({hasText:'Selected Owner'}).waitFor({state:'attached'});
  assert.equal(await dialog.getByLabel('Contract owner',{exact:true}).inputValue(),'2');
  await dialog.getByLabel('Contract owner',{exact:true}).selectOption('');
  await dialog.getByRole('button',{name:'Save owner',exact:true}).click();
  await page.locator('#contractSummary').getByText('Unassigned',{exact:true}).waitFor();
  await page.goto('https://vero.test/maintenance-workspace.html?id=4');
  await page.getByRole('button',{name:'Edit owner',exact:true}).click();
  await dialog.getByLabel('Contract owner',{exact:true}).selectOption('2');
  await dialog.getByRole('button',{name:'Save owner',exact:true}).click();
  await page.locator('#contractSummary').getByText('Selected Owner',{exact:true}).waitFor();
  await page.goto('https://vero.test/maintenance-management.html');await page.getByRole('link',{name:'Test agreement',exact:true}).waitFor();
  await page.getByRole('cell',{name:'Selected Owner',exact:true}).waitFor();
  assert.equal(await page.locator('[data-owner-edit]').count(),0);
  await page.getByRole('link',{name:'Test agreement',exact:true}).click();
  await page.getByRole('button',{name:'Edit status',exact:true}).click();
  const statusDialog=page.locator('#contractStatusDialog');
  await statusDialog.getByLabel('Contract status',{exact:true}).selectOption('Active');
  await statusDialog.getByRole('button',{name:'Save status',exact:true}).click();
  await statusDialog.getByRole('alert').filter({hasText:'Temporary status failure'}).waitFor();
  assert.equal(await statusDialog.getByLabel('Contract status',{exact:true}).inputValue(),'Active');
  statusFail=false;await statusDialog.getByRole('button',{name:'Save status',exact:true}).click();
  await page.locator('#contractSummary').getByText('Active',{exact:true}).waitFor();
  await page.reload();await page.locator('#contractSummary').getByText('Active',{exact:true}).waitFor();
  await page.goto('https://vero.test/maintenance-management.html');await page.getByRole('link',{name:'Test agreement',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Edit status',exact:true}).count(),0);
  await page.getByRole('cell',{name:'Active',exact:true}).waitFor();
  admin=false;await page.goto('https://vero.test/maintenance-workspace.html?id=4');await page.locator('#contractSummary').getByText('Selected Owner',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Edit owner',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Edit status',exact:true}).count(),0);
  await page.close();
 }}finally{await browser.close();}
});

test('historical event matching previews verified links, applies the fingerprint and refreshes counts',async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:950}});let linked=false,posted=null;
  const site={id:1,site_code:'A-01',site_name:'Example site',status:'Active',address:'',contracts:[],source_groups:[],event_summary:{total:0,open:0,recent:0,highest_score:null,last_date:null,unclassified:0}};
  await page.addInitScript(()=>localStorage.setItem('vero_session_token','mock-only'));
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.pathname.endsWith('/client-services-site-history-matches')){
    if(req.method()==='POST'){posted=req.postDataJSON();linked=true;return route.fulfill({json:{linked:1,remaining:1}});}
    return route.fulfill({json:{fingerprint:'reviewed-plan',matches:linked?[]:[{event_id:'1',event_reference:'Event 1',site_id:1,site_code:'A-01',contract_group:'Source group'}],already_linked:linked?1:0,unresolved:[{event_reference:'Event 2',reason:'No explicit site reference'}]}});
   }
   if(u.pathname.endsWith('/client-services-sites'))return route.fulfill({json:{sites:[{...site,event_summary:{...site.event_summary,total:linked?1:0,recent:linked?1:0,unclassified:linked?1:0}}],contracts:[],users:[]}});
   if(u.hostname!=='vero.test')return route.abort();const file=path.resolve(root,'.'+u.pathname);
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   let body=fs.readFileSync(file);if(file.endsWith('.html'))body=body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>','<script src="client-services-sites.js"></script><script>loadSites()</script></body>');
   return route.fulfill({contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream',body});
  });
  await page.goto('https://vero.test/client-services-sites.html');
  await page.getByRole('button',{name:'Match historical events',exact:true}).click();
  const dialog=page.locator('#historicalSiteDialog');
  await dialog.getByText('1 events match 1 sites. 0 already linked. 1 left unlinked.',{exact:true}).waitFor();
  await dialog.getByRole('button',{name:'Link matched events',exact:true}).click();
  await dialog.getByText('1 historical events linked. 1 records remain unlinked.',{exact:true}).waitFor();
  assert.deepEqual(posted,{fingerprint:'reviewed-plan'});
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await page.locator('.site-event-count strong').filter({hasText:'1'}).waitFor();
  await page.getByRole('button',{name:'Match historical events',exact:true}).click();
  await dialog.getByText('0 events match 0 sites. 1 already linked. 1 left unlinked.',{exact:true}).waitFor();
  assert.equal(await dialog.getByRole('button',{name:'Link matched events',exact:true}).isDisabled(),true);
 }finally{await browser.close();}
});
test('contract sites retain failed saves, retry safely, edit and display list rows without event links on desktop/mobile',async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try{for(const width of [1500,390]){
  const page=await browser.newPage({viewport:{width,height:1000}}),posts=[],sites=[],errors=[];const sharedExisting={id:9,site_code:'SHARED-009',site_name:'Existing shared site',status:'Active',address:'Shared road',owner_user_id:1,notes:'',version:1,linked_contract_count:2};let fail=true;page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('vero_session_token','mock-only'));
  await page.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());
   if(u.pathname.endsWith('/maintenance-contracts'))return route.fulfill({json:{contracts:[{id:4,contract_name:'Maintenance contract',contract_code:'UK-M',customer_name:'Example customer'}]}});
   if(u.pathname.endsWith('/details'))return route.fulfill({json:{sources:[],requirements:[]}});
   if(/\/sites(?:\/\d+)?$/.test(u.pathname)){
    if(r.method()==='GET')return route.fulfill({json:{sites,available_sites:sites.some(s=>s.id===9)?[]:[sharedExisting],can_manage:true,users:[{id:1,name:'Site Owner'}]}});
    const data=r.postDataJSON();posts.push(data);if(fail)return route.fulfill({status:503,json:{message:'Temporary save failure'}});
    if(data.existing_site_id){if(!sites.some(s=>s.id===9))sites.push({...sharedExisting,contract_id:4});return route.fulfill({json:{site:sharedExisting}});}const s={...data,id:5,contract_id:4,linked_contract_count:2,version:data.version?data.version+1:1};if(sites.length)sites[0]=s;else sites.push(s);return route.fulfill({json:{site:s}});
   }
   if(u.pathname.endsWith('/events'))return route.fulfill({json:{events:[{id:'example-event',status:'Under Investigation',report:{description:'Reported event',occurred_date:'2026-10-19',reference_name:'Camera site',classification:{summary:'Safety Incident: Minor Event'}}}]}});
   if(u.hostname!=='vero.test')return route.abort();const file=path.resolve(root,'.'+u.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});let body=fs.readFileSync(file);
   if(file.endsWith('.html'))body=body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>','<script src="maintenance-contract-activity.js"></script><script src="customer-contracts.js"></script><script>loadContractWorkspace()</script></body>');
   return route.fulfill({contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body});
  });
  await page.goto('https://vero.test/maintenance-workspace.html?id=4');await page.getByRole('button',{name:'Sites',exact:true}).click();await page.getByRole('button',{name:'+ Add Site',exact:true}).click();
  const dialog=page.locator('#contractSiteDialog');await dialog.getByLabel('Site reference',{exact:true}).fill('UK-001');await dialog.getByLabel('Site name',{exact:true}).fill('<img src=x onerror=alert(1)>');await dialog.getByLabel('Address',{exact:true}).fill('Example road');await dialog.locator('[name=owner_user_id]').selectOption('1');
  await dialog.getByRole('button',{name:'Add Site',exact:true}).click();await dialog.getByRole('alert').filter({hasText:'Temporary save failure'}).waitFor();assert.equal(await dialog.getByLabel('Site reference',{exact:true}).inputValue(),'UK-001');fail=false;await dialog.getByRole('button',{name:'Add Site',exact:true}).click();await page.getByRole('button',{name:'Edit site UK-001',exact:true}).waitFor();assert.equal(posts[0].request_id,posts[1].request_id);assert.equal(posts[1].owner_user_id,1);assert.equal(await page.locator('.contract-site-table img').count(),0);
  assert.equal(await page.getByRole('link',{name:'Report Event',exact:true}).count(),0);assert.equal(await page.getByRole('columnheader',{name:'Reference',exact:true}).count(),1);
  await page.getByRole('button',{name:'Edit site UK-001',exact:true}).click();assert.match(await dialog.innerText(),/linked to 2 contracts/);await dialog.locator('[name=status]').selectOption('Inactive');await dialog.getByRole('button',{name:'Save Changes',exact:true}).click();await page.locator('.contract-site-table .pill').filter({hasText:'Inactive'}).waitFor();assert.equal(posts[2].version,1);assert.equal(await page.getByRole('link',{name:'Report Event',exact:true}).count(),0);
  await page.getByRole('button',{name:'+ Link Existing Site',exact:true}).click();await dialog.getByLabel('Find site',{exact:true}).fill('SHARED-009');await dialog.locator('[name=existing_site_id]').selectOption('9');fail=true;await dialog.getByRole('button',{name:'Link Site',exact:true}).click();await dialog.getByRole('alert').filter({hasText:'Temporary save failure'}).waitFor();fail=false;await dialog.getByRole('button',{name:'Link Site',exact:true}).click();await page.getByRole('cell',{name:'Existing shared site',exact:true}).waitFor();assert.equal(posts[3].existing_site_id,9);assert.equal(posts[3].request_id,posts[4].request_id);assert.equal(await page.locator('.contract-site-table tbody tr').count(),2);
  await page.getByRole('button',{name:'Sites',exact:true}).click();await page.getByRole('button',{name:'+ Add Site',exact:true}).click();await dialog.getByLabel('Site reference',{exact:true}).fill('UK-002');await dialog.getByLabel('Site name',{exact:true}).fill('Camera site');
  assert.equal(await dialog.evaluate(el=>el.getBoundingClientRect().width<=innerWidth),true);
  fs.mkdirSync(path.join(root,'../artifacts/maintenance-sites'),{recursive:true});await page.screenshot({path:path.join(root,'../artifacts/maintenance-sites/site-form-'+width+'.png')});await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('button',{name:'Events',exact:true}).click();await page.getByRole('link',{name:'Reported event',exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'+ Report Event',exact:true}).getAttribute('href'),'incident-management.html?view=report&contract_id=4');assert.deepEqual(errors,[]);await page.close();
 }}finally{await browser.close();}
});

test('administrator site register shows all sites and hides data and navigation from other roles',async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try{for(const role of ['Administrator','Viewer']){
  const page=await browser.newPage({viewport:{width:1500,height:1000}});
  const sites=[{id:1,site_code:'REF-A',site_name:'Linked site',address:'Example road',status:'Active',source_groups:['NSW Mobile'],contracts:[{id:3,code:'1775M',name:'NSW agreement'}]}, {id:2,site_code:'REF-B',site_name:'Unlinked site',address:'Other road',status:'Active',source_groups:['UK source'],contracts:[]}, {id:3,site_code:'REF-C',site_name:'<img src=x onerror=alert(1)>',address:'',status:'Inactive',source_groups:[],contracts:[]}];
  await page.addInitScript(()=>localStorage.setItem('vero_session_token','mock-only'));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.pathname.endsWith('/auth/me'))return route.fulfill({json:{user:{vero_role:role}}});
   if(u.pathname.endsWith('/client-services-sites'))return route.fulfill(role==='Administrator'?{json:{sites}}:{status:403,json:{message:'Administrator required'}});
   if(u.hostname!=='vero.test')return route.abort();
   const file=path.resolve(root,'.'+u.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});let body=fs.readFileSync(file);
   if(file.endsWith('.html'))body=body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>','<script src="client-services-sites.js"></script><script>loadSites()</script><script src="nav.js"></script></body>');
   return route.fulfill({contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body});
  });
  await page.goto('https://vero.test/client-services-sites.html');
  if(role==='Administrator'){
   await page.getByRole('cell',{name:'Linked site',exact:true}).waitFor();
   await page.getByRole('link',{name:'Client Services Site List',exact:true}).waitFor();
   assert.equal(await page.locator('#siteRows tr').count(),3);assert.equal(await page.locator('#siteRows img').count(),0);
   await page.getByLabel('Contract',{exact:true}).selectOption('unlinked');assert.equal(await page.locator('#siteRows tr').count(),2);
   await page.getByLabel('Status',{exact:true}).selectOption('Active');assert.equal(await page.locator('#siteRows tr').count(),1);
   await page.getByLabel('Search sites',{exact:true}).fill('UK source');assert.equal(await page.getByRole('cell',{name:'Unlinked site',exact:true}).count(),1);
   assert.equal(await page.getByRole('link',{name:'Report Event',exact:true}).count(),0);
  }else{
   await page.getByText('Administrator access is required to view this page.',{exact:true}).waitFor();
   assert.equal(await page.locator('#siteRegister').isVisible(),false);assert.equal(await page.locator('#siteRows tr').count(),0);assert.equal(await page.getByRole('link',{name:'Client Services Site List',exact:true}).isVisible(),false);
  }
  await page.close();
 }}finally{await browser.close();}
});


test('administrator adds and edits shared sites with contract linking and retained failed saves',async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try{for(const width of [1500,390]){
  const page=await browser.newPage({viewport:{width,height:1000}}),posts=[],sites=[],contracts=[{id:3,code:'1775M',name:'NSW agreement'},{id:4,code:'OTHER',name:'Second agreement'}];let fail=true;
  await page.addInitScript(()=>localStorage.setItem('vero_session_token','mock-only'));
  await page.route('**/*',async route=>{
   const request=route.request(),u=new URL(request.url());
   if(u.pathname.endsWith('/auth/me'))return route.fulfill({json:{user:{vero_role:'Administrator'}}});
   if(/\/client-services-sites(?:\/\d+)?$/.test(u.pathname)){
    if(request.method()==='GET')return route.fulfill({json:{sites,contracts,users:[],can_manage:true}});
    const data=request.postDataJSON();posts.push(data);if(fail)return route.fulfill({status:503,json:{message:'Temporary save failure'}});
    const links=sites[0]?.contracts||[];if(data.contract_id&&!links.some(c=>c.id===data.contract_id))links.push(contracts.find(c=>c.id===data.contract_id));
    const site={...data,id:21,contracts:links,source_groups:[],version:(sites[0]?.version||0)+1};sites[0]=site;return route.fulfill({json:{site}});
   }
   if(u.hostname!=='vero.test')return route.abort();const file=path.resolve(root,'.'+u.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});let body=fs.readFileSync(file);
   if(file.endsWith('.html'))body=body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>','<script src="client-services-sites.js"></script><script>loadSites()</script><script src="nav.js"></script></body>');
   return route.fulfill({contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body});
  });
  await page.goto('https://vero.test/client-services-sites.html');await page.getByRole('button',{name:'+ Add Site',exact:true}).click();
  const dialog=page.locator('#globalSiteDialog');await dialog.getByLabel('Site reference',{exact:true}).fill('NEW-SITE');await dialog.getByLabel('Site name',{exact:true}).fill('New shared site');await dialog.getByLabel('Address',{exact:true}).fill('Example address');await dialog.getByLabel('Link to contract',{exact:true}).selectOption('3');
  await dialog.getByRole('button',{name:'Add Site',exact:true}).click();await dialog.getByRole('alert').filter({hasText:'Temporary save failure'}).waitFor();assert.equal(await dialog.getByLabel('Site name',{exact:true}).inputValue(),'New shared site');fail=false;
  await dialog.getByRole('button',{name:'Add Site',exact:true}).click();await page.getByRole('cell',{name:'New shared site',exact:true}).waitFor();assert.equal(posts[0].request_id,posts[1].request_id);assert.equal(posts[1].contract_id,3);
  assert.equal(await page.locator('[data-site-edit]').count(),0);await page.evaluate(()=>openSiteEditor(allSites[0]));await dialog.getByText('1775M · NSW agreement',{exact:false}).waitFor();await dialog.getByLabel('Site name',{exact:true}).fill('Updated shared site');await dialog.getByLabel('Site status',{exact:true}).selectOption('Inactive');await dialog.getByLabel('Link to contract',{exact:true}).selectOption('4');
  assert.equal(await dialog.evaluate(el=>el.getBoundingClientRect().width<=innerWidth),true);
  await dialog.getByRole('button',{name:'Save Changes',exact:true}).click();await page.getByRole('cell',{name:'Updated shared site',exact:true}).waitFor();assert.equal(posts[2].version,1);assert.equal(posts[2].contract_id,4);assert.equal(sites[0].contracts.length,2);assert.equal(await page.getByRole('link',{name:'Report Event',exact:true}).count(),0);
  await page.close();
 }}finally{await browser.close();}
});



test('site event history distinguishes missing coverage, counts and impact and supports sorting and combined filters',async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try{for(const width of [1500,390]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base={site_name:'Shared site',address:'Example road',status:'Active',source_groups:[],contracts:[{id:3,code:'CON',name:'Contract'}],notes:'',version:1};
  const sites=[
   {...base,id:1,site_code:'A',event_summary:{total:0,open:0,recent:0,highest_score:null,last_date:null,unclassified:0}},
   {...base,id:2,site_code:'B',event_summary:{total:3,open:2,recent:1,highest_score:4,last_date:'2026-10-18',unclassified:1}},
   {...base,id:3,site_code:'C',event_summary:null},
   {...base,id:4,site_code:'D',event_summary:{total:1,open:0,recent:1,highest_score:5,last_date:'2026-10-19',unclassified:0}}
  ];
  await page.addInitScript(()=>localStorage.setItem('vero_session_token','mock-only'));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.pathname.endsWith('/client-services-sites'))return route.fulfill({json:{sites,contracts:base.contracts,users:[],can_manage:true,events_available:true}});
   if(u.hostname!=='vero.test')return route.abort();
   const file=path.resolve(root,'.'+u.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   let body=fs.readFileSync(file);
   if(file.endsWith('.html'))body=body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>','<script src="client-services-sites.js"></script><script>loadSites()</script></body>');
   return route.fulfill({contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body});
  });
  await page.goto('https://vero.test/client-services-sites.html');
  await page.getByRole('link',{name:'B',exact:true}).waitFor();
  const rows=page.locator('#siteRows tr');
  assert.equal(await rows.count(),4);
  assert.equal(await page.locator('.table-wrap').evaluate(el=>getComputedStyle(el).overflowX),'auto');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  assert.equal(await rows.nth(0).locator('.site-event-count strong').innerText(),'0');
  assert.equal(await rows.nth(1).locator('.site-event-count strong').innerText(),'1');
  assert.match(await rows.nth(2).innerText(),/Unavailable/);
  await page.getByRole('button',{name:'Sort by Events (last 12 months)',exact:true}).click();
  assert.equal(await rows.first().locator('td').first().innerText(),'B');
  await page.getByRole('button',{name:'Sort by Events (last 12 months)',exact:true}).click();
  assert.equal(await rows.first().locator('td').first().innerText(),'A');
  await page.getByLabel('Event history',{exact:true}).selectOption('open');
  assert.equal(await rows.count(),1);assert.equal(await rows.first().locator('td').first().innerText(),'B');
  await page.getByLabel('Search sites',{exact:true}).fill('No such site');
  await page.getByRole('cell',{name:'No sites match these filters.',exact:true}).waitFor();
  await page.getByLabel('Search sites',{exact:true}).fill('');
  await page.getByLabel('Event history',{exact:true}).selectOption('none');
  assert.equal(await rows.count(),1);assert.equal(await rows.first().locator('td').first().innerText(),'A');
  assert.equal(await page.getByRole('link',{name:'Report Event',exact:true}).count(),0);
  assert.deepEqual(errors,[]);
  await page.close();
 }}finally{await browser.close();}
});





