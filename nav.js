/* VERO shared navigation — single source of truth */
(function () {
  const nav = document.getElementById('vero-nav');
  if (!nav) return;

  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  const isActive = (href) => {
    const target = href.toLowerCase();
    if (target === 'index.html') return path === '' || path === 'index.html';
    return path === target;
  };

  const projectActive = path === 'project-management.html' || path === 'project-workspace.html';

  nav.innerHTML = `
    <div class="nav-section">
      <a class="${isActive('index.html') ? 'active' : ''}" href="index.html"><span class="ico">⌂</span><span>Home</span></a>
    </div>

    <div class="nav-section">
      <div class="nav-label">My Work</div>
      <a class="${isActive('my-actions.html') ? 'active' : ''}" href="my-actions.html"><span class="ico">✓</span><span>My Actions</span></a>
    </div>

    <div class="nav-section">
      <div class="nav-label">Manage</div>
      <a class="${isActive('sites.html') ? 'active' : ''}" href="sites.html"><span class="ico">⌖</span><span>Sites</span></a>

      <div class="nav-group ${projectActive ? 'open' : ''}" id="projectsNav">
        <div class="nav-group-toggle" onclick="toggleNavGroup('projectsNav')">
          <span class="ico">▦</span><span>Projects</span><span class="nav-caret">›</span>
        </div>
        <div class="nav-sub">
          <a class="placeholder" href="#" onclick="return false"><span>Maintenance</span></a>
          <a class="${projectActive ? 'active' : ''}" href="project-management.html"><span>Implementation</span></a>
        </div>
      </div>

      <a class="placeholder" href="#" onclick="return false"><span class="ico">✚</span><span>Safety</span></a>
      <a class="placeholder" href="#" onclick="return false"><span class="ico">◆</span><span>Quality</span></a>
      <a class="placeholder" href="#" onclick="return false"><span class="ico">♻</span><span>Environment</span></a>
      <a class="placeholder" href="#" onclick="return false"><span class="ico">◇</span><span>Insurance</span></a>
      <a class="placeholder" href="#" onclick="return false"><span class="ico">↻</span><span>Business Continuity</span></a>
    </div>

    <div class="nav-section">
      <div class="nav-label">Governance</div>
      <a class="${isActive('documents.html') ? 'active' : ''}" href="documents.html"><span class="ico">▱</span><span>Documents</span></a>
      <a class="${isActive('risk.html') ? 'active' : ''}" href="risk.html"><span class="ico">▥</span><span>Risks</span></a>
      <a class="placeholder" href="#" onclick="return false"><span class="ico">◇</span><span>Compliance</span></a>
      <a class="placeholder" href="#" onclick="return false"><span class="ico">◎</span><span>Assurance</span></a>
    </div>
  `;

  window.toggleNavGroup = function (id) {
    const group = document.getElementById(id);
    if (group) group.classList.toggle('open');
  };
})();
