# LMS-0714 implementation report

Prepared 2026-09-05. **Implemented locally for review; not deployed. Stage 7 remains paused.** LMS-0713 remains the historical prior Stage 6 revision.

## Exact root cause and diagnosis

This is primarily a client disabled-state/cursor defect, not evidence that the successful feedback request stays pending. In the old `FeedbackControls`, each button used `disabled={entry.feedbackWorking || selected === value}` and both shared `disabled:cursor-wait`. A confirmed vote therefore permanently disabled the selected button and displayed a wait cursor even though `feedbackWorking` had already been set to false. The opposite button remained enabled, exactly matching the reported production sequence. Selecting the opposite vote simply moved the disabled/wait cursor to that button.

The existing success and catch paths did clear `feedbackWorking`; there was no `finally`. Two secondary lifecycle weaknesses were identified: the pending guard relied on React-rendered state, allowing two calls before a rerender, and session restoration could restore a saved `feedbackWorking: true` after the original request was gone. Those are hardened in the same bounded correction. The production screenshot itself was not attached in this request; diagnosis is based on the reported behavior and exact implementation. No new production vote was submitted or historical HTTP trace invented.

## One-vote lifecycle: before and after

| Stage | LMS-0713 behavior | LMS-0714 behavior |
| --- | --- | --- |
| Before click | No selected value initially; working false/absent | Same; any restored transient pending flag is reset |
| Start | Check receipt, rendered working and selected value; set working true | Check receipt, synchronous per-answer lock and last confirmed value; lock immediately; set working true and clear old error |
| Request | Authenticated POST `/api/ask-lwr/feedback`, JSON `{receipt, helpful}` | Same URL, authorization, body and server contract |
| HTTP/JSON | Require HTTP success, `success: true`, boolean `result.helpful` | Same validation; malformed or unsuccessful response enters error handling |
| Success | Save server `helpful` and `feedbackId`, set working false | Save server-confirmed `helpful` and `feedbackId`; clear working and lock in `finally` |
| Selected control | Disabled because it is selected; therefore wait cursor remains | Enabled, normal pointer, selected colors and `aria-pressed`; `aria-busy` false |
| Repeat selected value | Handler would suppress it, but disabled selected button cannot normally be clicked | Click is accepted by enabled button, controller suppresses redundant request, selection remains confirmed |
| Helpful → Not Helpful | Opposite request works; new selected button becomes disabled/wait | Opposite request runs; both buttons briefly disable; confirmed response switches selection; both re-enable |
| Error | Working false and generic error; confirmed selection retained | Same generic message and retained confirmed selection; centralized `finally` guarantees lock/pending cleanup after settled request, retry clears old error |

The unchanged server route returns HTTP 200 on success. A first/changed vote returns `{success:true,result:{helpful:true-or-false,changed:true,feedbackId:<event-id>}}`; an identical vote returns the existing state with `changed:false`. Both shapes are treated as successful confirmed state by the client. Failed authentication/receipt validation/database operations return a non-success response with a generic message; details are not displayed. These are the reviewed route contracts, not a newly captured production HTTP session.

## Correction

- Selected buttons are no longer disabled merely because they are selected. `disabled` and `aria-busy` depend only on the in-flight state. Normal cursor is `pointer`; disabled cursor is `wait`. Selection has `aria-pressed` and retains existing colors/text.
- `createFeedbackController` owns a synchronous per-answer in-flight set, preventing rapid opposite clicks before React rerenders. It caches the last server-confirmed value so even stale render callbacks cannot submit an immediate redundant vote.
- Selection updates only after a valid successful response. HTTP failures, network failures, malformed JSON, invalid response shape and authorization-header failures preserve the prior confirmed state and display the existing generic error. `finally` always clears pending/lock when the request settles.
- Session restoration resets transient feedback pending state; it retains the stored confirmed selection. This avoids restoring an abandoned request as permanently busy. Conversation receipts/history ordering are unchanged.
- No server-route or database semantics change. The existing authenticated, receipt-validated route compares against the last stored value and inserts only changes. This client correction does not claim cross-tab transactional serialization or redesign persistence.

## Files and version updates

- `lwrpc-admin/app/components/AskLwrAssistant.js`: shared controller wiring, transient pending reset, selected/pending UI separation and accessibility state.
- `lwrpc-admin/app/lib/askLwrFeedbackState.js`: bounded request lifecycle/controller and pending restoration helper.
- `lwrpc-admin/test/askLwrFeedbackState.test.mjs`: ten new lifecycle/UI contract tests.
- `lwrpc-admin/test/aiConversation.test.mjs`: existing endpoint-wiring assertion follows the extracted controller and verifies assistant wiring; prior protection checks retained.
- `lwrpc-admin/app/lib/version.js`: **LMS-0713 → LMS-0714**.
- `lwrpc-admin/package.json`: **0.1.535 → 0.1.536**.
- `lwrpc-admin/package-lock.json`: root and root-package versions synchronized; no dependency change.
- `docs/project-roadmap.md`: current version and pending System Setup cleanup findings.
- `docs/lms-0714-implementation-report.md`: this report.

