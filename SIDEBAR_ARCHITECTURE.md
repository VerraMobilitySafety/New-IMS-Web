# VERO sidebar

VERO remains a multi-page HTML application. The sidebar is present in each document before any application or authentication request completes.

- `nav.js` exports `renderNavigation` for generation and hydrates the same markup in the browser. It owns links, active states, dropdown behaviour and existing authenticated badge/role requests. It does not set shell dimensions or inject styles.
- `vero-shell.css` is the first stylesheet in each workspace head. It owns sidebar/main geometry and navigation styling. The existing logo and Montserrat font are embedded in that cached stylesheet; navigation SVGs use the existing pinned Lucide 0.456.0 artwork. Neither depends on a late remote download.
- `scripts/build-navigation.cjs` writes the shared renderer into all workspace pages. Run `node scripts/build-navigation.cjs` after changing navigation. Update the asset version when changing deployed shared assets. CI checks that HTML matches the renderer.
- `nav.css` remains a compatibility import for older references. Current workspace pages load `vero-shell.css` directly, once.
- The small restore call immediately after each sidebar restores its scroll/disclosure state and a recent, session-bound display count before first paint. The live My Actions request still refreshes the count. Restricted links still require the authenticated role response. Storage failure must never block navigation.
- The existing VERO loader covers main content only. Sidebar markup is never removed or hidden by navigation/startup logic. No client-side routing or page replacement is introduced.

Regression checks: `tests/vero-navigation.cjs`, `tests/vero-navigation-state.cjs`, `tests/vero-sidebar-first-paint.cjs`, `tests/vero-sidebar-browser.cjs` and `tests/client-services-nav.cjs`. Browser checks use synthetic API responses and cover all workspace shells at four widths plus actual link navigation through Home, My Actions, Projects, Risk, Compliance and Documents.
