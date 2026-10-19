// Isolated component integration: synthetic API only; no live business records.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.VERO_TEST_BROWSER?{executablePath:process.env.VERO_TEST_BROWSER}:{})});
 try{for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[],posts=[];page.on('pageerror',e=>errors.push(e.message));
 const project={id:10,project_name:'Example project',can_edit:true,can_manage_delivery:true,internal:false,baseline:{approved:true}};
 const finance={baseline_revenue:'1000.00',baseline_cost:'600.00',forecast_total_revenue:null,forecast_total_cost:null};
 let report=null,sites=[],events=[];
 function reporting(){return {project,report,submitted_report:report?.status==='Submitted'?report:null,latest_revision:report?.revision||0,can_correct:report?.status==='Submitted',history:report?[report]:[],reporting_month:'2026-09',previous_reporting_month:'2026-08',finance};}
 await page.route('https://vero.test/**',async route=>{const req=route.request(),u=new URL(req.url());
 if(u.pathname.startsWith('/api/')){
  if(req.method()==='POST'){
   const body=req.postDataJSON();posts.push({path:u.pathname,body});
   if(u.pathname.endsWith('/sites')){const site={...body,id:1,lock_version:1};sites=[site];return route.fulfill({json:{site}});}
   if(u.pathname.endsWith('/events')){events.unshift({...body,id:events.length+1,site_code:body.site_id?'SYD-01':null,created_by_name:'Example PM',created_at:'2026-10-20T00:00:00Z'});return route.fulfill({json:{event:{id:1,created:true}}});}
   if(u.pathname.endsWith('/corrections')){report={...report,status:'Draft',revision:2,lock_version:1};return route.fulfill({json:{report}});}
   report={...body,revision:1,lock_version:(report?.lock_version||0)+1,reporting_month:'2026-09',updated_at:'2026-10-20T00:00:00Z'};return route.fulfill({json:{report}});
  }
  if(u.pathname.endsWith('/delivery'))return route.fulfill({json:{project,sites,events:events.filter(e=>(!u.searchParams.get('site_id')||String(e.site_id)===u.searchParams.get('site_id'))&&(!u.searchParams.get('event_type')||e.event_type===u.searchParams.get('event_type'))),next_cursor:null}});
  if(u.pathname.endsWith('/finance'))return route.fulfill({json:{rows:[{project:{...project,project_code:'TEST-10',project_owner:'Example PM'},report:null,update_status:'Not submitted',finance}]}});
  return route.fulfill({json:reporting()});
 }
 if(u.pathname==='/fixture')return route.fulfill({contentType:'text/html',body:'<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/project-reporting.css"><main style="font-family:Arial"><div id="projectDelivery"></div><div id="projectMonthlyUpdates"></div><div id="projectMonthlyFinance"></div><div id="projectFinanceDashboard"></div></main><script src="/project-delivery.js"></script><script src="/project-reporting.js"></script>'});
 const file=path.join(__dirname,'..',path.basename(u.pathname));return route.fulfill({contentType:file.endsWith('.css')?'text/css':'application/javascript',body:fs.readFileSync(file)});
 });
 await page.goto('https://vero.test/fixture');
 await page.evaluate(async project=>{const opts={project,fetch:(...args)=>fetch(...args),baseUrl:'https://vero.test/api'};await VeroProjectDelivery.mount(opts);await VeroProjectReporting.mountProject(opts);await VeroProjectReporting.mountPortfolio(opts);},project);
 await page.getByRole('button',{name:'Add site',exact:true}).click();await page.getByLabel('Site code',{exact:true}).fill('SYD-01');await page.getByLabel('Site name',{exact:true}).fill('Sydney intersection');await page.getByLabel('Location',{exact:true}).fill('Example Road');await page.getByRole('button',{name:'Save site',exact:true}).click();await page.waitForFunction(()=>document.getElementById('deliveryMessage').textContent==='Site saved.');
 assert.equal(posts[0].body.expected_version,0);assert.equal(await page.locator('[name=site_id] option').count(),2);
 await page.getByLabel('Applies to',{exact:true}).selectOption('1');await page.getByLabel('Event type',{exact:true}).last().selectOption('Installation');await page.getByLabel('Date occurred',{exact:true}).fill('2026-09-15');await page.getByLabel('Summary',{exact:true}).fill('<script>unsafe()</script> Installation completed');await page.getByLabel('Supporting reference (document name or reference)',{exact:true}).fill('Acceptance.pdf');await page.getByRole('button',{name:'Record event',exact:true}).evaluate(b=>{b.click();b.click();});await page.waitForFunction(()=>document.getElementById('deliveryMessage').textContent==='Event recorded.');assert.equal(posts.filter(p=>p.path.endsWith('/events')).length,1);assert.ok(await page.locator('#eventList').textContent().then(s=>s.includes('<script>unsafe()</script>')));assert.equal(await page.locator('#eventList script').count(),0);
 await page.getByLabel('Project health',{exact:true}).selectOption('Green');await page.getByLabel('Total project forecast cost',{exact:true}).fill('650');await page.getByRole('button',{name:'Save Draft',exact:true}).click();await page.waitForFunction(()=>document.getElementById('pmReportingMessage').textContent.startsWith('Draft saved.'));assert.equal(posts.at(-1).body.payload.forecast_total_cost,'650');assert.equal(posts.at(-1).body.payload.month_actual_cost,null);
 await page.getByRole('button',{name:'Submit Monthly Update',exact:true}).click();await page.waitForFunction(()=>document.getElementById('pmReportingMessage').textContent.startsWith('Monthly update submitted.'));assert.equal(await page.getByLabel('Total project forecast cost',{exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:'Start Correction',exact:true}).count(),1);
 assert.ok((await page.locator('#projectFinanceDashboard').textContent()).includes('0 of 1 projects reported'));
 await page.locator('#projectDelivery').screenshot({path:path.join(__dirname,'project-delivery-'+width+'.png')});
 assert.deepEqual(errors,[]);console.log('PASS monthly reporting, sites/events '+width+'px: add site, scoped event, duplicate click, safe text, draft/submit/read-only, missing totals');await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
