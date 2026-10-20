const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch(e){if(process.platform!=='win32')throw e;({chromium}=require('C:/Users/dbleasel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=path.resolve(__dirname,'..');
test('Regulatory import requires preview, saves once and retains unassessed result',async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try{
  const page=await browser.newPage(),calls=[];
  await page.route('**/*',async route=>{
   const url=route.request().url();
   if(url.includes('/api/compliance/regulatory-import')){
    const payload=route.request().postDataJSON();calls.push(payload);return route.fulfill({json:{total:1,new:1,existing:0,resolved_links:2,unresolved_links:0,requirements:[{source_key:'REG-VIC-001',id:payload.save?55:null,existing:false,resolved_links:2,unresolved_links:[]}]}});
   }
   const name=url.includes('regulatory-import.js')?'regulatory-import.js':'regulatory-import.html';return route.fulfill({contentType:name.endsWith('.js')?'text/javascript':'text/html',body:fs.readFileSync(path.join(root,name),'utf8')});
  });
  await page.goto('https://vero.example/regulatory-import.html');
  assert.equal(await page.locator('#save').isDisabled(),true);
  await page.locator('#regulatoryFile').setInputFiles({name:'research.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'vero-regulatory-research-v1',requirements:[{requirement_id:'REG-VIC-001',title:'Notify <img src=x onerror=alert(1)>'}]}))});
  await page.locator('#preview').click();await page.getByText('Preview: 1 regulatory candidates',{exact:false}).waitFor();assert.equal(calls[0].save,false);assert.equal(await page.locator('#save').isEnabled(),true);assert.equal(await page.locator('#rows img').count(),0);
  await page.locator('#save').click();await page.getByText('Saved: 1 regulatory candidates',{exact:false}).waitFor();assert.equal(calls[1].save,true);assert.equal(calls.length,2);assert.equal(await page.locator('#save').isDisabled(),true);assert.match(await page.locator('#result').innerText(),/Not Assessed/);
  assert.equal(await page.locator('#rows a').getAttribute('href'),'compliance.html?obligation_id=55');
 }finally{await browser.close()}
});
test('Regulatory source drawer links existing requirement and IMS draft without assessing them',async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try{
  const page=await browser.newPage();
  await page.setContent('<div id="obligationModal"><div class="drawer-body"></div></div>');
  await page.addScriptTag({content:'var currentLiveObligation={compliance_type:"Regulatory"};var COMPLIANCE_API="https://vero.example/api";function complianceAuthHeaders(){return {}}window.openLiveObligation=async id=>{window.opened=id};window.fetch=async()=>({ok:true,json:async()=>({source:{jurisdiction:"Victoria",applicability_condition:"Employer test met",clause_reference:"s38",source_checked_date:"2026-10-20"},links:[{obligation_id:4,title:"Existing incident control",relationship:"Partial coverage"},{draft_id:8,document_id:9,title:"IMS reporting",relationship:"Supporting source"}]})});'});
  await page.addScriptTag({path:path.join(root,'compliance-regulatory-links.js')});await page.evaluate(()=>window.openLiveObligation(55));
  assert.match(await page.locator('#regulatorySourcePanel').innerText(),/do not establish full coverage/);
  assert.equal(await page.getByRole('link',{name:'Review existing IMS draft'}).getAttribute('href'),'compliance.html?ims_draft=8');
  assert.equal(await page.getByRole('link',{name:'Controlled source document'}).getAttribute('href'),'documents.html?document_id=9');
  await page.getByRole('button',{name:'Open existing requirement'}).click();assert.equal(await page.evaluate(()=>window.opened),4);
 }finally{await browser.close()}
});
