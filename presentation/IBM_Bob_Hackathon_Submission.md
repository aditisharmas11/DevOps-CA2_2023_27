# IBM Bob 2.0 Hackathon: submission text

Paste each block into the matching lablab.ai field.

## Links

| Field | Value |
|-------|-------|
| Public code repository | https://github.com/Islinger19/ForgeFlow-IBM-BOB |
| Application URL | https://forgeflow-ecru.vercel.app |
| Demo application platform | Web (PWA), deployed on Vercel |
| Video demonstration | https://youtu.be/cjVYj87INMo |
| Slide presentation | `presentation/ForgeFlow_IBM_Bob_Hackathon.pdf` |
| IBM Bob session screenshots | `bob_sessions/sanidhya/forgeflow-bob-session.png.png` |

## Submission Title

ForgeFlow: Self-Healing Test, Repair & Deploy

## Short Description

ForgeFlow turns a web-app idea into a verified live URL. It writes tests from your acceptance criteria, fixes failures in a bounded, diff-aware repair loop, deploys to Vercel, re-tests the live site, and hands stuck cases to IBM Bob.

## Long Description

<!-- LONG-START -->
THE PROBLEM
AI app builders made generating a web app fast, but proving that it works is still manual. Developers write tests after the code, paste CI logs into a chat, retry fixes with no stopping rule, and click through the live site hoping nothing broke. Studies show the cost: two frontier models deployed their generated infrastructure successfully on the first attempt only 30.2% and 26.8% of the time; most of a repair loop's gain arrives in the first one to three iterations; and repeated AI self-refinement can make code less secure. An open-ended fix loop wastes budget and adds risk.

OUR SOLUTION
ForgeFlow is a human-in-the-loop Progressive Web App that carries a web-app idea, given as screenshots or a structured spec, through six stages: requirements, design, build, test and repair, deploy, and live validation. It targets the verify, debug and release workflow.
- Tests come from your acceptance criteria. Each criterion's ID travels into the generated test, its result, the repair context and the live-validation report.
- Failures go to a bounded, diff-aware repair loop. The agent sees only the failing tests, the sources they exercise, the git diff since the last green run and the criterion text. The loop stops at the first of four guards (regression, no progress, iteration cap, budget cap) and escalates with a plain-language summary of what it tried.
- Deployment is infrastructure-aware: the SPA and Node API go to Vercel, data to MongoDB Atlas, and the same suite re-runs against the live URL. Live failures re-enter the same bounded loop.
- Continue in IBM Bob: when the loop escalates, one click exports the workspace with AGENTS.md, Bob rules and a BOB_HANDOFF.md of failing tests and patches tried, ready for IBM Bob IDE.

WHO IT'S FOR AND HOW THEY USE IT
Student and indie builders, agencies prototyping for clients, and teams adopting AI coding tools who need proof before they ship. In the browser, they describe the app or drop in screenshots, edit requirements, refine the design in one sentence, watch code and a live preview update in real time, follow each repair iteration, and deploy with one action. Any stage can be entered, skipped or revisited; only deploy needs a build, and validation a deploy.

WHAT MAKES IT DIFFERENT
Most builders treat generation as the finish line. ForgeFlow treats verification as the product: a repair loop designed to terminate, escalation as a normal outcome instead of an error, and tests re-run on the deployed URL. Pairing it with IBM Bob gives every hard case a real next step, with the developer in charge.

EFFICIENCY
Untrusted code runs only in per-project Docker sandboxes with no host network. Models are routed by role, so the expensive model runs only for code, tests and repair, and cost is tracked per project against a budget cap. ForgeFlow ships with 2,000+ automated tests, six quality gates before every commit, and a 10-app benchmark tracking first-pass versus post-repair pass rate, iterations and cost.
<!-- LONG-END -->

## IBM Bob Usage Statement

<!-- BOB-START -->
ForgeFlow is the kind of codebase Bob 2.0 is designed for: about 800 files across a Python control plane, a React PWA, Docker sandboxes and deploy adapters. We set the repository up for Bob with an AGENTS.md (layout, commands, conventions, no-go areas) and two custom rules in .bob/rules/: the fixed generated-app stack and the repair-loop invariants. Bob loaded both in every step and cited them while working.

We then gave IBM Bob one five-step task in Agent mode. The exported task history and the consumption summary are in bob_sessions/sanidhya/ (task e974963b063af54c60573c71ade2d7e4, 27.86 Bobcoins).

1. Understanding the repair flow. Bob spawned two explore subagents in parallel to map the testing, orchestrator and agents packages, then traced how a failing test becomes a repair attempt, hop by hop with file and function references, and located each of the four loop guards.

2. Code review. Bob reviewed the repair agent, repair-context analyzer, repair stage, sandbox runtime and deploy orchestrator, and gave a verdict for each of 6 findings. It confirmed 2 real bugs and fixed them: the Docker runtime turned a missing exit code from a dead container into success, and a transient MongoDB error while saving the repair context could crash the repair loop. It added 8 regression tests and argued the other 4 findings were false positives.

3. Planning. Bob read the escalation model, the repair stage and the escalation UI and wrote plans/bob-handoff.md, the design for a new feature, Continue in IBM Bob, reusing the escalation data the loop already stores.

4. Building. Bob implemented it end to end with parallel file reads and diffs: pure renderers in backend/app/testing/handoff.py, a GET /projects/{id}/repair/export-bob-handoff endpoint that streams a zip with AGENTS.md, .bob/rules/forgeflow-stack.md and BOB_HANDOFF.md (failing tests with criterion IDs, patches tried, failing-count trail), and a Continue in IBM Bob button on the escalation panel.

5. Testing. Bob wrote 26 renderer tests and 11 endpoint tests in pytest and 4 Vitest tests for the button, ran the backend suite in its terminal (1,790 passed, 0 failures) and summarised every change.

How IBM Bob fits the product: ForgeFlow automates the bounded part of verify, repair and release, and IBM Bob is where a developer takes over when the loop stops. The handoff zip is written for Bob to read, so a stuck case opens in Bob IDE with the failing tests, the patches already tried and the project's conventions loaded.

We did not use watsonx.ai or watsonx Orchestrate in this submission.
<!-- BOB-END -->

## Categories

Pick the closest options in the dropdown: Developer Tools, DevOps / CI-CD, Testing & QA, AI Agents.

## Technologies Used

IBM Bob (required). Add IBM watsonx.ai only if you actually use it.
Then: React, TypeScript, Vite, Tailwind CSS, Python, FastAPI, MongoDB, Docker, Node.js, Express, Playwright, Vitest, Vercel.