Historical LMS-0713 reports and references remain historical. Existing version consumers and future answer feedback receipts identify this revision as LMS-0714.

## Tests and validation

- Full app `npm test`: **182 passed, zero failed** (172 existing plus ten new tests). New tests cover the four-click sequence sending exactly two requests; synchronous rapid-opposite-click rejection; unchanged server response cleanup and server-authoritative selection; HTTP/network/malformed/invalid/authentication errors, confirmed-state preservation and successful retries; restored pending reset; and enabled selected controls with pressed/busy/cursor semantics. A prior static assertion was updated for the moved request code, not removed.
- Browser verification: PASS using installed Chrome through bundled Playwright, since `agent-browser` was unavailable. A local in-memory fixture renders the actual `FeedbackControls`, actual controller and generated application CSS. It verifies both controls disable with a wait cursor during a deferred request, re-enable with pointer cursor after success, four clicks send only two requests, confirmed selected state remains correct, an error preserves the preceding state and a retry clears the error. No browser errors. The fixture uses mocked responses and no production network or database writes. This is a component/request-lifecycle browser check, not an authenticated production end-to-end test.
- `npm run lint`: passed; zero errors, six existing warnings (captain-dashboard router hook dependency, two unused player-dashboard functions, three omitted source-ID destructuring bindings).
- `npx tsc --noEmit --incremental false`: passed.
- `npm run verify:ai-pdf-server-bundle`: passed in both main and isolated completed build output.
- Normal `npm run build`: compiled successfully in 19.7 seconds, then hit the known `.next/cache/.tsbuildinfo` EPERM write lock.
- Authorized isolated build `.next/lms0714-clean-build`: passed compilation (24.8 seconds), TypeScript, all 70 static pages and final optimization. It uses existing dependencies, inherited environment, no copied `.env` files, and a temporary tracing-root adjustment only; repository build configuration is unchanged.
- `git diff --check`: passed.

No SQL/schema/migration, corpus/document/embedding/metadata, model prompt, retrieval/selection, hierarchy, mobile layout, citation viewer or deployment change. No production feedback events were created by validation. All prior LMS-0713 functional regression coverage passes.

## Deployment instructions

After review approval, deploy the reviewed LMS-0714 application revision through the established workflow. No SQL, configuration, corpus processing or activation step is required. Do not deploy the ignored fixture/build directory as source. Confirm LMS-0714 in the UI and generate a NEW grounded answer so its feedback receipt/snapshot carries LMS-0714. Nothing was deployed automatically.

## Exact final production acceptance test

1. Confirm the deployed app is LMS-0714. Ask `what does an NR DUPR rating mean` and wait for the grounded answer with Official Sources and feedback controls.
2. On this ONE answer, click Helpful. During the request, a brief wait cursor/disable is acceptable. After completion, Helpful is selected, both controls enabled and neither remains busy.
3. Click Helpful again. It stays selected, the UI remains responsive, and no additional event is created. Client-side request suppression is expected.
4. Click Not Helpful. After completion, Not Helpful is selected, Helpful is unselected and both controls return to normal pointer behavior.
5. Click Not Helpful again. It stays selected and responsive with no additional event.
6. Perform read-only verification for this same `answer_id` and user: exactly two events in chronological order, Helpful then Not Helpful, both LMS-0714, with the original/effective question, generated answer and safe evidence snapshots. The first event must remain intact. Do not combine votes across separate answers.
7. If testing failures, use a local/nonproduction network-failure fixture: pending clears, the last confirmed selection survives, the existing generic error appears and retry works. Do not create artificial production rows. Rapid clicks during a request must not issue opposite concurrent requests from the same mounted assistant.
8. Preserve production controls: personal DUPR/status/opponent/roster protection; official NR/Season DUPR; roster troubleshooting with applicable evidence and no live-cause diagnosis; kitchen 11.A then contextual 11.A.2; Franklin Outdoor X-40 Optic; Color → Ball; legal/damaged ball; receipts; mobile panel; citation viewer and feedback eligibility.

Final Stage 6 production acceptance remains pending the above UI/database sequence. Stage 7 remains paused.

## Pending post-Stage-6 System Setup UI cleanup — not implemented

1. AI Assistant Management and Test AI Assistant both appear highlighted when Test AI Assistant is active.
2. The blue Test AI Assistant header contains a blank white control/box in the upper right.

These are separate manager UI findings. No related navigation/header files were changed; address them only after Stage 6 feedback acceptance under a separate scope.
