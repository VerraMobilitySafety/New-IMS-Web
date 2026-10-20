const {JSDOM}=require('jsdom'),assert=require('node:assert/strict'),fs=require('node:fs');
const script=fs.readFileSync(__dirname+'/../incident-management.js','utf8');
const wait=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('Historical actions UI timed out');};
async function scenario(blocked=false){
 const dom=new JSDOM('<main><p id="message"></p><div class="toolbar"><button id="new-report"></button><button id="register"></button></div><section id="content"></section></main>',{url:'https://example.invalid/incident-management.html?view=history',runScripts:'outside-only'}),w=dom.window,d=w.document,calls=[];
 w.localStorage.setItem('vero_session_token','synthetic');
 w.fetch=async(url,request)=>{const p=new URL(url).pathname.replace('/api',''),body=request.body?JSON.parse(request.body):undefined;calls.push({p,body});let value;
  if(p==='/auth/me')value={id:1};else if(p==='/incidents/options')value={administrator:true,users:[],unverified:{}};
  else if(p.endsWith('/owners'))value={users:[{id:3,name:'Confirmed Owner',email:'owner@example.invalid',status:'Invited',open_investigations:2}]};
  else if(p.endsWith('/preview'))value={preview_token:'review-token',selected:2,blocked:blocked?1:0,groups:[{name:'Confirmed Owner',email:'owner@example.invalid',status:'Invited',open_investigations:2}],notice:'Notifications stay suppressed.'};
  else if(p.endsWith('/activate'))value={published:2,already_published:0,notice:'Notifications stay suppressed.'};
  return {ok:!!value,status:value?200:404,json:async()=>value||{message:'Not found'}};
 };w.eval(script);await wait(()=>d.querySelector('#history-investigation-owners'));d.querySelector('#history-investigation-owners').click();await wait(()=>d.querySelector('#history-investigation-form input'));const form=d.querySelector('#history-investigation-form');form.querySelector('input').checked=true;form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait(()=>d.querySelector('#history-investigation-preview h4'));assert.equal(calls.some(c=>c.p.endsWith('/activate')),false);
 if(blocked){assert.equal(d.querySelector('#history-investigation-publish'),null);dom.window.close();return;}
 form.querySelector('input[name=reason]').dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(d.querySelector('#history-investigation-publish'),null);form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait(()=>d.querySelector('#history-investigation-publish'));d.querySelector('#history-investigation-publish').click();await wait(()=>d.querySelector('#history-investigation-preview').textContent.includes('2 activated'));assert.deepEqual(calls.find(c=>c.p.endsWith('/activate')).body.user_ids,[3]);assert.equal(calls.find(c=>c.p.endsWith('/activate')).body.preview_token,'review-token');assert.match(d.querySelector('#history-investigation-preview').textContent,/suppressed/);dom.window.close();
}
(async()=>{await scenario();await scenario(true);console.log('PASS: explicit reviewed publication, blocked preview, stale form invalidation and suppression notice.');})().catch(e=>{console.error(e);process.exitCode=1;});
