// Real Chromium rendering with synthetic fixtures only; no live API calls or credentials.
const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const root=path.resolve(__dirname,'..');const browser=await chromium.launch({headless:true});try{
for(const viewport of [{width:1500,height:1100},{width:390,height:844}]){
 const context=await browser.newContext({viewport});const page=await context.newPage();
 await page.addInitScript(()=>localStorage.setItem('vero_session_token','synthetic-test-token'));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const options={can_create:true,schema_ready:true,classifications:[{path_ids:[4,3,2,1],path_names:['Safety','Operations','Traffic','Vehicle collision']}],users:[{id:8,name:'Example Owner',email:'owner@example.test'}],controls:[{id:7,code:'CTRL-7',title:'Physical separation'}],documents:[{id:9,code:'DOC-9',title:'Traffic management procedure',version:'2'}],treatment_owners:[{id:8,name:'Example Owner',email:'owner@example.test'}]};
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.pathname.endsWith('/central-creation-options'))return route.fulfill({json:options});
  if(u.hostname!=='vero.test')return route.abort();const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
  let body=fs.readFileSync(file);if(file.endsWith('/risk.html')){body=body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>','<script src="risk-assessment-criteria.js"></script><script src="risk-review-policy.js"></script><script src="risk-assessment-form.js"></script><script src="risk-central-create.js"></script></body>');}
  const ext=path.extname(file),type={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml'}[ext]||'application/octet-stream';return route.fulfill({contentType:type,body});
 });
 await page.goto('https://vero.test/risk.html');await page.locator('#veroAddRiskButton').waitFor({state:'visible'});await page.locator('#veroAddRiskButton').click();
 await page.locator('.vero-central .cell').first().waitFor({state:'visible'});
 const cells=await page.locator('.vero-central .cell').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height};}));
 assert.equal(cells.length,25);assert.ok(cells.every(c=>Math.abs(c.width-c.height)<.5),'Matrix cells must be square');
 const label=page.locator('.vero-central .axis-label.like').first();const colour=await label.evaluate(e=>getComputedStyle(e).color);assert.notEqual(colour,'rgb(255, 255, 255)');assert.notEqual(colour,'rgba(0, 0, 0, 0)');
 await page.getByLabel('Risk Title',{exact:true}).fill('Working near moving vehicles');await page.getByLabel('Risk Description',{exact:true}).fill('Vehicle interaction during roadside operations.');
 const before=await page.getByLabel('Risk Description',{exact:true}).boundingBox();
 await page.getByLabel('Risk Owner',{exact:true}).fill('owner@');
 const after=await page.getByLabel('Risk Description',{exact:true}).boundingBox();
 assert.ok(Math.abs(before.y-after.y)<1,'Opening owner choices must not move the form');
 await page.locator('.owner-option').first().click();
 const drawerWidth=await page.locator('#veroRiskDrawerOverlay .vero-risk-drawer').evaluate(e=>e.getBoundingClientRect().width);
 assert.ok(drawerWidth<=731,'Drawer must be narrower');
 if(viewport.width>1000){
  const font=await page.getByLabel('Risk Title',{exact:true}).evaluate(e=>parseFloat(getComputedStyle(e).fontSize));assert.ok(font<=13,'Compact form input font');
  const titleBox=await page.getByLabel('Risk Title',{exact:true}).boundingBox(),descriptionBox=await page.getByLabel('Risk Description',{exact:true}).boundingBox();
  assert.ok(descriptionBox.y-(titleBox.y+titleBox.height)<=48,'Title-to-description spacing must be compact');
 }

 await page.locator('.vero-central .cell').first().click();await page.locator('.vero-central .stage').nth(1).click();await page.locator('.vero-central .cell').nth(16).click();
 await page.getByLabel('Find Enterprise Controls',{exact:true}).fill('Physical');
 await page.locator('.add-option').filter({hasText:'CTRL-7'}).click();
 await page.getByLabel('Find Document Library Controls',{exact:true}).fill('Traffic');
 await page.locator('.add-option').filter({hasText:'DOC-9'}).click();
 assert.equal(await page.locator('.added-item').count(),2,'Controls add individually');
 assert.equal(await page.locator('.vero-central input[type=checkbox]').count(),0,'Control checkboxes removed');
 // Keep the matrix in view for desktop and mobile geometry/screenshot checks.
 await page.locator('.vero-central .matrix').scrollIntoViewIfNeeded();
 const image=await page.screenshot({type:'jpeg',quality:65});console.log('CENTRAL_RISK_SCREENSHOT_'+(viewport.width>1000?'DESKTOP':'MOBILE')+'='+image.toString('base64'));
 assert.deepEqual(errors,[]);console.log('PASS Chromium '+viewport.width+'px: 25 square cells, visible labels, owner selection, independent stage ratings');await context.close();
}
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exit(1);});
