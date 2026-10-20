'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../project-management.html'),'utf8');
const source=html.slice(html.indexOf('let currentExecution=null;'),html.indexOf('function closeSetup()'));
function setup(canEdit=true,initialized=false){
 const nodes=new Map(),requests=[],alerts=[];
 const get=id=>{if(!nodes.has(id))nodes.set(id,{style:{},classList:{add(){}},value:'',innerHTML:'',textContent:'',querySelectorAll:()=>[],addEventListener(){},scrollIntoView(){}});return nodes.get(id)};
 const c=vm.createContext({currentProject:null,document:{getElementById:get,querySelector:get,querySelectorAll:()=>[],body:{style:{}}},
  console:{error(){}},alert:x=>alerts.push(x),esc:x=>String(x),PROJECT_EXECUTION_API:id=>'/projects/'+id+'/execution',
  apiFetch:async(url,options={})=>{requests.push({url,options});if(options.method==='POST'){initialized=true;return{ok:true,json:async()=>({status:'success'})}}
   return{ok:true,json:async()=>({is_project_manager:canEdit,execution_initialized:initialized,project:{},execution:{items:initialized?[{id:1,section_name:'Delivery',item_name:'Synthetic item'}]:[]}})}}});
 vm.runInContext(source,c);return{c,get,requests,alerts};
}
test('opening an uninitialized execution is read only and offers an explicit write to its manager',async()=>{
 const a=setup();await a.c.openProjectExecution({raw:{id:5}});
 assert.equal(a.requests.length,1);assert.equal(a.requests[0].options.method,undefined);
 assert.match(a.get('#setupPanel .setup-foot').innerHTML,/Initialize Project Execution/);
 assert.match(a.get('#setupPanel .setup-body').innerHTML,/not initialized/);assert.deepEqual(a.alerts,[]);
});
test('read-only viewers cannot initialize missing execution',async()=>{
 const a=setup(false);await a.c.openProjectExecution({raw:{id:5}});
 assert.match(a.get('#setupPanel .setup-foot').innerHTML,/Read only/);
 assert.doesNotMatch(a.get('#setupPanel .setup-foot').innerHTML,/button/);
});
test('explicit save reloads the created checklist using GET',async()=>{
 const a=setup();await a.c.openProjectExecution({raw:{id:5}});await a.c.saveProjectExecution();
 assert.deepEqual(a.requests.map(x=>x.options.method||'GET'),['GET','POST','GET']);
 assert.match(a.get('#setupPanel .setup-body').innerHTML,/Synthetic item/);
 assert.match(a.get('#setupPanel .setup-foot').innerHTML,/Save Project Execution/);
 assert.deepEqual(a.alerts,[]);
});
