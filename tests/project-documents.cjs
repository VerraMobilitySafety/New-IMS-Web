const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../project-documents.js'),'utf8');
const fixture={documents:[{id:1,document_title:'Safety plan',version_number:2,linked_via:['Site: Nine']},{id:1,document_title:'Duplicate'}],records:[{id:1,title:'Signed agreement',record_code:'REC1',linked_via:['Linked project record']}],uploads:[{id:1,title:'Contract upload',filename:'contract.txt',linked_via:['Project upload']}]};
function setup(){const dom=new JSDOM('<div id="list"></div><span id="count"></span>',{url:'https://vero.test',runScripts:'outside-only'});dom.window.eval(source);const w=dom.window;return {w,list:w.document.querySelector('#list'),count:w.document.querySelector('#count'),mount:(request)=>w.VeroProjectDocuments.mount(w.document.querySelector('#list'),4,request,'/api',w.document.querySelector('#count'))};}
const reply=data=>({ok:true,json:async()=>data});
test('combines sources, scopes duplicate IDs by source and preserves original links and authenticated viewer',async()=>{
 const a=setup(),calls=[];await a.mount(async(url,opts)=>{calls.push([url,opts]);return reply(fixture)});
 assert.equal(a.list.querySelectorAll('tbody tr').length,3);assert.equal(a.count.textContent,'3 documents and records');
 assert.equal(a.list.querySelector('a[href^="records.html"]').getAttribute('href'),'records.html?record_id=1');
 assert.equal(a.list.querySelector('a[href^="documents.html?document"]').getAttribute('href'),'documents.html?document=1');
 assert.match(a.list.querySelector('a').href,/link_type=Project&link_value=4/);
 const opened=[];a.w.VeroProjectDocumentViewer={open:x=>opened.push(x)};a.list.querySelector('tbody button').click();
 assert.equal(opened[0].contentUrl,'/api/projects/4/documents/1/content');assert.equal(typeof opened[0].fetch,'function');
 assert.equal(calls[0][0],'/api/projects/4/document-index');assert.equal(calls[0][1].cache,'no-store');
});
test('search and source filters combine and empty states are clear',async()=>{
 const a=setup();await a.mount(async()=>reply(fixture));const search=a.list.querySelector('input'),filter=a.list.querySelector('select');
 search.value='Nine';search.oninput();assert.equal(a.list.querySelectorAll('tbody tr').length,1);assert.match(a.list.querySelector('tbody').textContent,/Safety plan/);
 filter.value='record';filter.onchange();assert.match(a.list.textContent,/No matching/);search.value='';search.oninput();assert.match(a.list.querySelector('tbody').textContent,/Signed agreement/);
 await a.mount(async()=>reply({}));assert.match(a.list.textContent,/No documents or accessible records linked yet/);
});
test('titles are text and cannot execute markup',async()=>{
 const a=setup();await a.mount(async()=>reply({records:[{id:9,title:'<img src=x onerror=alert(1)>'}]}));assert.equal(a.list.querySelector('img'),null);assert.match(a.list.textContent,/<img src=x/);
});
test('errors support retry, report failed refresh, and cannot leave stale rows',async()=>{
 const a=setup();let fail=true;const request=async()=>fail?{ok:false,json:async()=>({message:'Temporarily unavailable'})}:reply(fixture);
 assert.equal(await a.mount(request),false);assert.match(a.list.textContent,/Temporarily unavailable/);assert.equal(a.count.textContent,'Unable to load');
 fail=false;a.list.querySelector('button').click();await new Promise(r=>setTimeout(r,0));assert.equal(a.list.querySelectorAll('tbody tr').length,3);
});
test('late responses from another project cannot replace active project data',async()=>{
 const a=setup();let finish;const old=a.mount(()=>new Promise(r=>finish=r));await a.mount(async()=>reply({records:[{id:7,title:'New project'}]}));finish(reply(fixture));assert.equal(await old,false);assert.match(a.list.textContent,/New project/);assert.doesNotMatch(a.list.textContent,/Safety plan/);
});
test('workspace uses unified index while keeping upload and original file viewer entry points',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../project-workspace.html'),'utf8');assert.match(html,/src="project-documents.js\?v=/);assert.doesNotMatch(html,/projectControlledDocuments|VeroLinkedDocuments.mount/);assert.match(html,/return VeroProjectDocuments.mount/);assert.match(html,/await loadProjectDocuments\(projectId\)/);assert.match(html,/async function viewProjectDocument\(documentId\)/);
});
