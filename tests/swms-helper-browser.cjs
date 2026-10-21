const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
const contract={type:'Contract',id:8,label:'C8 · Roadside Services',client:'Client A'};
const initial=[{kind:'document',id:10,title:'SWMS — Deployment',reference:'848-1503',status:'Current',version:'7.0',review_date:'2020-01-01',document_links:[contract]},
 {kind:'document',id:11,title:'SWMS — Old deployment',reference:'848-1503',status:'Superseded',version:'6.0',document_links:[contract]}];
async function screen(width=1440){
 const options={headless:true};if(process.env.VERO_CHROME_PATH)options.executablePath=process.env.VERO_CHROME_PATH;
 const browser=await chromium.launch(options),page=await browser.newPage({viewport:{width,height:1000}});let items=[...initial],posted,failList=false,assistCalls=0,failAi=false;
 await page.addInitScript(()=>localStorage.setItem('vero_session_token','test'));
 await page.route('**/*',async route=>{const u=new URL(route.request().url());
  if(u.hostname==='vero.test'){
   const file=path.join(root,u.pathname.slice(1));if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
   const type=file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'image/png';return route.fulfill({body:fs.readFileSync(file),contentType:type});
  }
  if(u.pathname.endsWith('/auth/me'))return route.fulfill({json:{user:{id:3,first_name:'Sam',last_name:'Taylor',vero_role:'Administrator'}}});
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
 await page.goto('https://vero.test/safe-work-method-statement.html?contract_id=8');await page.locator('#swmsTotal').filter({hasText:'2'}).waitFor();
 return {browser,page,get posted(){return posted;},fail:()=>failList=true,failAi:()=>failAi=true,get assistCalls(){return assistCalls;}};
}
test('desktop generation saves to the selected service; summaries, search, links and failures work',async()=>{
 const s=await screen();try{const p=s.page;
 assert.equal(await p.locator('#swmsCurrent').textContent(),'1');assert.equal(await p.locator('#swmsDue').textContent(),'1');
 assert.equal(await p.locator('#swmsRows a[href="maintenance-workspace.html?id=8"]').count(),2);
 await p.locator('#swmsGenerate').click();await p.locator('#swmsDialog').waitFor({state:'visible'});const rect=await p.locator('#swmsDialog').boundingBox();assert.equal(rect.x+rect.width,1440);assert.equal(rect.y,0);assert.equal(rect.height,1000);if(process.env.VERO_SWMS_SCREENSHOTS)await p.screenshot({path:path.join(root,'tests/swms-drawer-desktop.png')});await p.locator('#swmsManual').click();assert.equal(await p.locator('#swmsContract').inputValue(),'8');
 for(const [name,value] of Object.entries({title:'Camera maintenance',location:'Eastern Creek',responsible_person:'Site supervisor',scope:'Maintain camera system',high_risk_work:'Work near traffic — NSW',site_conditions:'Live road and public interface',consultation:'Crew briefing 22 October',resources:'Authorised crew and equipment',emergency:'Site emergency plan and first aid',monitoring:'Supervisor checks before and during work'}))await p.locator('[name="'+name+'"]').fill(value);
 for(const input of await p.locator('.swms-step [data-field]').all())await input.fill('Site-specific '+await input.getAttribute('data-field'));
 await p.locator('#swmsReviewConfirmed').check();await p.locator('#swmsSubmit').click();await p.locator('#swmsDialog').waitFor({state:'hidden'});await p.locator('#swmsTotal').filter({hasText:'3'}).waitFor();
 assert.equal(s.posted.contract_id,8);assert.equal(s.posted.steps.length,1);assert.equal(s.posted.review_confirmed,true);
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
 assert.equal(await p.locator('[name=title]').inputValue(),'Camera replacement');assert.equal(await p.locator('[name=consultation]').inputValue(),'');assert.equal(await p.locator('[data-field=controls]').inputValue(),'Establish separation before work');
 assert.equal(await p.locator('#swmsAiContext a').getAttribute('href'),'documents.html?document=12');await p.getByText('Confirm emergency contacts.',{exact:true}).waitFor();assert.equal(s.posted,undefined);
 if(process.env.VERO_SWMS_SCREENSHOTS)await p.screenshot({path:path.join(root,'tests/swms-ai-review.png'),fullPage:true});
 await p.locator('[name=consultation]').fill('Crew consulted and controls agreed.');await p.locator('#swmsReviewConfirmed').check();await p.locator('#swmsSubmit').click();assert.equal(s.posted,undefined);
 await p.locator('#swmsAiConfirmed').check();await p.locator('#swmsSubmit').click();await p.locator('#swmsDialog').waitFor({state:'hidden'});
 assert.equal(s.posted.ai_assisted,true);assert.equal(s.posted.ai_review_confirmed,true);assert.deepEqual(s.posted.ai_sources,[{document_id:12,version:'2.0'}]);assert.equal(s.assistCalls,2);
 }finally{await s.browser.close();}
});
test('AI failure retains the answer and permits manual drafting without creating a request',async()=>{
 const s=await screen();try{const p=s.page;s.failAi();await p.locator('#swmsGenerate').click();await p.locator('#swmsAnswer').fill('Work description retained');await p.locator('#swmsAsk').click();await p.getByText(/AI temporarily unavailable/).waitFor();
 assert.equal(await p.locator('#swmsAnswer').inputValue(),'Work description retained');assert.equal(s.posted,undefined);await p.locator('#swmsManual').click();assert.equal(await p.locator('#swmsForm').isVisible(),true);assert.equal(await p.locator('#swmsAiReviewLabel').isVisible(),false);
 }finally{await s.browser.close();}
});
