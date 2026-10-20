const {JSDOM}=require('jsdom'),assert=require('node:assert/strict'),fs=require('node:fs');
const script=fs.readFileSync(__dirname+'/../incident-management.js','utf8');
const wait=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('Actions dashboard timed out');};
async function scenario(admin){
 const dom=new JSDOM('<main><p id="message"></p><div class="toolbar"><button id="dashboard">Dashboard</button><button id="incident-actions">Actions dashboard</button><button id="new-report">Report</button><button id="register">Register</button></div><section id="content"></section></main>',{url:'https://example.invalid/incident-management.html?view=actions',runScripts:'outside-only'}),w=dom.window,d=w.document,calls=[];
 w.localStorage.setItem('vero_session_token','synthetic');
 w.fetch=async(url)=>{const u=new URL(url),path=u.pathname.replace('/api','');calls.push(path+u.search);let value;
  if(path==='/auth/me')value={id:3};else if(path==='/incidents/options')value={administrator:admin,users:[],unverified:{}};
  else if(path==='/incidents/actions/dashboard'){
   const state=u.searchParams.get('state'),offset=Number(u.searchParams.get('offset')),held=state==='held_open';
   value={metrics:{active_open:51,overdue:2,due_soon:7,closed:12,held:3,held_open:2,held_closed:1},as_of:'2026-10-20',state,offset,page_size:50,matching:held?2:51,scope:'Verified event links only.',actions:Array.from({length:held?2:offset?1:50},(_,i)=>({id:'action-'+(offset+i),title:i===0?'<img src=x onerror=alert(1)> Synthetic action':'Synthetic action '+i,status:'Open',due_date:'2026-10-19',migration_hold:held,owner_name:'Synthetic owner',can_view_event:admin,event_id:'event-1',event_reference:admin?'EV-1':null}))};
  }else if(path==='/incidents/event-1')value={id:'event-1',status:'Complete',report:{description:'Synthetic event',classification:{},details:{}},actions:[],history:[],investigation:{},migration_hold:true};
  else if(path.endsWith('/files'))value={files:[]};else if(path==='/incidents/dashboard')value={metrics:{},as_of:'2026-10-20'};
  return {ok:!!value,status:value?200:404,json:async()=>value||{message:'Not found'}};
 };w.eval(script);await wait(()=>d.querySelector('#incident-action-filter'));
 assert.equal(d.querySelector('[data-action-metric=total]').textContent,'51');assert.equal(d.querySelector('[data-action-metric=overdue]').textContent,'2');assert.equal(d.querySelector('#content img'),null);assert.match(d.querySelector('#content').textContent,/<img src=x/);assert.equal(d.querySelectorAll('a[data-event]').length,admin?50:0);
 assert.match(d.querySelector('.incident-actions-table a').href,/action=action-0/);assert.equal(d.querySelector('#actions-prev').disabled,true);
 d.querySelector('#actions-next').click();await wait(()=>new URL(w.location).searchParams.get('offset')==='50'&&d.querySelector('#actions-next').disabled);assert.match(d.querySelector('.action-pagination').textContent,/51–51 of 51/);
 d.querySelector('#historical-open-actions').click();await wait(()=>d.querySelector('#incident-action-filter')?.value==='held_open');assert.match(d.querySelector('.incident-actions-table').textContent,/On hold/);assert.equal(d.querySelector('#actions-next').disabled,true);
 if(admin){const background=d.querySelector('#incident-actions-dashboard');d.querySelector('a[data-event]').click();await wait(()=>d.querySelector('#event-backdrop'));assert.equal(d.querySelector('#incident-actions-dashboard'),background);assert.equal(background.inert,true);d.querySelector('#event-close').click();assert.equal(background.inert,false);assert.equal(new URL(w.location).searchParams.get('view'),'actions');}
 else assert.equal(d.querySelector('.incident-actions-table').textContent.includes('EV-1'),false);
 d.querySelector('#dashboard').click();await wait(()=>d.querySelector('#incident-dashboard'));assert.equal(d.querySelector('#incident-actions-dashboard'),null);assert(calls.some(s=>s.includes('state=held_open')));dom.window.close();
}
(async()=>{await scenario(true);await scenario(false);console.log('PASS: incident action dashboard counts, paging, held-open filtering, escaped titles, permission-aware event links and event drawer over action list.');})().catch(e=>{console.error(e);process.exitCode=1;});
