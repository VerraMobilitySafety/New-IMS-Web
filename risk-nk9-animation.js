/* Original HSE Noticeboard angled/front NK9 artwork and .38s turning transition.
 * One centred camera; the page readiness signal triggers a single turn and flash.
 */
window.VeroNK9={start(stage){
 'use strict';
 const angle=stage.querySelector('.nk9-angle'),front=stage.querySelector('.nk9-front');
 const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
 const timers=new Set();let stopped=false,failed=false,started=false,complete;
 function later(fn,ms){const id=setTimeout(()=>{timers.delete(id);if(!stopped)fn();},ms);timers.add(id);}
 function clear(){for(const id of timers)clearTimeout(id);timers.clear();}
 function finishReveal(){const done=complete;complete=null;clear();done?.();}
 function motionChanged(){if(motion.matches)finishReveal();}
 angle.onerror=()=>{failed=true;front.hidden=true;angle.onerror=()=>{angle.hidden=true;};angle.src='verra-chevron.png';finishReveal();};
 front.onerror=()=>{failed=true;front.hidden=true;finishReveal();};
 motion.addEventListener?.('change',motionChanged);
 return {
  reveal(done){
   if(started||stopped)return;
   started=true;complete=done;
   // Readiness never waits for artwork downloads or an arbitrary minimum duration.
   if(motion.matches||failed||!angle.complete||!angle.naturalWidth||!front.complete||!front.naturalWidth){finishReveal();return;}
   stage.classList.add('is-facing');
   later(()=>{stage.classList.add('do-flash');stage.parentElement.classList.add('nk9-reveal-flash');later(finishReveal,220);},380);
  },
  stop(){stopped=true;complete=null;clear();motion.removeEventListener?.('change',motionChanged);}
 };
}};
