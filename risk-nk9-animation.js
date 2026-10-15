/* Adapted from HSE-Board/index.html at 8f03658652255e0e8fe21d12ab8333798222531b.
 * Original colours, movement ranges, artwork transitions and flash timings retained.
 * VERO adaptations: container bounds, reduced motion, image failures and teardown.
 */
window.VeroNK9={start(bg){
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(motion.matches || !Element.prototype.animate)return ()=>{};
  const timers=new Set();let stopped=false;
  function later(fn,delay){const id=setTimeout(()=>{timers.delete(id);if(!stopped)fn();},delay);timers.add(id);return id;}
  function stop(){if(stopped)return;stopped=true;for(const id of timers)clearTimeout(id);timers.clear();for(const cam of cameras)cam._travelAnimation?.cancel();bg.replaceChildren();bg.parentElement?.classList.remove('nk9-running');motion.removeEventListener?.('change',stop);}
  const cameras = Array.from(bg.querySelectorAll(".nk9-floater"));
  if(!cameras.length) return ()=>{};

  const colours = ["green","teal","purple","grey","charcoal","white"];
  let busy = false;

  function random(min,max){ return min + Math.random()*(max-min); }
  function choose(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  function setColour(cam, colour){
    cam.querySelector(".nk9-angle").src = "./assets/nk9-" + colour + ".png";
    cam.querySelector(".nk9-front").src = "./assets/nk9-" + colour + "-front.png";
    cam.dataset.colour = colour;
  }

  function launch(cam, initial=false){
    if(stopped || cam.hidden)return;
    const colour = choose(colours);
    const top = random(7,84);
    const width = random(82,126);
    const duration = random(30,48);
    const yA = random(-18,18);
    const yB = random(-18,18);
    const rotA = random(-2.2,2.2);
    const rotB = random(-2.2,2.2);

    setColour(cam, colour);

    cam.style.top = top + "%";
    cam.style.width = width + "px";
    cam.style.height = (width * .77) + "px";
    cam.style.opacity = random(.11,.17).toFixed(2);
    cam.classList.remove("is-facing","do-flash");

    // Use the actual loader width; the noticeboard used a fixed 1920px canvas.
    const DESIGN_W = bg.clientWidth;
    const bgLeft = 0;
    const margin = 40;
    const startX = -width - margin;
    const mid1 = DESIGN_W * .30;
    const mid2 = DESIGN_W * .66;
    const endX = DESIGN_W + width + margin;

    const anim = cam.animate([
      { transform:`translate(${startX}px, 0px) rotate(${rotA}deg)` },
      { transform:`translate(${mid1}px, ${yA}px) rotate(${rotB}deg)` },
      { transform:`translate(${mid2}px, ${yB}px) rotate(${rotA}deg)` },
      { transform:`translate(${endX}px, 0px) rotate(${rotB}deg)` }
    ],{
      duration:duration*1000,
      easing:"linear",
      iterations:1
    });

    cam._travelAnimation = anim;

    anim.onfinish = ()=>{
      later(()=>launch(cam), random(1200,5200));
    };

    if(initial){
      anim.currentTime = random(0,duration*1000);
    }
  }

  function visibleCandidates(){
    const bounds=bg.getBoundingClientRect();
    return cameras.filter(cam=>{
      if(cam.hidden)return false;
      const r = cam.getBoundingClientRect();
      return r.right > bounds.left + 50 &&
             r.left < bounds.right - 50 &&
             r.bottom > bounds.top + 20 &&
             r.top < bounds.bottom - 20;
    });
  }

  function performFlash(){
    if(stopped)return;
    if(busy) return scheduleNext();

    const candidates = visibleCandidates();
    if(!candidates.length) return scheduleNext();

    busy = true;
    const cam = choose(candidates);
    const travel = cam._travelAnimation;

    if(travel) travel.pause();
    cam.classList.add("is-facing");

    later(()=>{
      cam.classList.add("do-flash");

      later(()=>{
        cam.classList.remove("do-flash");

        later(()=>{
          cam.classList.remove("is-facing");

          later(()=>{
            if(travel && !cam.hidden) travel.play();
            busy = false;
            scheduleNext();
          },420);
        },520);
      },430);
    },520);
  }

  function scheduleNext(){
    later(performFlash, random(8000,20000));
  }

  cameras.forEach(cam=>{
    for(const img of cam.querySelectorAll('img'))img.onerror=()=>{
      cam.hidden=true;cam._travelAnimation?.cancel();
      if(cameras.every(camera=>camera.hidden))stop();
    };
    launch(cam,true);
  });
  later(performFlash, random(6500,11000));
  bg.parentElement.classList.add('nk9-running');
  motion.addEventListener?.('change',stop);
  return stop;
}};
