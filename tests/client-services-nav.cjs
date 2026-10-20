const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('nav.js','utf8');
(async()=>{
 for(const state of ['Administrator','User','missing-role','unauthenticated','denied','failed','pending']){
  const dom=new JSDOM('<aside class="sidebar"><nav id="vero-nav"></nav></aside><main class="main"></main>',{url:'https://vero.test/client-services-sites.html',runScripts:'outside-only'}),w=dom.window;
  if(state!=='unauthenticated')w.localStorage.setItem('vero_session_token','synthetic');
  let calls=0;w.fetch=async()=>{calls++;if(state==='failed')throw Error('offline');if(state==='pending')return new Promise(()=>{});return{ok:state!=='denied',json:async()=>({user:state==='missing-role'?{}:{vero_role:state}})}};
  w.eval(source);await new Promise(r=>setTimeout(r,0));
  const d=w.document,link=d.getElementById('clientServicesSiteNav'),expand=d.getElementById('clientServicesSiteExpand'),group=d.getElementById('clientServicesNavGroup');
  assert.ok(link&&expand);assert.equal(link.getAttribute('href'),'client-services-sites.html');
  const management=group.querySelector('.vero-nav-parent a');assert.equal(management.getAttribute('href'),'maintenance-management.html');assert.equal(management.hidden,false);
  for(const control of [link,expand]){assert.equal(control.hidden,state!=='Administrator',state);assert.equal(w.getComputedStyle(control).display,state==='Administrator'?'flex':'none',state)}
  if(state==='Administrator'){assert.equal(expand.getAttribute('aria-expanded'),'true');expand.click();assert.equal(expand.getAttribute('aria-expanded'),'false');assert.equal(group.classList.contains('open'),false);expand.click();assert.equal(group.classList.contains('open'),true)}
  assert.equal(calls,state==='unauthenticated'?0:1);dom.window.close();console.log('PASS Client Services navigation: '+state);
 }
})().catch(e=>{console.error(e);process.exitCode=1});
