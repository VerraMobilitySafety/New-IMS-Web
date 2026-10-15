/* Explicit initial tasks only: never intercept fetch or re-cover routine refreshes.
 * Load synchronously in <head>; mount immediately after the hero. Each page owns
 * its critical task(s), and calls ready after rendering success or error content.
 */
(()=>{
 'use strict';
 const pending=new Set((document.currentScript?.dataset.tasks||'risk').split(/\s+/).filter(Boolean));
 let overlay,observer,finished=false,domReady=false,frame,removalTimer,cameraMotion,revealing=false;
 const cleanup=()=>{
  observer?.disconnect();
  cameraMotion?.stop();
  window.removeEventListener('resize',schedule);
  window.removeEventListener('scroll',schedule,true);
  if(frame)cancelAnimationFrame(frame);
 };
 function finish(){
  if(finished)return;
  finished=true;
  clearTimeout(deadline);
  cleanup();
  overlay?.setAttribute('aria-hidden','true');
  overlay?.classList.add('is-ready');
  // Transition cleanup also works when reduced motion disables transitionend.
  removalTimer=setTimeout(()=>overlay?.remove(),300);
 }
 function position(){
  if(!overlay||finished)return;
  const main=document.querySelector('.main'),hero=main?.querySelector('.global-hero, .workspace-hero');
  if(!main||!hero){finish();return;}
  const rect=main.getBoundingClientRect(),banner=hero.getBoundingClientRect();
  const sidebar=document.querySelector('.sidebar')?.getBoundingClientRect();
  const width=document.documentElement.clientWidth,height=window.innerHeight;
  const left=Math.min(width,Math.max(0,rect.left,sidebar?.right||0));
  const right=Math.max(left,Math.min(width,rect.right));
  const top=Math.min(height,Math.max(0,banner.bottom));
  Object.assign(overlay.style,{left:left+'px',top:top+'px',width:(right-left)+'px',height:(height-top)+'px'});
 }
 function schedule(){
  if(frame||finished)return;
  frame=requestAnimationFrame(()=>{frame=null;position();});
 }
 function check(){
  if(!domReady||pending.size||finished||revealing)return;
  revealing=true;
  if(cameraMotion)cameraMotion.reveal(finish);else finish();
 }
 function mount(){
  if(overlay||finished)return;
  overlay=document.createElement('div');
  overlay.id='veroPageLoader';overlay.className='vero-page-loader';
  overlay.setAttribute('role','status');overlay.setAttribute('aria-label','Preparing your workspace');
  const stage=document.createElement('div');stage.className='nk9-camera';stage.setAttribute('aria-hidden','true');
  const angle=document.createElement('img');angle.className='nk9-angle';angle.alt='';
  const front=document.createElement('img');front.className='nk9-front';front.alt='';
  angle.onerror=()=>{front.hidden=true;angle.onerror=()=>{angle.hidden=true;};angle.src='verra-chevron.png';};
  front.onerror=()=>{front.hidden=true;};
  const flash=document.createElement('span');flash.className='nk9-flash';
  stage.append(angle,front,flash);
  const label=document.createElement('span');label.className='vero-loader-label';label.textContent='Preparing your workspace...';
  overlay.append(stage,label);document.body.appendChild(overlay);
  position();
  if(!finished)cameraMotion=window.VeroNK9?.start(stage);
  angle.src='./assets/nk9-green.png';front.src='./assets/nk9-green-front.png';
  if(window.ResizeObserver){
   observer=new ResizeObserver(schedule);
   for(const selector of ['.main','.global-hero, .workspace-hero','.sidebar']){
    const element=document.querySelector(selector);if(element)observer.observe(element);
   }
  }
  window.addEventListener('resize',schedule);
  window.addEventListener('scroll',schedule,true);
 }
 // A failed script or stalled API must never leave error/retry UI covered.
 const deadline=setTimeout(finish,12000);
 window.addEventListener('error',finish);
 window.addEventListener('unhandledrejection',finish);
 window.addEventListener('pagehide',()=>{finish();clearTimeout(removalTimer);overlay?.remove();});
 document.addEventListener('DOMContentLoaded',()=>{domReady=true;mount();position();check();},{once:true});
 window.VeroPageLoader={mount,ready(task){pending.delete(task);check();},dismiss:finish};
})();
