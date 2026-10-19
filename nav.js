
/* VERO shared navigation — single source of truth */
(function () {
  const nav = document.getElementById('vero-nav');
  if (!nav) return;

  /* SIDEBAR CONFIGURATION */
  const SIDEBAR_WIDTH = '300px';

  document.documentElement.style.setProperty(
    '--vero-sidebar-width',
    SIDEBAR_WIDTH
  );

  const sidebar = document.querySelector('.sidebar');
  const main = document.querySelector('.main');

  if (sidebar) {
    sidebar.style.width = SIDEBAR_WIDTH;
    sidebar.style.display = 'flex';
    sidebar.style.flexDirection = 'column';
    sidebar.style.height = '100vh';
    sidebar.style.overflow = 'hidden';

    // Keep logo fixed and move Home closer to it.
    const brand = sidebar.querySelector('.brand');
    if (brand) {
      brand.style.flexShrink = '0';
      brand.style.marginBottom = '12px';
    }

    // Navigation scrolls independently.
    const navContainer = nav.closest('nav') || nav;

    navContainer.style.flex = '1 1 auto';
    navContainer.style.minHeight = '0';
    navContainer.style.overflowY = 'auto';
    navContainer.style.overflowX = 'auto';
    navContainer.style.scrollbarWidth = 'thin';
    navContainer.style.scrollbarColor =
      'rgba(255,255,255,.35) transparent';

    // Keep footer fixed at bottom.
    const footer = sidebar.querySelector('.side-foot');
    if (footer) {
      footer.style.position = 'relative';
      footer.style.left = 'auto';
      footer.style.bottom = 'auto';
      footer.style.flexShrink = '0';
      footer.style.paddingTop = '12px';
    }
  }

  if (main) {
    main.style.marginLeft = SIDEBAR_WIDTH;
    main.style.width = `calc(100% - ${SIDEBAR_WIDTH})`;
  }

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
    </div>

    <div class="nav-section">
      <div class="nav-label">My Work</div>

      <a class="${isActive('my-actions.html') ? 'active' : ''}"
         href="my-actions.html">
        <span class="ico" data-lucide="list-checks"></span>
        <span>My Actions</span>
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

      <a class="${maintenanceActive ? 'active' : ''}"
         href="maintenance-management.html">
        <span class="ico" data-lucide="file-signature"></span>
        <span>Client Services Management</span>
      </a>

      <a class="${isActive('contractor-management.html') ? 'active' : ''}" href="contractor-management.html">
        <span class="ico" data-lucide="hard-hat"></span>
        <span>Contractor Management</span>
      </a>
    </div>

    <div class="nav-section">
      <div class="nav-label">Management Systems</div>

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

      <a class="${isActive('risk.html') ? 'active' : ''}"
         href="risk.html">
        <span class="ico" data-lucide="triangle-alert"></span>
        <span>Risk Management</span>
      </a>

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

  /* DROPDOWN STYLING */
  const styleId = 'vero-nav-dropdown-style';

  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;

    style.textContent = `
      #vero-nav .vero-risk-navigation summary { display:flex; align-items:center; gap:11px; padding:9px 12px; font-size:12px; border-left:3px solid transparent; border-radius:7px; cursor:pointer; color:#f7f7f6; }
      #vero-nav .vero-risk-navigation summary::after {content:'›';margin-left:auto}
      #vero-nav .vero-risk-navigation[open] summary::after {transform:rotate(90deg)}
      #vero-nav .vero-risk-navigation[open] summary {background:rgba(255,255,255,.08);border-left-color:#A9C23F}
      #vero-nav .vero-risk-navigation > a {margin-left:34px!important;font-size:11px!important}
      #vero-nav .ico { width:20px;min-width:20px;display:inline-flex;align-items:center;justify-content:center; }
      #vero-nav .ico svg { width:17px;height:17px;display:block;stroke:currentColor; }
      #vero-nav .vero-nav-parent {
        display: flex;
        align-items: center;
      }

      #vero-nav .vero-nav-parent > a {
        flex: 1;
        min-width: 0;
      }

      #vero-nav .vero-nav-expand {
        background: transparent;
        border: 0;
        color: #f7f7f6;
        padding: 9px 10px;
        cursor: pointer;
        font-size: 17px;
      }

      #vero-nav .vero-nav-expand span {
        display: inline-block;
        transition: transform .2s ease;
      }

      #vero-nav .vero-nav-group.open
      .vero-nav-expand span {
        transform: rotate(90deg);
      }

      #vero-nav .vero-nav-children {
        display: none;
        padding-left: 34px;
        margin: 2px 0 6px;
      }

      #vero-nav .vero-nav-group.open
      .vero-nav-children {
        display: block;
      }

      #vero-nav .vero-nav-children a {
        display: block;
        padding: 8px 10px;
        font-size: 10px;
        line-height: 1.5;
        white-space: normal;
      }
    `;

    document.head.appendChild(style);
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

  /* Prevent main navigation labels wrapping */
  nav.querySelectorAll(
    '.nav-section > a > span:last-child'
  ).forEach(label => {
    label.style.whiteSpace = 'nowrap';
  });
})();


