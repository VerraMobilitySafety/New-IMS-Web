const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
const contract={type:'Contract',id:8,label:'C8 · Roadside Services',client:'Client A'};
const initial=[{kind:'document',id:10,title:'SWMS — Deployment',reference:'848-1503',status:'Current',version:'7.0',review_date:'2020-01-01',document_links:[contract]},
 {kind:'document',id:11,title:'SWMS — Old deployment',reference:'848-1503',status:'Superseded',version:'6.0',document_links:[contract]}];
async function tickWorkers(p,scope){assert.equal(await p.locator(scope+' select[name=consultation]').isVisible(),false);const menu=p.locator(scope+' .swms-user-picker .swms-checkbox-dropdown');await menu.locator('summary').click();for(const box of await menu.locator('input:checked').all())await box.uncheck();await menu.getByLabel('Sam Taylor',{exact:true}).check();await menu.getByLabel('Casey Lee',{exact:true}).check();assert.match(await menu.locator('summary').innerText(),/selected/);await menu.locator('summary').click();}
async function openHighRisk(p,scope){await p.locator(scope+' .swms-high-risk-picker summary').click();}
async function fillRisk(page){for(const input of await page.locator('.swms-risk textarea').all())if(!await input.inputValue())await input.fill('Work-specific '+await input.getAttribute('data-risk-field'));for(const input of await page.locator('.swms-risk select').all())await input.selectOption((await input.getAttribute('data-risk-field')).endsWith('impact')?'3':'10');}
async function screen(width=1440,holdAuth=false){
 let releaseAuth;const authGate=new Promise(resolve=>releaseAuth=resolve);if(!holdAuth)releaseAuth();
 const options={headless:true};if(process.env.VERO_CHROME_PATH)options.executablePath=process.env.VERO_CHROME_PATH;
 const browser=await chromium.launch(options),page=await browser.newPage({viewport:{width,height:1000}});let items=[...initial],posted,failList=false,assistCalls=0,failAi=false;
 await page.addInitScript(()=>localStorage.setItem('vero_session_token','test'));
 await page.route('**/*',async route=>{const u=new URL(route.request().url());
  if(u.hostname==='vero.test'){
   const file=path.join(root,u.pathname.slice(1));if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
   const type=file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'image/png';return route.fulfill({body:fs.readFileSync(file),contentType:type});
  }
  if(u.pathname.endsWith('/auth/me')){await authGate;return route.fulfill({json:{user:{id:3,first_name:'Sam',last_name:'Taylor',vero_role:'Administrator'}}});}
  if(u.pathname.endsWith('/users/active'))return route.fulfill({json:{users:[{id:3,name:'Sam Taylor',email:'sam@example.com'},{id:4,name:'Casey Lee',email:'casey@example.com'}]}});
  if(u.pathname.endsWith('/documents/link-options'))return route.fulfill({json:{options:[contract]}});
  if(u.pathname.endsWith('/swms/assist')){
   assistCalls++;if(failAi)return route.fulfill({status:503,json:{message:'AI temporarily unavailable.'}});
   const sources=[{id:'passage-12-0',document_id:12,title:'Roadside procedure',version:'2.0',excerpt:'Establish the work area controls before unloading.'}];
   if(assistCalls===1)return route.fulfill({json:{stage:'question',question:'Will the work area be separated from live traffic, and who will supervise?',sources,gaps:[]}});
   return route.fulfill({json:{stage:'draft',requires_review:true,jurisdiction:'NSW, Australia',sources,gaps:['Confirm emergency contacts.'],draft:{title:'Camera replacement',location:'Eastern Creek',scope:'Replace camera',high_risk_work:'Near live traffic — NSW',site_conditions:'Closed work bay beside live traffic',responsible_person:'Site supervisor',consultation:'',resources:'Confirm trained crew and equipment',emergency:'Confirm contacts and first aid access',monitoring:'Supervisor checks controls',steps:[{activity:'Prepare work area',hazards:'Traffic interaction',controls:'Establish separation before work',implementation:'Check separation before unloading',owner:'Site supervisor'}]}}});
  }
  if(u.pathname.endsWith('/swms')){
   if(route.request().method()==='POST'){posted=route.request().postDataJSON();items.push({kind:'request',id:42,title:'SWMS — '+posted.title,reference:'Request #42',status:'Submitted',version:'Draft',file_name:'SWMS-draft.docx',document_links:[contract]});return route.fulfill({status:201,json:{request:{id:42}}});}
   return route.fulfill(failList?{status:503,json:{message:'Register unavailable. Retry.'}}:{json:{items}});
  }
  if(u.pathname.endsWith('/auth/my-roles'))return route.fulfill({json:{roles:[]}});
  if(u.pathname.endsWith('/my-actions'))return route.fulfill({json:{actions:[]}});
  return route.abort();
 });
 await page.goto('https://vero.test/safe-work-method-statement.html?contract_id=8');if(!holdAuth)await page.locator('#swmsTotal').filter({hasText:'2'}).waitFor();
 return {browser,page,releaseAuth,get posted(){return posted;},fail:()=>failList=true,failAi:()=>failAi=true,get assistCalls(){return assistCalls;}};
}
test('desktop generation saves to the selected service; summaries, search, links and failures work',async()=>{
 const s=await screen();try{const p=s.page;
 assert.equal(await p.locator('#swmsCurrent').textContent(),'1');assert.equal(await p.locator('#swmsDue').textContent(),'1');
 assert.equal(await p.locator('#swmsStatus').textContent(),'');assert.equal(await p.locator('#swmsStatus').isVisible(),false);assert.equal(await p.locator('#swmsRows a').count(),0);assert.equal(await p.locator('#swmsRows tr').first().locator('td').nth(1).innerText(),contract.label);
 await p.locator('#swmsGenerate').click();await p.locator('#swmsDialog').waitFor({state:'visible'});const rect=await p.locator('#swmsDialog').boundingBox();assert.equal(rect.x+rect.width,1440);assert.equal(rect.y,0);assert.equal(rect.height,1000);if(process.env.VERO_SWMS_SCREENSHOTS)await p.screenshot({path:path.join(root,'tests/swms-drawer-desktop.png')});await p.locator('#swmsManual').click();assert.equal(await p.locator('#swmsContract').inputValue(),'8');
 for(const [name,value] of Object.entries({title:'Camera maintenance',location:'Eastern Creek',responsible_person:'Site supervisor',scope:'Maintain camera system',emergency:'Site emergency plan and first aid'}))await p.locator('[name="'+name+'"]').fill(value);
 await tickWorkers(p,'#swmsForm');await openHighRisk(p,'#swmsForm');assert.equal(await p.locator('#swmsForm .swms-high-risk-choices input').count(),19);await p.locator('#swmsForm .swms-high-risk-choices input').first().check();
 for(const input of await p.locator('.swms-step [data-field]').all())await input.fill('Site-specific '+await input.getAttribute('data-field'));
 await fillRisk(p);await p.locator('[name=ppe][value="Gloves"]').check();assert.match(await p.locator('.swms-risk output').first().textContent(),/30 · Moderate/);
 await p.locator('#swmsReviewConfirmed').check();await p.locator('#swmsSubmit').click();await p.locator('#swmsDialog').waitFor({state:'hidden'});await p.locator('#swmsTotal').filter({hasText:'3'}).waitFor();
 assert.equal(s.posted.contract_id,8);assert.equal(s.posted.steps.length,1);assert.equal(s.posted.review_confirmed,true);
 assert.equal(s.posted.steps[0].risks[0].initial_impact,3);assert.equal(s.posted.steps[0].risks[0].residual_likelihood,10);assert.deepEqual(s.posted.ppe,['Gloves']);
 assert.equal(await p.locator('#swmsPending').textContent(),'1');assert.match(await p.locator('#swmsSaved').textContent(),/Request #42/);
 await p.locator('#swmsSearch').fill('Camera maintenance');assert.equal(await p.locator('#swmsRows tr').count(),1);
 await p.locator('#swmsSearch').fill('');await p.locator('#swmsStateFilter').selectOption('pending');assert.equal(await p.locator('#swmsRows tr').count(),1);
 await p.locator('#swmsStateFilter').selectOption('');
 if(process.env.VERO_SWMS_SCREENSHOTS)await p.screenshot({path:path.join(root,'tests/swms-desktop.png'),fullPage:true});
 s.fail();await p.locator('#swmsRefresh').click();await p.getByText('Register unavailable. Retry.').waitFor();assert.equal(await p.locator('#swmsTotal').textContent(),'—');assert.equal(await p.locator('#swmsRows tr').count(),0);
 }finally{await s.browser.close();}
});
test('mobile layout and work-step controls remain usable',async()=>{
 const s=await screen(390);try{const p=s.page;assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.locator('#swmsGenerate').click();await p.locator('#swmsManual').click();await p.locator('#swmsAddStep').click();assert.equal(await p.locator('.swms-step').count(),2);await p.getByRole('button',{name:'Remove step'}).last().click();assert.equal(await p.locator('.swms-step').count(),1);
 assert.ok(await p.locator('#swmsDialog').evaluate(e=>e.getBoundingClientRect().width<innerWidth));const rect=await p.locator('#swmsDialog').boundingBox();assert.equal(rect.x+rect.width,390);assert.equal(rect.y,0);assert.equal(rect.height,1000);if(process.env.VERO_SWMS_SCREENSHOTS)await p.screenshot({path:path.join(root,'tests/swms-drawer-mobile.png')});
 await p.locator('#swmsClose').click();if(process.env.VERO_SWMS_SCREENSHOTS)await p.screenshot({path:path.join(root,'tests/swms-mobile.png'),fullPage:true});
 }finally{await s.browser.close();}
});

test('question-led AI intake prefills only after enough answers, exposes sources and requires review before saving',async()=>{
 const s=await screen();try{const p=s.page;await p.locator('#swmsGenerate').click();assert.equal(await p.locator('#swmsForm').isVisible(),false);
 await p.locator('#swmsAnswer').fill('Replace a roadside camera at Eastern Creek NSW, Australia, next to live traffic.');await p.locator('#swmsAsk').click();
 await p.getByText('Will the work area be separated from live traffic, and who will supervise?',{exact:true}).waitFor();assert.equal(await p.locator('#swmsForm').isVisible(),false);assert.equal(s.posted,undefined);
 await p.locator('#swmsAnswer').fill('Closed work bay with traffic separation, supervised by the site supervisor.');await p.locator('#swmsAsk').click();await p.locator('#swmsForm').waitFor({state:'visible'});
 assert.equal(await p.locator('[name=title]').inputValue(),'Camera replacement');assert.equal(await p.locator('[name=consultation]').inputValue(),'');assert.equal(await p.locator('[data-risk-field=controls]').inputValue(),'Establish separation before work');
 assert.equal(await p.locator('#swmsAiContext a').getAttribute('href'),'documents.html?document=12');await p.getByText('Confirm emergency contacts.',{exact:true}).waitFor();assert.equal(s.posted,undefined);
 if(process.env.VERO_SWMS_SCREENSHOTS)await p.screenshot({path:path.join(root,'tests/swms-ai-review.png'),fullPage:true});
 await tickWorkers(p,'#swmsForm');await openHighRisk(p,'#swmsForm');assert.equal(await p.locator('#swmsForm .swms-high-risk-choices input').count(),19);await p.locator('#swmsForm .swms-high-risk-choices input').first().check();assert.equal(await p.locator('[data-field=action],[data-field=implementation],[data-field=owner]').count(),0);await fillRisk(p);await p.locator('#swmsReviewConfirmed').check();await p.locator('#swmsSubmit').click();assert.equal(s.posted,undefined);
 await p.locator('#swmsAiConfirmed').check();await p.locator('#swmsSubmit').click();await p.locator('#swmsDialog').waitFor({state:'hidden'});
 assert.equal(s.posted.ai_assisted,true);assert.equal(s.posted.ai_review_confirmed,true);assert.deepEqual(s.posted.ai_sources,[{document_id:12,version:'2.0'}]);assert.equal(s.assistCalls,2);
 }finally{await s.browser.close();}
});
test('AI failure retains the answer and permits manual drafting without creating a request',async()=>{
 const s=await screen();try{const p=s.page;s.failAi();await p.locator('#swmsGenerate').click();await p.locator('#swmsAnswer').fill('Work description retained');await p.locator('#swmsAsk').click();await p.getByText(/AI temporarily unavailable/).waitFor();
 assert.equal(await p.locator('#swmsAnswer').inputValue(),'Work description retained');assert.equal(s.posted,undefined);await p.locator('#swmsManual').click();assert.equal(await p.locator('#swmsForm').isVisible(),true);assert.equal(await p.locator('#swmsAiReviewLabel').isVisible(),false);
 }finally{await s.browser.close();}
});


test('header is visible while sign-in is pending and workspace stays gated',async()=>{
 const s=await screen(1440,true);try{const p=s.page;
 await p.locator('.global-hero').waitFor({state:'visible'});
 assert.equal(await p.locator('.global-hero h1').textContent(),'Safe Work Method Statements');
 assert.equal(await p.locator('#swmsGenerate').isVisible(),false);
 assert.equal(await p.locator('.hero-tools').isVisible(),false);
 const hero=await p.locator('.global-hero').boundingBox();
 const loader=await p.locator('#veroPageLoader').boundingBox();assert.ok(loader.y>=hero.y+hero.height-1);
 s.releaseAuth();await p.locator('#swmsTotal').filter({hasText:'2'}).waitFor();await p.locator('#swmsGenerate').waitFor({state:'visible'});
 assert.equal(await p.locator('#heights-auth-status').isVisible(),false);
 }finally{s.releaseAuth();await s.browser.close();}
});


test('long conversations scroll inside the chat while composer and controls stay visible',async()=>{
 for(const width of [1440,390]){
 const s=await screen(width);try{const p=s.page;await p.setViewportSize({width,height:740});
 await p.route('**/swms/assist',route=>route.fulfill({json:{stage:'question',question:'Will you be working beside live traffic, or in a closed work area?',sources:[],gaps:[]}}));
 await p.locator('#swmsGenerate').click();
 const before=await p.locator('#swmsAnswer').boundingBox();
 for(let i=0;i<7;i++){await p.locator('#swmsAnswer').fill('Example answer '+i+' describing the roadside camera work and traffic arrangements.');await p.locator('#swmsAsk').click();await p.locator('#swmsAsk').filter({hasText:'Send answer'}).waitFor();}
 await p.waitForFunction(()=>{const log=document.getElementById('swmsConversation');return log.scrollHeight-log.clientHeight-log.scrollTop<=2;});
 const metrics=await p.evaluate(()=>{const d=document.getElementById('swmsDialog'),log=document.getElementById('swmsConversation'),answer=document.getElementById('swmsAnswer');return {drawer:d.scrollHeight-d.clientHeight,overflow:log.scrollHeight-log.clientHeight,bottom:log.scrollHeight-log.clientHeight-log.scrollTop,answer:answer.getBoundingClientRect().y};});
 assert.ok(metrics.drawer<=1,'drawer must not scroll during chat');assert.ok(metrics.overflow>0,'history must contain its own overflow');assert.ok(metrics.bottom<=2,'latest message is in view');assert.ok(Math.abs(metrics.answer-before.y)<=1,'answer box must stay in place');
 for(const id of ['swmsAsk','swmsManual','swmsRestart']){const box=await p.locator('#'+id).boundingBox();assert.ok(box.y>=0&&box.y+box.height<=740,id+' stays visible');}
 if(process.env.VERO_SWMS_SCREENSHOTS)await p.screenshot({path:path.join(root,'tests/swms-contained-'+width+'.png')});
 await p.locator('#swmsManual').click();assert.equal(await p.locator('#swmsForm').isVisible(),true);assert.equal(await p.locator('#swmsDialog').evaluate(d=>getComputedStyle(d).overflowY),'auto');
 }finally{await s.browser.close();}
 }
});


test('compact SWMS rows open the digital drawer by click or keyboard without hyperlinks or metadata lines',async()=>{
 const s=await screen();try{const p=s.page;
 await p.route(/\/swms(?:\?|$)/,route=>route.fulfill({json:{items:initial.map((item,index)=>({...item,title:'Maintenance, Inspection, Cleaning and Calibration Activities, '+(index?'Low Risk':'Waterview Tunnel')}))}}));await p.locator('#swmsRefresh').click();await p.getByRole('button',{name:'Maintenance, Inspection, Cleaning and Calibration Activities, Waterview Tunnel',exact:true}).waitFor();
 const ending=p.locator('#swmsRows tr').first().locator('.swms-title-ending');assert.equal(await ending.innerText(),'Waterview Tunnel');assert.equal(await ending.evaluate(e=>e.scrollWidth<=e.clientWidth),true);
 await p.route('**/swms/documents/10',route=>route.fulfill({json:{id:10,title:'SWMS deployment',reference:'S10',version:'7.0',status:'Current',can_edit:false,fields:digitalFields(),history:[{version:'7.0',status:'Current'}]}}));
 assert.equal(await p.getByRole('link',{name:'Open document',exact:true}).count(),0);assert.equal(await p.locator('.swms-table th').count(),5);
 await p.locator('#swmsRows tr').first().locator('td').nth(2).click();await p.locator('#swmsDocumentDialog').waitFor({state:'visible'});await p.getByText('Only Administrators or users with the HSEQ role can edit a current SWMS.',{exact:true}).waitFor();assert.match(p.url(),/safe-work-method-statement/);
 const rect=await p.locator('#swmsDocumentDialog').boundingBox();assert.equal(rect.x+rect.width,1440);assert.equal(rect.y,0);assert.equal(rect.height,1000);
 await p.getByRole('button',{name:'Close SWMS',exact:true}).click();await p.locator('#swmsRows tr').first().focus();await p.keyboard.press('Enter');await p.locator('#swmsDocumentDialog').waitFor({state:'visible'});
 await p.getByRole('button',{name:'Close SWMS',exact:true}).click();
 assert.equal(await p.locator('#swmsRows a,#swmsRows small,#swmsRows br').count(),0);
 assert.equal(await p.locator('#swmsRows tr').first().locator('td').nth(1).innerText(),contract.label);
 assert.equal(await p.locator('#swmsRows .swms-title-button').first().evaluate(e=>getComputedStyle(e).textDecorationLine),'none');
 assert.equal(await p.locator('#swmsRows tr').first().locator('td').first().evaluate(e=>getComputedStyle(e).whiteSpace),'nowrap');
 }finally{await s.browser.close();}
});
function digitalFields(){return {...Object.fromEntries(['title','location','responsible_person','scope','high_risk_work','site_conditions','consultation','resources','emergency','monitoring'].map(k=>[k,'Recorded '+k])),ppe:['Hi-vis'],competencies:['White Card'],jurisdiction:'NSW',emergency_number:'000',steps:[{activity:'Set up',action:'Set up separation',hazards:'Traffic',controls:'Separate work area',implementation:'Supervisor checks',owner:'Supervisor',risks:[{hazards:'Traffic',controls:'Separate work area',initial_impact:4,initial_likelihood:20,residual_impact:2,residual_likelihood:5}]}]};}
test('HSEQ editing submits a versioned revision and retains changes on failure',async()=>{
 const s=await screen();try{const p=s.page;let posted,deny=true;
 await p.route('**/swms/documents/10',route=>route.fulfill({json:{id:10,title:'SWMS deployment',reference:'S10',version:'7.0',status:'Current',can_edit:true,fields:digitalFields(),history:[]}}));
 await p.route('**/swms/documents/10/revisions',route=>{posted=route.request().postDataJSON();return route.fulfill(deny?{status:403,json:{message:'Only users with the HSEQ role can edit a SWMS.'}}:{status:201,json:{request:{id:88}}});});
 await p.locator('#swmsRows tr').first().locator('td').nth(2).click();await p.getByRole('button',{name:'Edit SWMS',exact:true}).click();
 await p.locator('#swmsDocumentDialog [name=scope]').fill('Updated roadside scope');await p.locator('#swmsDocumentDialog [name=change_reason]').fill('Improve separation controls');await p.locator('#swmsDocumentDialog section:last-child input[type=checkbox]').check();await p.getByRole('button',{name:'Submit revision for review',exact:true}).click();
 await p.getByText('Only users with the HSEQ role can edit a SWMS. Your changes are retained.',{exact:true}).waitFor();assert.equal(await p.locator('#swmsDocumentDialog [name=scope]').inputValue(),'Updated roadside scope');
 deny=false;await p.getByRole('button',{name:'Submit revision for review',exact:true}).click();await p.getByText('Revision submitted for review.',{exact:true}).waitFor();assert.equal(posted.expected_version,'7.0');assert.equal(posted.change_reason,'Improve separation controls');assert.equal(posted.review_confirmed,true);assert.deepEqual(posted.ppe,['Hi-vis']);assert.deepEqual(posted.competencies,['White Card']);assert.equal(posted.steps[0].risks[0].initial_impact,4);assert.equal(posted.emergency_number,'000');
 }finally{await s.browser.close();}
});
test('legacy SWMS shows a controlled-record link without embedding or fetching the file',async()=>{
 const s=await screen(390);try{const p=s.page;
 await p.route('**/swms/documents/10',route=>route.fulfill({json:{id:10,title:'Legacy SWMS',version:'7.0',status:'Current',can_edit:true,fields:null,conversion_required:true,history:[]}}));
 let contentRequests=0;await p.route('**/swms/documents/10/content',route=>{contentRequests++;return route.abort();});
 await p.locator('#swmsRows tr').first().locator('td').nth(2).click();const link=p.getByRole('link',{name:'Open controlled SWMS record ↗',exact:true});await link.waitFor();assert.equal(await link.getAttribute('href'),'documents.html?document=10');assert.equal(await link.getAttribute('target'),'_blank');assert.equal(await p.locator('#swmsDocumentDialog iframe,#swmsDocumentDialog canvas').count(),0);assert.equal(contentRequests,0);assert.match(p.url(),/safe-work-method-statement/);
 await p.getByRole('button',{name:'Create digital revision',exact:true}).click();assert.equal(await p.locator('#swmsDocumentDialog section:last-child input[type=checkbox]').count(),2);assert.equal(await p.locator('#swmsDocumentDialog [name=scope]').inputValue(),'');
 const rect=await p.locator('#swmsDocumentDialog').boundingBox();assert.equal(rect.x+rect.width,390);assert.equal(rect.height,1000);
 if(process.env.VERO_SWMS_SCREENSHOTS)await p.screenshot({path:path.join(root,'tests/swms-digital-edit-mobile.png')});
 }finally{await s.browser.close();}
});


test('imported Practice Note opens prefilled in the drawer without requiring invented risks',async()=>{
 const s=await screen();try{const p=s.page;
 const fields={...digitalFields(),document_type:'Practice Note',scope:'Existing NZTA maintenance scope',location:'',steps:[{activity:'Pre Start',action:'Notify NZTA before work',hazards:'',controls:'',implementation:'',owner:''}]};
 await p.route('**/swms/documents/10',route=>route.fulfill({json:{id:10,title:'NZTA Low Risk',document_type:'Practice Note',version:'0.1',status:'Draft',can_edit:true,fields,conversion_required:true,review_points:['No approval date was recorded in Cognito.'],history:[]}}));
 await p.locator('#swmsRows tr').first().locator('td').nth(2).click();await p.getByText('No approval date was recorded in Cognito.',{exact:true}).waitFor();await p.getByRole('link',{name:'Open Practice Note record ↗',exact:true}).waitFor();
 if(process.env.VERO_SWMS_SCREENSHOTS)await p.screenshot({path:path.join(root,'tests/swms-admin-edit-preview.png')});
 await p.getByRole('button',{name:'Edit draft',exact:true}).click();
 assert.equal(await p.locator('#swmsDocumentDialog [name=scope]').inputValue(),'Existing NZTA maintenance scope');
 assert.equal(await p.locator('#swmsDocumentDialog [name=action]').inputValue(),'Notify NZTA before work');
 assert.equal(await p.locator('#swmsDocumentDialog [name=location]').getAttribute('required'),null);
 assert.equal(await p.locator('#swmsDocumentDialog [name=hazards]').count(),0);
 assert.notEqual(await p.locator('#swmsDocumentDialog [name=action]').getAttribute('required'),null);
 await p.getByRole('button',{name:'Submit draft for review',exact:true}).waitFor();
 assert.equal(await p.locator('#swmsDocumentDialog iframe,#swmsDocumentDialog canvas').count(),0);
 }finally{await s.browser.close();}
});


test('SWMS drawer aligns each hazard with its own initial rating, controls and residual rating when viewing and editing',async()=>{
 const s=await screen();try{const p=s.page,fields=digitalFields();
 fields.steps[0].risks.push({hazards:'Uneven ground',controls:'Inspect access path',initial_impact:2,initial_likelihood:10,residual_impact:1,residual_likelihood:5});
 fields.steps[0].hazards='Traffic and uneven ground combined';fields.steps[0].controls='Combined controls must not be repeated';
 await p.route('**/swms/documents/10',route=>route.fulfill({json:{id:10,title:'SWMS deployment',version:'7.0',status:'Current',can_edit:true,fields,history:[]}}));
 await p.locator('#swmsRows tr').first().click();await p.locator('#swmsDocumentDialog .swms-risk-table').waitFor();
 assert.equal(await p.locator('.swms-requirements').isVisible(),true);assert.match(await p.locator('.swms-requirements').innerText(),/Competency requirements[\s\S]*White Card[\s\S]*PPE requirements[\s\S]*Hi-vis/);
 assert.equal(await p.getByText('Recorded scope',{exact:true}).isVisible(),true);assert.equal(await p.getByText('Recorded emergency',{exact:true}).isVisible(),true);assert.equal(await p.locator('.swms-section-heading').count(),5);
 const table=p.locator('#swmsDocumentDialog .swms-risk-table');assert.deepEqual(await table.locator('thead th').allTextContents(),['Step','Hazard','Risk assessment','Controls','Residual risk']);
 const rows=table.locator('tbody tr');assert.equal(await rows.count(),2);assert.equal(await rows.first().locator('td').first().getAttribute('rowspan'),'2');
 assert.equal(await rows.first().locator('td').nth(1).innerText(),'Traffic');assert.equal(await rows.first().locator('td').nth(3).innerText(),'Separate work area');
 assert.equal(await rows.nth(1).locator('td').first().innerText(),'Uneven ground');assert.equal(await rows.nth(1).locator('td').nth(2).innerText(),'Inspect access path');assert.match(await rows.nth(1).locator('td').nth(1).innerText(),/20 · Moderate/);assert.match(await rows.nth(1).locator('td').nth(3).innerText(),/5 · Low/);
 await p.setViewportSize({width:390,height:1000});assert.ok(await p.locator('#swmsDocumentDialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));assert.equal(await p.locator('.swms-requirements').isVisible(),true);if(process.env.VERO_SWMS_SCREENSHOTS)await p.screenshot({path:path.join(root,'tests/swms-readable-mobile.png')});await p.setViewportSize({width:1440,height:1000});
 assert.equal(await p.getByText('Combined controls must not be repeated',{exact:true}).count(),0);if(process.env.VERO_SWMS_SCREENSHOTS)await p.screenshot({path:path.join(root,'tests/swms-risk-grid-preview.png')});
 await p.getByRole('button',{name:'Edit SWMS',exact:true}).click();const risk=p.locator('.swms-digital-risk').nth(1);
 assert.equal(await p.locator('form.swms-readable-editor .swms-section-heading').count(),6);
 assert.equal(await p.locator('#swmsDocumentDialog [data-step=action],#swmsDocumentDialog [data-step=implementation],#swmsDocumentDialog [data-step=owner]').count(),0);
 assert.equal(await p.locator('form .swms-document-section').nth(0).locator('[name=scope]').inputValue(),'Recorded scope');
 assert.equal(await p.locator('form .swms-document-section').nth(1).locator('[name=competencies]').inputValue(),'White Card');
 assert.equal(await p.locator('form .swms-document-section').nth(2).locator('[name=ppe]').inputValue(),'Hi-vis');
 assert.equal(await p.locator('form .swms-document-section').nth(5).locator('[name=change_reason]').getAttribute('required'),'');
 if(process.env.VERO_SWMS_SCREENSHOTS)await p.screenshot({path:path.join(root,'tests/swms-readable-editor-desktop.png')});
 await p.setViewportSize({width:390,height:1000});assert.ok(await p.locator('#swmsDocumentDialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
 if(process.env.VERO_SWMS_SCREENSHOTS)await p.screenshot({path:path.join(root,'tests/swms-readable-editor-mobile.png')});await p.setViewportSize({width:1440,height:1000});
 assert.equal(await risk.locator('[data-risk=hazards]').inputValue(),'Uneven ground');assert.equal(await risk.locator('[data-risk=controls]').inputValue(),'Inspect access path');
 if(process.env.VERO_SWMS_SCREENSHOTS){await p.locator('#swmsDocumentDialog .swms-risk-table').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(root,'tests/swms-risk-editor-preview.png')});}await risk.locator('[data-risk=residual_impact]').selectOption('3');assert.match(await risk.locator('output').last().innerText(),/15 · Low/);
 let posted;await p.route('**/swms/documents/10/revisions',route=>{posted=route.request().postDataJSON();return route.fulfill({status:201,json:{request:{id:88}}});});
 await p.locator('#swmsDocumentDialog [name=change_reason]').fill('Review each risk separately');await p.locator('#swmsDocumentDialog section:last-child input[type=checkbox]').check();await p.getByRole('button',{name:'Submit revision for review',exact:true}).click();await p.getByText('Revision submitted for review.',{exact:true}).waitFor();
 assert.equal(posted.steps.length,1);for(const key of ['action','implementation','owner'])assert.equal(Object.hasOwn(posted.steps[0],key),false);assert.equal(posted.steps[0].risks.length,2);assert.equal(posted.steps[0].risks[0].controls,'Separate work area');assert.equal(posted.steps[0].risks[1].controls,'Inspect access path');assert.equal(posted.steps[0].risks[1].residual_impact,3);
 }finally{await s.browser.close();}
});


test('responsible person uses current users, retains saved names and retries without losing edits',async()=>{
 const s=await screen();try{const p=s.page;let fail=true,posted;
 await p.route('**/users/active',route=>{const deny=fail;fail=false;return route.fulfill(deny?{status:503,json:{message:'Unavailable'}}:{json:{users:[{id:3,name:'Sam Taylor',email:'sam@example.com'},{id:4,name:'Casey Lee',email:'casey@example.com'},{id:5,name:'Inactive User',active:false}]}});});
 await p.route('**/swms/documents/10',route=>route.fulfill({json:{id:10,title:'SWMS deployment',version:'7.0',status:'Current',can_edit:true,fields:digitalFields(),history:[]}}));
 await p.route('**/swms/documents/10/revisions',route=>{posted=route.request().postDataJSON();return route.fulfill({status:201,json:{request:{id:88}}});});
 await p.locator('#swmsRows tr').first().click();await p.getByRole('button',{name:'Edit SWMS',exact:true}).click();
 const picker=p.locator('select[name=responsible_person]');assert.equal(await picker.inputValue(),'Recorded responsible_person');
 await picker.locator('..').locator('..').getByRole('button',{name:'Retry users',exact:true}).waitFor({state:'visible'});await p.locator('#swmsDocumentDialog [name=scope]').fill('Updated scope remains');
 fail=false;await picker.locator('..').locator('..').getByRole('button',{name:'Retry users',exact:true}).click();await picker.locator('option').filter({hasText:'Casey Lee'}).waitFor({state:'attached'});
 assert.equal(await picker.inputValue(),'Recorded responsible_person');assert.equal(await picker.locator('option').filter({hasText:'Inactive User'}).count(),0);
 assert.equal(await p.locator('#swmsDocumentDialog [name=scope]').inputValue(),'Updated scope remains');await picker.selectOption('Casey Lee');await tickWorkers(p,'#swmsDocumentDialog');await openHighRisk(p,'#swmsDocumentDialog');const categories=p.locator('#swmsDocumentDialog .swms-high-risk-choices');await categories.getByLabel('None of the listed categories identified',{exact:true}).check();assert.equal(await categories.locator('input:checked').count(),1);await categories.getByLabel('Falls over 2 metres',{exact:true}).check();assert.equal(await categories.getByLabel('None of the listed categories identified',{exact:true}).isChecked(),false);await categories.getByLabel('Diving work',{exact:true}).check();
 if(process.env.VERO_SWMS_SCREENSHOTS){await p.locator('#swmsDocumentDialog .swms-high-risk-picker summary').click();await p.locator('#swmsDocumentDialog .swms-user-picker .swms-checkbox-dropdown summary').click();await p.locator('#swmsDocumentDialog .swms-high-risk-picker').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(root,'tests/swms-checkbox-dropdowns-preview.png')});}
 await p.locator('#swmsDocumentDialog [name=change_reason]').fill('Assign responsible person');await p.locator('#swmsDocumentDialog section:last-child input[type=checkbox]').check();await p.getByRole('button',{name:'Submit revision for review',exact:true}).click();
 await p.getByText('Revision submitted for review.',{exact:true}).waitFor();assert.equal(posted.responsible_person,'Casey Lee');assert.equal(posted.consultation,'Casey Lee\nSam Taylor');assert.equal(posted.high_risk_work,'Falls over 2 metres\nDiving work');assert.equal(await p.locator('[name=site_conditions],[name=resources],[name=monitoring]').count(),0);assert.equal(posted.expected_version,'7.0');
 }finally{await s.browser.close();}
});
