const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const tick=()=>new Promise(r=>setImmediate(r));
test('all five governance pages mount related documents beside their primary action',()=>{
 const fixtures={
  'continual-improvement-management.html':'<div id="vh"><div class="improvement-actions"><button>Add Action</button></div></div>',
  'documents.html':'<div class="actions document-actions"><button>Request Document Action</button></div>',
  'records.html':'<div class="dashboard-content"><section class="records-toolbar"><button>Add Record</button></section></div>',
  'risk.html':'<div id="veroCompactFilterBarV3"><div class="vero-risk-primary-actions"><button>Add Risk</button></div></div>',
  'incident-management.html':'<div class="toolbar"><button id="new-report">Report an Event</button></div>'
 };
 for(const [page,html] of Object.entries(fixtures)){
  const dom=new JSDOM('<main>'+html+'</main>',{url:'https://vero.example/'+page,runScripts:'outside-only'}),w=dom.window;
  w.eval(source('page-related-documents.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  const menu=w.document.querySelector('.vero-related-documents'),button=w.document.querySelector('button');
  assert.equal(menu.parentElement,button.parentElement,page);assert.ok(menu.parentElement.classList.contains('vero-related-action-row'));
  assert.equal(w.document.querySelectorAll('.vero-related-documents').length,1);
  if(page==='risk.html')assert.equal(w.document.querySelector('#veroCompactFilterBarV3').contains(menu),false);
  dom.window.close();
 }
});
test('page menu is on the action row, loads current links, escapes titles and handles errors',async()=>{
 const dom=new JSDOM('<main><section class="global-hero"></section><div class="actions"><button>Register policy</button></div></main>',{url:'https://vero.example/insurance.html',runScripts:'outside-only'}),w=dom.window;
 w.localStorage.setItem('vero_session_token','fixture');let fail=false,url;
 w.fetch=async(u,o)=>{url=u;assert.equal(o.headers.Authorization,'Bearer fixture');return {ok:!fail,json:async()=>fail?{message:'Try later'}:{documents:[{id:7,document_number:'IMS-1',document_title:'<b>Procedure</b>',version_number:'2'}]}};};
 w.eval(source('page-related-documents.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const menu=w.document.querySelector('.actions details');assert.ok(menu);menu.open=true;menu.dispatchEvent(new w.Event('toggle'));await tick();
 assert.match(url,/page=insurance.html/);const a=menu.querySelector('a');assert.equal(a.getAttribute('href'),'documents.html?document=7');assert.equal(a.querySelector('b'),null);assert.match(a.textContent,/Version 2/);
 fail=true;menu.dispatchEvent(new w.Event('toggle'));await tick();assert.match(menu.textContent,/Try later/);assert.ok(menu.querySelector('button'));
 menu.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(menu.open,false);dom.window.close();
});
test('document controller can save multiple pages and clear all links; readers cannot edit',async()=>{
 const dom=new JSDOM('<div id="drawerBack"><div class="drawer-body"></div></div>',{url:'https://vero.example/documents.html',runScripts:'outside-only'}),w=dom.window;
 w.API_BASE='/api';w.authHeaders=x=>x;let saved,editable=true;
 const data=()=>({pages:[{id:'insurance.html',label:'Insurance Management'},{id:'compliance.html',label:'Compliance'}],selected_pages:['insurance.html'],can_edit:editable,revision_token:'a'.repeat(64)});
 w.fetch=async(u,o)=>{if(o.method==='PUT')saved=JSON.parse(o.body);return {ok:true,json:async()=>data()};};
 w.eval(source('document-page-editor.js'));await w.VeroDocumentPages.open({id:7});
 const form=w.document.querySelector('form'),inputs=[...form.querySelectorAll('input')];inputs[1].checked=true;
 form.dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();assert.deepEqual(saved.pages,['insurance.html','compliance.html']);
 for(const i of form.querySelectorAll('input'))i.checked=false;form.dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();assert.deepEqual(saved.pages,[]);
 editable=false;await w.VeroDocumentPages.open({id:8});assert.equal(form.querySelector('button').hidden,true);assert.ok([...form.querySelectorAll('input')].every(i=>i.disabled));dom.window.close();
});
test('every selectable page includes the dropdown script and document deep links open its editor',()=>{
 const pages=fs.readdirSync(path.join(__dirname,'..')).filter(p=>p.endsWith('.html')&&source(p).includes('page-related-documents.js'));
 assert.ok(pages.length>=30);assert.ok(pages.includes('insurance.html'));assert.ok(pages.includes('compliance.html'));
 assert.match(source('documents.html'),/VeroDocumentPages\?\.open\(d\)/);
});
