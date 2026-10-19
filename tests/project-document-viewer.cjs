'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../project-document-viewer.js'),'utf8');
function setup(){
 const nodes=[],revoked=[];
 function element(tag){const e={tag,children:[],attrs:{},listeners:{},open:false,hidden:false,textContent:'',append(...items){this.children.push(...items)},appendChild(item){this.children.push(item)},replaceChildren(){this.children=[]},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this[k]},addEventListener(k,v){this.listeners[k]=v},showModal(){this.open=true},close(){this.open=false;this.listeners.close?.()}};nodes.push(e);return e;}
 const context=vm.createContext({document:{createElement:element,head:element('head'),body:element('body')},AbortController,Blob,URL:{createObjectURL:()=>`blob:test-${nodes.length}`,revokeObjectURL:x=>revoked.push(x)}});
 vm.runInContext(source,context);return {open:context.VeroProjectDocumentViewer.open,nodes,revoked,dialog:()=>nodes.find(n=>n.tag==='dialog'),status:()=>nodes.find(n=>n.className==='file-status'),body:()=>nodes.find(n=>n.className==='file-body'),download:()=>nodes.find(n=>n.tag==='a')};
}
const response=(body,type='text/plain',name='contract.txt')=>({ok:true,headers:new Headers({'Content-Disposition':`inline; filename="${name}"`,'Content-Type':type}),blob:async()=>new Blob([body],{type})});
test('viewer opens immediately and fetches the scoped authenticated URL without a popup',async()=>{
 const a=setup();let finish,request;
 const pending=a.open({contentUrl:'/projects/15/documents/2/content',fetch:(url,options)=>{request={url,options};return new Promise(r=>finish=r)}});
 assert.equal(a.dialog().open,true);assert.equal(a.status().textContent,'Loading document…');assert.equal(request.url,'/projects/15/documents/2/content');assert.equal(request.options.cache,'no-store');
 finish(response('Verification contract content'));await pending;assert.equal(a.body().children[0].textContent,'Verification contract content');assert.equal(a.download().hidden,false);
});
test('HTML content is shown as text and never inserted as executable markup',async()=>{
 const a=setup();await a.open({contentUrl:'test',fetch:async()=>response('<script>alert(1)</script>','text/html','unsafe.html')});
 assert.equal(a.body().children[0].tag,'pre');assert.equal(a.body().children[0].textContent,'<script>alert(1)</script>');
});
test('real PDF signature creates embedded PDF view, while fake PDF and Office files offer downloads',async()=>{
 const a=setup();await a.open({contentUrl:'test',fetch:async()=>response('%PDF-1.4\nfixture','application/octet-stream','contract.pdf')});assert.equal(a.body().children[0].tag,'iframe');assert.equal(a.body().children[0].title,'contract.pdf');
 await a.open({contentUrl:'test',fetch:async()=>response('not a PDF','application/pdf','bad.pdf')});assert.equal(a.body().children.length,0);assert.match(a.status().textContent,/separate application/);
 await a.open({contentUrl:'test',fetch:async()=>response('office bytes','application/vnd.openxmlformats-officedocument.wordprocessingml.document','contract.docx')});assert.match(a.status().textContent,/Download/);assert.equal(a.download().hidden,false);
});
test('close aborts the fetch and late response cannot reopen or replace the viewer',async()=>{
 const a=setup();let finish,signal;const pending=a.open({contentUrl:'test',fetch:async(url,options)=>{signal=options.signal;return new Promise(r=>finish=r)}});
 a.dialog().close();assert.equal(signal.aborted,true);finish(response('late content'));await pending;assert.equal(a.dialog().open,false);assert.equal(a.body().children.length,0);
});
test('opening another document discards the previous late response and releases blob URLs',async()=>{
 const a=setup();let finish;const pending=a.open({contentUrl:'old',fetch:()=>new Promise(r=>finish=r)});
 await a.open({contentUrl:'new',fetch:async()=>response('new document')});finish(response('old document'));await pending;assert.equal(a.body().children[0].textContent,'new document');a.dialog().close();assert.equal(a.revoked.length,1);
});
test('403, missing document and network failures remain visible without offering stale downloads',async()=>{
 for(const code of [403,404]){const a=setup();await a.open({contentUrl:'test',fetch:async()=>({ok:false,status:code,json:async()=>({message:'Document access denied'})})});assert.equal(a.status().textContent,'Document access denied');assert.equal(a.download().hidden,true);}
 const a=setup();await a.open({contentUrl:'test',fetch:async()=>{throw Error('Network unavailable')}});assert.match(a.status().textContent,/Network unavailable/);
});
test('both project entry points use the shared viewer and validate document IDs',async()=>{
 for(const name of ['project-management.html','project-workspace.html']){
  const html=fs.readFileSync(path.join(__dirname,'..',name),'utf8');assert.match(html,/src="project-document-viewer.js\?v=/);
  const start=html.indexOf('async function viewProjectDocument(documentId){'),end=html.indexOf('\n}',start)+2;
  const requests=[],scope=vm.createContext({currentProject:{id:15},API_BASE:'/api',apiFetch:()=>{},VeroProjectDocumentViewer:{open:options=>requests.push(options)}});vm.runInContext(html.slice(start,end),scope);
  await scope.viewProjectDocument(25);await scope.viewProjectDocument('invalid');await scope.viewProjectDocument(-1);assert.equal(requests.length,1);assert.equal(requests[0].contentUrl,'/api/projects/15/documents/25/content');
 }
});
