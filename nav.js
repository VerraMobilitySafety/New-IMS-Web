/* Shared navigation: prerender markup with scripts/build-navigation.cjs; hydrate without replacing it. */
/* Inline navigation icons: Lucide 0.456.0, ISC licence (vendor/lucide-LICENSE). */
(function(){'use strict';
 const VERSION='20261022-improvement-register';
 function renderNavigation(path){  /* CURRENT PAGE */
  path=(path||'index.html').toLowerCase();

  const isActive = (href) => {
    const target = href.toLowerCase();
    if (target === 'index.html') {
      return path === '' || path === 'index.html';
    }
    return path === target;
  };

  const projectActive =
    path === 'project-management.html' ||
    path === 'project-workspace.html';

  const maintenanceActive =
    path === 'maintenance-management.html';

  const incidentActive =
    path === 'incident-management.html';

  const continuityActive =
    path === 'business-continuity.html';

  /* NAVIGATION */
  return `
    <div class="nav-section">
      <a class="${isActive('index.html') ? 'active' : ''}"
         href="index.html">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico" aria-hidden="true" focusable="false"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
        <span>Home</span>
      </a>

      <a class="${isActive('my-actions.html') ? 'active' : ''}"
         href="my-actions.html">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico" aria-hidden="true" focusable="false"><path d="m3 17 2 2 4-4"></path><path d="m3 7 2 2 4-4"></path><path d="M13 6h8"></path><path d="M13 12h8"></path><path d="M13 18h8"></path></svg>
        <span>My Actions</span>
        <span class="vero-actions-slot"><span id="vero-my-actions-count" class="vero-actions-count" hidden aria-label="Outstanding actions"></span></span>
      </a>

      <a class="${isActive('reports.html') ? 'active' : ''}" href="reports.html">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico" aria-hidden="true" focusable="false"><line x1="18" x2="18" y1="20" y2="10"></line><line x1="12" x2="12" y1="20" y2="4"></line><line x1="6" x2="6" y1="20" y2="14"></line></svg>
        <span>My Reports</span>
      </a>
    </div>

    <div class="nav-section">
      <div class="nav-label">Operations Management</div>

      <a class="${isActive('sites.html') ? 'active' : ''}"
         href="sites.html">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico" aria-hidden="true" focusable="false"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path><circle cx="12" cy="10" r="3"></circle></svg>
        <span>Verra Mobility Locations</span>
      </a>

      <a class="${projectActive ? 'active' : ''}"
         href="project-management.html">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico" aria-hidden="true" focusable="false"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path><path d="M8 10v4"></path><path d="M12 10v2"></path><path d="M16 10v6"></path></svg>
        <span>Project Management</span>
      </a>

      <div class="vero-nav-group ${isActive('client-services-sites.html') ? 'open' : ''}" id="clientServicesNavGroup">
        <div class="vero-nav-parent">
          <a class="${maintenanceActive ? 'active' : ''}" href="maintenance-management.html">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico" aria-hidden="true" focusable="false"><path d="m18 5-2.414-2.414A2 2 0 0 0 14.172 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2"></path><path d="M21.378 12.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"></path><path d="M8 18h1"></path></svg>
            <span>Client Services Management</span>
          </a>
          <button id="clientServicesSiteExpand" hidden style="display:none!important" class="vero-nav-expand" type="button" aria-label="Expand Client Services Site List" aria-expanded="${isActive('client-services-sites.html') ? 'true' : 'false'}"><span>›</span></button>
        </div>
        <div class="vero-nav-children">
          <a id="clientServicesSiteNav" hidden style="display:none!important" class="${isActive('client-services-sites.html') ? 'active' : ''}" href="client-services-sites.html">Client Services Site List</a>
        </div>
      </div>

      <a class="${isActive('asset-management.html') ? 'active' : ''}" href="asset-management.html" ${isActive('asset-management.html') ? 'aria-current="page"' : ''}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico" aria-hidden="true" focusable="false"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/></svg>
        <span>Asset Management</span>
      </a>

      <a class="${isActive('contractor-management.html') ? 'active' : ''}" href="contractor-management.html">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico" aria-hidden="true" focusable="false"><path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z"></path><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"></path><path d="M4 15v-3a6 6 0 0 1 6-6"></path><path d="M14 6a6 6 0 0 1 6 6v3"></path></svg>
        <span>Contractor Management</span>
      </a>
    </div>

    <div class="nav-section">
      <div class="nav-label">Specific Risk Management</div>

      <details class="vero-risk-navigation" ${["alcohol-and-other-drugs.html","driving.html","electrical-works.html","emergency-management.html","ergonomics-and-sedentary-work.html","extreme-temperatures.html","fatigue.html","hazardous-substances-and-dangerous-goods.html","manual-handling.html","personal-protective-equipment.html","plant-and-equipment.html","psychosocial-risk.html","public-interaction.html","visitors.html","working-at-heights.html","working-from-home.html","working-near-traffic.html"].includes(path) ? 'open' : ''}><summary><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico" aria-hidden="true" focusable="false"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg><span>Safety Risks</span></summary><a class="${isActive('alcohol-and-other-drugs.html') ? 'active' : ''}" href="alcohol-and-other-drugs.html">Alcohol and Other Drugs</a>
<a class="${isActive('driving.html') ? 'active' : ''}" href="driving.html">Driving</a>
<a class="${isActive('electrical-works.html') ? 'active' : ''}" href="electrical-works.html">Electrical Works</a>
<a class="${isActive('emergency-management.html') ? 'active' : ''}" href="emergency-management.html">Emergency Management</a>
<a class="${isActive('ergonomics-and-sedentary-work.html') ? 'active' : ''}" href="ergonomics-and-sedentary-work.html">Ergonomics and Sedentary Work</a>
<a class="${isActive('extreme-temperatures.html') ? 'active' : ''}" href="extreme-temperatures.html">Extreme Temperatures</a>
<a class="${isActive('fatigue.html') ? 'active' : ''}" href="fatigue.html">Fatigue</a>
<a class="${isActive('hazardous-substances-and-dangerous-goods.html') ? 'active' : ''}" href="hazardous-substances-and-dangerous-goods.html">Hazardous Substances and Dangerous Goods</a>
<a class="${isActive('manual-handling.html') ? 'active' : ''}" href="manual-handling.html">Manual Handling</a>
<a class="${isActive('personal-protective-equipment.html') ? 'active' : ''}" href="personal-protective-equipment.html">Personal Protective Equipment</a>
<a class="${isActive('plant-and-equipment.html') ? 'active' : ''}" href="plant-and-equipment.html">Plant and Equipment</a>
<a class="${isActive('psychosocial-risk.html') ? 'active' : ''}" href="psychosocial-risk.html">Psychosocial Risk</a>
<a class="${isActive('public-interaction.html') ? 'active' : ''}" href="public-interaction.html">Public Interaction</a>
<a class="${isActive('visitors.html') ? 'active' : ''}" href="visitors.html">Visitors</a>
<a class="${isActive('working-at-heights.html') ? 'active' : ''}" href="working-at-heights.html">Working at Heights</a>
<a class="${isActive('working-from-home.html') ? 'active' : ''}" href="working-from-home.html">Working from Home</a>
<a class="${isActive('working-near-traffic.html') ? 'active' : ''}" href="working-near-traffic.html">Working Near Traffic</a></details>

      <a class="placeholder" href="#" onclick="return false">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico" aria-hidden="true" focusable="false"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"></path><path d="m9 12 2 2 4-4"></path></svg>
        <span>Quality Risks</span>
      </a>

      <details class="vero-risk-navigation" ${["waste-management.html"].includes(path) ? 'open' : ''}><summary><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico" aria-hidden="true" focusable="false"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path></svg><span>Environment Risks</span></summary><a class="${isActive('waste-management.html') ? 'active' : ''}" href="waste-management.html">Waste Management</a></details>
    </div>

    <div class="nav-section">
      <div class="nav-label">Governance Management</div>

      <a id="continualImprovementNav" hidden style="display:none!important" class="${isActive('continual-improvement-management.html') ? 'active' : ''}" href="continual-improvement-management.html" ${isActive('continual-improvement-management.html') ? 'aria-current="page"' : ''}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico" aria-hidden="true" focusable="false"><path d="M3 11a9 9 0 0 1 15-6l3 3M21 3v5h-5M21 13a9 9 0 0 1-15 6l-3-3M3 21v-5h5"/></svg>
        <span>Continual Improvement Management</span>
      </a>

      <a class="${isActive('documents.html') ? 'active' : ''}"
         href="documents.html">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico" aria-hidden="true" focusable="false"><path d="M20 7h-3a2 2 0 0 1-2-2V2"></path><path d="M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z"></path><path d="M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8"></path></svg>
        <span>Document Management</span>
      </a>

      <a class="${isActive('records.html') ? 'active' : ''}"
         href="records.html">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico" aria-hidden="true" focusable="false"><rect width="20" height="5" x="2" y="3" rx="1"></rect><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"></path><path d="M10 12h4"></path></svg>
        <span>Records Management</span>
      </a>

      <div class="vero-nav-group ${['risk.html', 'safe-work-method-statement.html', 'take-5.html'].includes(path) ? 'open' : ''}" id="riskNavGroup">
        <div class="vero-nav-parent">
          <a class="${isActive('risk.html') ? 'active' : ''}" href="risk.html">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico" aria-hidden="true" focusable="false"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg><span>Risk Management</span>
          </a>
          <button class="vero-nav-expand" type="button" aria-label="Expand Risk Management" aria-controls="riskNavChildren" aria-expanded="${['risk.html', 'safe-work-method-statement.html', 'take-5.html'].includes(path) ? 'true' : 'false'}"><span>›</span></button>
        </div>
        <div class="vero-nav-children" id="riskNavChildren">
          <a class="${isActive('safe-work-method-statement.html') ? 'active' : ''}" href="safe-work-method-statement.html" ${isActive('safe-work-method-statement.html') ? 'aria-current="page"' : ''}>SWMS Generation Helper</a>
          <a class="${isActive('take-5.html') ? 'active' : ''}" href="take-5.html" ${isActive('take-5.html') ? 'aria-current="page"' : ''}>Take 5</a>
        </div>
      </div>

      <a class="${isActive('insurance.html') ? 'active' : ''}" href="insurance.html">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico" aria-hidden="true" focusable="false"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="m9 12 2 2 4-4"></path></svg>
        <span>Insurance Management</span>
      </a>

      <a class="${isActive('compliance.html') ? 'active' : ''}"
         href="compliance.html">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico" aria-hidden="true" focusable="false"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path><path d="M7 21h10"></path><path d="M12 3v18"></path><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"></path></svg>
        <span>Compliance Management</span>
      </a>

      <!-- Incident Management + Business Continuity -->
      <div class="vero-nav-group ${continuityActive ? 'open' : ''}"
           id="incidentNavGroup">

        <div class="vero-nav-parent">
          <a class="${incidentActive ? 'active' : ''}"
             href="incident-management.html"
             >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico" aria-hidden="true" focusable="false"><path d="M7 18v-6a5 5 0 1 1 10 0v6"></path><path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"></path><path d="M21 12h1"></path><path d="M18.5 4.5 18 5"></path><path d="M2 12h1"></path><path d="M12 2v1"></path><path d="m4.929 4.929.707.707"></path><path d="M12 12v6"></path></svg>
            <span>Incident Management</span>
          </a>

          <button class="vero-nav-expand"
                  type="button"
                  aria-label="Expand Business Continuity Management"
                  aria-expanded="${continuityActive ? 'true' : 'false'}">
            <span>›</span>
          </button>
        </div>

        <div class="vero-nav-children">
          <a class="${continuityActive ? 'active' : 'placeholder'}"
             href="${continuityActive ? 'business-continuity.html' : '#'}"
             ${continuityActive ? '' : 'onclick="return false"'}>
            Business Continuity Management
          </a>
        </div>
      </div>

      <a class="placeholder" href="#" onclick="return false">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico" aria-hidden="true" focusable="false"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="m9 14 2 2 4-4"></path></svg>
        <span>Assurance Management</span>
      </a>
    </div>
  `;


 }

  // Display cache only. Role-restricted links still require the live auth response.
  function sessionKey(){try{const token=localStorage.getItem('vero_session_token');if(!token)return '';let hash=2166136261;for(const c of token)hash=Math.imul(hash^c.charCodeAt(0),16777619);return String(hash>>>0);}catch{return '';}}
  function saveBadge(count){try{sessionStorage.setItem('vero-nav-badge',JSON.stringify({session:sessionKey(),count,at:Date.now()}));}catch{}}
  function restoreNavigation(nav){
    if(!nav)return;
    try{const data=JSON.parse(sessionStorage.getItem('vero-nav-badge')||'null'),badge=nav.querySelector('#vero-my-actions-count'),session=sessionKey();
      if(badge&&session&&data?.session===session&&Date.now()-data.at<300000&&Number.isInteger(data.count)&&data.count>=0){badge.textContent=data.count>99?'99+':String(data.count);badge.setAttribute('aria-label',data.count+' outstanding actions');badge.hidden=data.count===0;}
      const state=JSON.parse(sessionStorage.getItem('vero-nav-state')||'null');
      if(state?.version===1){for(const [id,open]of Object.entries(state.groups||{})){const group=document.getElementById(id);if(!group||!nav.contains(group))continue;group.classList.toggle('open',open===true);group.querySelector('.vero-nav-expand')?.setAttribute('aria-expanded',String(open===true));}
        nav.querySelectorAll('.vero-risk-navigation').forEach((el,i)=>{if(typeof state.details?.[i]==='boolean')el.open=state.details[i];});
        if(Number.isFinite(state.scroll))nav.closest('nav').scrollTop=Math.max(0,state.scroll);
      }
    }catch{}
  }
  function rememberNavigation(nav){try{const groups={};nav.querySelectorAll('.vero-nav-group[id]').forEach(el=>groups[el.id]=el.classList.contains('open'));sessionStorage.setItem('vero-nav-state',JSON.stringify({version:1,groups,details:[...nav.querySelectorAll('.vero-risk-navigation')].map(el=>el.open),scroll:nav.closest('nav').scrollTop}));}catch{}}

 if(typeof module!=='undefined'&&module.exports){module.exports={renderNavigation,VERSION};return;}
 const insuranceNavGuard=document.createElement('link');insuranceNavGuard.rel='stylesheet';insuranceNavGuard.href='insurance-nav.css';document.head.append(insuranceNavGuard);
 window.VeroNav={restore:restoreNavigation};
 function init(){
  const nav=document.getElementById('vero-nav');if(!nav)return;
  if(nav.dataset.veroNav!==VERSION){nav.innerHTML=renderNavigation(location.pathname.split('/').pop());nav.dataset.veroNav=VERSION;}
  restoreNavigation(nav);
   // Resolve the current role from the authenticated service; stay hidden on error.
  const siteListNav=document.getElementById('clientServicesSiteNav');
  const siteListExpand=document.getElementById('clientServicesSiteExpand');
  const insuranceLink=nav.querySelector('a[href="insurance.html"]');
  if(insuranceLink){insuranceLink.hidden=true;insuranceLink.style.display='none';}
  const navSession=localStorage.getItem('vero_session_token');
  if(navSession&&insuranceLink)fetch('https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api/insurance/access',{headers:{Authorization:'Bearer '+navSession,Accept:'application/json'},cache:'no-store'}).then(async response=>{if(!response.ok)return;const data=await response.json();if(data.status==='success'&&data.allowed===true){insuranceLink.dataset.insuranceAdmitted='true';insuranceLink.hidden=false;insuranceLink.style.display='';}}).catch(()=>{});
  if(navSession)fetch('https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api/auth/me',{headers:{Authorization:'Bearer '+navSession,Accept:'application/json'},cache:'no-store'}).then(async response=>{if(!response.ok)return;const data=await response.json();if((data.user||data).vero_role==='Administrator'){for(const control of [siteListNav,siteListExpand]){control.hidden=false;control.style.display='flex';}}}).catch(()=>{});

  const improvementLink=nav.querySelector('#continualImprovementNav');
  if(improvementLink&&navSession)fetch('https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api/continual-improvement/access',{headers:{Authorization:'Bearer '+navSession},cache:'no-store'}).then(async response=>{if(!response.ok)return;const data=await response.json();if(data.can_manage===true){improvementLink.hidden=false;improvementLink.style.removeProperty('display');}}).catch(()=>{});
  /* Consistent Lucide line icons, loaded once for all VERO pages. */
  const lucideScriptId = 'vero-lucide-script';
  function renderNavIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons({ attrs: { 'stroke-width': 1.8 } });
    }
  }
  if (window.lucide) {
    renderNavIcons();
  } else if (!document.getElementById(lucideScriptId)) {
    const script = document.createElement('script');
    script.id = lucideScriptId;
    script.src = 'https://unpkg.com/lucide@0.456.0/dist/umd/lucide.min.js';
    script.onload = renderNavIcons;
    script.onerror = () => console.warn('VERO navigation icons could not be loaded');
    document.head.appendChild(script);
  }

  /* DROPDOWN BEHAVIOUR */
  const incidentGroup =
    document.getElementById('incidentNavGroup');

  const expandButton =
    incidentGroup?.querySelector('.vero-nav-expand');

  expandButton?.addEventListener('click', () => {
    const open = incidentGroup.classList.toggle('open');
    expandButton.setAttribute('aria-expanded', String(open));
  });

  const clientGroup = document.getElementById('clientServicesNavGroup');
  const clientExpand = clientGroup?.querySelector('.vero-nav-expand');
  clientExpand?.addEventListener('click', () => {
    const open = clientGroup.classList.toggle('open');
    clientExpand.setAttribute('aria-expanded', String(open));
  });

  const riskGroup = document.getElementById('riskNavGroup');
  const riskExpand = riskGroup?.querySelector('.vero-nav-expand');
  riskExpand?.addEventListener('click', () => {
    const open = riskGroup.classList.toggle('open');
    riskExpand.setAttribute('aria-expanded', String(open));
  });
  /* Signed-in user's outstanding actions, from the same API as My Actions. */
  async function updateMyActionsBadge() {
    const badge = document.getElementById('vero-my-actions-count');
    const token = localStorage.getItem('vero_session_token');
    if (!badge || !token) { if (badge) badge.hidden = true; return; }
    try {
      const response = await fetch(
        'https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api/my-actions',
        { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }, cache: 'no-store' }
      );
      if (!response.ok) throw new Error('Actions request returned ' + response.status);
      const data = await response.json();
      if (!Array.isArray(data.actions)) throw new Error('Missing actions list');
      const count = data.actions.length;
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.setAttribute('aria-label', count + ' outstanding actions');
      badge.hidden = count === 0;
      saveBadge(count);
    } catch (error) {
      badge.hidden = true;
      try { sessionStorage.removeItem('vero-nav-badge'); } catch {}
      console.warn('VERO could not refresh the My Actions count', error);
    }
  }
  updateMyActionsBadge();
  window.addEventListener('pageshow', updateMyActionsBadge);
  window.addEventListener('focus', updateMyActionsBadge);


  window.addEventListener('pagehide',()=>rememberNavigation(nav));
  nav.addEventListener('click',()=>rememberNavigation(nav));
  nav.addEventListener('toggle',()=>rememberNavigation(nav),true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
