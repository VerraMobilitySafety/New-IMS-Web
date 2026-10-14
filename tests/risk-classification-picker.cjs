'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','risk-classification-picker.js'),'utf8');
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.listeners={};this.value='';this.disabled=false;this.textContent='';this._value='';}
 set value(v){this._value=String(v);}
 get value(){return this._value;}
 append(...items){this.children.push(...items);}
 appendChild(item){this.children.push(item);return item;}
 replaceChildren(...items){this.children=[...items];}
 remove(){this.removed=true;}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 setAttribute(){}
 fire(type){for(const fn of this.listeners[type]||[])fn({target:this});}
}
function setup(fetcher,value){
 const document={createElement:tag=>new Element(tag)};
 const host=new Element(),events=[];
 const scope={document,fetch:fetcher,localStorage:{getItem:()=> 'token'},window:{}};
 vm.runInNewContext(code,scope);
 const picker=scope.window.VeroRiskClassificationPicker.mount(host,{value,onSelect:item=>events.push(item)});
 const [wrap]=host.children;
 return {picker,events,search:wrap.children[0],select:wrap.children[1],selected:wrap.children[2],info:wrap.children[3]};
}
const data={categories:[{category_id:7,path:'Traffic / Driving',tier:2},{category_id:7,path:'Operations / Driving',tier:2},{category_id:8,path:'People / Fatigue',tier:3}]};
const response=(body,ok=true)=>({ok,json:async()=>body});
const tick=async()=>{for(let n=0;n<5;n++)await Promise.resolve();};
test('preserves classification ID across multiple paths and search',async()=>{
 const a=setup(async()=>response(data),7);await tick();
 assert.equal(a.picker.getValue(),7);
 assert.equal(a.select.children.length,3);
 assert.match(a.selected.textContent,/Driving/);
 a.search.value='Fatigue';a.search.fire('input');
 assert.equal(a.select.value,'');
 assert.equal(a.picker.getValue(),7);
 a.search.value='';a.search.fire('input');
 assert.equal(a.select.value,'7');
 a.select.value='8';a.select.fire('change');
 assert.equal(a.picker.getValue(),'8');
 assert.equal(a.events[0].category_id,8);
});
test('disables selection on load failure',async()=>{
 const a=setup(async()=>{throw Error('offline')});await tick();
 assert.equal(a.select.disabled,true);
 assert.match(a.info.textContent,/offline/);
 assert.equal(a.select.children.length,0);
});
test('ignores results after destruction',async()=>{
 let resolve;
 const a=setup(()=>new Promise(r=>resolve=r));a.picker.destroy();
 resolve(response(data));await tick();
 assert.equal(a.select.children.length,0);
});
test('supports programmatic selection',async()=>{
 const a=setup(async()=>response(data));await tick();
 a.picker.setValue(8);
 assert.equal(a.select.value,'8');
 assert.match(a.selected.textContent,/Fatigue/);
 assert.equal(a.events.length,0);
});

test('excludes archived and invalid classifications from new selections',async()=>{
 const a=setup(async()=>response({categories:[
  {category_id:1,path:'Traffic',tier:1,status:'Active'},
  {category_id:2,path:'Retired',tier:2,status:'Archived'},
  {category_id:3,path:'Disabled',tier:2,status:'Inactive'},
  {category_id:4,path:'Invalid tier',tier:5,status:'Active'},
  {path:'Missing ID',tier:1,status:'Active'}
 ]}));await tick();
 assert.equal(a.select.children.length,2);
 assert.equal(a.select.children[1].value,'1');
 a.picker.setValue(2);
 assert.equal(a.picker.getSelected(),null);
});
