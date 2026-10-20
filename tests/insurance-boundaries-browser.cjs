// Exercise the shipped page with date-only fixtures at both sides of UTC midnight.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const cases=[
 ['UTC','2026-10-20T00:30:00Z','2026-10-20'],
 ['America/Los_Angeles','2026-10-20T00:30:00Z','2026-10-19'],
 ['Pacific/Kiritimati','2026-10-20T00:30:00Z','2026-10-20'],
 ['Australia/Sydney','2026-10-20T23:30:00Z','2026-10-21'],
 ['America/Los_Angeles','2026-03-08T09:30:00Z','2026-03-08']
];
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.INSURANCE_BROWSER?{executablePath:process.env.INSURANCE_BROWSER}:{})});try{
for(const [timezoneId,instant,today] of cases){
 const context=await browser.newContext({timezoneId}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date(instant)});await page.addInitScript(()=>localStorage.setItem('vero_session_token','synthetic'));
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.pathname.endsWith('/auth/me'))return route.fulfill({json:{user:{first_name:'Preview',last_name:'User',vero_role:'User'}}});if(u.hostname!=='vero.test')return route.abort();const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});return route.fulfill({body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream'})});
 await page.goto('https://vero.test/insurance.html');
 const dateAt=days=>new Date(Date.parse(today+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
 const rows=[['Expired',dateAt(-1)],['Today',today],['Within',dateAt(30)],['Day 90',dateAt(90)],['Day 91',dateAt(91)],['Invalid','not-a-date'],['Rolled date','2026-02-30'],['Empty',''],['Timestamp',today+'T00:00:00-07:00']].map(([name,expiry])=>({name,expiry,status:'Active',number:name}));
 await page.evaluate(rows=>{data.policies.splice(0,data.policies.length,...rows);tab='Policies';insuranceView='due';render()},rows);
 assert.deepEqual(await page.locator('#content tbody tr td:first-child').allTextContents(),['Today','Within','Day 90']);assert.equal(await page.locator('#upcoming').innerText(),'3');
 // The same local calendar day remains inclusive late at night.
 await page.evaluate(()=>{const now=new Date();now.setHours(23,59,59,999);const range=insuranceRenewalWindow(now);window.testLateMatches=data.policies.filter(p=>insuranceDue(p.expiry,range.start,range.end)).map(p=>p.name)});
 assert.deepEqual(await page.evaluate(()=>window.testLateMatches),['Today','Within','Day 90']);assert.deepEqual(errors,[]);
 console.log('PASS '+timezoneId+' '+instant+': today/90 inclusive, expired/91/invalid excluded, card agrees');await context.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
