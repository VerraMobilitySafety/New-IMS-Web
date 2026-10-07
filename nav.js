/* VERO shared navigation — single source of truth */
(function () {
  const nav = document.getElementById('vero-nav');
  if (!nav) return;

  /* =========================================================
     SHARED VERO SIDEBAR WIDTH
     Change this one value to resize the sidebar everywhere.
  ========================================================= */
  const SIDEBAR_WIDTH = '300px';

  document.documentElement.style.setProperty(
    '--vero-sidebar-width',
    SIDEBAR_WIDTH
  );

  const sidebar = document.querySelector('.sidebar');
  const main = document.querySelector('.main');

  if (sidebar) {
    sidebar.style.width = SIDEBAR_WIDTH;
  }

  if (main) {
    main.style.marginLeft = SIDEBAR_WIDTH;
    main.style.width = `calc(100% - ${SIDEBAR_WIDTH})`;
  }

  /* =========================================================
     CURRENT PAGE / ACTIVE NAVIGATION
  ========================================================= */
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

  /* =========================================================
     VERO NAVIGATION
  ========================================================= */
  nav.innerHTML = `

    <!-- HOME -->
    <div class="nav-section">
      <a
        class="${isActive('index.html') ? 'active' : ''}"
        href="index.html"
      >
        <span class="ico">⌂</span>
        <span>Home</span>
      </a>
    </div>


    <!-- MY WORK -->
    <div class="nav-section">

      <div class="nav-label">My Work</div>

      <a
        class="${isActive('my-actions.html') ? 'active' : ''}"
        href="my-actions.html"
      >
        <span class="ico">✓</span>
        <span>My Actions</span>
      </a>

    </div>


    <!-- OPERATIONS -->
    <div class="nav-section">

      <div class="nav-label">Operations</div>

      <a
        class="${isActive('sites.html') ? 'active' : ''}"
        href="sites.html"
      >
        <span class="ico">⌖</span>
        <span>Verra Mobility Locations</span>
      </a>

      <a
        class="${projectActive ? 'active' : ''}"
        href="project-management.html"
      >
        <span class="ico">▦</span>
        <span>Projects</span>
      </a>

      <a
        class="placeholder"
        href="#"
        onclick="return false"
      >
        <span class="ico">⚙</span>
        <span>Maintenance</span>
      </a>

      <a
        class="placeholder"
        href="#"
        onclick="return false"
      >
        <span class="ico">♙</span>
        <span>Contractor Management</span>
      </a>

    </div>


    <!-- MANAGEMENT SYSTEMS -->
    <div class="nav-section">

      <div class="nav-label">Management Systems</div>

      <a
        class="placeholder"
        href="#"
        onclick="return false"
      >
        <span class="ico">✚</span>
        <span>Safety Risks</span>
      </a>

      <a
        class="placeholder"
        href="#"
        onclick="return false"
      >
        <span class="ico">◆</span>
        <span>Quality Risks</span>
      </a>

      <a
        class="placeholder"
        href="#"
        onclick="return false"
      >
        <span class="ico">♻</span>
        <span>Environment Risks</span>
      </a>

    </div>


    <!-- GOVERNANCE -->
    <div class="nav-section">

      <div class="nav-label">Governance</div>

      <a
        class="${isActive('documents.html') ? 'active' : ''}"
        href="documents.html"
      >
        <span class="ico">▱</span>
        <span>Document Management</span>
      </a>

      <a
        class="${isActive('risk.html') ? 'active' : ''}"
        href="risk.html"
      >
        <span class="ico">▥</span>
        <span>Risk Management</span>
      </a>

      <a
        class="${isActive('compliance.html') ? 'active' : ''}"
        href="compliance.html"
      >
        <span class="ico">◇</span>
        <span>Compliance Management</span>
      </a>

      <a
        class="placeholder"
        href="#"
        onclick="return false"
      >
        <span class="ico">◎</span>
        <span>Assurance Management</span>
      </a>

      <a
        class="placeholder"
        href="#"
        onclick="return false"
      >
        <span class="ico">◇</span>
        <span>Insurance</span>
      </a>

      <a
        class="placeholder"
        href="#"
        onclick="return false"
      >
        <span class="ico">↻</span>
        <span>Business Continuity</span>
      </a>

    </div>

  `;
})();
