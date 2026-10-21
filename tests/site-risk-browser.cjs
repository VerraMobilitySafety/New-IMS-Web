const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
const site={id:123,site_code:'SITE-123',site_name:'Harbour service site',status:'Active',address:'Example street',notes:'Shared site',owner_name:'Example Owner',contracts:[],source_groups:[],event_summary:{recent:0,open:0}};
const options={can_submit:true,schema_ready:true,classification_categories:[{id:8,tier:2,name:'Delivery'},{id:9,tier:1,name:'Traffic Interaction'}],classification_relationships:[{parent_id:8,child_id:9}],users:[{id:11,name:'Example Owner',email:'owner@example.test'}],documents:[{id:4,code:'DOC-4',title:'Traffic Procedure',version:'2'}],controls:[],treatment_owners:[{id:11,name:'Example Owner'}],review_policy:{reference_date:'2026-10-22',context:'Site'}};
let browser;
test.before(async()=>{browser=await chromium.launch({headless:true,...(process.env.SITE_RISK_BROWSER?{executablePath:process.env.SITE_RISK_BROWSER}:{})});});
test.after(async()=>browser?.close());
async function setup(width=1440){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[],posts=[];page.on('pageerror',e=>errors.push(e.message));let fail=true;
 await page.addInitScript(()=>localStorage.setItem('vero_session_token','test-token'));
 await page.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());
  if(u.pathname.endsWith('/auth/me'))return route.fulfill({json:{user:{id:1,vero_role:'Administrator',first_name:'Test',last_name:'User'}}});
  if(u.pathname.endsWith('/risk-submission-options'))return route.fulfill({json:options});
  if(u.pathname.endsWith('/workspace'))return route.fulfill({json:{site,can_submit:true,risks:posts.length&&!fail?[{id:201,risk_code:'SR-TEST',risk_title:'Traffic exposure',approval_state:'Submitted',residual_likelihood:2,residual_impact:3,next_review_date:'2027-10-22'}]:[]}});
  if(u.pathname.endsWith('/client-services-sites'))return route.fulfill({json:{sites:[site],contracts:[],users:[]}});
  if(u.pathname.endsWith('/risk-drafts')&&req.method()==='POST'){posts.push(req.postDataJSON());return route.fulfill({status:fail?503:201,json:fail?{message:'Temporary save failure'}:{risk_id:201,site_id:123,is_live:false}});}
  if(u.pathname.endsWith('/site-submission'))return route.fulfill({json:{available:true,approval_state:'Submitted',is_live:false,risk_status:'Draft',submission:{risk_id:201,site_id:123,status:'Submitted',risk:{risk_code:'SR-TEST',risk_title:'Traffic exposure'},proposed_assessment:posts.at(-1)?.proposed_assessment,documents:[],treatment_actions:[],proposed_controls:[]},capabilities:{}}});
  if(u.hostname!=='vero.test')return route.abort();
  let p=path.resolve(root,'.'+u.pathname);if(!p.startsWith(root+path.sep))return route.fulfill({status:404,body:''});
  if(!fs.existsSync(p))return route.fulfill({status:200,body:'',contentType:p.endsWith('.js')?'application/javascript':'text/css'});
  let body=fs.readFileSync(p);if(p.endsWith('client-services-sites.html'))body=body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>','<script src="client-services-sites.js"></script><script>loadSites()</script></body>');
  if(p.endsWith('client-services-site.html'))body=body.toString().replace(/<script\b[^>]*src="(?:nav|register-layout|register-operations-layout|risk-page-loader)\.js[^>]*><\/script>/g,'').replace("document.documentElement.setAttribute('data-vero-loading','');",'');
  return route.fulfill({body,contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css'})[path.extname(p)]||'application/octet-stream'});
 });
 return {page,errors,posts,succeed:()=>fail=false};
}
test('site rows open by pointer and keyboard, while Edit keeps its existing action',async()=>{
 const {page,errors}=await setup();try{
 await page.goto('https://vero.test/client-services-sites.html');await page.getByRole('button',{name:'Edit site SITE-123'}).click();assert.equal(await page.locator('#globalSiteDialog').isVisible(),true);await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.match(page.url(),/client-services-sites.html$/);
 await page.locator('[data-site-open] td').nth(1).click();await page.waitForURL('**/client-services-site.html?id=123');await page.getByRole('heading',{name:site.site_name}).waitFor();
 await page.goto('https://vero.test/client-services-sites.html');await page.locator('[data-site-open]').focus();await page.keyboard.press('Enter');await page.waitForURL('**/client-services-site.html?id=123');assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('My Actions opens a site review using its validated site and risk identity',async()=>{
 const {page}=await setup();try{
 await page.goto('https://vero.test/client-services-site.html?id=123');
 const source=fs.readFileSync(path.join(root,'my-actions.html'),'utf8');const begin=source.indexOf('function openActionDetail(index){'),end=source.indexOf(' currentAction=action;',begin);
 const handler=source.slice(begin,end)+'}';
 await page.evaluate(handler=>{window.allActions=[{source:'Risks',action_type:'Site Risk Review',site_id:123,risk_id:201}];(0,eval)(handler);openActionDetail(0);},handler);
 await page.waitForURL('**/client-services-site.html?id=123&risk_id=201');await page.getByRole('heading',{name:'Submitted Site Risk',exact:true}).waitFor();
 }finally{await page.close();}
});
test('unlinked site assessment retains its fields after failure, retries once and stays pending review',async()=>{
 for(const width of [1440,390]){const {page,errors,posts,succeed}=await setup(width);try{
 await page.goto('https://vero.test/client-services-site.html?id=123');await page.getByRole('button',{name:'Add risk assessment',exact:true}).click();const form=page.locator('#siteRiskCreateOverlay');
 await form.getByLabel('Tier 2 Risk Category',{exact:true}).selectOption('8');await form.getByLabel('Tier 1 Risk Event',{exact:true}).selectOption('9');
 await form.getByLabel('Risk Title',{exact:true}).fill('Traffic exposure');await form.getByLabel('Risk Description',{exact:true}).fill('Vehicles moving through the site.');await form.getByLabel('Risk Owner',{exact:true}).fill('owner@');await form.locator('.owner-option').first().click();
 await form.locator('.cell').nth(4).click();await form.locator('.stage').nth(1).click();await form.locator('.cell').nth(17).click();await form.getByLabel('Find Document Library Controls',{exact:true}).fill('Traffic');await form.locator('.add-option').filter({hasText:'DOC-4'}).click();await form.locator('.stage').nth(2).click();await form.locator('.cell').nth(21).click();await form.getByLabel('Further Controls And Treatments',{exact:true}).fill('Install barriers.');await form.getByLabel('Assessment Notes And Justification',{exact:true}).fill('Reviewed the exposure and controls.');
 await page.screenshot({path:path.join(__dirname,'site-assessment-'+width+'.png'),fullPage:true});
 await form.getByRole('button',{name:'Submit For Risk Officer Review',exact:true}).click();await form.getByText('Temporary save failure',{exact:true}).waitFor();assert.equal(posts[0].site_id,123);assert.equal(posts[0].contract_id,undefined);assert.deepEqual(posts[0].proposed_document_ids,[4]);assert.equal(posts[0].proposed_assessment.target_impact,2);
 succeed();await form.getByRole('button',{name:'Submit For Risk Officer Review',exact:true}).evaluate(b=>{b.click();b.click();});await page.getByRole('heading',{name:'Submitted Site Risk',exact:true}).waitFor();assert.equal(posts.length,2);assert.equal(posts[1].request_id,posts[0].request_id);assert.equal(await form.isVisible(),false);await page.getByText('No, required approvals are still pending',{exact:true}).waitFor();assert.deepEqual(errors,[]);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:path.join(__dirname,'site-container-'+width+'.png'),fullPage:true});
 }finally{await page.close();}}
});

