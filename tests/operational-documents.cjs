const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const links=[{type:'Client',name:'Client A',label:'Client A'},{type:'Project',id:7,label:'PRJ7 · Test project'},{type:'Contract',id:8,label:'Contract 8'},{type:'Site',id:9,label:'Site 9'}];
async function screen(){
 const html=fs.readFileSync(path.join(root,'documents.html'),'utf8');
 const dom=new JSDOM(html,{url:'https://vero.example/documents.html?category=Operational&link_type=Project&link_value=7',runScripts:'outside-only'});
 const w=dom.window;
 w.fetch=async url=>({ok:true,status:200,json:async()=>String(url).includes('link-options')?{options:links}:{documents:[]}});
 w.localStorage.setItem('vero_session_token','test-token');
 const main=[...w.document.scripts].find(s=>s.textContent.includes('const DOCUMENTS_API='));
 assert.ok(main,'main document controller found');
 vm.runInContext(main.textContent,dom.getInternalVMContext());
 vm.runInContext(fs.readFileSync(path.join(root,'document-context.js'),'utf8'),dom.getInternalVMContext());
 await new Promise(r=>setImmediate(r));
 return {w,dom,run:code=>vm.runInContext(code,dom.getInternalVMContext()),id:id=>w.document.getElementById(id)};
}
test('new operational request selects the linked project and permits Excel drafts',async()=>{
 const s=await screen();
 try{
  s.run('openRequest()');await new Promise(r=>setImmediate(r));
  assert.equal(s.id('reqCategory').value,'Operational');
  assert.equal(s.id('requestLinksField').hidden,false);
  assert.equal(s.id('reqFile').accept,'.docx,.xlsx');
  assert.equal(s.id('reqLinks').selectedOptions.length,1);
  const payload=s.run('(()=>{const f=new FormData();VeroDocumentContext.appendRequest(f);return {category:f.get("entity_type"),links:JSON.parse(f.get("document_links"))};})()');
  assert.equal(payload.category,'Operational');assert.equal(payload.links[0].id,7);
  assert.equal(s.run('VeroDocumentContext.accepts({name:"bom.xlsx"})'),true);
  assert.equal(s.run('VeroDocumentContext.accepts({name:"macro.xlsm"})'),false);
 }finally{s.dom.window.close();}
});
test('operational requests cannot be submitted without an association',async()=>{
 const s=await screen();try{
  s.run('openRequest()');await new Promise(r=>setImmediate(r));
  for(const o of s.id('reqLinks').options)o.selected=false;
  assert.equal(s.run('VeroDocumentContext.validateRequest()'),false);
  assert.match(s.w.document.body.textContent,/Select at least one linked client/);
 }finally{s.dom.window.close();}
});
test('changing to Governance hides context and returns to Word drafts',async()=>{
 const s=await screen();try{
  s.run('openRequest()');await new Promise(r=>setImmediate(r));
  s.id('reqCategory').value='Governance';s.run('VeroDocumentContext.categoryChanged()');
  assert.equal(s.id('requestLinksField').hidden,true);assert.equal(s.id('reqFile').accept,'.docx');
  assert.equal(s.run('VeroDocumentContext.accepts({name:"bom.xlsx"})'),false);
 }finally{s.dom.window.close();}
});
test('revisions inherit the selected document and cannot submit edited links',async()=>{
 const s=await screen();try{
  s.run('liveDocuments=[normaliseDocument({id:40,entity_type:"Operational",status:"Current",document_links:[{type:"Project",id:7,label:"PRJ7"}]})];openRequest()');
  await new Promise(r=>setImmediate(r));
  s.id('reqType').value='Revise Existing Document';s.run('updateRequestType()');
  s.id('reqExistingDocument').value='40';s.id('reqExistingDocument').dispatchEvent(new s.w.Event('change'));
  assert.equal(s.id('reqLinks').disabled,true);
  assert.equal(s.run('(()=>{const f=new FormData();VeroDocumentContext.appendRequest(f);return f.has("document_links");})()'),false);
 }finally{s.dom.window.close();}
});
test('job view uses central document identities and reports failed loads',async()=>{
 const dom=new JSDOM('<main></main>',{url:'https://vero.example/',runScripts:'outside-only'}),w=dom.window;
 try{
  w.eval(fs.readFileSync(path.join(root,'linked-documents.js'),'utf8'));
  let requested;const host=w.document.querySelector('main');
  await w.VeroLinkedDocuments.mount(host,{type:'Project',id:7},null,'',async url=>{requested=url;return {documents:[{id:40,document_number:'OP7',document_title:'Test Plan',version_number:'1.1'}]};});
  assert.match(requested,/entity_type=Operational/);assert.match(requested,/link_value=7/);
  assert.ok(host.querySelector('a[href="documents.html?document=40"]'));
  await w.VeroLinkedDocuments.mount(host,{type:'Project',id:7},null,'',async()=>{throw Error('Unavailable');});
  assert.match(host.textContent,/Unavailable/);assert.equal(host.querySelector('button').textContent,'Retry');
 }finally{dom.window.close();}
});
