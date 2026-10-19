const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch(e){({chromium}=require('C:/Users/dbleasel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=path.join(__dirname,'..');
test('contract sites retain failed saves, retry safely, edit and link to formal events on desktop/mobile',async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try{for(const width of [1500,390]){
  const page=await browser.newPage({viewport:{width,height:1000}}),posts=[],sites=[],errors=[];let fail=true;page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('vero_session_token','mock-only'));
  await page.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());
   if(u.pathname.endsWith('/maintenance-contracts'))return route.fulfill({json:{contracts:[{id:4,contract_name:'Maintenance contract',contract_code:'UK-M',customer_name:'Example customer'}]}});
   if(u.pathname.endsWith('/details'))return route.fulfill({json:{sources:[],requirements:[]}});
   if(/\/sites(?:\/\d+)?$/.test(u.pathname)){
    if(r.method()==='GET')return route.fulfill({json:{sites,can_manage:true,users:[{id:1,name:'Site Owner'}]}});
    const data=r.postDataJSON();posts.push(data);if(fail)return route.fulfill({status:503,json:{message:'Temporary save failure'}});
    const s={...data,id:5,contract_id:4,version:data.version?data.version+1:1};if(sites.length)sites[0]=s;else sites.push(s);return route.fulfill({json:{site:s}});
   }
   if(u.pathname.endsWith('/events'))return route.fulfill({json:{events:[{id:'example-event',status:'Under Investigation',report:{description:'Reported event',occurred_date:'2026-10-19',reference_name:'Camera site',classification:{summary:'Safety Incident: Minor Event'}}}]}});
   if(u.hostname!=='vero.test')return route.abort();const file=path.resolve(root,'.'+u.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});let body=fs.readFileSync(file);
   if(file.endsWith('.html'))body=body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>','<script src="maintenance-contract-activity.js"></script><script src="customer-contracts.js"></script><script>loadContractWorkspace()</script></body>');
   return route.fulfill({contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body});
  });
  await page.goto('https://vero.test/maintenance-workspace.html?id=4');await page.getByRole('button',{name:'Sites',exact:true}).click();await page.getByRole('button',{name:'+ Add Site',exact:true}).click();
  const dialog=page.locator('#contractSiteDialog');await dialog.getByLabel('Site reference',{exact:true}).fill('UK-001');await dialog.getByLabel('Site name',{exact:true}).fill('<img src=x onerror=alert(1)>');await dialog.getByLabel('Address',{exact:true}).fill('Example road');await dialog.locator('[name=owner_user_id]').selectOption('1');
  await dialog.getByRole('button',{name:'Add Site',exact:true}).click();await dialog.getByRole('alert').filter({hasText:'Temporary save failure'}).waitFor();assert.equal(await dialog.getByLabel('Site reference',{exact:true}).inputValue(),'UK-001');fail=false;await dialog.getByRole('button',{name:'Add Site',exact:true}).click();await page.getByRole('button',{name:'Edit Site',exact:true}).waitFor();assert.equal(posts[0].request_id,posts[1].request_id);assert.equal(posts[1].owner_user_id,1);assert.equal(await page.locator('.contract-site-card img').count(),0);
  assert.equal(await page.getByRole('link',{name:'Report Event',exact:true}).getAttribute('href'),'incident-management.html?view=report&contract_id=4&site_id=5');
  await page.getByRole('button',{name:'Edit Site',exact:true}).click();await dialog.locator('[name=status]').selectOption('Inactive');await dialog.getByRole('button',{name:'Save Changes',exact:true}).click();await page.locator('.contract-site-card .pill').filter({hasText:'Inactive'}).waitFor();assert.equal(posts[2].version,1);assert.equal(await page.getByRole('link',{name:'Report Event',exact:true}).count(),0);
  await page.getByRole('button',{name:'Sites',exact:true}).click();await page.getByRole('button',{name:'+ Add Site',exact:true}).click();await dialog.getByLabel('Site reference',{exact:true}).fill('UK-002');await dialog.getByLabel('Site name',{exact:true}).fill('Camera site');
  assert.equal(await dialog.evaluate(el=>el.getBoundingClientRect().width<=innerWidth),true);
  fs.mkdirSync(path.join(root,'../artifacts/maintenance-sites'),{recursive:true});await page.screenshot({path:path.join(root,'../artifacts/maintenance-sites/site-form-'+width+'.png')});await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('button',{name:'Events',exact:true}).click();await page.getByRole('link',{name:'Reported event',exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'+ Report Event',exact:true}).getAttribute('href'),'incident-management.html?view=report&contract_id=4');assert.deepEqual(errors,[]);await page.close();
 }}finally{await browser.close();}
});
