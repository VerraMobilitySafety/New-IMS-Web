// Component acceptance with synthetic API responses; no live record writes.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.VERO_TEST_BROWSER?{executablePath:process.env.VERO_TEST_BROWSER}:{})});
 try{
  const page=await browser.newPage(),writes=[],errors=[];
  let allowed=true,conflict=false,fail=false,slow=false;
  let metadata={record_title:'Original',description:null,record_type:'Report',record_category:'Evidence',owner_business_area:'Safety',owner_user_id:1,record_date:'2026-01-01'};
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.pathname==='/fixture')return route.fulfill({contentType:'text/html',body:`<meta charset="utf-8"><div id="recordModal"><div class="record-drawer-body"></div></div><div id="recordHistoryTimeline"></div><span id="recordHistoryEventCount"></span><script>localStorage.setItem('vero_session_token','synthetic');window.saved=0;addEventListener('vero-record-metadata-saved',()=>saved++);</script><script src="/record-metadata-editor.js"></script>`});
   if(url.pathname==='/record-metadata-editor.js')return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/../record-metadata-editor.js')});
   assert.match(url.pathname,/\/records\/\d+\/metadata$/,'Unexpected network request');
   if(slow)await new Promise(r=>setTimeout(r,120));
   if(!allowed)return route.fulfill({status:403,json:{message:'Active Administrator permission required.'}});
   if(req.method()==='PUT'){
    writes.push(req.postDataJSON());await new Promise(r=>setTimeout(r,80));
    if(conflict)return route.fulfill({status:409,json:{message:'This record changed.'}});
    if(fail)return route.fulfill({status:500,json:{message:'Unable to save.'}});
    metadata={...metadata,record_title:writes.at(-1).record_title};
   }
   return route.fulfill({json:{metadata,can_edit:true,revision_token:'b'.repeat(64),changed_fields:req.method()==='PUT'?['record_title']:[],owners:[{id:1,name:'Synthetic <img src=x onerror=alert(1)>'}]}});
  });
  await page.goto('https://vero.test/fixture');
  const open=id=>page.evaluate(id=>{const m=document.getElementById('recordModal');m.dataset.activeRecordId=String(id);m.classList.add('open');},id);
  const close=()=>page.evaluate(()=>{const m=document.getElementById('recordModal');m.classList.remove('open');delete m.dataset.activeRecordId;});
  await open(1);await page.getByRole('button',{name:'Edit Record Details',exact:true}).click();
  await page.getByLabel('Title',{exact:true}).fill('Cancelled');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal(writes.length,0);
  await page.getByRole('button',{name:'Edit Record Details',exact:true}).click();
  assert.equal(await page.getByLabel('Title',{exact:true}).inputValue(),'Original');
  await page.getByLabel('Title',{exact:true}).fill('Corrected');
  await page.getByRole('button',{name:'Save Details',exact:true}).click();
  assert.equal(writes.length,0,'Reason required');
  await page.getByLabel('Reason for correction').fill('Synthetic correction');
  await page.getByRole('button',{name:'Save Details',exact:true}).evaluate(b=>{b.click();b.click();});
  await page.waitForFunction(()=>saved===1);
  assert.equal(writes.length,1);assert.equal(writes[0].description,null);
  assert.equal(await page.locator('#recordMetadataEditor img').count(),0);
  conflict=true;await page.getByRole('button',{name:'Edit Record Details',exact:true}).click();
  await page.getByLabel('Reason for correction').fill('Conflict');
  await page.getByRole('button',{name:'Save Details',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#recordMetadataEditor [role=status]').textContent.includes('This record changed'));
  assert.equal(await page.getByRole('button',{name:'Save Details',exact:true}).isDisabled(),true);
  assert.equal(await page.evaluate(()=>saved),1);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  conflict=false;await page.getByRole('button',{name:'Edit Record Details',exact:true}).waitFor({state:'visible'});
  // Closing during a pending load must not reveal the old editor.
  await close();slow=true;await open(2);await close();await page.waitForTimeout(180);
  assert.equal(await page.locator('#recordMetadataEditor').isVisible(),false);
  slow=false;allowed=false;await open(3);await page.waitForTimeout(100);
  assert.equal(await page.locator('#recordMetadataEditor').isVisible(),false);
  // Exercise the real history renderer with escaped old/new details and actor.
  const html=fs.readFileSync(__dirname+'/../records.html','utf8');
  const render=html.slice(html.indexOf(' function renderRecordHistory('),html.indexOf(' async function loadRecordHistory('));
  await page.evaluate(source=>{(0,eval)(source);renderRecordHistory([{event_type:'Updated',event_description:'Reason <img>',performed_at:'2026-01-01T10:00:00Z',performed_by_name:'Admin <b>',previous_value:{record_title:'Old <script>'},new_value:{record_title:'New <img>'}}]);},render);
  assert.match(await page.locator('#recordHistoryTimeline').innerText(),/Old <script>/);
  assert.match(await page.locator('#recordHistoryTimeline').innerText(),/New <img>/);
  assert.match(await page.locator('#recordHistoryTimeline').innerText(),/Admin <b>/);
  assert.equal(await page.locator('#recordHistoryTimeline img,#recordHistoryTimeline script').count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS Admin editor: cancel, reason, duplicate save, conflict, safe text/history, stale drawer and non-admin denial');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
