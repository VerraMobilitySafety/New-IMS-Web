const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../maintenance-documents.js'),'utf8');
function screen(){
 const dom=new JSDOM('<main></main>',{url:'https://vero.example/',runScripts:'outside-only'}),w=dom.window;
 w.eval(source);return {dom,w,host:w.document.querySelector('main'),mount:request=>w.VeroMaintenanceDocuments.mount(w.document.querySelector('main'),{id:4,contract_name:'Contract Four'},request,'https://api.example')};
}
const data={documents:[{id:1,document_title:'Safety plan',document_type:'Safety Management Plan',version_number:'2.0',linked_via:['Site: Nine']},{id:1,document_title:'Safety plan',version_number:'2.0'}],records:[{id:1,record_code:'REC1',title:'Signed contract',kind:'Contract source record',linked_via:['Contract source file'],content_path:'/maintenance-contracts/4/sources/7'}]};
test('one index displays DMS documents and records without identifier collisions or duplicates',async()=>{
 const s=screen();try{
  let url;await s.mount(async value=>{url=value;return data;});
  assert.equal(url,'/maintenance-contracts/4/documents');
  assert.equal(s.host.querySelectorAll('tbody tr').length,2);
  assert.ok(s.host.querySelector('a[href="documents.html?document=1"]'));
  assert.ok(s.host.querySelector('a[href="records.html?record_id=1"]'));
  assert.match(s.host.textContent,/Site: Nine/);
  const search=s.host.querySelector('input');search.value='Safety';search.dispatchEvent(new s.w.Event('input'));
  assert.equal(s.host.querySelectorAll('tbody tr').length,1);assert.match(s.host.textContent,/1 of 2/);
  search.value='';const filter=s.host.querySelector('select');filter.value='record';filter.dispatchEvent(new s.w.Event('change'));
  assert.equal(s.host.querySelectorAll('tbody tr').length,1);assert.match(s.host.querySelector('tbody').textContent,/Signed contract/);
 }finally{s.dom.window.close();}
});
test('source files use the existing authenticated viewer and source URL',async()=>{
 const s=screen();try{
  let options;s.w.VeroProjectDocumentViewer={open:value=>{options=value;}};
  await s.mount(async()=>data);s.host.querySelector('button').click();
  assert.equal(options.contentUrl,'https://api.example/maintenance-contracts/4/sources/7');
  assert.equal(typeof options.fetch,'function');
 }finally{s.dom.window.close();}
});
test('failed loads offer retry and do not claim no documents exist',async()=>{
 const s=screen();try{
  await s.mount(async()=>{throw Error('Temporary failure');});
  assert.match(s.host.textContent,/Temporary failure/);assert.equal(s.host.querySelector('button').textContent,'Retry');
  assert.doesNotMatch(s.host.textContent,/No current documents/);
 }finally{s.dom.window.close();}
});
test('a response from the previous contract cannot overwrite the current tab',async()=>{
 const s=screen();try{
  let finish;const first=s.mount(()=>new Promise(resolve=>{finish=resolve;}));
  s.host.replaceChildren(s.w.document.createTextNode('Current Sites tab'));
  finish(data);await first;assert.equal(s.host.textContent,'Current Sites tab');
 }finally{s.dom.window.close();}
});
