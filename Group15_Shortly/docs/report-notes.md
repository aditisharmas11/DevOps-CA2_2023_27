# Report notes

## Please confirm or delete

- [CONFIRM] The self-hosted workflow context failure shown in the provided Actions log was caused by runner context configuration. The log says the active context was empty while `shortly` was expected; the repository runbook explains the `ALLOW_CONTEXT` and `PROFILE` settings.

## Fill in before submission

- Group members: `Harsh Ledwani, Shivam Kapure, Kashyup Gaud, Kisna Kanti`
- Roll numbers: `23070122100, 23070122113, 23070122114, 23070122116`
- Step 6 external challenge: `[TO BE FILLED]`; no proof was present in the repository at report generation.

## Decisions and evidence limits

- The assignment calls for four to five slides; the deck uses exactly five assertion-title slides and no title or closing slide.
- Challenge confidence means repository-backed evidence. Scenario and Ansible results use committed reports/logs; plans and expected outcomes in runbooks are not presented as observed results.
- The scenario summary records the first `scenario-all` abuse run as FAIL. A focused rerun passed, but the full suite was not rerun; report this split accurately.
- The captured Ansible host evidence is a macOS negative preflight with zero changes. Positive apply, idempotence and verify evidence comes from the disposable Ubuntu 24.04 container.
- The captured screenshots are stored in `docs/screenshots/`; the rebuilt five-slide deck embeds the app, architecture, workflow, monitoring, rollback, runner and environment captures. Missing manifest shots remain missing and are not synthesized.
- Mermaid CLI was unavailable. Mermaid blocks are syntax-reviewed and the slide diagrams are editable PowerPoint shapes.
- Typical pipeline duration is documented as 7–15 minutes in `docs/cicd.md`; there is no committed `gh run list` duration sample. Label it as the runbook's typical estimate.
- The five-slide deck was rebuilt with the captured screenshots and the group names and roll numbers. Visual QA used a PDF export and rendered images of all five pages; no clipping or off-page content remained.
- The capture session has been sequenced to focus first on rubric MUST evidence; actual scenario runs may take longer than one hour if all SHOULD shots are captured.
