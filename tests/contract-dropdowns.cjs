const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom'),root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const wait=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('Dropdown did not load');};
const names=[['DJCS','VIC DJCS Fixed Camera Operations'],['NSW Fixed Cameras','NSW TfNSW Fixed Camera Operations'],['NSW Mobile Speed Cameras','NSW TfNSW Mobile Speed Camera Operations'],['NZTA','NZ NZTA Fixed Camera Operations']];

test('exact legacy aliases display friendly names without rewriting unrelated text',()=>{
 const dom=new JSDOM('',{runScripts:'outside-only'}),w=dom.window;
 try{w.eval(read('contract-labels.js'));for(const [old,friendly] of names)assert.equal(w.VeroContractLabels.label(old),friendly);
  assert.equal(w.VeroContractLabels.label('1775M · TfNSW Detection and Enforcement Systems Agreement'),'1775M · NSW TfNSW Fixed Camera Operations');
  assert.equal(w.VeroContractLabels.label('Projects'),'Projects');
  assert.equal(w.VeroContractLabels.label('DJCS installation investigation'),'DJCS installation investigation');
  assert.equal(w.VeroContractLabels.record({friendly_name:'Current approved name',contract_name:'Previous name'}),'Current approved name');
  assert.equal(w.VeroContractLabels.label('Camera Enforcement Adjudication Services'),'Camera Enforcement Adjudication Services','Shared historical title cannot identify NT versus WA');
  assert.equal(w.VeroContractLabels.record({code:'1311OS:B',name:'Camera Enforcement Adjudication Services'}),'NT DPI Fixed Camera Operations');
  assert.equal(w.VeroContractLabels.record({code:'1846C',name:'Camera Enforcement Adjudication Services'}),'WA WAPOL Fixed Camera Operations');
  assert.equal(w.VeroContractLabels.choice({label:'1846C · Camera Enforcement Adjudication Services',client:'Western Australia Police Force'}),'WA WAPOL Fixed Camera Operations');
  assert.equal(w.VeroContractLabels.choice({label:'1834UK:C · CVOM EG037 — Tranche 03 implementation'}),'NL CVOM Fixed Camera Operations');
 }finally{w.close();}
});

test('event filters show friendly names while requests keep the original filter values',async()=>{
 const dom=new JSDOM('<main><p id="message"></p><div class="toolbar"><button id="dashboard"></button><button id="new-report"></button><button id="register"></button></div><section id="content"></section></main>',{url:'https://vero.test/incident-management.html',runScripts:'outside-only'}),w=dom.window,d=w.document,calls=[];
 try{
  w.localStorage.setItem('vero_session_token','test');
  w.fetch=async url=>{const u=new URL(url);calls.push(u);const p=u.pathname;let value;
   if(p.endsWith('/auth/me'))value={id:1};else if(p.endsWith('/incidents/options'))value={administrator:true,users:[],unverified:{}};
   else if(p.endsWith('/incidents/dashboard'))value={metrics:{},context_filters:{contracts:names.map(x=>x[0]),vm_sites:[]}};
   else if(p.endsWith('/incidents'))value={events:[]};
   return {ok:!!value,status:value?200:404,json:async()=>value||{}};
  };
  w.eval(read('contract-labels.js'));w.eval(read('incident-analytics.js'));w.eval(read('incident-management.js'));
  await wait(()=>d.getElementById('event-contract_name'));
  for(const [old,friendly] of names){
   const select=d.getElementById('event-contract_name');assert.equal([...select.options].find(o=>o.value===old)?.textContent,friendly);
   select.value=old;select.dispatchEvent(new w.Event('change'));
   await wait(()=>calls.some(u=>u.pathname.endsWith('/dashboard')&&u.searchParams.get('contract_name')===old));
   await wait(()=>d.getElementById('event-contract_name')?.value===old&&!d.getElementById('content').hasAttribute('aria-busy'));
  }
 }finally{w.close();}
});

test('SWMS saved link labels cannot overwrite the current service label',async()=>{
 const dom=new JSDOM(read('safe-work-method-statement.html'),{url:'https://vero.test/safe-work-method-statement.html',runScripts:'outside-only'}),w=dom.window,d=w.document;
 try{
  const saved={type:'Contract',id:3,label:'1775M · TfNSW Detection and Enforcement Systems Agreement'},current={...saved,label:'1775M · NSW TfNSW Fixed Camera Operations'};
  w.localStorage.setItem('vero_session_token','test');w.requestAnimationFrame=fn=>fn();w.eval(read('swms-ai.js'));
  w.fetch=async url=>({ok:true,json:async()=>String(url).endsWith('/link-options')?{options:[current]}:{items:[{kind:'document',id:8,title:'Existing SWMS',status:'Current',document_links:[saved]}]}});
  w.eval(read('contract-labels.js'));w.eval(read('swms-helper.js'));w.dispatchEvent(new w.Event('vero-risk-auth-ready'));
  await wait(()=>d.getElementById('swmsServiceFilter').options.length===2);
  const choice=d.getElementById('swmsServiceFilter').options[1];assert.equal(choice.value,'3');assert.equal(choice.textContent,current.label);
  assert.equal(d.getElementById('swmsContract').options[1].textContent,'NSW TfNSW Fixed Camera Operations');
  assert.equal(d.getElementById('swmsIntakeContract').options[1].textContent,'NSW TfNSW Fixed Camera Operations');
  assert.equal(saved.label,'1775M · TfNSW Detection and Enforcement Systems Agreement');
 }finally{w.close();}
});

test('document filters display friendly names without changing link identities',async()=>{
 const dom=new JSDOM(read('documents.html'),{url:'https://vero.test/documents.html',runScripts:'outside-only'}),w=dom.window,d=w.document;
 try{
  w.fetch=async()=>({ok:true,json:async()=>({documents:[]})});w.localStorage.setItem('vero_session_token','test');
  const vm=require('node:vm'),run=code=>vm.runInContext(code,dom.getInternalVMContext());
  const main=[...d.scripts].find(s=>s.textContent.includes('const DOCUMENTS_API='));run(main.textContent);run(read('contract-labels.js'));run(read('document-context.js'));
  run("liveDocuments=[{id:1,documentLinks:[{type:'Contract',id:3,label:'1775M · TfNSW Detection and Enforcement Systems Agreement'}]}];VeroDocumentContext.populateFilters();");
  const choice=d.getElementById('documentLinkFilter').options[1];assert.equal(choice.textContent,'Contract: 1775M · NSW TfNSW Fixed Camera Operations');assert.deepEqual(JSON.parse(choice.value),['Contract',3]);
 }finally{w.close();}
});

test('older Take 5 selections keep their stored value and display the friendly name',async()=>{
 const dom=new JSDOM(read('take-5.html'),{url:'https://vero.test/take-5.html',runScripts:'outside-only'}),w=dom.window,d=w.document;
 try{
  const assessment={payload:{contract:'NSW Fixed Cameras'}};
  w.eval(read('contract-labels.js'));w.eval(read('take5-work-context.js'));
  const work=w.VeroTake5WorkContext({getAssessment:()=>assessment,request:async p=>p==='/swms'?{items:[]}:{contracts:[]},changed(){},readonly:()=>false,importSwms(){}});
  await work.load();const selected=d.getElementById('take5_contract').selectedOptions[0];
  assert.equal(selected.value,'legacy');assert.equal(selected.textContent,'NSW TfNSW Fixed Camera Operations');assert.equal(assessment.payload.contract,'NSW Fixed Cameras');
 }finally{w.close();}
});
