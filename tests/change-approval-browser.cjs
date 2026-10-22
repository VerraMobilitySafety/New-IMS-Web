const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.join(__dirname,'..'),out=path.join(root,'..','outputs','change-approval-preview');fs.mkdirSync(out,{recursive:true});
const cid='11111111-1111-4111-8111-111111111111';
const options={classification_categories:[{id:1,tier:4,name:'Operations'}],classification_relationships:[],users:[{id:7,name:'Owner'}],treatment_owners:[],controls:[],documents:[]};
const payload={title:'Workshop change',reason:'Reliability',scope:'Replace equipment',affected:'Workshop',planned_date:'2026-11-10',implementation:'Isolate and commission',consultation:'Brief team',rollback:'Retain unit',review_confirmed:true,risk:{risk_title:'Energisation',risk_description:'Unexpected energisation',classification_path:[1],risk_owner_user_id:7,inherent:{likelihood:3,impact:4},residual:{likelihood:2,impact:3},target:{likelihood:1,impact:3},controls_summary:'Isolation',treatments_summary:'Test',justification:'Credible exposure',control_ids:[],document_ids:[],treatment_actions:[]}};
(async()=>{const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';const browser=await chromium.launch({headless:true,...(fs.existsSync(chrome)?{executablePath:chrome}:{})});
try{for(const width of [1440,390]){
let manager=false,saved={id:cid,status:'Submitted',version:1,payload,updated_at:new Date().toISOString(),risk_id:81},writes=0,fail=false;
const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('vero_session_token','isolated-browser-test'));
const snapshot=()=>({...saved,can_approve:manager&&saved.status==='Submitted',can_implement:!manager&&saved.status==='Approved',can_close:!manager&&saved.status==='In progress',can_edit:false});
await page.route('**/*',async route=>{const u=new URL(route.request().url()),p=u.pathname;
if(u.hostname==='vero.test'){const f=path.join(root,p.slice(1));return route.fulfill({status:fs.existsSync(f)?200:404,body:fs.existsSync(f)?fs.readFileSync(f):'',contentType:f.endsWith('.html')?'text/html':f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'image/png'});}
if(u.hostname!=='verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net')return route.fulfill({body:'',contentType:p.endsWith('.js')?'application/javascript':'text/css'});
if(p.endsWith('/auth/me'))return route.fulfill({json:{user:{id:manager?9:7,first_name:'Test',last_name:manager?'Manager':'Owner',vero_role:'Employee'}}});
if(p.endsWith('/changes/options'))return route.fulfill({json:options});
if(p.endsWith('/changes'))return route.fulfill({json:{changes:[snapshot()]}});
if(p.endsWith('/changes/'+cid)){
if(route.request().method()==='PUT'){
writes++;if(fail)return route.fulfill({status:503,json:{message:'Temporary save failure'}});
const body=route.request().postDataJSON();assert.deepEqual(body.payload,payload,'approval and implementation use saved assessment');
saved={...saved,status:body.status,version:saved.version+1,...(['Approved','Rejected'].includes(body.status)?{decision_reason:body.decision_reason,decision_by:9,decision_at:new Date().toISOString()}:{})};
}return route.fulfill({json:{change:snapshot()}});}
return route.fulfill({json:{documents:[],resources:[]}});
});
await page.goto('https://vero.test/change-management.html?change_id='+cid);await page.locator('#changeDetails').waitFor({state:'visible'});
assert.equal(await page.locator('#changeSubmit').isVisible(),false);assert.equal(await page.locator('#changeApprove').isVisible(),false);assert.equal(await page.locator('#change_scope').isDisabled(),true);
assert.equal(await page.getByRole('link',{name:'Open linked Master Risk record'}).getAttribute('href'),'risk.html?risk_id=81');
manager=true;await page.reload();await page.locator('#changeApprove').waitFor({state:'visible'});
await page.locator('#changeApprove').click();await page.getByText('Enter a reason for your decision.').waitFor();assert.equal(writes,0);
await page.locator('#changeDecisionReason').fill('Controls and implementation plan reviewed.');fail=true;await page.locator('#changeApprove').click();await page.getByText('Temporary save failure',{exact:true}).waitFor();assert.equal(await page.locator('#changeDecisionReason').inputValue(),'Controls and implementation plan reviewed.');
await page.screenshot({path:path.join(out,'approval-'+width+'.png'),fullPage:true});
fail=false;await page.locator('#changeApprove').click();await page.getByText('Change saved.',{exact:true}).waitFor();assert.equal(saved.status,'Approved');assert.equal(await page.locator('#changeApprove').isVisible(),false);assert.equal(await page.locator('#changeSubmit').isVisible(),false);
manager=false;await page.reload();await page.getByRole('button',{name:'Start implementation',exact:true}).waitFor();await page.locator('#changeSubmit').click();await page.getByRole('button',{name:'Close change',exact:true}).waitFor();await page.locator('#changeSubmit').click();await page.getByText('This change is closed.',{exact:true}).waitFor();assert.equal(saved.status,'Closed');
saved={...saved,status:'Submitted'};manager=true;await page.reload();await page.locator('#changeReject').waitFor({state:'visible'});await page.locator('#changeDecisionReason').fill('More isolation controls required.');await page.locator('#changeReject').click();await page.getByText('Change saved.',{exact:true}).waitFor();assert.equal(saved.status,'Rejected');assert.equal(await page.locator('#changeSubmit').isVisible(),false);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);console.log('PASS change approval, locked assessment, note/retry, owner implementation, closure and rejection at '+width);await page.close();
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
