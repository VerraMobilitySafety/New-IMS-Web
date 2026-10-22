// Real Records screen with an isolated linked change; no live records or permissions are changed.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),cid='11111111-1111-4111-8111-111111111111';
const record={id:501,record_code:'REC-000501',record_title:'Workshop change',record_type:'Change Management',record_category:'Change Management',description:'Versioned change record',source_module:'Change Management',storage_type:'System',security_classification:'Confidential',status:'Active',owner:{user_id:7,first_name:'Test',last_name:'Owner',business_area:'Operations Management'},record_date:'2026-10-22',retention:{},related_change:{id:cid,status:'Submitted',risk_id:81}};
(async()=>{const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';const b=await chromium.launch({headless:true,...(fs.existsSync(chrome)?{executablePath:chrome}:{})});try{
for(const width of [1440,390]){
const p=await b.newPage({viewport:{width,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>localStorage.setItem('vero_session_token','isolated-record-test'));
await p.route('**/*',async route=>{const u=new URL(route.request().url()),url=u.pathname;
if(u.hostname==='vero.test'){const file=path.join(root,url.slice(1));return route.fulfill({status:fs.existsSync(file)?200:404,body:fs.existsSync(file)?fs.readFileSync(file):'',contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'image/png'});}
if(!url.startsWith('/api/'))return route.fulfill({body:'',contentType:url.endsWith('.js')?'application/javascript':'text/css'});
let data={};const endpoint=url.replace('/api','');
if(endpoint==='/auth/me')data={user:{id:7,first_name:'Test',last_name:'Owner',vero_role:'Employee'}};
if(endpoint==='/auth/my-roles')data={roles:[]};
if(endpoint==='/records')data={records:[record],my_pending_copy_requests:0};
if(endpoint==='/records/501')data={record,can_view:true};
if(endpoint==='/records/retention-rules')data={rules:[],permissions:{can_manage:false}};
if(endpoint==='/records/holds')data={holds:[]};
if(endpoint==='/records/dispositions')data={dispositions:[]};
if(endpoint==='/records/501/history')data={history:[]};
if(endpoint.endsWith('/viewing-groups'))data={groups:[],permissions:{can_manage:false}};
if(endpoint.endsWith('/metadata'))return route.fulfill({status:403,json:{message:'Record editor access required.'}});
return route.fulfill({json:data});});
await p.goto('https://vero.test/records.html?record_id=501');
const link=p.getByRole('link',{name:'Open linked change',exact:true});await link.waitFor({state:'visible'});
assert.equal(await link.getAttribute('href'),'change-management.html?change_id='+cid);
assert.equal(await p.locator('#drawerSource').innerText(),'Change Management\nOpen linked change');
assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
console.log('PASS Records detail opens originating change at '+width);await p.close();
}}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
