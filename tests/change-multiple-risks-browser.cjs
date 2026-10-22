const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../outputs/change-multiple-preview');fs.mkdirSync(out,{recursive:true});
const cid='11111111-1111-4111-8111-111111111111';
const assessment={risk_title:'Original risk',risk_description:'Original assessment',classification_path:[1],risk_owner_user_id:7,inherent:{likelihood:3,impact:4},residual:{likelihood:2,impact:3},target:{likelihood:1,impact:3},controls_summary:'Confirmed isolation',treatments_summary:'Test isolation',justification:'Reviewed basis',control_ids:[],document_ids:[],treatment_actions:[]};
const options={classification_categories:[{id:1,tier:4,name:'Operations'}],classification_relationships:[],users:[{id:7,name:'Test Owner'}],treatment_owners:[],controls:[],documents:[]};
(async()=>{const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';const b=await chromium.launch({headless:true,...(fs.existsSync(chrome)?{executablePath:chrome}:{})});try{
for(const width of [1440,390]){
const p=await b.newPage({viewport:{width,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
let manager=false,aiTurn=0,saved={id:cid,status:'Draft',version:1,updated_at:new Date().toISOString(),record_id:501,payload:{title:'Workshop change',scope:'Replace equipment',reason:'Reliability',affected:'Workshop',planned_date:'2026-11-10',implementation:'Isolate and test',consultation:'Brief team',rollback:'Retain unit',review_confirmed:false,risk:structuredClone(assessment)}};
const snapshot=()=>({...saved,can_edit:saved.status==='Draft',can_approve:manager&&saved.status==='Submitted',can_implement:!manager&&saved.status==='Approved',linked_risks:saved.status==='Draft'?[]:saved.payload.risks.map((r,i)=>({risk_key:r.id,risk_id:81+i}))});
await p.addInitScript(()=>localStorage.setItem('vero_session_token','isolated-multiple-risk-test'));
await p.route('**/*',async route=>{const u=new URL(route.request().url()),url=u.pathname;
if(u.hostname==='vero.test'){const file=path.join(root,url.slice(1));return route.fulfill({status:fs.existsSync(file)?200:404,body:fs.existsSync(file)?fs.readFileSync(file):'',contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'image/png'});}
if(!url.startsWith('/api/'))return route.fulfill({body:'',contentType:url.endsWith('.js')?'application/javascript':'text/css'});
if(url.endsWith('/auth/me'))return route.fulfill({json:{user:{id:manager?9:7,first_name:'Test',last_name:manager?'Manager':'Owner',vero_role:'Employee'}}});
if(url.endsWith('/changes/options'))return route.fulfill({json:options});
if(url.endsWith('/changes/assist')){aiTurn++;const body=route.request().postDataJSON();assert.ok(body.messages[0].content.includes('Assess only this one risk'));return route.fulfill({json:aiTurn===1?{stage:'question',question:'What controls already exist for this risk?'}:{stage:'draft',draft:{risk:{...structuredClone(assessment),risk_title:'AI suggested second risk',risk_owner_user_id:null}},gaps:['Confirm the proposed controls.'],sources:[]}});}
if(url.endsWith('/changes'))return route.fulfill({json:{changes:[snapshot()]}});
if(url.endsWith('/changes/'+cid)){if(route.request().method()==='PUT'){const body=route.request().postDataJSON();saved={...saved,status:body.status,version:saved.version+1,payload:body.payload};}return route.fulfill({json:{change:snapshot()}});}
return route.fulfill({json:{documents:[],actions:[]}});});
await p.goto('https://vero.test/change-management.html?change_id='+cid);await p.locator('#changeAddRisk').waitFor({state:'visible'});
assert.equal(await p.locator('.change-risk-entry').count(),1);assert.equal(await p.locator('.risk-worksheet-ratings tbody tr').count(),1);
await p.locator('#changeAddRisk').click();assert.equal(await p.locator('.change-risk-entry').count(),2);assert.equal(await p.locator('.change-risk-entry[open]').count(),1);
let second=p.locator('.change-risk-entry').nth(1);await second.getByLabel('Risk Title',{exact:true}).fill('Second manual risk');await second.getByRole('button',{name:'AI help for this risk',exact:true}).click();
await second.getByLabel('Your answer',{exact:true}).fill('Assess manual handling during the replacement.');await second.getByRole('button',{name:'Ask Vero',exact:true}).click();await second.getByText('What controls already exist for this risk?').waitFor();
await second.getByLabel('Your answer',{exact:true}).fill('A lifting aid is already used.');await second.getByRole('button',{name:'Ask Vero',exact:true}).click();await second.getByRole('button',{name:'Apply draft to this risk',exact:true}).waitFor({state:'visible'});
assert.equal(await second.getByLabel('Risk Title',{exact:true}).inputValue(),'Second manual risk','AI does not overwrite before review');
await second.getByRole('button',{name:'Apply draft to this risk',exact:true}).click();assert.equal(await second.getByLabel('Risk Title',{exact:true}).inputValue(),'AI suggested second risk');
assert.equal(await p.locator('.change-risk-entry').first().getByLabel('Risk Title',{exact:true}).inputValue(),'Original risk','AI leaves other assessments unchanged');
await second.getByRole('combobox',{name:'Risk Owner',exact:true}).fill('Test');await second.getByRole('option',{name:'Test Owner',exact:true}).click();
await p.locator('#changeAddRisk').click();await p.locator('.change-risk-entry').last().getByRole('button',{name:'Remove risk',exact:true}).click();assert.equal(await p.locator('.change-risk-entry').count(),2);
await p.locator('#changeDraft').click();await p.getByText('Change saved.',{exact:true}).waitFor();assert.equal(saved.payload.risks.length,2);assert.equal(saved.payload.risks[0].id,cid);
await p.reload();await p.locator('#changeAddRisk').waitFor({state:'visible'});assert.equal(await p.locator('.change-risk-entry').count(),2);assert.equal(await p.locator('.change-risk-entry[open]').count(),1);
await p.locator('.change-risk-entry').nth(1).locator('summary').first().click();await p.locator('.change-risk-entry').first().locator('summary').first().click();
await p.screenshot({path:path.join(out,'multiple-'+width+'.png'),fullPage:true});
await p.locator('#changeConfirmed').check();await p.locator('#changeSubmit').click();await p.getByText('Change saved.',{exact:true}).waitFor();assert.equal(saved.payload.risks.length,2);assert.equal(saved.status,'Submitted');assert.equal(await p.locator('#changeAddRisk').isVisible(),false);
manager=true;await p.reload();await p.locator('#changeApprove').waitFor({state:'visible'});assert.equal(await p.getByRole('link',{name:/Open linked Master Risk [12]/}).count(),2);
await p.locator('#changeDecisionReason').fill('Reviewed both risk assessments.');await p.locator('#changeApprove').click();await p.getByText('Change saved.',{exact:true}).waitFor();assert.equal(saved.status,'Approved');assert.equal(saved.payload.risks.length,2);
assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);console.log('PASS multiple risks, isolated per-risk AI, compact table, add/remove, reload and complete approval package at '+width);await p.close();
}}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
