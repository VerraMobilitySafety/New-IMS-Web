const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../risk-nk9-animation.js'),'utf8');
function setup(reduced=false){
 const timers=new Map();let id=0,change;
 const classes=()=>{const values=new Set();return {add(...xs){xs.forEach(x=>values.add(x));},remove(...xs){xs.forEach(x=>values.delete(x));},has:x=>values.has(x)};};
 const parent={classList:classes()};
 const bg={clientWidth:800,parentElement:parent,getBoundingClientRect:()=>({left:300,right:1100,top:200,bottom:900}),replaceChildren(){this.cleared=true;}};
 const cameras=Array.from({length:4},()=>{
  const angle={},front={};return {style:{},dataset:{},classList:classes(),parentElement:bg,
   querySelector:s=>s==='.nk9-angle'?angle:front,querySelectorAll:()=>[angle,front],
   getBoundingClientRect:()=>({left:400,right:500,top:300,bottom:400}),
   animate(frames,options){this.frames=frames;this.options=options;return {playState:'running',pause(){this.playState='paused';},play(){this.playState='running';},cancel(){this.playState='idle';}};}
  };
 });bg.querySelectorAll=()=>cameras;
 const motion={matches:reduced,addEventListener:(name,fn)=>{change=fn;},removeEventListener:()=>{change=null;}};
 const window={matchMedia:()=>motion};
 vm.runInNewContext(code,{window,Element:{prototype:{animate(){}}},Math:Object.assign(Object.create(Math),{random:()=>.35}),
  setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)});
 return {cameras,bg,parent,timers,stop:window.VeroNK9.start(bg),change:()=>change?.(),
  next(){const [key,timer]=timers.entries().next().value;timers.delete(key);timer.fn();return timer.ms;}};
}
test('original movement uses colour pairs, varied route keyframes and actual loader width',()=>{
 const e=setup();for(const c of e.cameras){
  assert.equal(c.querySelector('.nk9-angle').src,'./assets/nk9-purple.png');
  assert.equal(c.querySelector('.nk9-front').src,'./assets/nk9-purple-front.png');
  assert.equal(c.options.duration,36300);assert.equal(c.options.easing,'linear');
  assert.ok(c.frames[3].transform.includes('937.4px'));assert.ok(c._travelAnimation.currentTime>0);
 }e.stop();
});
test('original pause, face, lens flash, turn back and resume timings are preserved',()=>{
 const e=setup(),c=e.cameras[1];
 assert.equal(e.next(),8075);assert.equal(c._travelAnimation.playState,'paused');assert.ok(c.classList.has('is-facing'));
 assert.equal(e.next(),520);assert.ok(c.classList.has('do-flash'));
 assert.equal(e.next(),430);assert.ok(!c.classList.has('do-flash'));assert.ok(c.classList.has('is-facing'));
 assert.equal(e.next(),520);assert.ok(!c.classList.has('is-facing'));
 assert.equal(e.next(),420);assert.equal(c._travelAnimation.playState,'running');
 assert.equal([...e.timers.values()][0].ms,12200);e.stop();assert.equal(e.timers.size,0);
 assert.ok(e.cameras.every(c=>c._travelAnimation.playState==='idle'));assert.ok(e.bg.cleared);
});
test('only cameras inside the loader may flash; reduced motion and preference changes stop activity',()=>{
 const e=setup();for(const c of e.cameras)c.getBoundingClientRect=()=>({left:0,right:200,top:300,bottom:400});
 e.next();assert.ok(e.cameras.every(c=>!c.classList.has('is-facing')));e.change();assert.equal(e.timers.size,0);
 const reduced=setup(true);assert.equal(reduced.timers.size,0);assert.ok(reduced.cameras.every(c=>!c._travelAnimation));
});
test('failed camera image pairs stop and restore static loading fallback',()=>{
 const e=setup();for(const c of e.cameras)c.querySelector('.nk9-front').onerror();
 assert.ok(e.cameras.every(c=>c.hidden));assert.equal(e.timers.size,0);assert.ok(!e.parent.classList.has('nk9-running'));
});
