/* VERO shared initial page loader — real Verra navigation asset. */
(function(){
  'use strict';
  if(window.__veroPageLoaderInstalled)return;
  window.__veroPageLoaderInstalled=true;
  const style=document.createElement('style');
  style.textContent=`
    #veroSharedPageLoader{position:fixed;z-index:45;background:#0D0D0D;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;opacity:1;transition:opacity .25s ease;pointer-events:auto}
    #veroSharedPageLoader.vero-loaded{opacity:0;pointer-events:none}
    #veroSharedPageLoader img{width:80px;height:80px;object-fit:contain;animation:veroSharedSpin 1.6s linear infinite}
    #veroSharedPageLoader span{color:#F4F6F5;font:500 12px Montserrat,Arial,sans-serif;letter-spacing:.2px}
    @keyframes veroSharedSpin{to{transform:rotate(360deg)}}
    @media(prefers-reduced-motion:reduce){#veroSharedPageLoader img{animation:none}}
  `;
  document.head.appendChild(style);
  let pending=0, started=false, complete=false, lastActivity=performance.now(), element=null;
  const originalFetch=window.fetch;
  window.fetch=function(...args){
    if(!complete){pending++;started=true;lastActivity=performance.now();}
    return Promise.resolve().then(()=>originalFetch.apply(this,args)).finally(()=>{
      if(!complete){pending=Math.max(0,pending-1);lastActivity=performance.now();}
    });
  };
  function position(){
    if(!element)return;
    const main=document.querySelector('main.main, .main');
    const hero=main?.querySelector('.global-hero');
    if(!main||!hero)return;
    const m=main.getBoundingClientRect(),h=hero.getBoundingClientRect();
    element.style.left=Math.max(0,m.left)+'px';
    element.style.right='0';
    element.style.top=Math.max(0,h.bottom)+'px';
    element.style.bottom='0';
  }
  function finish(){
    if(complete)return;
    complete=true;
    element?.classList.add('vero-loaded');
    setTimeout(()=>{element?.remove();element=null;},300);
    window.removeEventListener('resize',position);
  }
  function ready(){
    const main=document.querySelector('main.main, .main');
    const hero=main?.querySelector('.global-hero');
    if(!main||!hero)return;
    element=document.createElement('div');
    element.id='veroSharedPageLoader';
    element.setAttribute('role','status');
    element.setAttribute('aria-label','Loading workspace');
    element.innerHTML='<img src="verra-chevron.png" alt=""><span>Preparing your workspace...</span>';
    document.body.appendChild(element);
    position();
    window.addEventListener('resize',position);
    const begin=performance.now();
    const check=()=>{
      if(complete)return;
      const elapsed=performance.now()-begin;
      if(elapsed>9000 || (elapsed>450 && pending===0 && performance.now()-lastActivity>350)){
        finish();return;
      }
      setTimeout(check,80);
    };
    check();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
  else ready();
})();
