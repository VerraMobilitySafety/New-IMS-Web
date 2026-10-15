const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'risk-page-loader.js'),'utf8');
test('Risk alone opts in; every inline script remains valid',()=>{
 for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.html'))){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  assert.equal(html.includes('src="risk-page-loader.js?v=20261016-single-reveal"'),file==='risk.html');
  if(file==='risk.html')for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
 }
 const css=fs.readFileSync(path.join(root,'risk-page-loader.css'),'utf8');
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(fs.readFileSync(path.join(root,'risk-nk9-animation.css'),'utf8'),/nk9-flash,\.vero-page-loader::after\{display:none\}/);
 assert.doesNotMatch(code,/window\.fetch\s*=/);
});
function setup(tasks='content'){
 const listeners={},timers=new Map(),frames=new Map();let id=0,element,disconnected=false;
 const rects={main:{left:300,right:1200},hero:{bottom:245},sidebar:{right:300}};
 const main={getBoundingClientRect:()=>rects.main,querySelector:()=>hero};
 const hero={getBoundingClientRect:()=>rects.hero},sidebar={getBoundingClientRect:()=>rects.sidebar};
 const query=selector=>selector==='.main'?main:selector==='.sidebar'?sidebar:hero;
 function node(){return {style:{},dataset:{},attributes:{},classes:new Set(),children:[],
  setAttribute(k,v){this.attributes[k]=v;},classList:{add(value){element.classes.add(value);}},
  append(...children){this.children.push(...children);},remove(){this.removed=true;}};}
 const window={innerHeight:900,addEventListener:(type,fn)=>{listeners[type]=fn;},removeEventListener:(type)=>{delete listeners[type];}};
 const document={currentScript:{dataset:{tasks}},documentElement:{clientWidth:1200},
  createElement:node,body:{appendChild:n=>{element=n;}},querySelector:query,
  addEventListener:(type,fn)=>{listeners[type]=fn;}};
 const context=vm.createContext({window,document,ResizeObserver:class{observe(){}disconnect(){disconnected=true;}},
  setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),
  requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)});
 window.ResizeObserver=context.ResizeObserver;
 vm.runInContext(code,context);
 return {api:window.VeroPageLoader,listeners,timers,frames,rects,window,document,
  get overlay(){return element;},get disconnected(){return disconnected;},
  flush(){const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn());}};
}
test('waits for all critical rendered tasks and DOM, then fades once',()=>{
 const env=setup();env.api.mount();
 env.api.ready('other');env.listeners.DOMContentLoaded();
 assert.ok(!env.overlay.classes.has('is-ready'));
 env.api.ready('risk');assert.ok(env.overlay.classes.has('is-ready'));
 assert.equal(env.overlay.attributes['aria-hidden'],'true');assert.ok(env.disconnected);
 env.api.mount();env.api.ready('risk');assert.equal(env.timers.size,1);
 env.timers.values().next().value.fn();assert.ok(env.overlay.removed);
});
test('fast results cannot dismiss before the document is parsed; static pages finish at DOM ready',()=>{
 for(const tasks of ['content','']){const env=setup(tasks);env.api.mount();env.api.ready('risk');
 assert.ok(!env.overlay.classes.has('is-ready'));env.listeners.DOMContentLoaded();assert.ok(env.overlay.classes.has('is-ready'));}
});
test('positions against actual sidebar, main and hero at desktop, responsive, scroll and hidden sidebar',()=>{
 const env=setup();env.api.mount();
 assert.deepEqual(env.overlay.style,{left:'300px',top:'245px',width:'900px',height:'655px'});
 env.rects.sidebar.right=82;env.rects.main={left:82,right:390};env.document.documentElement.clientWidth=390;
 env.rects.hero.bottom=310;env.window.innerHeight=844;env.listeners.resize();env.flush();
 assert.deepEqual(env.overlay.style,{left:'82px',top:'310px',width:'308px',height:'534px'});
 env.rects.sidebar.right=0;env.rects.main={left:0,right:390};env.rects.hero.bottom=-20;
 env.listeners.scroll();env.flush();assert.equal(env.overlay.style.top,'0px');assert.equal(env.overlay.style.left,'0px');
});
test('timeout, script failures and pagehide expose content even if tasks never settle',()=>{
 for(const event of ['timeout','error','unhandledrejection','pagehide']){
  const env=setup();env.api.mount();
  if(event==='timeout'){const deadline=[...env.timers.values()].find(t=>t.ms===12000);assert.ok(deadline);deadline.fn();}
  else env.listeners[event]();
  assert.ok(env.overlay.classes.has('is-ready'));assert.ok(env.disconnected);
  env.api.mount();assert.equal(env.overlay.attributes['aria-hidden'],'true');
 }
});
test('missing camera falls back to chevron, then readable status if both assets fail',()=>{
 const env=setup();env.api.mount();
 const img=env.overlay.children[0].children[0];
 assert.equal(img.src,'./assets/nk9-green.png');img.onerror();
 assert.equal(img.src,'verra-chevron.png');
 img.onerror();assert.equal(img.hidden,true);
 assert.equal(env.overlay.children[1].textContent,'Preparing your workspace...');
 env.api.ready('risk');env.listeners.DOMContentLoaded();assert.ok(env.overlay.classes.has('is-ready'));
});

