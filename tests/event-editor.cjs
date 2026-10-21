const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
const dom=new JSDOM('<main></main>',{url:'https://example.invalid',runScripts:'outside-only'}),w=dom.window,d=w.document;
w.HTMLElement.prototype.scrollIntoView=()=>{};w.eval(fs.readFileSync(__dirname+'/../event-editor.js','utf8'));
const event={id:'fixture',version:2,investigator_id:9,investigator_name:'Historical investigator',legacy:{register_description:'Original short title'},report:{description:'Original full report',details:{},classification:{}},investigation:{}};
let payload,saved=false;const args={event,root:d.querySelector('main'),options:{administrator:true,users:[{id:2,name:'Active investigator',email:'test@example.invalid'}]},esc:v=>String(v??''),api:async(path,body)=>{payload=body;},saved:async()=>{saved=true;},message:()=>{}};
w.VeroEventEditor.open(args);const form=d.querySelector('form');assert.equal(form.elements.edit_investigator_id.value,'9','Preserve inactive current investigator until explicitly changed');
form.elements.description.value='Corrected full description';form.elements.register_description.value='Corrected short title';form.elements.edit_investigator_id.value='2';form.elements.reason.value='Correct original assignment';await form.onsubmit({preventDefault(){}});
assert(saved);assert.equal(payload.changes.investigator_id,2);assert.equal(payload.changes.description,'Corrected full description');assert.equal(payload.changes.register_description,'Corrected short title');assert.equal(payload.reason,'Correct original assignment');
d.querySelector('main').innerHTML='';w.VeroEventEditor.open({...args,options:{...args.options,administrator:false}});assert.equal(d.querySelector('[name=edit_investigator_id]'),null,'HSEQ-only editors cannot change investigator');dom.window.close();console.log('PASS: admin descriptions and investigator amendment, historical owner retention and non-admin field exclusion');
})().catch(e=>{console.error(e);process.exitCode=1;});
