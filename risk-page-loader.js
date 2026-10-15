/* Explicit initial tasks only: never intercept fetch or re-cover routine refreshes.
 * Load synchronously in <head>; mount immediately after the hero. Each page owns
 * its critical task(s), and calls ready after rendering success or error content.
 */
(()=>{
 'use strict';
 const pending=new Set(['risk']);
 let overlay,observer,finished=false,domReady=false,frame,removalTimer,stopCameras;
 const cleanup=()=>{
  observer?.disconnect();
  stopCameras?.();
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
 function check(){if(domReady&&!pending.size)finish();}
 function mount(){
  if(overlay||finished)return;
  overlay=document.createElement('div');
  overlay.id='veroPageLoader';overlay.className='vero-page-loader';
  overlay.setAttribute('role','status');overlay.setAttribute('aria-label','Preparing your workspace');
  const background=document.createElement('div');background.className='motion-bg';background.setAttribute('aria-hidden','true');
  for(const colour of ['green','teal','purple','grey']){
   const cam=document.createElement('div');cam.className='nk9-floater';cam.dataset.colour=colour;
   for(const [name,suffix] of [['nk9-angle',''],['nk9-front','-front']]){
    const image=document.createElement('img');image.className=name;image.alt='';image.src='./assets/nk9-'+colour+suffix+'.png';cam.append(image);
   }
   const flash=document.createElement('span');flash.className='nk9-flash';cam.append(flash);background.append(cam);
  }
  const img=document.createElement('img');img.className='nk9-status-image';img.alt='';
  img.onerror=()=>{img.onerror=()=>{img.hidden=true;};img.src='verra-chevron.png';};img.src='./assets/nk9-green.png';
  const label=document.createElement('span');label.className='vero-loader-label';label.textContent='Preparing your workspace...';
  overlay.append(background,img,label);document.body.appendChild(overlay);
  position();
  if(!finished)stopCameras=window.VeroNK9?.start(background);
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
