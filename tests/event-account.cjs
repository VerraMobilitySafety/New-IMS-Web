const {JSDOM,VirtualConsole}=require('jsdom'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync(__dirname+'/../incident-management.html','utf8'),script=fs.readFileSync(__dirname+'/../incident-management.js','utf8');
const wait=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('Account UI timed out');};
async function scenario(admin){
 const dom=new JSDOM(html,{url:'https://example.invalid/incident-management.html',runScripts:'outside-only',virtualConsole:new VirtualConsole()}),w=dom.window,d=w.document,calls=[];
 w.localStorage.setItem('vero_session_token','synthetic-token');w.localStorage.setItem('vero_current_user','stale user');
 w.fetch=async(url,init)=>{const path=new URL(url).pathname.replace('/api','');calls.push({path,init});let value;
  if(path==='/auth/me')value={user:{id:1,first_name:'Test',last_name:'<unsafe>',email:'test@example.invalid',vero_role:admin?'Administrator':'User'}};
  else if(path==='/incidents/options')value={administrator:admin,users:[],unverified:{}};else if(path==='/incidents/dashboard')value={metrics:{},as_of:'2026-10-20'};else if(path==='/auth/logout')value={success:true};
  return {ok:!!value,status:value?200:404,json:async()=>value||{message:'Not found'}};
 };w.eval(script);await wait(()=>d.querySelector('#incident-dashboard'));
 assert.equal(d.querySelector('#veroAccountName').textContent,'Test <unsafe>');assert.equal(d.querySelector('#veroAccountAvatar').textContent,'T<');assert.equal(d.querySelector('#veroAccountEmail').textContent,'test@example.invalid');assert.equal(d.querySelector('unsafe'),null);assert.equal(d.querySelector('#veroUserManagement').style.display,admin?'flex':'none');assert.equal(calls.filter(c=>c.path==='/auth/me').length,1);
 const trigger=d.querySelector('#veroAccountTrigger');trigger.click();assert.equal(trigger.getAttribute('aria-expanded'),'true');assert(d.querySelector('#veroAccount').classList.contains('open'));
 d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(trigger.getAttribute('aria-expanded'),'false');assert.equal(d.activeElement,trigger);
 trigger.click();d.querySelector('#incident-dashboard').click();assert.equal(trigger.getAttribute('aria-expanded'),'false');
 w.localStorage.setItem('vero_session_token','refreshed-synthetic-token');trigger.click();d.querySelector('#veroAccountSignOut').click();await wait(()=>!w.localStorage.getItem('vero_session_token'));assert.equal(w.localStorage.getItem('vero_current_user'),null);assert.equal(calls.find(c=>c.path==='/auth/logout').init.method,'POST');assert.equal(calls.find(c=>c.path==='/auth/logout').init.headers.Authorization,'Bearer refreshed-synthetic-token');dom.window.close();
}
(async()=>{await scenario(true);await scenario(false);console.log('PASS: authenticated header identity, escaped profile data, admin-only management link, menu dismissal and standard sign-out cleanup.');})().catch(e=>{console.error(e);process.exitCode=1;});
