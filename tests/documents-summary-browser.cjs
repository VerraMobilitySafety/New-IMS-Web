const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../preview');fs.mkdirSync(out,{recursive:true});
const titles=['Zebra','alpha','Bravo','charlie','delta','echo','foxtrot','ALPHA','golf'];
const dates=['2026-10-20','2026-11-18','2026-11-19','2026-10-19',null,'2026-02-30','2026-10-20','2026-10-21','2026-10-20'];
const rows=titles.map((title,i)=>({id:i+1,document_title:title,document_number:i===0?'AAA-001':'ZZZ-'+i,status:'Current',document_type:'Policy',document_owner_user_id:i===6?9:i>=7?null:7,document_owner_email:i===7?'PREVIEW@example.test':'',document_owner:'Preview User',review_date:dates[i],version_number:1}));
rows.push({...rows[0],id:10,status:'Draft',document_title:'Hidden draft'});
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.INSURANCE_BROWSER?{executablePath:process.env.INSURANCE_BROWSER}:{})});try{
for(const width of [1440,1173,1024,768,390]){
 const context=await browser.newContext({viewport:{width,height:1000},timezoneId:'America/Los_Angeles'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-10-20T18:00:00Z')});
 await page.addInitScript(()=>{localStorage.setItem('vero_session_token','synthetic');localStorage.setItem('vero_current_user',JSON.stringify({id:7,email:'preview@example.test'}))});
 let releaseAuth;const authGate=new Promise(r=>releaseAuth=r);let fail=false,empty=false;
 await page.route('**/*',async route=>{const u=new URL(route.request().url());
  if(u.pathname.endsWith('/auth/me')){await authGate;return route.fulfill({json:{user:{id:7,first_name:'Preview',last_name:'User',email:'preview@example.test',vero_role:'User'}}})}
  if(u.pathname.endsWith('/documents'))return fail?route.fulfill({status:503,json:{message:'unavailable'}}):route.fulfill({json:{documents:empty?[]:rows}});
  if(u.hostname!=='vero.test')return route.abort();
  const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
  return route.fulfill({body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream'});
 });
 await page.goto('https://vero.test/documents.html');await page.locator('#documentsSummary').waitFor();
 await page.waitForFunction(()=>document.getElementById('documentsSummary').querySelector('[data-count="total"]').textContent==='9');
 assert.equal(await page.locator('[data-count="mine"]').innerText(),'—','cached identity is not trusted');releaseAuth();
 await page.waitForFunction(()=>document.getElementById('documentsSummary').querySelector('[data-count="mine"]').textContent==='7 known');
 assert.equal(await page.locator('[data-count="due"]').innerText(),'3 known');
 assert.match(await page.locator('[data-note="due"]').innerText(),/2 owned documents lack a valid date/);
 const ids=()=>page.locator('#documentsBody tr.data').evaluateAll(rs=>rs.map(r=>Number(r.getAttribute('onclick').match(/'(\d+)'/)[1])));
 assert.deepEqual(await ids(),[2,8,3,4,5,6,7,9,1],'title A-Z, not code; stable case-insensitive ties');
 await page.locator('[data-doc-sort-button="document"]').click();assert.equal((await ids())[0],1);
 await page.locator('#documentSearch').fill('alpha');assert.deepEqual(await ids(),[2,8]);assert.equal(await page.locator('[data-count="total"]').innerText(),'9');
 await page.locator('#documentSearch').fill('');assert.equal((await ids())[0],1,'sort choice survives filtering');
 await page.locator('#documentTableReset').click();assert.deepEqual(await ids(),[2,8,3,4,5,6,7,9,1]);
 await page.getByRole('button',{name:'My Documents',exact:true}).click();assert.equal((await ids()).length,7,'no name-only matches');
 await page.getByRole('button',{name:'All Documents',exact:true}).click();
 const tops=await page.locator('#documentsSummary>.vr-card').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top));
 if(width>750)assert.equal(new Set(tops).size,1,'three desktop cards in one row');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('#veroPageLoader').waitFor({state:'hidden'});await page.screenshot({path:path.join(out,'documents-summary-'+width+'.png'),fullPage:true});
 if(width===1440){
  for(const invalid of ['2026-10-20Tgarbage','2026-10-20T25:99:00Z','2026-10-20T24:00:00Z','2026-10-20extra']){
   await page.evaluate(value=>{liveDocuments[0].nextReviewDate=value;applyDocumentFilters()},invalid);
   assert.equal(await page.locator('[data-count="due"]').innerText(),'2 known',invalid);
  }
  for(const valid of ['2026-10-20T12:30:00Z','2026-10-20T12:30:00.123+10:00']){
   await page.evaluate(value=>{liveDocuments[0].nextReviewDate=value;applyDocumentFilters()},valid);
   assert.equal(await page.locator('[data-count="due"]').innerText(),'3 known',valid);
  }
  fail=true;await page.evaluate(()=>loadDocuments());for(const key of ['total','mine','due'])assert.equal(await page.locator('[data-count="'+key+'"]').innerText(),'—');fail=false;empty=true;await page.evaluate(()=>loadDocuments());for(const key of ['total','mine','due'])assert.equal(await page.locator('[data-count="'+key+'"]').innerText(),'0')
 }
 assert.deepEqual(errors,[]);console.log('PASS Documents '+width+'px: authenticated counts, 0/29/30-day boundaries, missing dates, A-Z and stable ties, filters, one row, load failure/empty handling');await context.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
