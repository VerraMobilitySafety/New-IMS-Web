
/* VERO shared navigation — single source of truth */
(function () {
  const nav = document.getElementById('vero-nav');
  if (!nav) return;

  /* SIDEBAR CONFIGURATION */
  const SIDEBAR_WIDTH = '260px';

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

  const incidentActive =
    path === 'incident-management.html';

  const continuityActive =
    path === 'business-continuity.html';

  /* NAVIGATION */
  nav.innerHTML = `
    <div class="nav-section">
      <a class="${isActive('index.html') ? 'active' : ''}"
         href="index.html">
        <span class="ico">⌂</span>
        <span>Home</span>
      </a>
    </div>

    <div class="nav-section">
      <div class="nav-label">My Work</div>

      <a class="${isActive('my-actions.html') ? 'active' : ''}"
         href="my-actions.html">
        <span class="ico">✓</span>
        <span>My Actions</span>
      </a>
    </div>

    <div class="nav-section">
      <div class="nav-label">Operations</div>

      <a class="${isActive('sites.html') ? 'active' : ''}"
         href="sites.html">
        <span class="ico">⌖</span>
        <span>Verra Mobility Locations</span>
      </a>

      <a class="${projectActive ? 'active' : ''}"
         href="project-management.html">
        <span class="ico">▦</span>
        <span>Projects</span>
      </a>

      <a class="placeholder" href="#" onclick="return false">
        <span class="ico">⚙</span>
        <span>Maintenance</span>
      </a>

      <a class="placeholder" href="#" onclick="return false">
        <span class="ico">♙</span>
        <span>Contractor Management</span>
      </a>
    </div>

    <div class="nav-section">
      <div class="nav-label">Management Systems</div>

      <a class="placeholder" href="#" onclick="return false">
        <span class="ico">✚</span>
        <span>Safety Risks</span>
      </a>

      <a class="placeholder" href="#" onclick="return false">
        <span class="ico">◆</span>
        <span>Quality Risks</span>
      </a>

      <a class="placeholder" href="#" onclick="return false">
        <span class="ico">♻</span>
        <span>Environment Risks</span>
      </a>
    </div>

    <div class="nav-section">
      <div class="nav-label">Governance</div>

      <a class="${isActive('documents.html') ? 'active' : ''}"
         href="documents.html">
        <span class="ico">▱</span>
        <span>Document Management</span>
      </a>

      <a class="${isActive('records.html') ? 'active' : ''}"
         href="records.html">
        <span class="ico">▤</span>
        <span>Records Management</span>
      </a>

      <a class="${isActive('risk.html') ? 'active' : ''}"
         href="risk.html">
        <span class="ico">▥</span>
        <span>Risk Management</span>
      </a>

      <a class="placeholder" href="#" onclick="return false">
        <span class="ico">◇</span>
        <span>Insurance Management</span>
      </a>

      <a class="${isActive('compliance.html') ? 'active' : ''}"
         href="compliance.html">
        <span class="ico">◇</span>
        <span>Compliance Management</span>
      </a>

      <!-- Incident Management + Business Continuity -->
      <div class="vero-nav-group ${continuityActive ? 'open' : ''}"
           id="incidentNavGroup">

        <div class="vero-nav-parent">
          <a class="${incidentActive ? 'active' : 'placeholder'}"
             href="${incidentActive ? 'incident-management.html' : '#'}"
             ${incidentActive ? '' : 'onclick="return false"'}>
            <span class="ico">✚</span>
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
        <span class="ico">◎</span>
        <span>Assurance Management</span>
      </a>
    </div>
  `;

  /* DROPDOWN STYLING */
  const styleId = 'vero-nav-dropdown-style';

  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;

    style.textContent = `
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
