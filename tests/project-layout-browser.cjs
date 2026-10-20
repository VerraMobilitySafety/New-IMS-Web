const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../preview');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.INSURANCE_BROWSER?{executablePath:process.env.INSURANCE_BROWSER}:{})});try{
for(const width of [1440,1024,768,390]){
 const context=await browser.newContext({viewport:{width,height:1100}}),page=await context.newPage(),errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('vero_session_token','synthetic'));
 await page.route('**/*',route=>{const req=route.request(),u=new URL(req.url());if(u.hostname!=='vero.test'){
  if(!u.pathname.startsWith('/api/'))return route.abort();if(req.method()!=='GET'){writes.push(u.pathname);return route.fulfill({status:400,json:{message:'No mutations permitted in layout test'}})}
  const p=u.pathname.replace('/api','');let data={};
  if(p==='/auth/me')data={user:{id:1,first_name:'Preview',last_name:'User',email:'preview@example.test',vero_role:'User'}};
  if(p==='/users/lookup')data={users:[]};
  if(p==='/projects')data={projects:[
   {id:1,project_name:'Execution project',current_stage:'Project Execution',status:'In Progress',customer:'Example customer',action_required_by_user_id:1,action_required_by:'Preview User'},
   {id:2,project_name:'Restricted finance project',current_stage:'Finance Approval',status:'Submitted',action_required_by_user_id:2,action_required_by:'Another approver'},
   {id:3,project_name:'Closed project',current_stage:'Project Closed',status:'Closed'},
   {id:4,project_name:'Restricted draft project',current_stage:'New Project Request',status:'Draft',action_required_by_user_id:2,action_required_by:'Another owner'}]};
  if(p==='/project-reporting/finance')data={rows:[]};return route.fulfill({json:data});
 }
 const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});return route.fulfill({body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream'});
 });
 await page.goto('https://vero.test/project-management.html');await page.locator('#projectTableBody tr.project-row').first().waitFor();await page.locator('.vr-toolbar').waitFor();
 assert.equal(await page.locator('#lifeAll').innerText(),'4');assert.equal(await page.locator('#lifeInitiation').innerText(),'2');assert.equal(await page.locator('#lifeExecution').innerText(),'1');assert.equal(await page.locator('#lifeCompletion').innerText(),'1');
 await page.getByLabel('Filter project lifecycle').selectOption('execution');assert.equal(await page.locator('.project-row:visible').count(),1);
 await page.getByLabel('Search projects',{exact:true}).fill('missing');assert.equal(await page.locator('.project-row:visible').count(),0);await page.getByLabel('Search projects',{exact:true}).fill('');
 await page.locator('.lifecycle-card[data-filter="all"]').click();assert.equal(await page.getByLabel('Filter project lifecycle').inputValue(),'all');assert.equal(await page.locator('.project-row:visible').count(),4);
 for(const name of ['Restricted finance project','Restricted draft project']){const row=page.locator('.project-row').filter({hasText:name});assert.equal(await row.getAttribute('onclick'),null);assert.equal(await row.locator('a,button').count(),0,'restricted row must not gain workspace or workflow actions')}
 assert.equal(await page.locator('.project-row').filter({hasText:'Execution project'}).locator('a').getAttribute('href'),'project-workspace.html?id=1');
 assert.equal(await page.locator('.project-row').filter({hasText:'Execution project'}).locator('.next-step-action').count(),1);
 await page.getByRole('button',{name:'+ New Project',exact:true}).click();await page.locator('#setupPanel.show').waitFor();await page.locator('#setupPanel .setup-close').click();assert.equal(await page.locator('#setupPanel').isVisible(),false);
 await page.locator('#pfContent .reporting-totals').waitFor();assert.equal(await page.getByRole('heading',{name:'Monthly portfolio finance'}).isVisible(),true);
 await page.locator('#veroPageLoader').waitFor({state:'hidden'});await page.evaluate(()=>scrollTo(0,0));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);await page.screenshot({path:path.join(out,'project-management-register-'+width+'.png'),fullPage:true});
 console.log('PASS Project '+width+'px: shared layout, combined filters, metrics, protected rows, request dialog, portfolio dashboard; no writes');await context.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
