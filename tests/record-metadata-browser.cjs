// Component acceptance with synthetic API responses; no live record writes.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.VERO_TEST_BROWSER?{executablePath:process.env.VERO_TEST_BROWSER}:{})});
 try{
  const page=await browser.newPage(),writes=[],errors=[];
  let allowed=true,conflict=false,fail=false,slow=false,readOnly={};
  let metadata={record_title:'Original',description:null,record_type:'Report',record_category:'Evidence',owner_business_area:'Safety',owner_user_id:1,record_date:'2026-01-01'};
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.pathname==='/fixture')return route.fulfill({contentType:'text/html',body:`<meta charset="utf-8"><div id="recordModal"><div class="record-drawer-body"></div></div><div id="recordHistoryTimeline"></div><span id="recordHistoryEventCount"></span><script>localStorage.setItem('vero_session_token','synthetic');window.saved=0;addEventListener('vero-record-metadata-saved',()=>saved++);</script><script src="/record-metadata-editor.js"></script>`});
   if(url.pathname==='/record-metadata-editor.js')return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/../record-metadata-editor.js')});
   assert.match(url.pathname,/\/records\/\d+\/metadata$/,'Unexpected network request');
   if(slow)await new Promise(r=>setTimeout(r,120));
   if(!allowed)return route.fulfill({status:403,json:{message:'Active Administrator permission required.'}});
   if(req.method()==='PUT'){
    writes.push(req.postDataJSON());await new Promise(r=>setTimeout(r,80));
    if(conflict)return route.fulfill({status:409,json:{message:'This record changed.'}});
    if(fail)return route.fulfill({status:500,json:{message:'Unable to save.'}});
    for(const key of Object.keys(metadata))if(Object.hasOwn(writes.at(-1),key))metadata[key]=writes.at(-1)[key];
   }
   return route.fulfill({json:{metadata,read_only_fields:readOnly,can_edit:true,revision_token:'b'.repeat(64),changed_fields:req.method()==='PUT'?['record_title']:[],owners:[
    {id:1,name:'Same Name',email:'work@example.test'},
    {id:2,name:'Same Name',email:'personal@example.test'},
    {id:3,name:'No Email',email:null},
    {id:4,name:'Unsafe <img src=x>',email:'<img src=x onerror=alert(1)>@example.test'}
   ]}});
  });
  await page.goto('https://vero.test/fixture');
  const open=id=>page.evaluate(id=>{const m=document.getElementById('recordModal');m.dataset.activeRecordId=String(id);m.classList.add('open');},id);
  const close=()=>page.evaluate(()=>{const m=document.getElementById('recordModal');m.classList.remove('open');delete m.dataset.activeRecordId;});
  await open(1);await page.getByRole('button',{name:'Edit Record Details',exact:true}).click();
  assert.deepEqual(await page.getByLabel('Owner',{exact:true}).locator('option').allTextContents(),[
   'Same Name (work@example.test)','Same Name (personal@example.test)','No Email (ID 3)',
   'Unsafe <img src=x> (<img src=x onerror=alert(1)>@example.test)'
  ]);
  assert.equal(await page.getByLabel('Owner',{exact:true}).inputValue(),'1','Existing owner ID preserved');
  await page.getByLabel('Owner',{exact:true}).selectOption('2');
  await page.getByLabel('Title',{exact:true}).fill('Cancelled');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal(writes.length,0);
  await page.getByRole('button',{name:'Edit Record Details',exact:true}).click();
  assert.equal(await page.getByLabel('Title',{exact:true}).inputValue(),'Original');
  assert.equal(await page.getByLabel('Owner',{exact:true}).inputValue(),'1','Cancel restores existing owner ID');
  await page.getByLabel('Title',{exact:true}).fill('Corrected');
  await page.getByRole('button',{name:'Save Details',exact:true}).click();
  assert.equal(writes.length,0,'Reason required');
  await page.getByLabel('Reason for correction').fill('Synthetic correction');
  await page.getByRole('button',{name:'Save Details',exact:true}).evaluate(b=>{b.click();b.click();});
  await page.waitForFunction(()=>saved===1);
  assert.equal(writes.length,1);assert.equal(Object.hasOwn(writes[0],'description'),false);
  assert.equal(await page.locator('#recordMetadataEditor img').count(),0);
  conflict=true;await page.getByRole('button',{name:'Edit Record Details',exact:true}).click();
  await page.getByLabel('Reason for correction').fill('Conflict');
  await page.getByRole('button',{name:'Save Details',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#recordMetadataEditor [role=status]').textContent.includes('This record changed'));
  assert.equal(await page.getByRole('button',{name:'Save Details',exact:true}).isDisabled(),true);
  assert.equal(await page.evaluate(()=>saved),1);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  conflict=false;await page.getByRole('button',{name:'Edit Record Details',exact:true}).waitFor({state:'visible'});
  // Closing during a pending load must not reveal the old editor.
  await close();slow=true;await open(2);await close();await page.waitForTimeout(180);
  assert.equal(await page.locator('#recordMetadataEditor').isVisible(),false);
  slow=false;allowed=false;await open(3);await page.waitForTimeout(100);
  assert.equal(await page.locator('#recordMetadataEditor').isVisible(),false);
  // Exercise the real history renderer with escaped old/new details and actor.
  const html=fs.readFileSync(__dirname+'/../records.html','utf8');
  const render=html.slice(html.indexOf(' function renderRecordHistory('),html.indexOf(' async function loadRecordHistory('));
  await page.evaluate(source=>{(0,eval)(source);renderRecordHistory([{event_type:'Updated',event_description:'Reason <img>',performed_at:'2026-01-01T10:00:00Z',performed_by_name:'Admin <b>',previous_value:{record_title:'Old <script>'},new_value:{record_title:'New <img>'}}]);},render);
  assert.match(await page.locator('#recordHistoryTimeline').innerText(),/Old <script>/);
  assert.match(await page.locator('#recordHistoryTimeline').innerText(),/New <img>/);
  assert.match(await page.locator('#recordHistoryTimeline').innerText(),/Admin <b>/);
  assert.equal(await page.locator('#recordHistoryTimeline img,#recordHistoryTimeline script').count(),0);
  const historyLoader=html.slice(html.indexOf(' async function loadRecordHistory('),html.indexOf(' async function openRecordDrawer('));
  await page.evaluate(async source=>{
   const section=document.createElement('section');section.id='recordHistorySection';
   document.body.append(section);section.append(document.getElementById('recordHistoryTimeline'));
   const style=document.createElement('style');style.textContent='#recordHistorySection{display:none!important}';document.head.append(style);
   (0,eval)('var recordHistoryRequest=0; var recordsFetch=async()=>({history:[]});'+source);
   await loadRecordHistory(1);
  },historyLoader);
  assert.equal(await page.locator('#recordHistorySection').isVisible(),true,'Authorised Admin history overrides Controller-only hiding');
  assert.deepEqual(errors,[]);
  // Legacy nulls must not be coerced into edits or block unrelated corrections.
  allowed=true;metadata={...metadata,owner_user_id:null,record_date:null,record_type:null,record_category:null,owner_business_area:null};
  readOnly=Object.fromEntries(['record_date','record_type','record_category','owner_business_area'].map(k=>[k,'An active assigned retention rule is required.']));
  await close();await open(4);
  for(const [label,value,key] of [['Title','Legacy title','record_title'],['Description','Legacy description','description'],['Owner','1','owner_user_id']]){
   await page.getByRole('button',{name:'Edit Record Details',exact:true}).click();
   assert.equal(await page.getByLabel('Record date',{exact:true}).isDisabled(),true);
   assert.equal(await page.getByLabel('Category',{exact:true}).isDisabled(),true);
   assert.match(await page.locator('#record-edit-help-record_date').textContent(),/active assigned retention rule/);
   if(key==='owner_user_id')await page.getByLabel(label,{exact:true}).selectOption(value);
   else await page.getByLabel(label,{exact:true}).fill(value);
   await page.getByLabel('Reason for correction').fill('Legacy correction');
   const count=writes.length;
   await page.getByRole('button',{name:'Save Details',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('#recordMetadataEditor [role=status]').textContent==='Details saved with audit history.');
   assert.equal(writes.length,count+1);
   assert.deepEqual(Object.keys(writes.at(-1)).sort(),['expected_revision','reason',key].sort());
  }
  await page.getByRole('button',{name:'Edit Record Details',exact:true}).click();
  await page.getByLabel('Owner',{exact:true}).selectOption({label:'Same Name (personal@example.test)'});
  await page.getByLabel('Reason for correction').fill('Synthetic owner choice');
  await page.getByRole('button',{name:'Save Details',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#recordMetadataEditor [role=status]').textContent==='Details saved with audit history.');
  assert.equal(writes.at(-1).owner_user_id,2,'Label selection submits the unchanged numeric account ID');
  await close();await open(5);
  await page.getByRole('button',{name:'Edit Record Details',exact:true}).click();
  assert.equal(await page.getByLabel('Owner',{exact:true}).inputValue(),'2','Reload does not replace the selected account');
  // Integration: execute the actual drawer, close handler and save-refresh listener
  // with the real editor. Only network/data helpers are replaced by synthetic fixtures.
  const integration=await browser.newPage();const integrationWrites=[];
  await integration.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.pathname==='/integration')return route.fulfill({contentType:'text/html',body:'<meta charset="utf-8"><body></body>'});
   assert.match(url.pathname,/\/records\/[12]\/metadata$/);
   const id=url.pathname.includes('/records/1/')?1:2;
   if(req.method()==='PUT')integrationWrites.push(req.postDataJSON());
   return route.fulfill({json:{metadata:{...metadata,record_title:id===1?'Record A':'Record B'},can_edit:true,
    owners:[{id:1,name:'Admin'}],revision_token:'c'.repeat(64),changed_fields:['record_title']}});
  });
  await integration.goto('https://vero.test/integration');
  const counterAndListener=html.slice(html.indexOf(' let recordHistoryRequest = 0;'),html.indexOf(' function renderRecordHistory('));
  const drawerAndClose=html.slice(html.indexOf(' async function openRecordDrawer('),html.indexOf(' window.recordBackdropClose = function('));
  await integration.evaluate(({html,counterAndListener,drawerAndClose,editor})=>{
   const parsed=new DOMParser().parseFromString(html,'text/html');
   document.body.append(document.importNode(parsed.getElementById('recordModal'),true));
   localStorage.setItem('vero_session_token','synthetic');
   window.waiters=[];
   (0,eval)(`(()=>{
    const enterpriseRecords=[],formatDate=x=>x||'-';
    const loadRecordHistory=()=>{},loadRecordViewingGroups=async()=>{},closeControlledPreview=()=>{},loadRecords=()=>{};
    const recordsFetch=path=>path==='/records/retention-rules'?Promise.resolve({permissions:{can_manage:false}}):
     new Promise((resolve,reject)=>waiters.push({path,resolve,reject}));
    ${counterAndListener}
    ${drawerAndClose}
    window.testOpenRecord=openRecordDrawer;
   })();`);
   (0,eval)(editor);
  },{html,counterAndListener,drawerAndClose,editor:fs.readFileSync(__dirname+'/../record-metadata-editor.js','utf8')});
  const openIntegrated=id=>integration.evaluate(id=>{void testOpenRecord(id);},id);
  const resolve=async(index,id,title)=>integration.evaluate(({index,id,title})=>{
   waiters[index].resolve({record:{id,record_title:title,record_code:'REC-'+id,status:'Active',security_classification:'Public',owner:{},retention:{}}});
  },{index,id,title});
  await openIntegrated(1);await resolve(0,1,'Record A');
  await integration.getByRole('button',{name:'Edit Record Details',exact:true}).click();
  await integration.getByLabel('Title',{exact:true}).fill('Saved A');
  await integration.getByLabel('Reason for correction').fill('Race regression');
  await integration.getByRole('button',{name:'Save Details',exact:true}).click();
  await integration.waitForFunction(()=>waiters.length===2);
  await openIntegrated(2);
  assert.equal(await integration.locator('.record-drawer-body').isVisible(),false,'Previous details hidden while B loads');
  assert.equal(await integration.locator('#drawerRecordSubtitle').textContent(),'');
  assert.equal(await integration.locator('#restrictedRecordView').isVisible(),false);
  await resolve(2,2,'Record B');
  await integration.waitForFunction(()=>document.getElementById('drawerRecordTitle').textContent==='Record B');
  await integration.getByRole('button',{name:'Edit Record Details',exact:true}).click();
  await resolve(1,1,'Late A');
  await integration.waitForTimeout(30);
  assert.equal(await integration.locator('#drawerRecordTitle').textContent(),'Record B');
  assert.equal(await integration.getByLabel('Title',{exact:true}).inputValue(),'Record B');
  assert.equal(await integration.locator('#recordModal').getAttribute('data-active-record-id'),'2');
  await integration.locator('#recordMetadataEditor').getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal(integrationWrites.length,1,'Cancel B must not save');
  // The generation guard must reject older responses even for the same record.
  await openIntegrated(2);await openIntegrated(2);
  await resolve(4,2,'Newest B');await resolve(3,2,'Stale B');
  await integration.waitForTimeout(30);
  assert.equal(await integration.locator('#drawerRecordTitle').textContent(),'Newest B');
  // Closing invalidates pending successes and failures.
  await openIntegrated(1);
  await integration.evaluate(()=>closeRecordDrawer());
  await resolve(5,1,'Closed A');await integration.waitForTimeout(30);
  assert.equal(await integration.locator('#recordModal').evaluate(m=>m.classList.contains('open')),false);
  assert.notEqual(await integration.locator('#drawerRecordTitle').textContent(),'Closed A');
  await openIntegrated(1);await openIntegrated(2);await resolve(7,2,'Final B');
  await integration.evaluate(()=>waiters[6].reject(Error('Late A failure')));
  await integration.waitForTimeout(30);
  assert.equal(await integration.locator('#drawerRecordTitle').textContent(),'Final B');
  await openIntegrated(1);
  await integration.evaluate(()=>waiters[8].reject(Error('Synthetic detail failure')));
  await integration.waitForFunction(()=>document.getElementById('drawerRecordTitle').textContent==='Unable to load record');
  assert.equal(await integration.locator('.record-drawer-body').isVisible(),false,'Failed loads must not show previous details');
  await integration.close();
  console.log('PASS Admin editor: cancel, reason, duplicate save, conflict, safe text/history, stale drawer and non-admin denial');
  console.log('PASS actual save-refresh integration: late A cannot overwrite B, same-record generation, close and stale failure');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
