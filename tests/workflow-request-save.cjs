const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
function setup(storage=new Map()){
 const ctx=vm.createContext({crypto:require('node:crypto').webcrypto,TextEncoder,Uint8Array,console,
  sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
 vm.runInContext(fs.readFileSync(path.join(root,'project-request-save.js'),'utf8'),ctx);return ctx.VeroProjectRequestSave;
}
test('uncertain request retries exactly the same operation after page reload',async()=>{
 const storage=new Map(),keys=[];let helper=setup(storage);
 await assert.rejects(helper.send(async(u,o)=>{keys.push(JSON.parse(o.body).operation_id);throw Error('lost response');},'/projects/5/request',{request_status:'Submitted'}));
 helper=setup(storage);
 const result=await helper.send(async(u,o)=>{keys.push(JSON.parse(o.body).operation_id);return {ok:true,json:async()=>({status:'success'})};},'/projects/5/request',{request_status:'Submitted'});
 assert.equal(keys[0],keys[1]);assert.equal(result.status,'success');assert.equal(storage.size,0);
});
test('changed payload cannot accidentally reuse an uncertain operation',async()=>{
 const helper=setup();await assert.rejects(helper.send(async()=>{throw Error('lost');},'/request',{title:'A'}));
 let called=false;await assert.rejects(helper.send(async()=>{called=true;},'/request',{title:'B'}),/uncertain/);assert.equal(called,false);
});
test('definite stale rejection permits a fresh operation after reload',async()=>{
 const helper=setup(),keys=[];
 await assert.rejects(helper.send(async(u,o)=>{keys.push(JSON.parse(o.body).operation_id);return {ok:false,status:409,json:async()=>({message:'Reload'})};},'/request',{version:1}),/Reload/);
 await helper.send(async(u,o)=>{keys.push(JSON.parse(o.body).operation_id);return {ok:true,json:async()=>({})};},'/request',{version:2});assert.notEqual(keys[0],keys[1]);
});
test('milestone collection retains existing blank rows for server validation, does not silently remove them',()=>{
 const helper=setup(),rows=[{dataset:{existingId:'7',milestoneType:'Contract'},querySelector:s=>({value:s==='.ms-name'?'':'2026-12-01'})}];
 const result=helper.collect({querySelectorAll:()=>rows});assert.equal(result.length,1);assert.equal(result[0].id,7);assert.equal(result[0].milestone_name,'');
});
test('all affected inline scripts parse and both request editors send one atomic mutation',()=>{
 for(const name of ['project-management.html','project-workspace.html','compliance.html','my-actions.html']){
  const text=fs.readFileSync(path.join(root,name),'utf8');let i=0;
  for(const match of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))if(match[1].trim())new vm.Script(match[1],{filename:name+':'+(++i)});
  if(name.startsWith('project-')){assert.match(text,/VeroProjectRequestSave.send/);assert.doesNotMatch(text,/await saveMilestones\(/);assert.match(text,/expected_milestones/);}
 }
 new vm.Script(fs.readFileSync(path.join(root,'compliance-correction.js'),'utf8'));
});
