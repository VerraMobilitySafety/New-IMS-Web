const {JSDOM}=require('jsdom'),assert=require('node:assert/strict'),fs=require('node:fs');
const script=fs.readFileSync(__dirname+'/../incident-management.js','utf8');
const wait=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('Dashboard timed out');};
async function scenario(admin,deep=false,empty=false){
 const dom=new JSDOM('<main><p id="message"></p><div class="toolbar"><button id="dashboard">Dashboard</button><button id="new-report">Report</button><button id="register">Event register</button><button id="manual"></button><button id="configuration"></button></div><div id="coverage"></div><section id="content"></section></main>',{url:'https://example.invalid/incident-management.html'+(deep?'?event=test':''),runScripts:'outside-only'});
 const w=dom.window,d=w.document,calls=[];w.localStorage.setItem('vero_session_token','synthetic');
 const event={id:'test',status:'Complete',report:{description:'Private event narrative',details:{},classification:{}},investigation:{},actions:[],history:[],migration_hold:true};
 w.fetch=async(url)=>{const path=new URL(url).pathname.replace('/api','');calls.push(path);let value;
  if(path==='/auth/me')value={id:1};else if(path==='/incidents/options')value={administrator:admin,users:[],unverified:{}};
  else if(path==='/incidents/dashboard')value={as_of:'2026-10-20',metrics:empty?{}:{events:12,under_investigation:5,completed:4,awaiting_assignment:3,active_investigations:2,overdue:1,held:8}};
  else if(path==='/incidents')value={events:empty?[]:[event]};else if(path==='/incidents/test')value=event;else if(path.endsWith('/files'))value={files:[]};
  return {ok:!!value,status:value?200:404,json:async()=>value||{message:'Not found'}};
 };w.eval(fs.readFileSync(__dirname+'/../incident-analytics.js','utf8'));w.eval(script);await wait(()=>d.querySelector('#incident-dashboard'));
 await wait(()=>d.querySelector('.status-event-results table'));assert(calls.includes('/incidents'),'Landing fetches permission-scoped events');assert.equal(d.querySelector('#event-rows'),null);
 assert.equal(d.querySelector('[data-metric=total]').textContent,empty?'0':'12');assert.equal(d.querySelector('[data-metric=active]').textContent,empty?'0':'2');
 assert.equal(d.querySelector('.dashboard-workspace'),null);assert.equal(d.querySelector('#dashboard-title'),null);assert.equal(d.querySelector('.dashboard-date'),null);
 assert.equal(d.querySelector('#incident-dashboard').textContent.includes('Private event narrative'),!empty);
 assert.equal(d.querySelector('#incident-dashboard').textContent.includes('NaN'),false);
 assert.doesNotMatch(d.querySelector('#incident-dashboard').textContent,/historical events on hold/);
 assert.match(d.querySelector('.investigation-status-heading').textContent,/Recorded Investigation Status/);
 const overdue=[...d.querySelectorAll('.status-chart-row')].find(row=>row.textContent.includes('Overdue Investigations'));assert.equal(overdue.querySelector('strong').textContent,empty?'0':'1');
 assert.match(d.querySelector('.status-chart').textContent,/Under Investigation/);assert.match(d.querySelector('.status-chart').textContent,/Awaiting Assignment/);
 if(!empty&&!deep){d.querySelector('[data-status-chart=completed]').click();await wait(()=>d.querySelector('[data-chart-event=test]'));assert(d.querySelector('#incident-dashboard'));assert.match(d.querySelector('.chart-events thead').textContent,/Ref Number/);assert.doesNotMatch(d.querySelector('.chart-events thead').textContent,/Due/);d.querySelector('[data-status-chart=completed]').click();await wait(()=>d.querySelector('[data-chart-event=test]'));d.querySelector('[data-status-chart=investigating]').click();await wait(()=>!d.querySelector('[data-chart-event=test]'));d.querySelector('#clear-status-selection').click();await wait(()=>d.querySelector('[data-chart-event=test]'));}
 if(deep){await wait(()=>d.querySelector('#event-backdrop'));assert(d.querySelector('#incident-dashboard'));d.querySelector('#event-close').click();assert.equal(d.querySelector('#event-backdrop'),null);assert.equal(d.querySelector('#event-rows'),null);}
 d.querySelector('#register').click();await wait(()=>d.querySelector('#event-rows'));assert(calls.includes('/incidents'));assert.equal(d.querySelector('#incident-dashboard'),null);assert.equal(new URL(w.location).searchParams.get('view'),'register');
 d.querySelector('#dashboard').click();await wait(()=>d.querySelector('#incident-dashboard'));assert.equal(d.querySelector('#event-rows'),null);dom.window.close();
}
(async()=>{await scenario(true);await scenario(false);await scenario(false,true);await scenario(false,false,true);console.log('PASS: dashboard default for admins and users; no event list fetch or narratives until Event register; scoped summary cards, empty state and direct-event drawer over dashboard.');})().catch(e=>{console.error(e);process.exitCode=1;});
