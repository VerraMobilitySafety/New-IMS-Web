const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {mockInsurance,savedPolicy}=require('./insurance-mock.cjs');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.INSURANCE_BROWSER?{executablePath:process.env.INSURANCE_BROWSER}:{})});try{
for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:1100}}),page=await context.newPage();
 const base={policy_name:'Named policy',policy_number:'P-1',insurance_class:'Cyber',insurer_name:'Insurer',currency:'AUD',inception_date:'2026-01-01',expiry_date:'2027-01-01'};
 const server=await mockInsurance(page,{policies:[savedPolicy({...base,owner_user_id:1,owner_name:'Synthetic Owner',country_code:'AU',state_territory:'NSW'},1),savedPolicy({...base,policy_name:'Unassigned policy',owner_user_id:null,country_code:null},2),savedPolicy({...base,policy_name:'Unnamed owner',owner_user_id:3,country_code:'NZ'},3)]});
 await page.goto('https://vero.test/insurance.html');await page.locator('#insuranceApiStatus[data-state=ready]').waitFor({state:'attached'});
 assert.deepEqual(await page.locator('#content th').allTextContents(),['Policy','Insurer','Owner','Jurisdiction','Expiry Date','Status','Policy document']);
 assert.match(await page.locator('#content').innerText(),/Synthetic Owner/);assert.match(await page.locator('#content').innerText(),/AU \/ NSW/);
 assert.match(await page.locator('#content').innerText(),/Unassigned/);assert.match(await page.locator('#content').innerText(),/Not specified/);assert.match(await page.locator('#content').innerText(),/Name unavailable/);
 for(const query of ['Synthetic Owner','AU / NSW','NSW']){await page.locator('#search').fill(query);assert.equal(await page.locator('tr[data-policy-index]').count(),1);}
 await page.locator('tr[data-policy-index]').click();await page.keyboard.press('Escape');
 await page.getByRole('link',{name:'View Policy',exact:true}).click();await page.getByText('Policy PDF unavailable',{exact:true}).waitFor();
 assert.equal(await page.locator('#modal').isVisible(),false);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.equal(server.posts.length,0);console.log('PASS owner/jurisdiction list '+width);await context.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
