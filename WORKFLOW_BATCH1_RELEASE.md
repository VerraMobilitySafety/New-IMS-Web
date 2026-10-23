# Workflow corrections batch 1 - companion Web candidate

Base: `5d999e92a831b7d28ce1489429549c21a0104879`. Local only; no push/merge/deploy.
The API checkout's `WORKFLOW_BATCH1_RELEASE.md` is the full release and rollback checklist.

Changed UI paths: both Project request editors send one atomic request with current milestones, a loaded baseline and a stable retry operation ID; project approval sends its pending approval ID. My Actions routes returned Compliance requests to their correction drawer. Corrections save/resume/resubmit the same identity; normal controller decisions send the loaded revision. Risk and SWMS fields are not edited.

Validated:

- 5 new request-save unit tests, including retry after reload, changed-payload rejection, stale retry reset and inline-script parsing.
- 27 existing project lifecycle/document-viewer/initialisation tests and 6 document-index UI tests passed.
- Project register mocked browser checks at 1440/1024/768/390 px.
- Correction drawer draft/failure/retry/resume/resubmit mocked browser checks at 1440/390 px.
- Existing monthly-reporting/site-event mocked browser checks at 1440/390 px, team management browser checks, and project-document browser checks at desktop/mobile widths.
- Test browser uses a fresh headless profile and intercepted network responses, not the user's signed-in browser. No production calls or records.

Commands:

```powershell
node --test tests/workflow-request-save.cjs tests/project-first-fixes.cjs tests/project-execution-initialization.cjs tests/project-document-viewer.cjs tests/project-documents.cjs
node tests/compliance-correction-browser.cjs
node tests/project-layout-browser.cjs
node tests/project-reporting-browser.cjs
node tests/project-team-browser.cjs
node tests/project-documents-browser.cjs
```

Requires Playwright, a test Chromium executable and jsdom for the existing document UI tests. Local jsdom was installed in the task's temporary folder, not added as a production dependency. Browser scripts were run with the installed Chrome executable in headless test profiles.

Release remains blocked on real PostgreSQL migration/concurrency verification and an isolated Web-to-API role acceptance run. Coordinate schema/API/Web release; cached old forms require refresh. Do not blindly roll back to an API that includes archived milestone rows. Retain audit tables on rollback; no destructive rollback is authorised.

Publication update: API draft PR #197 and Web draft PR #288 are open. The user explicitly authorised existing Risk/SWMS regression tests on synthetic data; the earlier testing exclusion and pre-publication permission blocker are superseded for tests only. Risk/SWMS code changes remain excluded. CI results are pending; no deployment workflow was dispatched.
