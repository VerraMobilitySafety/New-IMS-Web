const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {mockInsurance}=require('./insurance-mock.cjs');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.VERO_BROWSER?{executablePath:process.env.VERO_BROWSER}:{})});try{
 const page=await browser.newPage();await mockInsurance(page);
 const now=Date.parse('2027-07-02T00:00:00Z');await page.clock.install({time:new Date(now)});
 const task=(id,source,due_at)=>({id,source,due_at,title:'Task '+id,action_type:'Review',status:'Open'});
 let actions=[task('1','Documents',new Date(now-1000).toISOString()),task('2','Records',new Date(now+86400000).toISOString()),task('3','Risks',null),task('4','Compliance',new Date(now+8*86400000).toISOString()),{...task('5','Insurance',new Date(now).toISOString()),action_type:'Insurance Renewal',due_date:'2027-07-01'}],denied=false;
 await page.route('**/api/my-actions',r=>r.fulfill(denied?{status:401,json:{message:'Session revoked'}}:{json:{actions}}));
 await page.goto('https://vero.test/my-actions.html');await page.locator('.full-action').first().waitFor();
 const totals=()=>page.locator('.vr-summary .vr-card b').allTextContents();
 assert.deepEqual(await totals(),['5','2','1','1']);
 await page.locator('[data-filter=documents]').click();assert.equal(await page.locator('.full-action').count(),1);assert.deepEqual(await totals(),['5','2','1','1']);
 await page.locator('#actionSearch').fill('nothing matches');assert.equal(await page.locator('.full-action').count(),0);assert.deepEqual(await totals(),['5','2','1','1']);
 actions=[];await page.evaluate(()=>loadActions());assert.deepEqual(await totals(),['0','0','0','0']);
 denied=true;await page.evaluate(()=>loadActions());assert.deepEqual(await totals(),['—','—','—','—']);
 denied=false;actions=[task('6','Documents',null)];await page.locator('#actionSearch').fill('');await page.evaluate(()=>loadActions());assert.deepEqual(await totals(),['1','0','0','1']);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:require('path').resolve('../my-actions-counts-mobile.png'),fullPage:true});
 console.log('PASS summary totals, renewal boundary, filters, empty feed, failure, recovery and mobile');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});

