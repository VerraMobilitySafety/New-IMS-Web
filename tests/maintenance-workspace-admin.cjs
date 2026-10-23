const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('C:/Users/dbleasel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=path.join(__dirname,'..');
test('administrator details, local requirements and management controls work across all eight tabs on desktop/mobile',async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try{for(const width of [1500,390]){
  const page=await browser.newPage({viewport:{width,height:1000}});page.setDefaultTimeout(12000);
  let admin=true,fail=true,version=0,activityVersion='first';const posts=[],errors=[];
  const c={id:4,contract_code:'CT4',contract_name:'Camera contract',friendly_name:'Camera contract',official_contract_name:'Official camera agreement',customer_name:'Client A',status:'Active',scope:'Scope',notes:'Notes',source_count:1,requirement_count:1,expiry_date:'2027-01-01',start_date:'2026-01-01'};
  const activity={instance_id:'A1',verra_action:'Monthly service',timing_or_trigger:'Monthly',conditions_and_exceptions:'Dry weather',clause_reference:'4.2',pdf_pages:[3]};
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('vero_session_token','fixture-only'));
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.pathname.endsWith('/maintenance-contracts'))return route.fulfill({json:{contracts:[c],can_edit_owner:admin}});
   if(u.pathname.endsWith('/4/details'))return route.fulfill({json:{sources:[{id:1,record_id:13,title:'Agreement',record_code:'REC13',metadata:{}}],requirements:[{id:40,code:'COM40',title:'Shared requirement',activities:[activity]}]}});
   if(u.pathname.endsWith('/admin-details')){
    const requirement=u.pathname.includes('/requirements/');
    if(req.method()==='GET')return route.fulfill({json:requirement?{activities:[activity],version:activityVersion}:{...c,version}});
    const data=req.postDataJSON();posts.push({path:u.pathname,data});if(!admin)return route.fulfill({status:403,json:{message:'Active administrator access is required.'}});
    if(fail)return route.fulfill({status:409,json:{message:'Contract details changed. Close and reopen the editor.'}});
    if(requirement){Object.assign(activity,data);activityVersion='second';return route.fulfill({json:{activities:[activity],version:activityVersion}});}
    Object.assign(c,data,{contract_name:data.friendly_name});version++;return route.fulfill({json:{...c,version}});
   }
   if(u.pathname.endsWith('/4/sites'))return route.fulfill({json:{sites:[{id:9,site_code:'SITE9',site_name:'Site nine',status:'Active',version:1}],can_manage:admin,users:[],available_sites:[]}});
   if(u.pathname.endsWith('/4/events'))return route.fulfill({json:{events:[{id:'event1',status:'Under Investigation',report:{description:'Service incident',classification:{summary:'Safety'},occurred_date:'2026-10-23'}}]}});
   if(u.pathname.endsWith('/risk-submission-capabilities'))return route.fulfill({json:{can_submit:admin}});
   if(u.pathname.endsWith('/4/risks'))return route.fulfill({json:{risks:[{id:6,risk_code:'R6',risk_title:'Roadside work',status:'Open'}]}});
   if(u.pathname.endsWith('/risk-drafts'))return route.fulfill({json:{drafts:[]}});
   if(u.pathname.endsWith('/4/documents'))return route.fulfill({json:{documents:[{id:94,document_title:'Safety plan',version_number:1,linked_via:['Linked to this contract']}],records:[{id:13,title:'Agreement',record_code:'REC13',linked_via:['Contract source file']},{id:14,title:'Correspondence',record_code:'REC14',linked_via:['Linked contract record']}]}});
   if(u.pathname.endsWith('/swms'))return route.fulfill({json:{items:[]}});
   if(u.pathname.endsWith('/documents'))return route.fulfill({json:{documents:[{id:95,document_title:'Client manual',version_number:1}]}});
   if(u.hostname!=='vero.test')return route.abort();const file=path.resolve(root,'.'+u.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   let body=fs.readFileSync(file);if(file.endsWith('.html'))body=body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>',['maintenance-workspace-admin','maintenance-contract-activity','maintenance-documents','linked-documents','swms-service-documents','maintenance-risks','customer-contracts'].map(s=>'<script src="'+s+'.js"></script>').join('')+'<script>loadContractWorkspace()</script></body>');
   return route.fulfill({contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body});
  });
  await page.goto('https://vero.test/maintenance-workspace.html?id=4');await page.getByRole('button',{name:'Edit contract details',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Edit contract details',exact:true});
  for(const [label,value] of [['Friendly name','Updated service'],['Full contract name','Updated official agreement'],['Contract reference','CT4-NEW'],['Customer','Client B'],['Start date','2026-02-01'],['Expiry / renewal date','2028-02-01'],['Scope','New scope'],['Notes','New notes'],['Reason for change','Correct the service register']])await dialog.getByLabel(label,{exact:true}).fill(value);
  await dialog.getByRole('button',{name:'Save Changes',exact:true}).click();await dialog.getByRole('alert').filter({hasText:'Contract details changed'}).waitFor();assert.equal(await dialog.getByLabel('Friendly name',{exact:true}).inputValue(),'Updated service');
  fail=false;await dialog.getByRole('button',{name:'Save Changes',exact:true}).click();await page.getByRole('heading',{name:'Updated service',exact:true}).waitFor();await dialog.waitFor({state:'hidden'});
  assert.equal(posts[1].data.version,0);assert.equal(posts[1].data.expiry_date,'2028-02-01');assert.equal(posts[1].data.customer_name,'Client B');
  for(const [tab,link] of [['Events','Manage events'],['Risks','Manage risks and assessments'],['Documents','Manage controlled documents'],['Client Documents','Manage shared client documents'],['Records','Manage records']]){
   await page.getByRole('button',{name:tab,exact:true}).click();await page.getByRole('link',{name:link,exact:true}).waitFor();
   if(tab==='Records'){await page.getByRole('link',{name:'Edit record details',exact:true}).first().waitFor();assert.equal(await page.getByRole('link',{name:'Edit record details',exact:true}).count(),2);assert.equal(await page.getByRole('link',{name:'Edit record details',exact:true}).last().getAttribute('href'),'records.html?record_id=14');}
  }
  await page.getByRole('button',{name:'Sites',exact:true}).click();await page.getByRole('cell',{name:'Site nine',exact:true}).click();await page.getByRole('dialog',{name:'Edit Site',exact:true}).getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('button',{name:'Compliance',exact:true}).click();await page.getByRole('button',{name:'Edit activity',exact:true}).click();const requirement=page.getByRole('dialog',{name:'Edit contract requirement',exact:true});await requirement.getByLabel('Requirement / activity',{exact:true}).fill('Quarterly service');await requirement.getByLabel('Reason for change',{exact:true}).fill('Correct activity wording');await requirement.getByRole('button',{name:'Save Changes',exact:true}).click();await page.getByRole('link',{name:'Quarterly service',exact:true}).waitFor();
  assert.equal(posts.at(-1).path,'/api/maintenance-contracts/4/requirements/40/admin-details');assert.equal(posts.at(-1).data.activity_index,0);assert.equal(posts.at(-1).data.version,'first');assert.equal(posts.at(-1).data.instance_id,undefined);assert.equal(posts.at(-1).data.pdf_pages,undefined);
  admin=false;await page.reload();await page.getByRole('button',{name:'Overview',exact:true}).waitFor();assert.equal(await page.locator('#maintenanceAdminTools').isVisible(),false);assert.equal(await page.getByRole('button',{name:'Edit contract details',exact:true}).count(),0);await page.getByRole('button',{name:'Compliance',exact:true}).click();await page.getByRole('link',{name:'Quarterly service',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Edit activity',exact:true}).count(),0);assert.deepEqual(errors,[]);await page.close();
 }}finally{await browser.close();}
});
