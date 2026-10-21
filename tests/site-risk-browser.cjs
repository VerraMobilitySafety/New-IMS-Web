const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
const site={id:123,site_code:'SITE-123',site_name:'Harbour service site',status:'Active',address:'Example street',notes:'Shared site',owner_name:'Example Owner',contracts:[],source_groups:[],event_summary:{recent:0,open:0},risk_summary:{highest:{rating:'Significant',score:75},average_residual_score:67.5,assessed_risks:2,awaiting_assessment:1}};
const options={can_submit:true,schema_ready:true,classification_categories:[{id:8,tier:2,name:'Delivery'},{id:9,tier:1,name:'Traffic Interaction'}],classification_relationships:[{parent_id:8,child_id:9}],users:[{id:11,name:'Example Owner',email:'owner@example.test'}],documents:[{id:4,code:'DOC-4',title:'Traffic Procedure',version:'2'}],controls:[],treatment_owners:[{id:11,name:'Example Owner'}],review_policy:{reference_date:'2026-10-22',context:'Site'}};
let browser;
test.before(async()=>{browser=await chromium.launch({headless:true,...(process.env.SITE_RISK_BROWSER?{executablePath:process.env.SITE_RISK_BROWSER}:{})});});
test.after(async()=>browser?.close());
async function setup(width=1440,sites=[site]){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[],posts=[];page.on('pageerror',e=>errors.push(e.message));let fail=true;
 await page.addInitScript(()=>localStorage.setItem('vero_session_token','test-token'));
 await page.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());
  if(u.pathname.endsWith('/auth/me'))return route.fulfill({json:{user:{id:1,vero_role:'Administrator',first_name:'Test',last_name:'User'}}});
  if(u.pathname.endsWith('/risk-submission-options'))return route.fulfill({json:options});
  if(u.pathname.endsWith('/workspace'))return route.fulfill({json:{site,can_submit:true,risks:posts.length&&!fail?[{id:201,risk_code:'SR-TEST',risk_title:'Traffic exposure',approval_state:'Submitted',residual_likelihood:2,residual_impact:3,next_review_date:'2027-10-22'}]:[]}});
  if(u.pathname.endsWith('/client-services-sites'))return route.fulfill({json:{sites,contracts:[],users:[]}});
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
test('site rows open by pointer and keyboard, with aggregate risk before Events and no edit actions',async()=>{
 const {page,errors}=await setup();try{
 await page.goto('https://vero.test/client-services-sites.html');await page.getByRole('cell',{name:site.site_name,exact:true}).waitFor();assert.deepEqual(await page.locator('[data-site-sort]').evaluateAll(buttons=>buttons.map(b=>b.dataset.siteSort)),['reference','site','risk','events','address','contract','source','status']);assert.equal(await page.locator('[data-site-edit]').count(),0);assert.equal(await page.getByRole('columnheader',{name:'Actions',exact:true}).count(),0);assert.match(await page.locator('.site-risk-summary').innerText(),/Significant/);assert.match(await page.locator('.site-risk-summary').innerText(),/Average 67.5 \/ 125 · 2 assessed/);assert.match(await page.locator('.site-risk-summary').innerText(),/1 awaiting assessment/);
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


test('aggregate cells distinguish unassessed, unavailable and approved bands at desktop and mobile widths',async()=>{
 for(const width of [1440,390]){const {page,errors}=await setup(width);try{
 await page.goto('https://vero.test/client-services-sites.html');await page.locator('.site-risk-badge').waitFor();
 for(const [summary,expected] of [[null,'Unavailable'],[{highest:null,assessed_risks:0,average_residual_score:null,awaiting_assessment:0},'Not assessed'],[{highest:{rating:'Low'},assessed_risks:1,average_residual_score:5,awaiting_assessment:0},'Low']]){
 await page.evaluate(summary=>{allSites[0].risk_summary=summary;drawSites();},summary);assert.match(await page.locator('.site-risk-summary').innerText(),new RegExp(expected));}
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);assert.deepEqual(errors,[]);
 await page.screenshot({path:path.join(__dirname,'site-aggregate-'+width+'.png'),fullPage:true});
 }finally{await page.close();}}
});

test('all eight headers sort both ways with natural text ordering and accessible state',async()=>{
 for(const width of [1440,390]){
 const fixtures=[
 {...site,id:1,site_code:'SITE-2',site_name:'Zulu',address:'B road',contracts:[{id:1,code:'B',name:'Bravo'}],source_groups:['C'],status:'Inactive',event_summary:{recent:2},risk_summary:{highest:{rating:'Low',score:5},average_residual_score:5,assessed_risks:1}},
 {...site,id:2,site_code:'SITE-10',site_name:'Alpha',address:'A road',contracts:[{id:2,code:'A',name:'Alpha'}],source_groups:['B'],status:'Active',event_summary:{recent:12},risk_summary:{highest:{rating:'Significant',score:125},average_residual_score:125,assessed_risks:1}},
 {...site,id:3,site_code:'SITE-1',site_name:'Mike',address:'C road',contracts:[{id:3,code:'C',name:'Charlie'}],source_groups:['A'],status:'Inactive',event_summary:{recent:0},risk_summary:{highest:{rating:'High',score:50},average_residual_score:50,assessed_risks:1}}
 ];
 const {page,errors}=await setup(width,fixtures);try{
 await page.goto('https://vero.test/client-services-sites.html');await page.locator('[data-site-open]').first().waitFor();
 const ids=()=>page.locator('[data-site-open]').evaluateAll(rows=>rows.map(r=>Number(r.dataset.siteOpen)));
 assert.deepEqual(await ids(),[3,1,2]);assert.equal(await page.locator('#siteSort').count(),0);
 const cases=[
 ['reference',[2,1,3],[3,1,2],'descending'],['site',[2,3,1],[1,3,2],'ascending'],
 ['risk',[2,3,1],[1,3,2],'descending'],['events',[2,1,3],[3,1,2],'descending'],
 ['address',[2,1,3],[3,1,2],'ascending'],['contract',[2,1,3],[3,1,2],'ascending'],
 ['source',[3,2,1],[1,2,3],'ascending'],['status',[2,3,1],[3,1,2],'ascending']];
 for(const [key,first,second,direction] of cases){
 const button=page.locator('[data-site-sort="'+key+'"]');
 if(key==='risk'){await button.focus();await page.keyboard.press('Enter');}else await button.click();
 assert.deepEqual(await ids(),first,key+' initial direction');
 assert.equal(await button.locator('..').getAttribute('aria-sort'),direction);
 assert.equal(await page.locator('th[aria-sort="ascending"],th[aria-sort="descending"]').count(),1);
 if(key==='risk'){await button.focus();await page.keyboard.press('Space');}else await button.click();
 assert.deepEqual(await ids(),second,key+' reverse direction');assert.match(page.url(),/client-services-sites.html$/);
 }
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 await page.screenshot({path:path.join(__dirname,'site-header-sorts-'+width+'.png'),fullPage:true});assert.deepEqual(errors,[]);
 }finally{await page.close();}
 }
});

test('missing values stay last in either direction while zero counts and approved Low risk sort normally',async()=>{
 const fixtures=[{...site,id:1,site_code:'A',address:'',contracts:[],source_groups:[],event_summary:null,risk_summary:null},
 {...site,id:2,site_code:'B',address:'B',contracts:[{id:2,code:'B',name:'B'}],source_groups:['B'],event_summary:{recent:0},risk_summary:{highest:{rating:'Low',score:5},average_residual_score:5,assessed_risks:1}},
 {...site,id:3,site_code:'C',address:'A',contracts:[{id:3,code:'A',name:'A'}],source_groups:['A'],event_summary:{recent:12},risk_summary:{highest:{rating:'High',score:60},average_residual_score:60,assessed_risks:1}},
 {...site,id:4,site_code:'D',address:'',contracts:[],source_groups:[],event_summary:null,risk_summary:{highest:null,average_residual_score:null,assessed_risks:0}}];
 const {page}=await setup(1440,fixtures);try{
 await page.goto('https://vero.test/client-services-sites.html');await page.locator('[data-site-open]').first().waitFor();
 for(const key of ['risk','events','address','contract','source']){
 const button=page.locator('[data-site-sort="'+key+'"]');
 for(let n=0;n<2;n++){await button.click();const ids=await page.locator('[data-site-open]').evaluateAll(rows=>rows.map(r=>Number(r.dataset.siteOpen)));assert.deepEqual(ids.slice(2),[1,4]);assert.deepEqual(new Set(ids.slice(0,2)),new Set([2,3]));}
 }
 }finally{await page.close();}
});

test('header sorting covers all pages, resets pagination and remains selected after filtering and reload',async()=>{
 const fixtures=Array.from({length:55},(_,i)=>({...site,id:i+1,site_code:'SITE-'+(i+1),event_summary:{recent:i+1}}));
 const {page}=await setup(1440,fixtures);try{
 await page.goto('https://vero.test/client-services-sites.html');await page.getByRole('button',{name:'Next',exact:true}).click();
 assert.equal(await page.locator('[data-site-open]').first().getAttribute('data-site-open'),'51');
 await page.getByRole('button',{name:'Sort by Events (last 12 months)',exact:true}).click();
 assert.equal(await page.locator('[data-site-open]').first().getAttribute('data-site-open'),'55');assert.equal(await page.locator('[data-site-open]').count(),50);
 assert.equal(await page.getByRole('button',{name:'Previous',exact:true}).isDisabled(),true);
 await page.getByLabel('Search sites',{exact:true}).fill('SITE-5');
 assert.equal(await page.locator('[data-site-open]').first().getAttribute('data-site-open'),'55');
 await page.evaluate(()=>loadSites());assert.equal(await page.locator('th[aria-sort="descending"] button').getAttribute('data-site-sort'),'events');
 assert.equal(await page.locator('[data-site-open]').first().getAttribute('data-site-open'),'55');
 }finally{await page.close();}
});
