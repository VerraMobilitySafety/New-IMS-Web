const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../workflow-task-completion.js'),'utf8');
test('workflow completion opens the real source task, without submitting a fabricated decision',async()=>{
 const source={id:'document-approval-12',action_type:'Document Approval',source_id:4,decision:'Pending',managed_task_id:'must-be-removed'};
 const requests=[],actions=[];let opened;
 const context={URLSearchParams,location:{search:'?complete_task=document-approval-12'},localStorage:{getItem:()=> 'synthetic'},allActions:actions,openActionDetail:index=>opened=index,fetch:async(url,options)=>{requests.push({url,options});return {ok:true,status:200,json:async()=>({action:{closed:false,source_action:source}})};}};
 vm.runInNewContext(code,context);await new Promise(r=>setImmediate(r));
 assert.equal(requests.length,1);assert.equal(requests[0].options.method,undefined);assert.equal(actions[0].id,source.id);assert.equal(actions[0].managed_task_id,undefined);assert.equal(actions[0].decision,'Pending');assert.equal(opened,0);
});
test('a completed source workflow never opens a second approval form',async()=>{
 let opened=false,message;
 const context={URLSearchParams,location:{search:'?complete_task=document-approval-12'},localStorage:{getItem:()=> 'synthetic'},allActions:[],openActionDetail:()=>opened=true,fetch:async()=>({ok:true,json:async()=>({action:{closed:true}})}),document:{createElement:()=>({setAttribute(){},set textContent(value){message=value;}}),querySelector:()=>({prepend(){}})}};
 vm.runInNewContext(code,context);await new Promise(r=>setImmediate(r));assert.equal(opened,false);assert.match(message,/already complete/);
});
