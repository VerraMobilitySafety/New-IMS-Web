# Project reporting and delivery UI

Adds monthly PM Updates, Commercial comparisons, a filterable finance dashboard on Project Management, and Sites & Events within the existing Project Workspace.

Defaults: AUD; approved baseline unchanged; PM forecasts separate from monthly costs, invoices and recognised revenue. Dashboards show submitted revisions only, disclose incomplete coverage and retain missing amounts. Internal Projects report costs only.

Sites can be added and edited by the assigned PM or Administrator on open projects. Event history records project-wide or site-specific occurrences. Supporting files remain in the existing Documents tab; enter their reference in the event. Corrections are additional events so the original history is retained.

Release together with New-IMS-API feature/project-monthly-reporting. Follow its PROJECT_REPORTING_RELEASE.md: database migrations first, API second, frontend last. These changes are not deployed merely by pushing this feature branch.

Validation: `node tests/project-first-fixes.cjs`, `node tests/project-document-viewer.cjs`, `node tests/project-reporting-browser.cjs`. The last uses Playwright with synthetic API responses at desktop and mobile sizes; it writes preview PNGs in tests/. No live project data is created.
