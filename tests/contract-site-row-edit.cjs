const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('C:/Users/dbleasel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=path.join(__dirname,'..');
test('admin rows edit every site field, support keyboard and paging, preserve nested links and retry conflicts',async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try{for(const width of [1500,390]){
  const page=await browser.newPage({viewport:{width,height:1000}});page.setDefaultTimeout(12000);
  const sites=Array.from({length:51},(_,i)=>({id:i+1,site_code:'REF-'+(i+1),site_name:'Camera '+(i+1),address:'Road '+(i+1),status:'Active',owner_user_id:1,notes:'Existing notes',version:3,linked_contract_count:2}));
  let admin=true,conflict=true,deny=false;const posts=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('vero_session_token','fixture-only'));
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.pathname.endsWith('/maintenance-contracts'))return route.fulfill({json:{contracts:[{id:4,contract_code:'CT4',contract_name:'Test contract'}]}});
   if(u.pathname.endsWith('/details'))return route.fulfill({json:{sources:[],requirements:[]}});
   if(/\/maintenance-contracts\/4\/sites(?:\/\d+)?$/.test(u.pathname)){
    if(req.method()==='GET')return route.fulfill({json:{sites,can_manage:admin,users:[{id:1,name:'Current owner'},{id:2,name:'New owner'}],available_sites:[]}});
    const payload=req.postDataJSON();posts.push({path:u.pathname,payload});
    if(deny)return route.fulfill({status:403,json:{message:'Administrator access is required.'}});
    if(conflict)return route.fulfill({status:409,json:{message:'This shared site changed. Close and reopen it before saving.'}});
    const site=sites.find(s=>s.id===Number(u.pathname.split('/').pop()));Object.assign(site,payload,{version:site.version+1});return route.fulfill({json:{site}});
   }
   if(u.pathname.endsWith('/documents.html'))return route.fulfill({contentType:'text/html',body:'<h1>Site documents</h1>'});
   if(u.hostname!=='vero.test')return route.abort();
   const file=path.resolve(root,'.'+u.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   let body=fs.readFileSync(file);if(file.endsWith('.html'))body=body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>','<script src="maintenance-contract-activity.js"></script><script src="customer-contracts.js"></script><script>loadContractWorkspace()</script></body>');
   return route.fulfill({contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body});
  });
  const open=async()=>{await page.goto('https://vero.test/maintenance-workspace.html?id=4');await page.getByRole('button',{name:'Sites',exact:true}).click();await page.getByRole('cell',{name:sites[0].site_name,exact:true}).waitFor();};
  await open();await page.getByRole('cell',{name:'Camera 1',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Edit Site',exact:true});await dialog.waitFor();
  assert.match(await dialog.innerText(),/linked to 2 contracts/);
  for(const [label,value] of [['Site reference','REF-UPDATED'],['Site name','Updated camera'],['Address','Updated road'],['Notes','Updated notes']])await dialog.getByLabel(label,{exact:true}).fill(value);
  await dialog.getByLabel('Status',{exact:true}).selectOption('Inactive');await dialog.getByLabel('Responsible person',{exact:true}).selectOption('2');
  await dialog.getByRole('button',{name:'Save Changes',exact:true}).click();await dialog.getByRole('alert').filter({hasText:'This shared site changed'}).waitFor();
  assert.equal(await dialog.getByLabel('Site name',{exact:true}).inputValue(),'Updated camera');assert.equal(await dialog.isVisible(),true);
  conflict=false;await dialog.getByRole('button',{name:'Save Changes',exact:true}).click();await dialog.waitFor({state:'hidden'});await page.getByRole('cell',{name:'Updated camera',exact:true}).waitFor();
  assert.deepEqual(posts[1],{path:'/api/maintenance-contracts/4/sites/1',payload:{site_code:'REF-UPDATED',site_name:'Updated camera',address:'Updated road',status:'Inactive',owner_user_id:2,notes:'Updated notes',version:3}});
  await page.getByRole('button',{name:'Next',exact:true}).click();await page.locator('[data-site-edit-row="51"]').press('Enter');await dialog.waitFor();assert.equal(await dialog.getByLabel('Site reference',{exact:true}).inputValue(),'REF-51');await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('searchbox',{name:'Search contract sites'}).fill('Updated camera');await page.locator('[data-site-edit-row="1"]').press('Space');await dialog.waitFor();assert.equal(await dialog.getByLabel('Responsible person',{exact:true}).inputValue(),'2');
  deny=true;await dialog.getByRole('button',{name:'Save Changes',exact:true}).click();await dialog.getByRole('alert').filter({hasText:'Administrator access is required'}).waitFor();await dialog.getByRole('button',{name:'Cancel',exact:true}).click();deny=false;
  await page.getByRole('button',{name:'Edit site REF-UPDATED',exact:true}).click();assert.equal(await page.locator('dialog[open]').count(),1);await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('link',{name:'Documents',exact:true}).click();await page.getByRole('heading',{name:'Site documents'}).waitFor();assert.match(page.url(),/link_type=Site&link_value=1/);assert.equal(await page.locator('dialog[open]').count(),0);
  admin=false;await open();assert.equal(await page.locator('[data-site-edit-row]').count(),0);assert.equal(await page.getByRole('button',{name:'Edit site REF-UPDATED',exact:true}).count(),0);await page.getByRole('cell',{name:'Camera 2',exact:true}).click();assert.equal(await page.locator('dialog[open]').count(),0);
  assert.deepEqual(errors,[]);await page.close();
 }}finally{await browser.close();}
});
