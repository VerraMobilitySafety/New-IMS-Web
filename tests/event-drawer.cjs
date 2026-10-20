const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
const script=fs.readFileSync(__dirname+'/../incident-management.js','utf8');
const wait=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('UI timed out');};
async function scenario(deepLink=false){
 const dom=new JSDOM('<main><p id="message"></p><div class="toolbar"><button id="new-report">Report</button><button id="register">Register</button><button id="manual"></button><button id="configuration"></button></div><div id="coverage"></div><section id="content"></section></main>',{url:'https://example.invalid/incident-management.html?contract_id=5'+(deepLink?'&event=allowed':''),runScripts:'outside-only'});
 const w=dom.window,d=w.document;w.localStorage.setItem('vero_session_token','synthetic-test');
 const event={id:'allowed',status:'Under Investigation',report:{description:'Synthetic private event',classification:{summary:'Hazard',due_date:'2026-11-01'},details:{}},investigation:{},actions:[],history:[],can_complete:false};
 const calls=[];w.fetch=async(url,init)=>{const path=new URL(url).pathname.replace('/api','');calls.push(path);let value;
  if(path==='/auth/me')value={id:1};else if(path==='/incidents/options')value={administrator:false,users:[],unverified:{}};
  else if(path==='/maintenance-contracts/5/events')value={events:[event]};else if(path==='/incidents/allowed')value=event;else if(path==='/incidents/allowed/files')value={files:[]};
  return {ok:!!value,status:value?200:404,json:async()=>value||{message:'Event not found or access denied'}};
 };w.eval(script);
 await wait(()=>d.querySelector('#event-rows'));
 const register=d.querySelector('#event-rows').closest('.card'),filter=d.querySelector('#event-filter');
 if(!deepLink){filter.value='open';filter.dispatchEvent(new w.Event('change'));const link=d.querySelector('a[data-event]');link.focus();link.click();}
 await wait(()=>d.querySelector('#event-backdrop'));
 const dialog=d.querySelector('[role=dialog]');assert.equal(dialog.getAttribute('aria-modal'),'true');assert.equal(d.querySelector('#event-rows').closest('.card'),register);assert.equal(register.inert,true);assert.equal(d.body.style.overflow,'hidden');assert.equal(d.activeElement.id,'event-close');
 assert.match(dialog.textContent,/Synthetic private event/);assert.equal(new URL(w.location).searchParams.get('contract_id'),'5');
 d.querySelector('#event-close').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));assert.equal(d.activeElement.tagName,'SUMMARY');
 d.querySelector('#event-close').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
 assert.equal(d.querySelector('#event-backdrop'),null);assert.equal(register.inert,false);assert.equal(d.body.style.overflow,'');assert.equal(new URL(w.location).searchParams.has('event'),false);assert.equal(filter.value,deepLink?'all':'open');
 const link=d.querySelector('a[data-event]');link.focus();link.dispatchEvent(new w.MouseEvent('click',{button:-1,bubbles:true,cancelable:true}));await wait(()=>d.querySelector('#event-backdrop'));d.querySelector('#event-close').click();assert.equal(d.activeElement,link);
 // A denied direct link leaves only the accessible register and a generic error.
 w.history.pushState(null,'','?event=forbidden&contract_id=5');w.dispatchEvent(new w.PopStateEvent('popstate'));await wait(()=>d.querySelector('#message').textContent.includes('access denied'));
 assert.equal(d.querySelector('#event-backdrop'),null);assert.equal(d.querySelector('#event-rows').closest('.card'),register);assert.equal(calls.includes('/incidents/forbidden/files'),false);assert.equal(d.querySelector('#manual').hidden,true);
 dom.window.close();
}
(async()=>{await scenario();await scenario(true);console.log('PASS: event links and direct URLs open a side drawer; register/filter/context retained; focus, Escape and close restored; denied events never rendered.');})().catch(e=>{console.error(e);process.exitCode=1;});
