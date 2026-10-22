const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../outputs/change-suggestions-preview');fs.mkdirSync(out,{recursive:true});
const cid='11111111-1111-4111-8111-111111111111';
const assessment={risk_title:'Original risk',risk_description:'Original assessment',classification_path:[1],risk_owner_user_id:7,inherent:{likelihood:3,impact:4},residual:{likelihood:2,impact:3},target:{likelihood:1,impact:3},controls_summary:'Confirmed isolation',treatments_summary:'Test isolation',justification:'Reviewed basis',control_ids:[],document_ids:[],treatment_actions:[]};
const options={classification_categories:[{id:1,tier:4,name:'Operations'}],classification_relationships:[],users:[{id:7,name:'Test Owner',email:'owner@example.test'},{id:9,name:'Alex Contributor',email:'alex@example.test'},{id:11,name:'Sam Contributor',email:'sam@example.test'}],treatment_owners:[{id:7,name:'Test Owner',email:'owner@example.test'},{id:9,name:'Action Owner',email:'action@example.test'}],controls:[],documents:[]};
(async()=>{const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';const b=await chromium.launch({headless:true,...(fs.existsSync(chrome)?{executablePath:chrome}:{})});try{
for(const width of [1440,390]){
 const p=await b.newPage({viewport:{width,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
 let actor=7,saved={id:cid,status:'Draft',version:1,updated_at:new Date().toISOString(),owner_id:7,record_id:501,payload:{title:'Workshop change',scope:'Replace equipment',reason:'Reliability',affected:'Workshop',planned_date:'2026-11-10',implementation:'Isolate and test',consultation:'Brief team',rollback:'Retain unit',review_confirmed:false,risk:structuredClone(assessment)}};

 const allowed=()=>actor===7||(saved.payload.contributor_user_ids||[]).includes(actor);
 const snapshot=()=>({...saved,can_edit:saved.status==='Draft'&&allowed(),can_manage_contributors:saved.status==='Draft'&&actor===7,can_submit:saved.status==='Draft'&&actor===7});
 await p.addInitScript(()=>localStorage.setItem('vero_session_token','isolated-contributor-test'));
 await p.route('**/*',async route=>{const u=new URL(route.request().url()),url=u.pathname;
  if(u.hostname==='vero.test'){const file=path.join(root,url.slice(1));return route.fulfill({status:fs.existsSync(file)?200:404,body:fs.existsSync(file)?fs.readFileSync(file):'',contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'image/png'});}
  if(!url.startsWith('/api/'))return route.fulfill({body:'',contentType:url.endsWith('.js')?'application/javascript':'text/css'});
  if(url.endsWith('/auth/me'))return route.fulfill({json:{user:{id:actor,first_name:'Test',last_name:'User',vero_role:'Employee'}}});
  if(url.endsWith('/changes/options'))return route.fulfill({json:options});
  if(url.endsWith('/changes'))return route.fulfill({json:{changes:allowed()?[snapshot()]:[]}});
  if(url.endsWith('/changes/'+cid)){
   if(!allowed())return route.fulfill({status:404,json:{message:'Change not found.'}});
   if(route.request().method()==='PUT'){const body=route.request().postDataJSON();saved={...saved,status:body.status,version:saved.version+1,payload:body.payload};}
   return route.fulfill({json:{change:snapshot()}});
  }
  return route.fulfill({json:{documents:[],actions:[]}});
 });
 await p.goto('https://vero.test/change-management.html?change_id='+cid);await p.locator('#changeContributorsPicker').waitFor({state:'visible'});
 await p.locator('#changeContributorsSummary').click();await p.locator('#changeContributorsSearch').fill('Alex');await p.getByRole('checkbox',{name:'Alex Contributor · alex@example.test',exact:true}).check();
 await p.locator('#changeContributorsSearch').fill('Sam');await p.getByRole('checkbox',{name:'Sam Contributor · sam@example.test',exact:true}).check();
 assert.equal(await p.locator('#changeContributorsSummary').textContent(),'2 contributors selected');
 await p.locator('#changeDraft').click();await p.getByText('Change saved.',{exact:true}).waitFor();assert.deepEqual(saved.payload.contributor_user_ids,[9,11]);
 actor=9;await p.reload();await p.locator('#changeDraft').waitFor({state:'visible'});assert.equal(await p.locator('#changeSubmit').isVisible(),false);assert.equal(await p.locator('#change_title').isEnabled(),true);
 await p.locator('#changeContributorsSummary').click();assert.equal(await p.getByRole('checkbox',{name:'Sam Contributor · sam@example.test',exact:true}).isDisabled(),true);
 await p.locator('#change_reason').fill('Reviewed collaboratively');await p.locator('#changeDraft').click();await p.getByText('Change saved.',{exact:true}).waitFor();assert.equal(saved.payload.reason,'Reviewed collaboratively');assert.equal(saved.owner_id,7);
 actor=7;await p.reload();await p.locator('#changeDraft').waitFor({state:'visible'});await p.locator('#changeContributorsSummary').click();await p.getByRole('checkbox',{name:'Alex Contributor · alex@example.test',exact:true}).uncheck();
 await p.locator('#changeDraft').click();await p.getByText('Change saved.',{exact:true}).waitFor();assert.deepEqual(saved.payload.contributor_user_ids,[11]);
 actor=9;await p.reload();await p.getByText('This change is unavailable or you do not have access.',{exact:true}).waitFor();
 actor=11;saved.status='Submitted';await p.reload();await p.locator('#change_title').waitFor();assert.equal(await p.locator('#change_title').isDisabled(),true);assert.equal(await p.locator('#changeDraft').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('PASS contributor multi-select, search, draft editing, membership restrictions, revocation and submission lock at '+width);await p.close();
}
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
