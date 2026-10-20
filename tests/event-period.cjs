const {JSDOM}=require('jsdom'),assert=require('node:assert/strict'),fs=require('node:fs');
const dom=new JSDOM('<main><p id="message"></p><div class="toolbar"><button id="dashboard">Dashboard</button><button id="new-report">Report</button><button id="register">Register</button></div><section id="content"></section></main>',{url:'https://example.invalid/incident-management.html?contract_id=5',runScripts:'outside-only'}),w=dom.window,d=w.document,calls=[];
w.localStorage.setItem('vero_session_token','synthetic');w.Date=class extends Date{constructor(...args){super(...(args.length?args:['2024-08-31T00:00:00Z']));}static now(){return new Date('2024-08-31T00:00:00Z').getTime();}};
const event={id:'event-1',status:'Complete',migration_hold:true,report:{description:'Synthetic dated event',occurred_date:'2001-01-15',classification:{summary:'Hazard'},details:{}},actions:[],history:[],investigation:{}};
w.fetch=async(url)=>{const u=new URL(url),p=u.pathname.replace('/api','');calls.push(u);let value;
 if(p==='/auth/me')value={id:1};else if(p==='/incidents/options')value={administrator:false,users:[],unverified:{}};
 else if(p==='/incidents/dashboard')value={metrics:{events:u.searchParams.get('date_from')==='2001-01-01'?1:2},as_of:'2024-08-31'};
 else if(p==='/maintenance-contracts/5/events')value={events:[event]};else if(p==='/incidents/event-1')value=event;else if(p.endsWith('/files'))value={files:[]};
 return {ok:!!value,status:value?200:404,json:async()=>value||{message:'Not found'}};
};w.eval(fs.readFileSync(__dirname+'/../incident-management.js','utf8'));
const wait=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('Period UI timed out');};
const latest=()=>calls.filter(u=>u.pathname.endsWith('/incidents/dashboard')).at(-1);
async function select(period){const old=d.querySelector('#event-period');old.value=period;old.dispatchEvent(new w.Event('change'));if(period!=='custom')await wait(()=>d.querySelector('#event-period')!==old);}
(async()=>{
 await wait(()=>d.querySelector('#event-period'));assert.equal(latest().searchParams.has('date_from'),false);assert.equal(d.querySelector('#dashboard-title'),null);
 await select('30d');assert.equal(latest().searchParams.get('date_from'),'2024-08-02');assert.equal(latest().searchParams.get('date_to'),'2024-08-31');assert.equal(latest().searchParams.get('contract_id'),'5');
 await select('6m');assert.equal(latest().searchParams.get('date_from'),'2024-02-29','Month-end range must clamp to leap day');
 await select('12m');assert.equal(latest().searchParams.get('date_from'),'2023-08-31');
 await select('year');assert.equal(latest().searchParams.get('date_from'),'2024-01-01');
 const count=calls.length;await select('custom');assert.equal(d.querySelector('#period-custom').hidden,false);assert.equal(calls.length,count,'Custom selection waits for Apply');
 d.querySelector('#event-from').value='2001-02-01';d.querySelector('#event-to').value='2001-01-01';d.querySelector('#apply-event-period').click();assert.match(d.querySelector('#message').textContent,/end date/);assert.equal(calls.length,count);
 d.querySelector('#event-from').value='2001-01-01';d.querySelector('#event-to').value='2001-01-31';d.querySelector('#apply-event-period').click();await wait(()=>d.querySelector('[data-metric=total]')?.textContent==='1');
 d.querySelector('#register').click();await wait(()=>d.querySelector('#event-rows'));assert.equal(d.querySelector('#event-period').value,'custom');assert.equal(d.querySelector('#event-from').value,'2001-01-01');
 const list=calls.findLast(u=>u.pathname.endsWith('/events'));assert.equal(list.searchParams.get('date_from'),'2001-01-01');assert.equal(list.searchParams.get('date_to'),'2001-01-31');
 d.querySelector('[data-event]').click();await wait(()=>d.querySelector('#event-backdrop'));d.querySelector('#event-close').click();assert.equal(new URL(w.location).searchParams.get('date_to'),'2001-01-31');assert.equal(d.querySelector('#event-period').value,'custom');
 d.querySelector('#dashboard').click();await wait(()=>d.querySelector('#incident-dashboard'));assert.equal(d.querySelector('#event-period').value,'custom');
 await select('all');assert.equal(latest().searchParams.has('date_from'),false);assert.equal(latest().searchParams.has('date_to'),false);assert.match(d.querySelector('.event-period').textContent,/Includes events without a confirmed date/);
 dom.window.close();console.log('PASS: rolling and custom occurrence-date ranges, leap-day clamping, validation, dashboard/register/drawer retention and All time reset.');
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});
