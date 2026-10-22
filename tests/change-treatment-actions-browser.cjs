const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';const browser=await chromium.launch({headless:true,...(fs.existsSync(chrome)?{executablePath:chrome}:{})});try{
for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:900}});let posts=0,fail=true,denied=false;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const action={id:101,title:'Install approved barrier',risk_code:'MR-1',risk_title:'Vehicle interface',risk_description:'Protect people during the change.',owner_name:'Active Employee',due_date:'2026-12-01',status:'Open',can_complete:true};
 await page.addInitScript(()=>localStorage.setItem('vero_session_token','isolated-action-test'));
 await page.route('**/*',async route=>{const url=new URL(route.request().url());
  if(url.hostname==='vero.test'){
   if(url.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:'<link rel="stylesheet" href="action-details.css"><body><script>window.refreshed=0;function loadActions(){window.refreshed++}</script><script src="change-treatment-actions.js"></script>'});
   return route.fulfill({contentType:url.pathname.endsWith('.css')?'text/css':'application/javascript',body:fs.readFileSync(path.join(root,url.pathname.slice(1)))});
  }
  assert.equal(url.pathname,'/api/changes/treatment-actions/101');
  if(denied)return route.fulfill({status:404,json:{message:'Action not found or access denied.'}});
  if(route.request().method()==='POST'){posts++;assert.deepEqual(route.request().postDataJSON(),{notes:'Barrier installed and checked'});if(fail)return route.fulfill({status:503,json:{message:'Please retry.'}});action.status='Completed';action.can_complete=false;action.completion_notes='Barrier installed and checked';}
  return route.fulfill({json:{status:'success',action}});
 });
 await page.goto('https://vero.test/fixture.html?change_treatment_id=101');await page.getByRole('heading',{name:action.title}).waitFor();
 await page.getByRole('button',{name:'Mark completed',exact:true}).click();await page.getByText('Completion notes are required.',{exact:true}).waitFor();assert.equal(posts,0);
 await page.getByLabel('Completion notes',{exact:true}).fill('Barrier installed and checked');await page.getByRole('button',{name:'Mark completed',exact:true}).click();await page.getByText('Please retry.',{exact:true}).waitFor();assert.equal(await page.getByLabel('Completion notes',{exact:true}).inputValue(),'Barrier installed and checked');
 fail=false;await page.getByRole('button',{name:'Mark completed',exact:true}).click();await page.getByText('Barrier installed and checked',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Mark completed',exact:true}).count(),0);assert.equal(await page.evaluate(()=>refreshed),1);
 denied=true;await page.reload();await page.getByText('Action not found or access denied.',{exact:true}).waitFor();assert.equal(await page.getByText(action.risk_description,{exact:true}).count(),0);
 assert.deepEqual(errors,[]);console.log('PASS assigned change action completion, notes, failure/retry and access-denied display at '+width);await page.close();
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
