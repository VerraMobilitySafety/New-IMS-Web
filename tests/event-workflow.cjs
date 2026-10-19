const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const {webcrypto}=require('node:crypto');
const path=require('node:path'),root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'incident-management.html'),'utf8');
html=html.replace('<script src="nav.js"></script>','').replace('<body>','<body><script>'+fs.readFileSync(path.join(__dirname,'event-fixture.js'),'utf8')+'</script>').replace('<script src="incident-management.js"></script>','<script>'+fs.readFileSync(path.join(root,'incident-management.js'),'utf8')+'</script>');
const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(html,{url:'https://preview.invalid/incident-management.html',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.structuredClone=structuredClone;w.crypto.randomUUID=()=>webcrypto.randomUUID();}});
const w=dom.window,d=w.document;
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timed out waiting for UI');}
function set(form,name,value){form.elements.namedItem(name).value=value;}
function submit(form){form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));}
async function evidenceUpload(){
 const Native=w.FormData;d.querySelector('#message').textContent='';
 w.FormData=class extends Native{getAll(name){return name==='files'?[{name:'synthetic.txt',size:3,arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer}]:super.getAll(name);}};
 submit(d.querySelector('#upload-form'));w.FormData=Native;
 await until(()=>d.querySelector('#message').textContent==='Files uploaded.');
}

(async()=>{
 await until(()=>d.querySelector('#event-filter'));assert.match(d.body.textContent,/No events in this view/);
 assert.match(d.querySelector('#coverage').textContent,/Unverified/);assert.match(d.querySelector('#coverage').textContent,/not enabled/);
 d.querySelector('#new-report').click();let f=d.querySelector('#report-form');
 for(const field of d.querySelectorAll('[data-impact]')){const [a,c]=field.querySelectorAll('select');assert.equal(c.disabled,true);a.value='Potential';a.dispatchEvent(new w.Event('change'));assert.equal(c.required,true);a.value='No';a.dispatchEvent(new w.Event('change'));assert.equal(c.disabled,true);assert.equal(c.required,false);}
 set(f,'description','<img src=x onerror=alert(1)> synthetic event');set(f,'occurred_date','2026-10-19');set(f,'occurred_time','12:30');set(f,'location','Other');d.querySelector('#location').dispatchEvent(new w.Event('change'));set(f,'address','Sydney');submit(f);
 await until(()=>d.querySelector('#investigation-form'));assert.equal(d.querySelector('#content img'),null,'Narrative must be escaped');assert.match(d.querySelector('#content').textContent,/<img src=x/);
 f=d.querySelector('#investigation-form');set(f,'summary','Guard repaired; cause verified');d.querySelector('#add-action').click();d.querySelector('#add-action').click();
 [...d.querySelectorAll('#prevention-actions .item')].forEach((row,i)=>{row.querySelector('[data-title]').value='Repair '+i;row.querySelector('select').value='1';row.querySelector('[data-due]').value='2026-11-01';});
 d.querySelector('#add-factor').click();d.querySelector('#factors textarea').value='Synthetic factor';
 const actionKeys=[...d.querySelectorAll('#prevention-actions .item')].map(row=>row.dataset.key);
 await evidenceUpload();assert.equal(d.querySelector('#investigation-form'),f);assert.equal(f.elements.namedItem('summary').value,'Guard repaired; cause verified');assert.equal(d.querySelector('#factors textarea').value,'Synthetic factor');assert.deepEqual([...d.querySelectorAll('#prevention-actions .item')].map(row=>row.dataset.key),actionKeys);
 submit(f);await until(()=>!d.querySelector('#investigation-form'));assert.match(d.querySelector('#content').textContent,/Complete/);const links=[...d.querySelectorAll('a')].filter(a=>a.textContent==='Open action');assert.equal(links.length,3);
 w.history.pushState(null,'',links[0].href);w.dispatchEvent(new w.PopStateEvent('popstate'));await until(()=>d.querySelector('#close-form'));f=d.querySelector('#close-form');set(f,'comments','Repair verified');await evidenceUpload();assert.equal(d.querySelector('#close-form'),f);assert.equal(f.elements.namedItem('comments').value,'Repair verified');submit(f);await until(()=>!d.querySelector('#close-form'));assert.match(d.querySelector('#content').textContent,/Closed/);assert.match(d.querySelector('#content').textContent,/Repair verified/);
 assert.deepEqual(errors,[]);dom.window.close();const linked=new JSDOM(html,{url:'https://preview.invalid/incident-management.html?view=report&contract_id=5&site_id=1',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.structuredClone=structuredClone;w.crypto.randomUUID=()=>webcrypto.randomUUID();}});await until(()=>linked.window.document.querySelector('#report-form'));assert.equal(linked.window.document.querySelector('#location').value,'Client site');assert.equal(linked.window.document.querySelector('#reference').value,'1');linked.window.close();console.log('PASS: actual UI report → investigation → exactly 3 actions → closure; conditional fields, uncertainty flags and HTML escaping.');
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});
