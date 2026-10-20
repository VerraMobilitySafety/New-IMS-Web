// Local documents/contractors pages and Compliance's real register adapter, synthetic API only.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../preview');
const common=[{id:1,obligation_code:'COM-CLIENT-CONTRACT-01',compliance_type:'Client',obligation_title:'Shared assessment',current_assessment:{status:'Not Assessed'}},{id:2,compliance_type:'Regulatory',obligation_title:'Regulatory notification',applicability:{type:'Jurisdiction'},current_assessment:{status:'Not Assessed'}},{id:3,compliance_type:'Internal',obligation_title:'Internal event reporting',applicability:{type:'Organisation'},current_assessment:{status:'Compliant'}}];
const contracts=[{id:10,code:'CON-TEST',name:'Synthetic contract'}],requirements=[{contract_id:10,obligation_id:1,common_requirement:'Shared assessment',activity:{instance_id:'CO-1',verra_action:'Synthetic monthly report',timing_or_trigger:'Monthly',clause_reference:'Clause 1',pdf_pages:[2]}}];
const contractor={contractors:[{id:1,contractor_code:'CTR-TEST',company_name:'Example contractor',service_type:'Road services',risk_level:'Low',contract_owner:'Preview Owner',status:'Approved'}],workers:[{contractor_id:1,first_name:'Example',last_name:'Worker',status:'Current'}],requirements:[{contractor_id:1,requirement_type:'Insurance',reference:'TEST-001',compliance_status:'Current'}],monitoring:[],contracts:[]};
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,...(process.env.INSURANCE_BROWSER?{executablePath:process.env.INSURANCE_BROWSER}:{})});
 try{for(const width of [1440,1024,768,390])for(const file of ['documents.html','compliance.html','contractor-management.html']){
  const context=await browser.newContext({viewport:{width,height:1100}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('vero_session_token','synthetic'));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.pathname.endsWith('/auth/me'))return route.fulfill({json:{user:{id:7,first_name:'Preview',last_name:'User',email:'preview@example.test',vero_role:'User'}}});
   if(u.pathname.endsWith('/contractors'))return route.fulfill({json:contractor});
   if(u.pathname.endsWith('/documents'))return route.fulfill({json:{documents:[{id:1,document_number:'DOC-TEST',document_title:'Synthetic Safety Procedure',document_type:'Procedure',document_owner_user_id:7,document_owner:'Preview User',status:'Current',version_number:1,review_date:'2020-01-01',effective_date:'2026-01-01',allow_view:true},{id:2,document_number:'DOC-TEST2',document_title:'Synthetic Policy',document_type:'Policy',document_owner_user_id:9,document_owner:'Another Owner',status:'Current',version_number:1,review_date:'2099-01-01',allow_view:true}]}});
   if(u.hostname!=='vero.test')return route.abort();
   const local=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!local.startsWith(root+path.sep)||!fs.existsSync(local))return route.fulfill({status:404,body:''});
   let body=fs.readFileSync(local);
   if(path.basename(local)==='compliance.html'){
    const source=body.toString(),functions=['filterRegister','setComplianceType','setType','renderComplianceRegister','updateComplianceCounts'].map(name=>source.match(new RegExp('function '+name+'\\([^]*?\\n\\}'))[0]).join('\n');
    body=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>',`<script>var obligationsLive={};const COMPLIANCE_API="https://example.invalid/api";function complianceAuthHeaders(){return {}};function compliancePill(x){return x}function assessmentPill(x){return x||"Not Assessed"}function formatComplianceDate(){return "-"}window.openLiveObligation=async id=>{window.opened=id;document.getElementById("obligationModal").classList.add("show")};window.fetch=async()=>({ok:true,status:200,json:async()=>(${JSON.stringify({contracts,requirements})})});${functions}</script><script src="nav.js"></script><script src="compliance-contract-register.js"></script><script src="register-layout.js"></script></body>`);
   }
   return route.fulfill({body,contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(local)]||'application/octet-stream'});
  });
  await page.goto('https://vero.test/'+file);
  await page.locator('.vr-summary').waitFor();
  await page.evaluate(()=>{for(const task of ['account','documents','compliance','contractors'])window.VeroPageLoader?.ready(task)});
  if(file==='documents.html'){
   await page.locator('#documentsBody tr.data').first().waitFor();
   await page.getByRole('button',{name:'My Documents',exact:true}).click();assert.equal(await page.locator('#documentsBody tr.data').count(),1);
   await page.getByRole('button',{name:'All Documents',exact:true}).click();
   await page.locator('#documentTypeFilter').selectOption({label:'Policy'});assert.equal(await page.locator('#documentsBody tr.data').count(),1);
   await page.locator('#documentSearch').fill('missing');assert.equal(await page.locator('#documentsBody tr.data').count(),0);
   await page.locator('#documentSearch').fill('');await page.locator('#documentTypeFilter').selectOption('');
   await page.getByRole('button',{name:'Due for Review',exact:true}).click();assert.equal(await page.locator('#documentsBody tr.data').count(),1);
   await page.getByRole('button',{name:'All Documents',exact:true}).click();
   await page.locator('.document-actions button').click();assert.ok(await page.locator('#requestTitle').isVisible());
   await page.evaluate(()=>closeRequest());
  }else if(file==='compliance.html'){
   await page.evaluate(items=>renderComplianceRegister(items),common);
   assert.equal(await page.locator('.compliance-type-panel').count(),0);
   assert.equal(await page.locator('.vr-toolbar .compliance-view').count(),4);
   await page.locator('.compliance-view[data-type="Client"]').click();assert.equal(await page.locator('#contractRequirementRows tr[data-requirement]').count(),1);
   await page.locator('#contractRequirementSearch').fill('missing');assert.equal(await page.locator('#contractRequirementRows tr[data-requirement]').count(),0);
   await page.locator('#contractRequirementSearch').fill('');
   await page.locator('#requirementStatusFilter').selectOption('Compliant');assert.equal(await page.locator('#contractRequirementRows tr[data-requirement]').count(),0);
   await page.locator('#requirementStatusFilter').selectOption('');
   await page.locator('.compliance-view[data-type=""]').click();assert.equal(await page.locator('#contractRequirementRows tr[data-requirement]').count(),3);
   await page.locator('#contractRequirementRows .contract-requirement-open').first().click();assert.equal(await page.evaluate(()=>window.opened),1);
   await page.locator('#obligationModal').evaluate(e=>e.classList.remove('show'));
   assert.deepEqual((await page.locator('.vr-summary>.vr-card').allTextContents()).map(s=>s.replace(/\s+/g,' ').trim()),['1 Regulatory','1 Internal','1 Client','3 Total Requirements']);
  }else{
   await page.locator('.contractor-row').waitFor();
   await page.locator('#search').fill('missing');assert.equal(await page.locator('.contractor-row').count(),0);
   await page.locator('#search').fill('Example');
   await page.locator('.contractor-row').click();assert.equal(await page.locator('#companyOverlay.open').count(),1);
   await page.keyboard.press('Escape');
   await page.getByLabel('Contractor view').selectOption('Workers');assert.match(await page.locator('#content').innerText(),/Worker/);
   await page.getByLabel('Contractor view').selectOption('Requirements');assert.match(await page.locator('#content').innerText(),/Insurance/);
   await page.getByLabel('Contractor view').selectOption('Monitoring');assert.match(await page.locator('#content').innerText(),/No records/);
   await page.getByLabel('Contractor view').selectOption('Contractors');await page.locator('#search').fill('');
   await page.locator('.vr-more summary').click();await page.getByRole('button',{name:/Add Worker/}).click();assert.equal(await page.locator('#modal.open').count(),1);
   await page.getByRole('button',{name:'Cancel',exact:true}).click();
  }
  assert.equal(await page.locator('.vr-summary>.vr-card').count(),file==='documents.html'?3:4);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no page overflow');
  await page.screenshot({path:path.join(out,file.replace('.html','')+'-register-'+width+'.png'),fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS '+file+' '+width+'px: existing filters/actions/views and common layout');await context.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
