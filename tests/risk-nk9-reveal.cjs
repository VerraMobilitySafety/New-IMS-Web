const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../risk-nk9-animation.js'),'utf8');
function setup({reduced=false,loaded=true}={}){
 const timers=new Map();let id=0,changed,completions=0;
 const classes=()=>{const values=new Set();return {add:x=>values.add(x),has:x=>values.has(x)};};
 const angle={complete:loaded,naturalWidth:loaded?1536:0},front={complete:loaded,naturalWidth:loaded?1536:0};
 const stage={classList:classes(),parentElement:{classList:classes()},querySelector:s=>s==='.nk9-angle'?angle:front};
 const motion={matches:reduced,addEventListener:(event,fn)=>{changed=fn;},removeEventListener:()=>{changed=null;}};
 const window={matchMedia:()=>motion};
 vm.runInNewContext(code,{window,setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)});
 const api=window.VeroNK9.start(stage);
 return {stage,angle,front,timers,api,get completions(){return completions;},reveal:()=>api.reveal(()=>{completions++;}),
  reduce(){motion.matches=true;changed?.();},next(){const [key,t]=timers.entries().next().value;timers.delete(key);t.fn();return t.ms;}};
}
test('camera stays still until readiness, then turns once, flashes white and reveals',()=>{
 const e=setup();assert.equal(e.timers.size,0);assert.ok(!e.stage.classList.has('is-facing'));
 e.reveal();assert.ok(e.stage.classList.has('is-facing'));assert.equal(e.completions,0);
 assert.equal(e.next(),380);assert.ok(e.stage.classList.has('do-flash'));assert.ok(e.stage.parentElement.classList.has('nk9-reveal-flash'));
 assert.equal(e.completions,0);assert.equal(e.next(),220);assert.equal(e.completions,1);assert.equal(e.timers.size,0);
 e.reveal();assert.equal(e.completions,1);assert.equal(e.timers.size,0);
});
test('reduced motion and unloaded artwork reveal immediately without turn, flash or download wait',()=>{
 for(const options of [{reduced:true},{loaded:false}]){
  const e=setup(options);e.reveal();assert.equal(e.completions,1);assert.equal(e.timers.size,0);assert.ok(!e.stage.classList.has('is-facing'));
 }
});
test('missing artwork falls back to chevron and cannot delay readiness',()=>{
 const e=setup();e.angle.onerror();assert.equal(e.angle.src,'verra-chevron.png');assert.equal(e.front.hidden,true);
 e.angle.onerror();assert.equal(e.angle.hidden,true);e.reveal();assert.equal(e.completions,1);
 const front=setup();front.front.onerror();front.reveal();assert.equal(front.completions,1);assert.equal(front.timers.size,0);
});
test('failure or reduced-motion preference during a turn releases the page exactly once',()=>{
 for(const fail of [e=>e.front.onerror(),e=>e.reduce()]){
  const e=setup();e.reveal();fail(e);assert.equal(e.completions,1);assert.equal(e.timers.size,0);e.api.stop();assert.equal(e.completions,1);
 }
});
test('dismissal cancels pending choreography and cannot flash or complete later',()=>{
 const e=setup();e.reveal();e.api.stop();assert.equal(e.timers.size,0);assert.equal(e.completions,0);assert.ok(!e.stage.classList.has('do-flash'));
});
