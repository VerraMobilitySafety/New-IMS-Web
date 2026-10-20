// Synthetic component only; all requests are intercepted.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.VERO_TEST_BROWSER?{executablePath:process.env.VERO_TEST_BROWSER}:{})});
 try{
  const page=await browser.newPage(),posts=[],errors=[];let manager=true,members=[],deny=false;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://vero.test/**',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.pathname==='/fixture')return route.fulfill({contentType:'text/html',body:'<main><div id="projectTeam"></div></main><script src="/project-team.js"></script>'});
   if(url.pathname==='/project-team.js')return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(__dirname,'../project-team.js'))});
   if(req.method()==='POST'){
    posts.push(req.postDataJSON());if(deny)return route.fulfill({status:403,json:{message:'Assigned Project manager or Administrator required.'}});
    await new Promise(r=>setTimeout(r,80));
    members=req.postDataJSON().action==='Add'?[{user_id:20,name:'<script>unsafe()</script>',email:'viewer@example.test',active:true}]:[];
    return route.fulfill({json:{changed:true}});
   }
   if(url.pathname.endsWith('/users'))return route.fulfill({json:{users:[{id:20,name:'<script>unsafe()</script>',email:'viewer@example.test'}]}});
   return route.fulfill({json:{can_manage:manager,members}});
  });
  await page.goto('https://vero.test/fixture');
  const mount=()=>page.evaluate(()=>VeroProjectTeam.mount({project:{id:5},fetch:(...args)=>fetch(...args),baseUrl:'https://vero.test/api'}));
  await mount();
  await page.getByLabel('Search active VERO users').fill('viewer');
  await page.getByRole('button',{name:'<script>unsafe()</script> · viewer@example.test',exact:true}).click();
  await page.getByLabel('Membership change reason').fill('Synthetic viewer request');
  await page.getByRole('button',{name:'Add viewer',exact:true}).evaluate(b=>{b.click();b.click();});
  await page.waitForFunction(()=>document.querySelector('[role=status]').textContent==='Viewer added.');
  assert.equal(posts.length,1);assert.equal(posts[0].user_id,20);assert.equal(posts[0].reason,'Synthetic viewer request');
  assert.equal(await page.locator('#projectTeam script').count(),0);
  assert.ok((await page.locator('.team-member').textContent()).includes('<script>unsafe()</script>'));
  await page.getByRole('button',{name:'Remove',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.startsWith('Viewer membership removed.'));
  assert.equal(posts.length,2);assert.equal(posts[1].action,'Remove');
  manager=false;await mount();
  assert.equal(await page.getByLabel('Search active VERO users').isVisible(),false);
  assert.equal(await page.getByRole('button',{name:'Remove',exact:true}).count(),0);
  manager=true;deny=true;await mount();
  await page.getByLabel('Search active VERO users').fill('viewer');
  await page.getByRole('button',{name:'<script>unsafe()</script> · viewer@example.test',exact:true}).click();
  await page.getByLabel('Membership change reason').fill('Synthetic denied request');
  await page.getByRole('button',{name:'Add viewer',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('Administrator required'));
  assert.equal(await page.locator('.team-member').count(),0);assert.deepEqual(errors,[]);
  console.log('PASS Project Team picker, view-only UI, safe text, add/remove, duplicate click and denial');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
