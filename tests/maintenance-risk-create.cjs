const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch(e){if(process.platform!=='win32')throw e;({chromium}=require('C:/Users/dbleasel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=path.join(__dirname,'..');

test('maintenance risk is created in place, retains failed submissions and refreshes the contract register',async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try{
  const page=await browser.newPage();let fail=true,submitted=null,previousRequest=null,approvalState='Submitted';
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('vero_session_token','test'));
  await page.route('https://vero.test/**',route=>{
   const file=path.join(root,new URL(route.request().url()).pathname);
   return fs.existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404,body:''});
  });
  await page.route('**/api/**',async route=>{
   const url=route.request().url();let data={},status=200;
   if(url.endsWith('/auth/me'))data={user:{first_name:'Test',vero_role:'Administrator'}};
   else if(url.endsWith('/maintenance-contracts'))data={contracts:[{id:42,contract_name:'Maintenance A',contract_code:'MC-42'}]};
   else if(url.endsWith('/details'))data={sources:[],requirements:[]};
   else if(url.endsWith('/risk-submission-capabilities'))data={can_submit:true};
   else if(url.endsWith('/risk-classifications'))data={categories:[{id:2,tier:2,category_name:'Equipment',status:'Active'},{id:7,tier:1,category_name:'Equipment failure',status:'Active'}],relationships:[{parent_category_id:2,child_category_id:7}]};
   else if(url.endsWith('/users/active')||url.endsWith('/risk-treatment-owners'))data={users:[{id:10,name:'Risk Owner',first_name:'Risk',last_name:'Owner'}]};
   else if(url.endsWith('/risk-control-documents'))data={documents:[{id:9,document_number:'DOC-9',document_title:'Maintenance Procedure',version_number:'2',document_type:'Procedure'}]};
   else if(url.endsWith('/contract-submission'))data={available:true,is_live:false,approval_state:approvalState,capabilities:{can_request_changes:approvalState==='Submitted',can_approve:false,can_resubmit:approvalState==='Changes Requested'},submission:{risk_id:50,contract_id:42,status:approvalState,version:1,package_hash:'test-hash',risk:{id:50,risk_code:'MR-50',risk_title:submitted.risk_title,risk_description:submitted.risk_description},proposed_assessment:submitted.proposed_assessment,documents:[{id:9,document_number:'DOC-9',document_title:'Maintenance Procedure',version_number:'2'}],treatment_actions:submitted.treatment_actions,classification_category_id:7,reason:submitted.reason}};
   else if(url.endsWith('/contract-submission/decision')){assert.equal(route.request().postDataJSON().decision,'Return');approvalState='Changes Requested';data={approval_state:approvalState};}
   else if(url.endsWith('/risks'))data={risks:[]};
   else if(url.endsWith('/risk-drafts')){
    if(route.request().method()==='POST'){
     const payload=route.request().postDataJSON();
     assert.equal(payload.contract_id,42);assert.equal(payload.project_id,undefined);
     assert.equal(payload.classification_category_id,7);assert.deepEqual(payload.proposed_document_ids,[9]);
     assert.equal(payload.proposed_assessment.inherent_likelihood,4);assert.equal(payload.proposed_assessment.residual_impact,2);
     assert.equal(payload.treatment_actions.length,2);assert.equal(payload.treatment_actions[0].owner_user_id,10);
     if(fail){previousRequest=payload.request_id;status=503;data={message:'Temporary failure'};}
     else{assert.equal(payload.request_id,previousRequest);submitted=payload;data={risk_id:50,contract_id:42,approval_state:'Submitted'};}
    }else data={drafts:submitted?[{id:50,risk_code:'MR-50',risk_title:submitted.risk_title,status:'Draft',approval_state:approvalState}]:[]};
   }
   return route.fulfill({status,json:data,headers:{'Access-Control-Allow-Origin':'*'}});
  });
  await page.goto('https://vero.test/maintenance-workspace.html?id=42');
  await page.getByRole('button',{name:'Risks',exact:true}).click();
  await page.getByRole('button',{name:'+ Add Risk',exact:true}).click();
  await page.locator('#projectRiskCreateSave').waitFor({state:'visible'});
  await page.locator('#projectRiskCreateCategory').selectOption('7');
  await page.locator('#projectRiskCreateTitle').fill('Equipment failure');
  await page.locator('#projectRiskCreateDescription').fill('Failure could interrupt the maintenance service.');
  for(const [id,value] of Object.entries({praIL:'4',praIC:'4',praRL:'2',praRC:'2',praOwner:'10',praTreatmentOwner:'10'}))await page.locator('#'+id).selectOption(value);
  await page.locator('#praDocuments input[data-document-id]').check();
  await page.locator('#praActionTitle').fill('Check equipment');await page.locator('#praDue').fill('2026-12-01');
  await page.locator('#praAddAction').click();
  await page.locator('[data-action-field="title"]').fill('Arrange backup equipment');
  await page.locator('[data-action-field="owner_user_id"]').selectOption('10');
  await page.locator('[data-action-field="due_date"]').fill('2026-12-02');
  await page.locator('#projectRiskCreateReason').fill('Required for this maintenance contract.');
  await page.locator('#projectRiskCreateSave').click();await page.getByText(/Temporary failure/).waitFor();
  assert.equal(await page.locator('#projectRiskCreateTitle').inputValue(),'Equipment failure');
  fail=false;await page.locator('#projectRiskCreateSave').click();
  await page.getByRole('button',{name:'Open submitted risk',exact:true}).waitFor();
  assert.match(await page.locator('#contractRiskList').innerText(),/Submitted · Pending approval/);
  assert.equal(page.url(),'https://vero.test/maintenance-workspace.html?id=42');
  await page.getByRole('button',{name:'Open submitted risk',exact:true}).click();
  await page.getByText('Maintenance Procedure',{exact:false}).last().waitFor();
  page.once('dialog',dialog=>dialog.accept('Please explain the treatment controls.'));
  await page.getByRole('button',{name:'Return for changes',exact:true}).click();
  await page.getByRole('button',{name:'Revise returned submission',exact:true}).waitFor();
  await page.getByRole('button',{name:'Revise returned submission',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('projectRiskCreateTitle').value==='Equipment failure');
  await page.getByRole('button',{name:'Resubmit corrected risk',exact:true}).waitFor();
  await page.locator('#projectRiskCreateCancel').click();
  await page.getByRole('button',{name:'Open submitted risk',exact:true}).click();
  await page.getByRole('button',{name:'Close risk review',exact:true}).click();
  await page.getByRole('button',{name:'+ Add Risk',exact:true}).click();
  await page.locator('#projectRiskCreateCategory').selectOption('7');
  await page.locator('#projectRiskCreateTitle').fill('Keep this draft');
  await page.locator('#projectRiskCreateCancel').click();
  await page.getByRole('button',{name:'+ Add Risk',exact:true}).click();
  assert.equal(await page.locator('#projectRiskCreateTitle').inputValue(),'Keep this draft');
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await page.locator('#projectRiskCreateOverlay .drawer').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  await page.locator('#projectRiskCreateOverlay .drawer').evaluate(el=>el.scrollTop=0);
  await page.screenshot({path:path.join(root,'../artifacts/maintenance-add-risk-mobile.png')});
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
