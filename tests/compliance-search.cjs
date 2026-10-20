const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch(e){if(process.platform!=='win32')throw e;({chromium}=require('C:/Users/dbleasel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'compliance.html'),'utf8');
const filter=html.match(/function filterRegister\(\)\{[\s\S]*?\n\}/)[0];

for(const width of [1500,390]) test(`Common requirements search lifecycle at ${width}px`,async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try{
  const page=await browser.newPage({viewport:{width,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  // Use the shipped markup, including its inline input handlers. All data is synthetic.
  await page.route('**/*',route=>route.fulfill({json:{contracts:[],requirements:[]},headers:{'Access-Control-Allow-Origin':'*'}}));
  await page.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  await page.addScriptTag({content:filter});
  assert.equal(await page.locator('#registerCount').count(),1);
  await page.locator('#registerCount').evaluate(node=>node.remove());
  await page.evaluate(()=>filterRegister()); // Initial loading row and absent counter.
  await page.locator('#registerBody').evaluate(body=>body.innerHTML=`
   <tr data-type="Client" data-applicability="Project" data-status="Compliant"><td>TEST — Compliance parent routing acceptance</td></tr>
   <tr data-type="Internal" data-applicability="Organisation" data-status="Compliant"><td>Another requirement</td></tr>`);
  const visible=()=>page.locator('#registerBody tr[data-type]:visible').count();
  const search=page.locator('#complianceSearch');
  await search.fill('TEST — Compliance parent routing acceptance');
  assert.equal(await visible(),1);
  await search.fill('');assert.equal(await visible(),2);
  await search.fill('test — compliance');assert.equal(await visible(),1);
  await search.fill('no such obligation');assert.equal(await visible(),0);
  await search.fill('');assert.equal(await visible(),2);
  await page.locator('#applicabilityFilter').selectOption('Project');assert.equal(await visible(),1);
  await search.fill('Another');assert.equal(await visible(),0);
  await page.locator('#applicabilityFilter').selectOption('');assert.equal(await visible(),1);
  // A counter supplied by another layout must still update, and must not be cached.
  await page.evaluate(()=>{const node=document.createElement('span');node.id='registerCount';document.body.append(node);filterRegister();});
  assert.equal(await page.locator('#registerCount').textContent(),'Showing 1 common requirement');
  await search.fill('');assert.equal(await page.locator('#registerCount').textContent(),'Showing 2 common requirements');
  await page.evaluate(()=>{const old=document.getElementById('registerCount');const next=old.cloneNode(false);old.replaceWith(next);window.oldCounter=old;});
  await search.fill('missing');assert.equal(await page.locator('#registerCount').textContent(),'Showing 0 common requirements');
  assert.equal(await page.evaluate(()=>oldCounter.textContent),'Showing 2 common requirements');
  await page.locator('#registerCount').evaluate(node=>node.remove());
  await search.fill('Another');assert.equal(await visible(),1);
  await page.addScriptTag({content:'const COMPLIANCE_API="https://example.invalid/api";function complianceAuthHeaders(){return {}}'});
  await page.addScriptTag({path:path.join(root,'compliance-contract-register.js')});
  await page.locator('#commonRequirementView').click();
  assert.equal(await search.inputValue(),'Another');assert.equal(await visible(),1);
  await page.locator('#contractRequirementView').click();
  await page.locator('#commonRequirementView').click();
  await search.fill('');assert.equal(await visible(),2);
  assert.deepEqual(errors,[]);
  // Required search controls remain errors; only the optional display counter is guarded.
  assert.match(await page.evaluate(()=>{document.getElementById('typeFilter').remove();try{filterRegister();return ''}catch(e){return e.message}}),/null/);
 }finally{await browser.close();}
});
