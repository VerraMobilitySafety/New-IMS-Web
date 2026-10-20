
/* VERO shared navigation — single source of truth */
(function () {
  const nav = document.getElementById('vero-nav');
  if (!nav) return;

  /* Geometry and control styles live in the early vero-shell.css. */

  /* CURRENT PAGE */
  const path = (
    location.pathname.split('/').pop() || 'index.html'
  ).toLowerCase();

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
  nav.innerHTML = `
    <div class="nav-section">
      <a class="${isActive('index.html') ? 'active' : ''}"
         href="index.html">
        <span class="ico" data-lucide="house"></span>
        <span>Home</span>
      </a>

      <a class="${isActive('my-actions.html') ? 'active' : ''}"
         href="my-actions.html">
        <span class="ico" data-lucide="list-checks"></span>
        <span>My Actions</span>
        <span class="vero-actions-slot"><span id="vero-my-actions-count" class="vero-actions-count" hidden aria-label="Outstanding actions"></span></span>
      </a>

      <a class="${isActive('reports.html') ? 'active' : ''}" href="reports.html">
        <span class="ico" data-lucide="chart-no-axes-column"></span>
        <span>My Reports</span>
      </a>
    </div>

    <div class="nav-section">
      <div class="nav-label">Operations</div>

      <a class="${isActive('sites.html') ? 'active' : ''}"
         href="sites.html">
        <span class="ico" data-lucide="map-pin"></span>
        <span>Verra Mobility Locations</span>
      </a>

      <a class="${projectActive ? 'active' : ''}"
         href="project-management.html">
        <span class="ico" data-lucide="folder-kanban"></span>
        <span>Project Management</span>
      </a>

      <div class="vero-nav-group ${isActive('client-services-sites.html') ? 'open' : ''}" id="clientServicesNavGroup">
        <div class="vero-nav-parent">
          <a class="${maintenanceActive ? 'active' : ''}" href="maintenance-management.html">
            <span class="ico" data-lucide="file-signature"></span>
            <span>Client Services Management</span>
          </a>
          <button id="clientServicesSiteExpand" hidden style="display:none!important" class="vero-nav-expand" type="button" aria-label="Expand Client Services Site List" aria-expanded="${isActive('client-services-sites.html') ? 'true' : 'false'}"><span>›</span></button>
        </div>
        <div class="vero-nav-children">
          <a id="clientServicesSiteNav" hidden style="display:none!important" class="${isActive('client-services-sites.html') ? 'active' : ''}" href="client-services-sites.html">Client Services Site List</a>
        </div>
      </div>

      <a class="${isActive('contractor-management.html') ? 'active' : ''}" href="contractor-management.html">
        <span class="ico" data-lucide="hard-hat"></span>
        <span>Contractor Management</span>
      </a>
    </div>

    <div class="nav-section">
      <div class="nav-label">Specific Risk Management Systems</div>

      <details class="vero-risk-navigation" ${["alcohol-and-other-drugs.html","driving.html","electrical-works.html","emergency-management.html","ergonomics-and-sedentary-work.html","extreme-temperatures.html","fatigue.html","hazardous-substances-and-dangerous-goods.html","manual-handling.html","personal-protective-equipment.html","plant-and-equipment.html","psychosocial-risk.html","public-interaction.html","visitors.html","working-at-heights.html","working-from-home.html","working-near-traffic.html"].includes(path) ? 'open' : ''}><summary><span class="ico" data-lucide="shield-alert"></span><span>Safety Risks</span></summary><a class="${isActive('alcohol-and-other-drugs.html') ? 'active' : ''}" href="alcohol-and-other-drugs.html">Alcohol and Other Drugs</a>
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
        <span class="ico" data-lucide="badge-check"></span>
        <span>Quality Risks</span>
      </a>

      <details class="vero-risk-navigation" ${["waste-management.html"].includes(path) ? 'open' : ''}><summary><span class="ico" data-lucide="leaf"></span><span>Environment Risks</span></summary><a class="${isActive('waste-management.html') ? 'active' : ''}" href="waste-management.html">Waste Management</a></details>
    </div>

    <div class="nav-section">
      <div class="nav-label">Governance</div>

      <a class="${isActive('documents.html') ? 'active' : ''}"
         href="documents.html">
        <span class="ico" data-lucide="files"></span>
        <span>Document Management</span>
      </a>

      <a class="${isActive('records.html') ? 'active' : ''}"
         href="records.html">
        <span class="ico" data-lucide="archive"></span>
        <span>Records Management</span>
      </a>

      <div class="vero-nav-group ${['risk.html', 'safe-work-method-statement.html', 'take-5.html'].includes(path) ? 'open' : ''}" id="riskNavGroup">
        <div class="vero-nav-parent">
          <a class="${isActive('risk.html') ? 'active' : ''}" href="risk.html">
            <span class="ico" data-lucide="triangle-alert"></span><span>Risk Management</span>
          </a>
          <button class="vero-nav-expand" type="button" aria-label="Expand Risk Management" aria-controls="riskNavChildren" aria-expanded="${['risk.html', 'safe-work-method-statement.html', 'take-5.html'].includes(path) ? 'true' : 'false'}"><span>›</span></button>
        </div>
        <div class="vero-nav-children" id="riskNavChildren">
          <a class="${isActive('safe-work-method-statement.html') ? 'active' : ''}" href="safe-work-method-statement.html" ${isActive('safe-work-method-statement.html') ? 'aria-current="page"' : ''}>Safe Work Method Statement</a>
          <a class="${isActive('take-5.html') ? 'active' : ''}" href="take-5.html" ${isActive('take-5.html') ? 'aria-current="page"' : ''}>Take 5</a>
        </div>
      </div>

      <a class="${isActive('insurance.html') ? 'active' : ''}" href="insurance.html">
        <span class="ico" data-lucide="shield-check"></span>
        <span>Insurance Management</span>
      </a>

      <a class="${isActive('compliance.html') ? 'active' : ''}"
         href="compliance.html">
        <span class="ico" data-lucide="scale"></span>
        <span>Compliance Management</span>
      </a>

      <!-- Incident Management + Business Continuity -->
      <div class="vero-nav-group ${continuityActive ? 'open' : ''}"
           id="incidentNavGroup">

        <div class="vero-nav-parent">
          <a class="${incidentActive ? 'active' : ''}"
             href="incident-management.html"
             >
            <span class="ico" data-lucide="siren"></span>
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
        <span class="ico" data-lucide="clipboard-check"></span>
        <span>Assurance Management</span>
      </a>
    </div>
  `;

  // Resolve the current role from the authenticated service; stay hidden on error.
  const siteListNav=document.getElementById('clientServicesSiteNav');
  const siteListExpand=document.getElementById('clientServicesSiteExpand');
  const navSession=localStorage.getItem('vero_session_token');
  if(navSession)fetch('https://verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net/api/auth/me',{headers:{Authorization:'Bearer '+navSession,Accept:'application/json'},cache:'no-store'}).then(async response=>{if(!response.ok)return;const data=await response.json();if((data.user||data).vero_role==='Administrator'){for(const control of [siteListNav,siteListExpand]){control.hidden=false;control.style.display='flex';}}}).catch(()=>{});

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
    } catch (error) {
      badge.hidden = true;
      console.warn('VERO could not refresh the My Actions count', error);
    }
  }
  updateMyActionsBadge();
  window.addEventListener('pageshow', updateMyActionsBadge);
  window.addEventListener('focus', updateMyActionsBadge);

})();



