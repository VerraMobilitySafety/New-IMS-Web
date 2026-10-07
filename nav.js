
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

    // Keep the logo and footer fixed while navigation scrolls.
    sidebar.style.display = 'flex';
    sidebar.style.flexDirection = 'column';
    sidebar.style.height = '100vh';
    sidebar.style.overflow = 'hidden';

    // Move Home closer to the logo.
    const brand = sidebar.querySelector('.brand');
    if (brand) {
      brand.style.flexShrink = '0';
      brand.style.marginBottom = '12px';
    }

    // Allow the navigation area to scroll independently.
    const navContainer = nav.closest('nav') || nav;

    navContainer.style.flex = '1 1 auto';
    navContainer.style.minHeight = '0';
    navContainer.style.overflowY = 'auto';
    navContainer.style.overflowX = 'auto';
    navContainer.style.scrollbarWidth = 'thin';
    navContainer.style.scrollbarColor =
      'rgba(255,255,255,.35) transparent';

    // Keep footer at the bottom.
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

      <a class="${isActive('risk.html') ? 'active' : ''}"
         href="risk.html">
        <span class="ico">▥</span>
        <span>Risk Management</span>
      </a>

      <a class="${isActive('compliance.html') ? 'active' : ''}"
         href="compliance.html">
        <span class="ico">◇</span>
        <span>Compliance Management</span>
      </a>

      <a class="placeholder" href="#" onclick="return false">
        <span class="ico">◎</span>
        <span>Assurance Management</span>
      </a>

      <a class="placeholder" href="#" onclick="return false">
        <span class="ico">◇</span>
        <span>Insurance</span>
      </a>

      <a class="placeholder" href="#" onclick="return false">
        <span class="ico">↻</span>
        <span>Business Continuity</span>
      </a>
    </div>
  `;

  /* Prevent labels from wrapping */
  nav.querySelectorAll('a span:last-child').forEach(label => {
    label.style.whiteSpace = 'nowrap';
  });
})();
