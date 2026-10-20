/* Initial-navigation loader. Pages explicitly settle their critical rendering tasks. */
(()=>{
 'use strict';
 if(window.VeroPageLoader)return;
 const pending=new Set((document.currentScript?.dataset.tasks||'').split(/\s+/).filter(Boolean));
 let overlay,resizeObserver,finished=false,domReady=document.readyState!=='loading',frame,removalTimer;
 const early=new MutationObserver(mount);
 function finish(){
  if(finished)return;
  finished=true;clearTimeout(deadline);clearTimeout(window.__veroLoaderDeadline);
  document.documentElement.removeAttribute('data-vero-loading');
  early.disconnect();resizeObserver?.disconnect();
  window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);
  if(frame)cancelAnimationFrame(frame);
  overlay?.setAttribute('aria-hidden','true');overlay?.classList.add('is-ready');
  removalTimer=setTimeout(()=>overlay?.remove(),220);
 }
 function position(){
  if(!overlay||finished)return;
  const main=document.querySelector('.main'),hero=main?.querySelector('.global-hero,.workspace-hero');
  if(!main||!hero)return;
  const rect=main.getBoundingClientRect(),banner=hero.getBoundingClientRect(),sidebar=document.querySelector('.sidebar')?.getBoundingClientRect();
  const width=document.documentElement.clientWidth,height=window.innerHeight;
  const left=Math.min(width,Math.max(0,rect.left,sidebar?.right||0)),right=rect.width?Math.max(left,Math.min(width,rect.right)):width,top=Math.min(height,Math.max(0,banner.bottom));
  Object.assign(overlay.style,{left:left+'px',top:top+'px',width:(right-left)+'px',height:(height-top)+'px'});
 }
 function schedule(){if(!frame&&!finished)frame=requestAnimationFrame(()=>{frame=null;position();});}
 function check(){if(domReady&&!pending.size)finish();}
 function mount(){
  if(overlay||finished)return;
  const main=document.querySelector('.main'),hero=main?.querySelector('.global-hero,.workspace-hero');
  if(!document.body||!hero)return;
  overlay=document.createElement('div');overlay.id='veroPageLoader';overlay.className='vero-page-loader';overlay.setAttribute('role','status');overlay.setAttribute('aria-live','polite');
  const stage=document.createElement('div');stage.className='nk9-camera';stage.setAttribute('aria-hidden','true');
  const camera=document.createElement('img');camera.src='assets/vero-loader-camera.svg?v=20261021';camera.alt='';camera.onerror=()=>{camera.hidden=true;};stage.append(camera);
  const label=document.createElement('span');label.className='vero-loader-label';label.textContent='Loading your workspace';
  const detail=document.createElement('span');detail.className='vero-loader-detail';detail.textContent='Getting everything ready for you';
  const track=document.createElement('span');track.className='vero-loader-track';track.setAttribute('aria-hidden','true');
  overlay.append(stage,label,detail,track);document.body.append(overlay);position();early.disconnect();
  if(window.ResizeObserver){resizeObserver=new ResizeObserver(schedule);for(const el of [main,hero,document.querySelector('.sidebar')])if(el)resizeObserver.observe(el);}
  window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);
 }
 // An unrelated image or widget failure must not uncover unfinished content.
 // Settled task callbacks reveal success/error UI; the deadline covers failed boot scripts.
 const deadline=setTimeout(finish,12000);
 window.VeroPageLoader={mount,ready(task){pending.delete(task);check();},dismiss:finish};
 early.observe(document.documentElement,{subtree:true,childList:true});mount();
 function loaded(){domReady=true;mount();position();if(!document.querySelector('.main .global-hero,.main .workspace-hero'))finish();else check();}
 if(domReady)loaded();else document.addEventListener('DOMContentLoaded',loaded,{once:true});
 window.addEventListener('pagehide',()=>{finish();clearTimeout(removalTimer);overlay?.remove();});
})();
