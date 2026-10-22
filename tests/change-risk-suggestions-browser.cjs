const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../outputs/change-suggestions-preview');fs.mkdirSync(out,{recursive:true});
const cid='11111111-1111-4111-8111-111111111111';
const assessment={risk_title:'Original risk',risk_description:'Original assessment',classification_path:[1],risk_owner_user_id:7,inherent:{likelihood:3,impact:4},residual:{likelihood:2,impact:3},target:{likelihood:1,impact:3},controls_summary:'Confirmed isolation',treatments_summary:'Test isolation',justification:'Reviewed basis',control_ids:[],document_ids:[],treatment_actions:[]};
const options={classification_categories:[{id:1,tier:4,name:'Operations'}],classification_relationships:[],users:[{id:7,name:'Test Owner',email:'owner@example.test'}],treatment_owners:[{id:7,name:'Test Owner',email:'owner@example.test'},{id:9,name:'Action Owner',email:'action@example.test'}],controls:[],documents:[]};
(async()=>{const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';const b=await chromium.launch({headless:true,...(fs.existsSync(chrome)?{executablePath:chrome}:{})});try{
for(const width of [1440,390]){
 const p=await b.newPage({viewport:{width,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
 let fail=false,requests=0,saved={id:cid,status:'Draft',version:1,updated_at:new Date().toISOString(),record_id:501,payload:{title:'Workshop change',scope:'Replace equipment',reason:'Reliability',affected:'Workshop',planned_date:'2026-11-10',implementation:'Isolate and test',consultation:'Brief team',rollback:'Retain unit',review_confirmed:false,risk:structuredClone(assessment)}};
 const draft={...saved.payload,risks:[{id:'22222222-2222-4222-8222-222222222222',assessment:{...structuredClone(assessment),risk_title:'Electrical contact',risk_owner_user_id:null,treatment_actions:[{title:'Verify isolation before removal',owner_user_id:null,due_date:''}]}},{id:'33333333-3333-4333-8333-333333333333',assessment:{...structuredClone(assessment),risk_title:'Lifting injury',risk_owner_user_id:null}},{id:'44444444-4444-4444-8444-444444444444',assessment:structuredClone(assessment)}]};
 await p.addInitScript(()=>localStorage.setItem('vero_session_token','isolated-suggestions-test'));
 await p.route('**/*',async route=>{const u=new URL(route.request().url()),url=u.pathname;
  if(u.hostname==='vero.test'){const file=path.join(root,url.slice(1));return route.fulfill({status:fs.existsSync(file)?200:404,body:fs.existsSync(file)?fs.readFileSync(file):'',contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'image/png'});}
  if(!url.startsWith('/api/'))return route.fulfill({body:'',contentType:url.endsWith('.js')?'application/javascript':'text/css'});
  if(url.endsWith('/auth/me'))return route.fulfill({json:{user:{id:7,first_name:'Test',last_name:'Owner',vero_role:'Employee'}}});
  if(url.endsWith('/changes/options'))return route.fulfill({json:options});
  if(url.endsWith('/changes/assist')){
   requests++;const body=route.request().postDataJSON();assert.ok(['suggest_risks','change'].includes(body.mode));assert.ok(body.messages.every(m=>m.content.length<=4000));
   if(fail)return route.fulfill({status:503,json:{message:'AI temporarily unavailable.'}});
   return route.fulfill({json:{stage:'draft',draft,gaps:['Confirm controls and select action owners.'],sources:[]}});
  }
  if(url.endsWith('/changes'))return route.fulfill({json:{changes:[saved]}});
  if(url.includes('/changes/')){
   if(route.request().method()==='PUT'){const body=route.request().postDataJSON();saved={...saved,id:url.split('/').pop(),status:body.status,version:saved.version+1,payload:body.payload};}
   return route.fulfill({json:{change:saved}});
  }
  return route.fulfill({json:{documents:[],actions:[]}});
 });
 await p.goto('https://vero.test/change-management.html?change_id='+cid);await p.locator('#changeSuggestRisks').waitFor({state:'visible'});
 fail=true;await p.locator('#changeSuggestRisks').click();await p.getByText(/AI temporarily unavailable/).waitFor();assert.equal(await p.locator('.change-risk-entry').count(),1);fail=false;
 await p.locator('#changeSuggestRisks').click();await p.getByRole('button',{name:'Add selected risks',exact:true}).waitFor();
 assert.equal(await p.locator('.change-risk-entry').count(),1,'Suggestions never overwrite the form before review');
 const choices=p.locator('.change-risk-suggestion input[type=checkbox]');assert.equal(await choices.count(),3);assert.equal(await choices.nth(2).isDisabled(),true,'Already included risk is excluded');
 await choices.nth(1).uncheck();await p.getByRole('button',{name:'Add selected risks',exact:true}).click();assert.equal(await p.locator('.change-risk-entry').count(),2);
 const second=p.locator('.change-risk-entry').nth(1);assert.equal(await second.getByLabel('Risk Title',{exact:true}).inputValue(),'Electrical contact');
 assert.equal(await p.locator('.change-risk-entry').first().getByLabel('Risk Title',{exact:true}).inputValue(),'Original risk');
 const action=second.locator('.risk-compact-actions');await action.getByLabel('Treatment Owner 1',{exact:true}).selectOption('9');await action.getByLabel('Treatment Due Date 1',{exact:true}).fill('2026-12-01');
 await second.getByRole('combobox',{name:'Risk Owner',exact:true}).fill('Test');await second.locator('.owner-options').getByRole('option',{name:/Test Owner/}).click();
 await p.locator('#changeDraft').click();await p.getByText('Change saved.',{exact:true}).waitFor();assert.equal(saved.payload.risks.length,2);assert.deepEqual(saved.payload.risks[1].assessment.treatment_actions,[{title:'Verify isolation before removal',owner_user_id:9,due_date:'2026-12-01'}]);
 await p.reload();await p.locator('#changeSuggestRisks').waitFor({state:'visible'});await p.locator('.change-risk-entry').nth(1).locator('summary').first().click();assert.equal(await p.getByLabel('Treatment Owner 1',{exact:true}).inputValue(),'9');
 await p.screenshot({path:path.join(out,'suggestions-'+width+'.png'),fullPage:true});
 await p.locator('#changeConfirmed').check();await p.locator('#changeSubmit').click();await p.getByText('Change saved.',{exact:true}).waitFor();assert.equal(saved.status,'Submitted');assert.equal(await p.locator('#changeSuggestRisks').isVisible(),false);
 assert.equal(saved.payload.risks[1].assessment.treatment_actions[0].owner_user_id,9);
 // A new change's question-led interview also opens every AI risk for human review, without a write.
 await p.locator('#changeClose').click();await p.locator('#changeNew').click();await p.locator('#changeAnswer').fill('Replace workshop equipment with confirmed isolation and lifting aids.');await p.locator('#changeSend').click();await p.locator('#changeSuggestRisks').waitFor({state:'visible'});assert.equal(await p.locator('.change-risk-entry').count(),3);assert.equal(requests,3);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);console.log('PASS reviewed AI risk selection, existing assessment preservation, action ownership, reload, submission and multi-risk intake at '+width);await p.close();
}
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
