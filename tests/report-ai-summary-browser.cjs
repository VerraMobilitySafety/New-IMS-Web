// Synthetic source data only. No business records are created or changed.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true,...(process.env.VERO_TEST_BROWSER?{executablePath:process.env.VERO_TEST_BROWSER}:{})});
const output=process.env.VERO_REPORT_SCREENSHOTS;if(output)fs.mkdirSync(output,{recursive:true});
try{for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:1100},acceptDownloads:true}),errors=[],mutations=[];let fail=false,delay=false,aiFail=false,aiDelay=false,aiRequests=[];
 page.on('pageerror',e=>errors.push(e.message));
 const risks=[{id:1,risk_title:'<script>unsafe</script>',risk_owner:'Owner A',status:'Open',next_review_date:'2026-10-01'},{id:2,risk_owner:'Owner B',status:'Open',next_review_date:null},{id:3,risk_owner:'Owner A',status:'Archived',next_review_date:'2026-01-01'}];
 const positions=[{risk_id:1,context_type:'Project',context_id:10,inherent_likelihood:5,inherent_impact:5,residual_likelihood:2,residual_impact:2},{risk_id:1,context_type:'VM Site',context_id:20,inherent_likelihood:5,inherent_impact:5,residual_likelihood:4,residual_impact:4}];
 const rows=[{project:{id:10,project_code:'P-10',project_name:'Project A',project_owner:'Owner A'},report:{payload:{health:'Green'}},finance:{month_revenue:'100',month_actual_cost:'50'}},{project:{id:11,project_name:'Project B',project_owner:'Owner B'},report:null,finance:{month_revenue:null,month_actual_cost:null}}];
 await page.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(req.method()!=='GET')mutations.push(req.method());
 if(url.pathname==='/api/reports/ai-summary'){const payload=req.postDataJSON();aiRequests.push(payload);if(aiDelay)await new Promise(r=>setTimeout(r,600));if(aiFail)return route.fulfill({status:503,json:{message:'AI summary unavailable. Please try again.'}});return route.fulfill({json:{highlights:payload.facts.slice(0,3),actions:['Review the underlying source records.'],management_report:[{heading:'Overview',text:'The available report provides a current view of the selected records. Review the figures alongside the reporting coverage before making management decisions.',fact_ids:['0']},{heading:'What needs attention',text:'Management should focus on any gaps identified in the report. Missing data limits the conclusions that can be drawn from these figures.',fact_ids:['1']},{heading:'Recommended next steps',text:'Review the underlying records with the relevant team and confirm the current position before deciding on follow-up actions.',fact_ids:['0','1']}]}});}if(url.pathname.startsWith('/api/')){if(fail)return route.fulfill({status:503,json:{message:'Source unavailable'}});if(delay&&url.pathname.includes('/finance'))await new Promise(r=>setTimeout(r,500));
 const data=url.pathname==='/api/risks'?{risks}:url.pathname==='/api/risk/approved-matrix-positions'?{positions:[...positions,positions[0]]}:url.pathname==='/api/risk/operational-contexts'?{projects:[{id:10,name:'Project A'}],contracts:[],vm_locations:[{id:20,name:'Sydney'}]}:url.pathname.includes('/finance')?{rows}:url.pathname==='/api/incidents'?{events:[{status:'Complete',report:{occurred_date:'2026-10-01',location:'Depot',classification:{summary:'Incident'}}},{status:'Held',migration_hold:true,report:{occurred_date:'2026-09-01',location:'Client site',classification:{summary:'Hazard'}}},{status:'Held',report:{occurred_date:'unknown',classification:{summary:'Hazard'}}}]}:{};return route.fulfill({json:data});}
 if(url.host!=='vero.test')return route.abort();const file=path.join(__dirname,'..',path.basename(url.pathname));if(!fs.existsSync(file))return route.fulfill({status:404,body:''});return route.fulfill({contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.addInitScript(()=>{localStorage.setItem('vero_session_token','synthetic');Date=class extends Date{constructor(...args){super(...(args.length?args:['2026-10-20T03:00:00Z']))}static now(){return new Date().getTime()}}});

 const ready=()=>page.waitForFunction(()=>document.querySelector('#reportStatus').textContent.startsWith('Report updated'));
 await page.goto('https://vero.test/reports.html');await ready();await page.evaluate(()=>{document.body.classList.remove('conversation-start');document.querySelector('#reportScope').open=true;document.querySelector('#reportDataDetails').open=true;document.querySelector('#generateAiSummary').hidden=false});await page.locator('#reportSelect').selectOption('risk-exposure');await ready();
 for(const id of ['risk-exposure','risk-reviews','project-summary','project-trend','event-trend']){
  await page.locator('#reportSelect').selectOption(id);await ready();
  assert.equal(await page.locator('#aiSummaryPanel').isHidden(),true);
  await page.locator('#generateAiSummary').click();await page.waitForFunction(()=>!document.querySelector('#copyAiSummary').disabled);
  assert.ok((await page.locator('#aiSummaryBody').textContent()).includes('Coverage and limitations'));
  assert.ok((await page.locator('#aiSummaryBody').textContent()).includes('What needs attention'));
  assert.equal(await page.locator('.management-section').count(),3);assert.equal(await page.locator('.management-brand img').getAttribute('alt'),'Verra Mobility');assert.equal(await page.locator('#printAiSummary').isEnabled(),true);const request=aiRequests.at(-1);assert.equal(request.report,id);assert.ok(request.facts.length>0);assert.ok(request.coverage.length>0);
  assert.equal(Object.hasOwn(request,'events'),false);assert.equal(Object.hasOwn(request,'risks'),false);
  const target=await page.locator('#aiSummaryBody a').first().getAttribute('href');assert.equal(await page.locator(target).count(),1);
  if(id==='event-trend')assert.ok((await page.locator('#aiSummaryBody').textContent()).includes('500 most recently'));
 }
 aiFail=true;await page.locator('#generateAiSummary').click();await page.waitForFunction(()=>document.querySelector('#aiSummaryStatus').textContent.includes('unavailable'));
 assert.equal(await page.locator('#copyAiSummary').isDisabled(),false);assert.equal(await page.locator('#generateAiSummary').isDisabled(),false);aiFail=false;
 aiDelay=true;await page.locator('#generateAiSummary').click();await page.locator('[name=classification]').selectOption('Incident');
 assert.equal(await page.locator('#aiSummaryPanel').isHidden(),true);assert.equal(await page.locator('#generateAiSummary').isDisabled(),true);
 await page.waitForTimeout(800);assert.equal(await page.locator('#aiSummaryPanel').isHidden(),true);aiDelay=false;
 await page.getByRole('button',{name:'Apply scope',exact:true}).click();await ready();
 await page.locator('[name=from]').fill('2025-01');await page.locator('[name=to]').fill('2025-02');await page.getByRole('button',{name:'Apply scope',exact:true}).click();await ready();assert.equal(await page.locator('#generateAiSummary').isDisabled(),true);
 await page.locator('#reportSelect').selectOption('risk-exposure');await ready();await page.locator('#generateAiSummary').click();await page.waitForFunction(()=>!document.querySelector('#copyAiSummary').disabled);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 await page.evaluate(()=>{window.print=()=>{window.didPrint=true;window.dispatchEvent(new Event('afterprint'))}});await page.locator('#printAiSummary').click();assert.equal(await page.evaluate(()=>window.didPrint),true);await page.emulateMedia({media:'print'});assert.equal(await page.locator('#reportOutput').isVisible(),false);assert.equal(await page.locator('.management-brand').isVisible(),true);assert.equal(await page.locator('#printAiSummary').isVisible(),false);await page.emulateMedia({media:'screen'});if(output)await page.screenshot({path:path.join(output,'ai-summary-'+width+'.png'),fullPage:true});
 assert.ok(mutations.every(m=>m==='POST'));console.log('PASS AI summary '+width+'px: five reports, evidence links, coverage, errors/retry, stale responses, empty reports, responsive layout');await page.close();
}}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
