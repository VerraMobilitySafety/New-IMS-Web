const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('C:/Users/dbleasel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=path.join(__dirname,'..');
test('customer satisfaction tasks, notes, prepared answers and resources work on desktop and mobile',async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try{for(const width of [1500,390]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('vero_session_token','fixture-only'));
  await page.route('**/*',async route=>{const u=new URL(route.request().url());
   if(u.pathname.endsWith('/auth/me'))return route.fulfill({json:{user:{first_name:'Alex',last_name:'Reviewer',vero_role:'User'}}});
   if(u.pathname.endsWith('/customer-surveys'))return route.fulfill({json:{can_manage:false,customers:[],contacts:[],rounds:[],invitations:[],units:[],owners:[],as_of:'2026-10-23'}});
   if(u.hostname!=='vero.test')return route.request().resourceType()==='script'?route.abort():route.fulfill({json:{actions:[],can_manage:false}});
   const file=path.resolve(root,'.'+u.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
   return route.fulfill({contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.goto('https://vero.test/customer-satisfaction-risk-management.html');
  await page.getByText('Customer satisfaction guidance',{exact:true}).click();await page.locator('#risk-page-body').waitFor();await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-vero-loading'));
  assert.equal(await page.locator('#risk-tasks button').count(),4);
  assert.match(await page.locator('#risk-metadata').textContent(),/Draft guidance/);
  await page.getByRole('button',{name:'Review feedback and complaints',exact:false}).click();
  await page.getByRole('button',{name:'Tools & checks',exact:true}).click();
  await page.locator('#risk-draft').fill('Confirm response owner');await page.getByRole('button',{name:'Keep note in this page'}).click();
  await page.getByRole('button',{name:'Understand customer expectations',exact:false}).click();
  await page.getByRole('button',{name:'Review feedback and complaints',exact:false}).click();await page.getByRole('button',{name:'Tools & checks',exact:true}).click();
  assert.equal(await page.locator('#risk-draft').inputValue(),'Confirm response owner');
  await page.getByRole('button',{name:'Training & briefing',exact:true}).click();await page.getByRole('button',{name:'No',exact:true}).click();assert.match(await page.locator('#risk-feedback').textContent(),/Correct/);
  await page.locator('#risk-ask input').fill('How do I handle customer complaints?');await page.locator('#risk-ask').getByRole('button',{name:'Ask →'}).click();assert.equal(await page.locator('#risk-panel').isVisible(),true);assert.match(await page.locator('#risk-messages').textContent(),/customer’s concern/);
  await page.getByRole('button',{name:'Close Ask Vero'}).click();await page.getByRole('button',{name:'Guidance',exact:true}).click();await page.getByRole('button',{name:'Read draft guidance',exact:false}).click();assert.match(await page.locator('#risk-source-meta').textContent(),/Approved customer satisfaction procedure not yet linked/);
  assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  if(process.env.CUSTOMER_SCREENSHOT){await page.getByRole('button',{name:'Close source excerpt'}).click();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:process.env.CUSTOMER_SCREENSHOT.replace('.png','-'+width+'.png'),fullPage:true});}
  await page.close();
 }}finally{await browser.close();}
});
