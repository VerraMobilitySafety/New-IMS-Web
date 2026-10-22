const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.join(__dirname,'..');
(async()=>{const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(fs.existsSync(chrome)?chrome:undefined)});try{
for(const width of [1440,390])for(const failure of ['none','register','auth']){
 const p=await b.newPage({viewport:{width,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 let releaseAuth,releaseRegister,markRegisterStarted,registerStarted=false;
 const registerStart=new Promise(r=>markRegisterStarted=r);
 const authGate=new Promise(r=>releaseAuth=r),registerGate=new Promise(r=>releaseRegister=r);
 await p.addInitScript(()=>localStorage.setItem('vero_session_token','isolated-test'));
 await p.route('**/*',async route=>{const u=new URL(route.request().url());
  if(u.hostname==='vero.test'){const file=path.join(root,u.pathname.slice(1));if(!fs.existsSync(file))return route.fulfill({status:404,body:''});return route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':'image/png'});}
  if(u.hostname!=='verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net')return route.fulfill({body:'',contentType:u.pathname.endsWith('.js')?'application/javascript':'text/css'});
  if(u.pathname.endsWith('/auth/me')){await authGate;return route.fulfill({status:failure==='auth'?503:200,json:{user:{id:7,first_name:'Test',last_name:'Owner',vero_role:'Administrator'}}});}
  if(u.pathname.endsWith('/changes/options'))return route.fulfill({json:{classification_categories:[],classification_relationships:[],users:[],controls:[],documents:[],treatment_owners:[]}});
  if(u.pathname.endsWith('/changes')){registerStarted=true;markRegisterStarted();await registerGate;return route.fulfill({status:failure==='register'?503:200,json:failure==='register'?{message:'Register temporarily unavailable'}:{changes:[]}});}
  return route.fulfill({json:{actions:[],documents:[]}});
 });
 await p.goto('https://vero.test/change-management.html');
 const hero=p.locator('.global-hero');await hero.waitFor({state:'visible'});assert.equal(await p.locator('#changeContent').isVisible(),false,'content stays hidden while auth is pending');
 const geometry=()=>hero.evaluate(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height];});const before=await geometry();
 assert.equal(await p.locator('#veroPageLoader').isVisible(),true,'standard camera loader visible below the header');
 releaseAuth();
 if(failure!=='auth'){
  await p.waitForFunction(()=>document.getElementById('changeNew').disabled===false);
  await registerStart;
  assert.equal(registerStarted,true);assert.deepEqual(await geometry(),before,'auth does not move the header');
  assert.equal(await p.locator('#veroPageLoader').isVisible(),true,'loader waits for the register, not just auth');
  assert.equal(await p.locator('#changeContent').isVisible(),false,'unfinished register does not flash');
  releaseRegister();
  await p.getByText(failure==='register'?'Register temporarily unavailable':'No changes yet. Select New change to get started.',{exact:true}).waitFor();
  await p.locator('#veroPageLoader').waitFor({state:'hidden'});
  assert.equal(await p.locator('#changeContent').isVisible(),true);assert.equal(await p.locator('#changeNew').isVisible(),true);
  assert.equal(await p.locator('#changeContent > .actions .vero-related-documents').count(),1);
 }else{
  releaseRegister();await p.getByText('Unable to check your session.',{exact:false}).waitFor();await p.locator('#veroPageLoader').waitFor({state:'hidden'});
  assert.equal(await p.locator('#changeContent').isVisible(),false,'private content stays hidden on auth failure');
 }
 assert.deepEqual(await geometry(),before,'header remains fixed through success/error');assert.deepEqual(errors,[]);
 console.log('PASS header first, loader settlement and stable geometry at '+width+' ('+failure+')');await p.close();
}
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
