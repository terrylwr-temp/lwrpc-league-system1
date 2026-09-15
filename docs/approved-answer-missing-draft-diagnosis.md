# Approved Answers missing draft — read-only diagnosis

## Finding

**B. DRAFT DOES NOT EXIST.** Production contains one Approved Answer with two revisions, both retired `Match Scheduling Changes`. Draft count is zero; orphan revision count zero. No Approved Answer save/create events exist after September 6. Both review cases matching `Do subs have to meet the DUPR rating range?` remain new/unresolved with zero linked answers. One is categorized AI/retrieval selection; the other is unclassified. No draft title, scope, dates, revision or answer content were durably saved for this question.

## Save evidence and limits

Vercel logs on current deployment show Approved Answers POST responses HTTP 400 at September 9, 2026 9:37:49 and 9:38:16 p.m. Eastern, followed by successful list GETs at 9:40/9:41. These align with the reported workflow. Logs do not retain request bodies, action names or response error text, so request attribution to Save Draft is based on owner workflow/timing, and the specific rejected field cannot be proved. The earlier 9:35 request is middleware-level HTTP 200, not proof of a durable draft; the existing-evidence category update occurs at that time. Owner explicitly reports receiving no error message.

UI Editor submits create/save with draft, case/revision reference, operation UUID, static-policy confirmation and distinction. Handler rejects View-As and requires authorized Commissioner/League Manager. Validation checks IDs, required text, policy-key syntax, dates/scope, source binding, privacy, static-policy confirmation and evidence distinction before mutation RPC. A field/reference/policy validation raises HTTP 400; direct-evidence conflict uses 409, authorization normally 401/403, RPC failures 409/503. Available 400s therefore support pre-persistence request/validation failure, not a successful save hidden by the list. The specific validation must remain unconfirmed rather than guessed.

The transactional RPC creates the answer/revision and audit event together, as Draft. It does not activate or resolve the case. No corresponding durable record/event exists here. No SQL mutation was executed to reproduce the failure.

## UI feedback defect

`ApprovedAnswersPanel.js` catches save errors but places `role=alert` at the beginning of the long form. Save Draft is at its bottom. There is no focus/scroll to the error or adjacent save outcome; on failure the button simply returns from Saving to Save Draft. There is no explicit success confirmation either: success refreshes the list and opens the returned revision. This supports an off-screen failure explanation, not a claim that historical pixel state was captured. Owner saw no error. Exact backend validation message is unavailable.

## List and filters

`approvedList` selects the latest 300 revisions ordered by updated_at, with no status or effective-date predicate. The UI applies optional status/scope/search filters. Publication All is empty string and genuinely includes draft, active and retired. Future-effective/expired active records remain listed with eligibility annotations; no separate inactive enum exists. Only active/current qualifying revisions govern retrieval. Two total revisions cannot hit the 300-row cap. The list matches current durable storage; no listing defect established.

## Existing management path

View on a draft already renders the Editor and Review activation. Activation requires explicit review, checkbox and Activate, with scope/source/overlap revalidation and embedding. Draft saves do not embed, govern answers or resolve cases. Activation also keeps case resolution separate. Reuse this workflow; do not introduce another manager screen or weaken authorization.

## Classification and smallest proposed correction

**D. Failed save/request validation with inadequate user-visible error/success feedback.** Not a proved database persistence defect, not a listing/filter defect. The exact validation cause remains unconfirmed because response text/input was not retained. Do not present a guessed policy-key or evidence error as established fact.

Propose, for review only:

- Visible save outcome beside Save Draft plus focused/scroll-revealed error summary. Preserve form values after failure; never announce success on error.
- Explicit `Draft saved — not active` only after a valid returned revision is confirmed; distinguish save success from a subsequent list/detail load failure.
- Inline validation aligned with server rules (especially the currently unrestricted text input for the constrained policy/topic key), preserving existing server enforcement.
- Keep existing list query, status options, View/Edit/activation and separate case resolution. Consider uppercase status labels for clarity, not altered semantics.
- Warn before leaving unsaved/failed edits. Do not silently create, recover, or activate an answer on the owner's behalf.
- If a later controlled synthetic reproduction identifies a validation bug, review its exact correction separately; do not bypass evidence/security restrictions to force a save.

**SQL requirement:** none identified for this UI feedback correction. No schema, grant or RLS changes proposed.

## Proposed permanent tests and controlled deployment

Use synthetic local fixtures and mocked provider calls only: create valid draft → save → visible success → leave/reopen → Draft visible under All/Draft with preserved content → View/Edit → explicit activation → Active visible. Draft must be excluded from retrieval; eligible active revision can participate, with fixture embeddings and no OpenAI requests. Also test HTTP 400/409/503 and network failure from the bottom of a long mobile form: visible/focused error, retained fields, no false success; retry does not duplicate; successful persistence plus failed refresh is distinguished; case stays unresolved; unauthorized/View-As mutations denied. Preserve future-effective/expired/retired listing and eligibility behavior.

After approval: implement locally, run focused deterministic UI/service tests, lint/build; review exact candidate; deploy without SQL/data edits; normal LMS first, then production read-only management checks. Do not create/activate real answers as a smoke test. Owner controls eventual real draft save/activation and Ask LWR retest, which may incur provider calls and is outside this diagnosis.

No implementation, deployment, production mutation or OpenAI calls performed. Stop for review. Existing draft content cannot be recovered from the inspected durable stores because it was not persisted.
