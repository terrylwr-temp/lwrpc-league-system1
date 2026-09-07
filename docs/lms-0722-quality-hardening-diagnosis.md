# LMS-0722 / 0.1.544 — Production quality hardening diagnosis

> Current checkpoint: **PrimeTime Picklebreaker source conflict RESOLVED BY OWNER SOURCE CORRECTION.** Read-only verification passed for active Rules v20260907001227-e4d9bf77 (6.3.3, 6.3.6 and summary all 15 by 2 Rally). Both prior versions are superseded and retained. Resume approved LMS-0722 implementation against the corrected baseline; retain generic isolated equal-authority conflict regression coverage. See [final verification](lms-0722-final-source-verification.md). Historical conflict evidence and replay scores below are preserved as history, not active defects.

Historical diagnosis status (2026-09-06): diagnosis/design only. **LMS-0721 / 0.1.543 remains deployed and production accepted.** Stage 7A/B and Approved Answers remain accepted. No implementation, migration, deployment, version change, corpus processing, activation, managed-answer mutation, or live LMS lookup was performed.

## Evidence and method

This report incorporates the original five families and every subsequent addition: document navigation, LMS account help, equipment with a proposed product, multi-part composition, team-size/9.1 assumptions, explicit Weekday 9.1 format, and PrimeTime player count. The last four are analyzed as a shared composition/format family while retaining separate production questions and controls.

The current local accepted code was replayed against active official production document search. Each normal replay used its original question embedding, `askAbout=all`, player role, no page/module boosts, no live scope IDs, and no conversation receipt unless explicitly identified as a local receipt probe. Runtime functions used were `resolveOfficialConversation`, `retrieveOfficialEvidence`, `clarificationFromRetrieval`, and `selectAnswerEvidenceWithAssistance`. Pure private predicates were inspected in memory without editing application modules.

**These are fresh diagnostic replays, not reconstructed historical requests.** The historical receipt, browser context, and exact rejecting branch were not retained for every owner report. `evidence_selected` means the unchanged selector would hand evidence to generation; it is not proof that a newly generated answer was correct. No answer-model calls, player Ask requests, feedback events, review actions, or capture events were created. Query embeddings were not persisted. There are 99 normal question/control replays, plus separately labeled recall probes.

Artifacts:

- [All normal traces and selected passages](lms-0722-diagnostic-replay.json): raw/effective resolution, intent, league, terms, 32 candidates with scores/FTS, 12-candidate authority membership, predicate results, selected passages, and final selection kind.
- [Readable trace/control appendix](lms-0722-trace-appendix.md).
- [Active official passage inspection](lms-0722-source-inspection.json): targeted read-only source inspection, not a new corpus.
- [Counterfactual recall inspection](lms-0722-recall-inspection.json): exploratory search-text projections using original vectors, not changes to the runtime.

The active Rules version is `c0604ad8-7057-4e63-b6e1-e9389aee2157`; the active USAP version is `00c2e2bb-6465-4677-b8d5-6debdde8fe70`. Seven active documents are searchable: Rules, DUPR Captains Guide, Captains Guide to the LMS, Players Guide to the LMS, Important Dates, Code of Conduct, and 2026 USAP Rulebook. Both captain guides exist, so an unqualified “Captains Guide” can be ambiguous. Page numbers below are stored document/viewer pages. No historical source was substituted for active evidence.

## 1. Saturday mixed-only players — exact trace and root cause

Question: `I could use some clarification on the Saturday league mixed doubles. Is it permissible to use players other than the 12 that played in the single gender matches?`

Fresh resolution is standalone, unchanged effective question, no guard or clarification. Saturday is recognized, but no specific Stage 4 participation intent is detected. The existing roster-permission intent recognizes roster-before-play questions, not mixed-only participation. Generic terms include `some`, `clarification`, `saturday`, `league`, `mixed`, `doubles`, `permissible`, `other`, `than`, `12`, `played`, `single`, `gender`.

Stage 3 top candidates include USAP 15.A.3.a rank 1/.5054; Rules Saturday-format material p10 rank 3/.4887; 6.2.5 p10 rank 4/.4821; Saturday introduction 6.2 p9 rank 7/.4728; 6.2.3 p9 rank 10/.4621; 6.2.4 p10 rank 11/.4575. All 12 reviewed candidates return no direct/generic applicable passage. The 6.2.1 stored chunk containing 6.2.2 is **absent from this fresh normal 32-candidate pool**. Do not reuse the earlier diagnosis's rank as this request's rank.

The active document independently establishes the answer in chunk `e4bebbb3-7a89-42c6-ab33-dfb18baad0c3`, p9:

> 6.2.2. Roster & Courts: 12 players—6 men and 6 women—divided into six teams: 3 men’s doubles teams and 3 women’s doubles teams. Mixed teams may be formed from the gender doubles players or can be from additional players who participate only in the mixed round. Requires 4 courts.

6.2.5 p10 separately addresses player participation/caps. It is not a substitute for the complete 6.2.2 mixed-only permission. The generic matcher requires every residual term in a passage; even injecting the genuine 6.2.2 text into that predicate would not satisfy conversational terms such as `clarification` and `permissible`. Thus **recall/windowing plus applicability** are demonstrated. No selected evidence; final fallback `insufficient_evidence`; no generation.

All six simpler Saturday controls also fail current replay. Player count/courts and mixed-only eligibility need distinct proposition types. This is existing official knowledge, not an Approved Answer opportunity.

### Smallest correction design

Recognize participant eligibility for a named round: mixed round / mixed doubles, same gender-round players versus additional/mixed-only players. Bind the permission and its Saturday scope to the actual passage; retain its parent identity and qualifications. Separately recognize match player count and court count. Do not route unrelated Saturday questions to 6.2.2. A bounded concept-based recall path is also needed when the passage is outside review; do not simply increase the evidence cap or claim a predicate-only repair suffices.

## 2. Club website — exact trace and correction

Question: `What is the website for the club` resolves standalone unchanged. Stage 4 has no recognized specific intent; generic coverage reduces the question to **`website` because `club` is discarded as framing**.

Current ranks reproduce the owner finding: Captains LMS Guide p5 rank 1/.4706; Players LMS Guide p5 rank 2/.4700; Rules p2 rank 3/.4644; Players Guide p3 rank 4/.4136. Exact/keyword component values and normalized FTS terms are in the replay. Rules rank 3 is not lost at Stage 3 or the authority window.

The Rules chunk has:

> 1.1. Club main website: https://lwrpickleballclub.com
> 1.2. League Management System (LMS) website: https://league.lwrpickleballclub.com

Both are declarative label/value facts. The generic predicate's operative-word test rejects the 1.1 passage: no `is`, `are`, `must`, `can`, etc. The Players Guide's broad p3 paragraph contains `website` and operative words, so it passes and is selected even though its URL concerns DUPR rating calculation. Its entire broad paragraph survives as one passage. This is **entity binding plus fact-shape recognition**, not a score-tie or authority-rank problem. With no detected special intent, generic applicability controls the result; the earlier `materiallyContributes` candidate calculation does not rescue the formal Rule.

Design an entity-bound locator proposition: requested entity (club/LMS/DUPR/membership), relation (website/location/access), value from an explicit trusted label or procedure. Preserve `club` as the requested entity, not a universal stopword. Accept a well-formed label/value fact without adding imaginary operative language. Keep 1.1 and 1.2 separate; do not hardcode URLs. Membership management is a documented procedure, not automatically a request for the DUPR website. Current controls show short club/LMS/DUPR website wording can select evidence while apostrophe/online wording fails; selection success alone does not certify the right destination.

## 3. Rally scoring — selected-passage scope matrix

Question: `what are your rally scoring rules` resolves standalone; generic concepts are `rally`, `score`. No league is specified. `leagueCompatible` returns true for unspecified league, and otherwise inspects shallow metadata/headings rather than reliable passage ancestry. The governing selector keeps multiple same-authority LWR matches, capped at four, after detecting word-level directness. This permits incompatible scopes to travel together.

Fresh selected evidence is exactly:

| Selected source (all active Rules) | Rank / score | Proposition | Actual scope / defect |
|---|---:|---|---|
| Rally Scoring Rules, p15; stored heading misleadingly `DUPR LEAGUE MANAGERS` | 1 / .6467 | Losing serving rally gives opponent point and serve | General LWR rally mechanics |
| Same p15 selection | 1 / .6467 | Freeze at one below winning score; winning point on serve; 25/24 example | General conditional mechanism; 25 is an example, not a universal target |
| Same p15 selection | 1 / .6467 | Win-by-two tie/unfreeze/refreeze paragraph | Conditional on win-by-two; selected text ends mid-sentence, so incomplete continuation must not be treated as complete |
| 6.2.3 continuation, p10 | 8 / .4771 | One game to 25 win-by-two, three bonus points, no DUPR posting; team numbering | Saturday Picklebreaker; leading antecedent is missing at page boundary; not general rally mechanics |
| 6.2.3.1, p9 | 11 / .4647 | Games to 15/win-by-one, one match point per win, two timeouts, end change at 8 | Saturday regular games, not all LWR leagues or Picklebreakers |
| 6.3.6 continuation, p13 | 12 / .4640 | Picklebreaker to 15/win-by-two; no DUPR posting | PrimeTime tiebreaker; not regular games or universal rally target |

USAP 15.C.2 rank 2/.6011 and 14.A rank 3/.6002 are reviewed, but applicable LWR provisions govern their same issues. The full source p15 genuinely contains a general “Rally Scoring Rules” section referencing USAP 14.A and stating LWR modifications. Its service-positioning, switch-on-own-serve, and game-point bullets are not all retained by the current literal passage test. Thus the general source ranked first: this is not absence of universal evidence.

### Universal versus scoped findings

General LWR rally mechanics are points on either team's rally wins, subject to the winning-point freeze; service position by score parity after side out; partners switch after winning on their serve; losing serve transfers serve. The p15 freeze is not limited to games to 25: that number is expressly an example. Win-by-two behavior applies only to that format and needs the complete continuation. A read-only adjacency inspection located the next chunk on the same page: it completes “game by two (2) points,” repeats unfreezing at another tie, and requires the winning point to be scored while serving. This continuation exists but was not selected in the broad-query replay.

Target score, win-by, timeout count, end changes, standings points, and Picklebreaker activation/rotations must retain format scope. Rules 6.1.3 p7 describes normal Weekday one-game-to-15/win-by-one format; 6.1.9 p8 overrides for Weekday 9.1; 6.2.3 p9–10 governs Saturday; 6.3.3/6.3.6 p12–13 governs PrimeTime. Picklebreaker overview p16 explicitly says 15 or 25 depending on league and refers readers to league-specific rules. The overview's broad “every rally” description must be read with the formal freeze qualification.

Two source issues require owner review, not silent RAG repair: PrimeTime 6.3.3 says potential Picklebreaker to **11**, while 6.3.6 says **15**; Picklebreaker p17 1.4 says **“six (8)”** for an optional 15-point-game end change. Do not invent which number was intended. These do not make the unambiguous PrimeTime four-player provision unknowable.

**Owner-requested source recheck:** the PrimeTime inconsistency was independently verified in the original, checksum-matched currently active PDF, not only indexed text. Both provisions belong to the same active version: 6.3.3 p12 and 6.3.6 p12–13. The p13 PrimeTime summary also says 15. See [exact provenance, quotations and original-page renders](lms-0722-primetime-conflict-source-verification.md). Retain the conflict; neither passage is superseded or borrowed from another league. This verification does not decide the intended policy or claim to identify the separate copies reviewed by the owner.

### Recommended behavior

Recommend **B, with bounded D when details are requested**: answer supported general mechanics, say targets/format vary by league, and ask for league/division only for those details. Do not block all universal explanation with an initial league question. Do not list every league's scoring table in a general answer. A specific question must allow its scoped provisions and surface genuine conflict for the conflicting proposition.

Scope design: attach document/version, structural ancestor, league, division, match phase, scoring mode, conditions, and completeness to each selected passage/proposition. Document `scope=all` means a multi-league document, not that every child is universal. Derive scope from trusted headings/numbered hierarchy/table labels, not the question or generated text. Carry this data into the generation contract. Unknown scope cannot become universal by default. Preserve page-boundary continuations with verified adjacency and same section identity; never arbitrary neighboring content.

## 4. Kitchen/NVZ — exact trace and correction

The exact recorded production wording is **`Is the kitchen the same as the NVZ`**, from the existing roadmap's retained unanswered observations. It resolves standalone unchanged, no guard. The matcher normalizes both aliases to NVZ, but the SQL terminology gate does not enable the NVZ bridge for this wording: it lacks the gate's playing-rule terms or definition cues (`what/where/define/dimension/zone/line`). JavaScript alias diagnostics mirror that gate. No typo annotations means no interpretation-assisted retry.

Fresh top candidate is the correct USAP **3.A.4.c p12**, rank 1, but only **.1076** (semantic .2091; keyword 0; exact 0), below .35. `selectAnswerEvidence` exits at insufficient retrieval evidence before applicability. A second latent defect remains: `same/as` stay in issue coverage, and `nvzQuestionScope` does not recognize equivalence. No selected evidence and no generation.

3.A.4.c defines the non-volley zone and expressly includes its boundary lines. USAP 11.A p30 permits contact except while volleying; 11.A.1 governs contact while volleying; 11.A.2 governs momentum; 11.A.3 governs leaving before volleying. The inspected active USAP text does not literally use “kitchen”; that colloquial mapping is already part of the accepted application terminology. The definition is official evidence for the mapped concept, not permission to invent new USAP terminology in a quote.

The control `Is the kitchen the non-volley zone?` selects evidence, but includes 11.A.3 and adaptive 25.A.10.c rather than just the definition: a separate applicability failure despite clearing recall. Line-membership and standing-without-volley controls fail; ordinary volley and momentum controls select 11.A and 11.A.2 respectively.

Design a shared concept equivalence/definition intent, with trusted existing kitchen/NVZ/non-volley-zone aliases and a deterministic query projection using the existing RPC. Definition/line membership selects 3.A.4.c; contact-without-volley selects 11.A; momentum stays separate. No universal 11.A.2 routing, no adaptive exceptions unless requested. Do not lower .35 to accommodate this wording. If a safe JavaScript projection cannot produce adequate recall under the existing RPC, stop for separate RPC authorization; no SQL change was made here.

## 5. Apparel — conversation/object trace and policy availability

`clothing` resolves as a standalone fragment and reaches insufficient evidence. The complete blouse question, both alone and with a locally valid immediately prior `clothing` follow-up receipt, returns `missing_color_subject` clarification before retrieval. With the receipt, validation is `valid`, prior purpose `follow_up`, context is superseded, and effective question is empty because the resolver returns clarification. Without it, the same detector fails. This demonstrates a current vocabulary defect independent of prior context; it does not prove which receipt production actually supplied.

The missing-color detector recognizes singular `clothing/apparel/shirt/jersey/uniform/...` but not blouse, blouses, or shirts. The standalone detector explicitly refuses questions flagged by that predicate, so a full sentence does not bypass it. The clarification-reply object vocabulary duplicates the narrow list. `team shirts` also falsely clarifies; singular `jersey` reaches retrieval but produces insufficient evidence. No retrieval candidates exist on the normal blouse path: do not present a counterfactual search as the actual request.

`What color can our team wear?` is unexpectedly protected by the broad personal-team guard, while `Are there color restrictions?` clarifies. A future correction should recognize general attire questions before that broad fallback without exempting all first-person questions or guessing attire from every team/color phrase.

Targeted active LWR inspection found no team-shirt/color policy. **USAP 18.B.3 p47 does address apparel approximating the ball's color**, requiring a Tournament Director-directed apparel change; 18.B.1 concerns appropriate depictions; 18.B.2 footwear; 18.B.4 refusal to comply. These are in the tournament section and must not be silently restated as a universal LWR team-uniform color prohibition. Rule 5.2's USAP governance does not justify erasing the Tournament Director/format conditions. The exact team-ordering policy remains unestablished by inspected LWR evidence; that portion is a possible future owner-policy question, not a reason to duplicate USAP rules.

Design one bounded object-family vocabulary shared by conversation, interpretation, and applicability, with controlled inflections for clothing/apparel/shirt/jersey/blouse/uniform and other verified apparel nouns. Recognition answers “what object,” not “what policy.” Preserve ambiguous color clarification; return appropriately scoped evidence or insufficient evidence after recognizing apparel. Do not hardcode a blouse outcome.

## 6. Official-document navigation

Exact question: `I can't seem to locate the rules/guidelines for the Saturday Pickleball League. Can you please direct me where I can locate them`

Fresh resolution is standalone unchanged; Saturday recognized. Stage 3 reports procedural/how-to, but Stage 4 has no document-navigation intent. Terms such as `seem`, `locate`, `guidelines`, `direct`, `me`, `them` remain requirements. Rules is retrieved: p13 rank 5/.4642, Saturday 6.2 p9 rank 7/.4563, Saturday format p10 rank 10/.4402. All direct/generic predicates reject; final insufficient evidence.

The active DUPR Captains Guide p1 explicitly says the Rules cover league-specific requirements and directs readers to **League Documents → League Rules**. It also supplies an official public short link; no fabricated URL is needed. The Rules' Saturday section starts at 6.2 p9. This is existing official material.

Some short navigation controls select incidental substantive material (`Where are the Saturday rules?`, `I need the rules for the Saturday league.`), showing that eliminating the fallback alone is insufficient. Most guide/rulebook/Important Dates locator controls fail. `Show me the Saturday roster rules` must retain a substantive target rather than treating “show” as unconditional document navigation.

Design a bounded **document locator** intent: document identity/family plus optional league/section, no requested substantive proposition. Resolve active/searchable document metadata and a verified anchor chunk, then deterministically produce a title/location sentence and the existing Official Source viewer link. No answer model is needed for an unambiguous document. Do not fabricate a public URL or give storage URLs to the client. Existing viewer claims require trusted document/version/chunk IDs; a root or verified section anchor supplies those. If the requested section cannot be verified, open the correct document at its valid root rather than invent a page.

Use a small indexed active-document lookup, not a semantic threshold on an arbitrary policy paragraph. Preserve Rules, two distinct captain guides, Players Guide, Important Dates, and USAP Rulebook identities. Ambiguous “rules” or “Captains Guide” should offer bounded choices unless immediate valid context establishes the intended document. `Where can I find what ball we're using?` remains substantive selected-equipment + source, not pure navigation. No Approved Answer.

## 7. LMS account/procedural help

Exact question: `I am unable to log into my account. How do I reset my password`

Standalone unchanged, no guard; Stage 3 diagnostic detects procedural/how-to but no Stage 4 password-help intent. Residual terms are `am/unable/log/into/account/reset/password`. Full question is not split at its declarative sentence boundary. Rank 1 is DUPR Captains Guide p3/.3926; password/profile p5 is ranks 2/.3633 and 3/.3628. The actual reset instructions are Captains LMS Guide p4 rank 15/.2348 and Players LMS Guide p4 rank 16/.2346—outside authority review and below threshold. Every reviewed candidate fails applicability. This is **recall plus procedural intent/coverage**, not a missing password article.

Players Guide p4 (also Captains LMS Guide p4 and DUPR Captains Guide p6) states:

> Select Forgot Password to reset or create your password. You can also change your password at any time when you are logged in the system. Click the Change Password button located in the top header of the initial dashboard screen. Note: this will only change the password in this League Management System and not the Club Membership system.

The same source identifies `https://league.lwrpickleballclub.com` and general sign-in instructions. Profile p5 identifies Change Password / Passkey and Club Website Link for membership renewals/payments. The short `How do I reset my password?`, `I forgot my password`, and change-password controls select evidence; the longer production framing and sign-in control fail. `I can't log in` alone should provide supported general troubleshooting/route help, not assert the reason a particular account is inaccessible.

Use a bounded procedural intent (operation + system + object + requested outcome) for authentication help, membership, roster management, Match Setup, and score entry. Keep existing specialized roster/score controls. Prefer player instructions where duplicate guides give identical public procedures. Preserve all steps/conditions, not just a mention of password. A model is optional for paraphrasing, never needed to reset anything. URLs must come from trusted official instructions or the established safe route mechanism.

Two security/control findings: `Where do I enter match scores?` is currently protected because the broad where/my/I/score pattern wins despite being a procedure; `What email address is my account under?` is **not** currently classified protected by the operational guard, though this replay still falls back without disclosing anything. Future design should explicitly protect account-identity/status/token requests and narrowly allow public how-to questions. This is no authorization to query accounts, send resets, inspect credentials, request passwords, or expose auth internals. No Approved Answer is warranted for documented reset help.

## 8. Equipment, navigation wording, and proposed products

Exact question: `Where do I find the info on what Pickleball’s we will be using with weekday league? I thought I read that we were using Joola HC-40.`

Standalone unchanged, Weekday recognized, procedural diagnostic only. The selected-equipment helper requires literal `ball|balls`; its token normalization leaves `pickleball s`, so the helper returns false. The equipment probe is ineligible. There are no accepted typo annotations, so no assisted retry. The official DUPR Captains Guide p10 is already rank 12/.3865, above threshold and in authority review. Its explicit league-provided match-ball provision fails generic matching against navigation words, possessive residue, and the user-proposed product. Two clauses also create an all-or-nothing coverage requirement. No selection; insufficient evidence.

Active p10 states league provision of **Franklin Outdoor X-40 Optic balls for all regular-season and playoff matches**. This is derived evidence, not a proposed hardcoded answer. It supports Weekday and Saturday unless a higher-authority scoped override exists; none was established in this inspection.

Accepted controls still select evidence: `What kind of balls will we be using?`, explicit Weekday ball, combined `Where can I find what ball we're using for Weekday?`, and Saturday ball. `Are we using Joola HC-40?` and a made-up product question fail. `I thought we're using Joola HC-40. Is that right?` and `Where does it say what ball we're using?` hit the short-pronoun follow-up detector and clarify without context. The two-clause made-up-product question fails even with an explicit ball subject, demonstrating unsupported-assumption coverage separately from the pickleball token.

Design: bounded equipment noun normalization including inflected/possessive pickleball when grammar denotes the object; identify/verify club-selected equipment; classify product claims as **user assertions to verify**, not required evidence tokens. Keep product identity for comparing the response, never alias Joola to Franklin. Pure product wording without a known object may need a clarification; do not build a brand lookup or infer arbitrary product categories. Mixed navigation/substantive requests answer the substantive question and cite its source. Preserve legal specifications, damaged ball, generic ball, and league-scoped exceptions. Reuse the accepted equipment probe only after a valid equipment intent, not for any sentence containing a product-like token.

## 9. Composition, 9.1, and multiple propositions

Four production traces remain distinct in the appendix: full men/women/mixed/heat question (I), LWRCC team-size/pair-rating assumption (J), explicit Weekday 9.1 format (K), and explicit PrimeTime player count (L).

### Simple controls establish an upstream problem first

`Does the weekday 9.1 league have a different format?` resolves standalone, Weekday recognized, no specific format intent or division compatibility model. Generic terms require `weekday/9/1/league/have/different/format`. Rules p13's extracted heading-only `Weekday League Weekday League (9.1)` ranks 1/.5594; normal Weekday 6.1.1 rank 4/.4530; actual 6.1.9.1–2 p8 rank 11/.4372. The latter is in authority review and league-compatible but fails literal coverage. Generic metadata also labels Saturday/PrimeTime child chunks compatible when their immediate headings omit the league. `9.1` is not bound as a typed division; the retrieval RPC's broad numeric rule-reference extraction can also interpret a dotted number as a requested rule. It must not be treated as Rule 9.1 when the question says Weekday division.

`How many players do i need for the primetime league` resolves standalone, PrimeTime recognized, no player-count intent. Generic terms reduce to `many/primetime/league`, discarding the object `players`. PrimeTime introduction 6.3 rank 4/.4731 and the division table rank 3/.4742 are reviewed; neither passes the literal count predicate. The explicit 6.3.2 row is not in the first 12. All requested PrimeTime count controls fail. These simpler failures demonstrate that **league/division + composition/format applicability and recall must be fixed before partial-answer behavior**.

### Active official proposition matrix

| Proposition | Active source | What can truthfully be said |
|---|---|---|
| Pair/team DUPR calculation | Rules 4.6 p4, in stored 4.5.2 chunk | Add the Season DUPR ratings of **both players**; individual minimum/maximum and pair maximum are separate constraints |
| Every fielded lineup | Rules 4.6.1–2 p4 | Must satisfy both individual and combined limits; not the sum of the entire season roster |
| Weekday DUPR 9 | Division table p7 | Individual range 3.8–4.899; maximum pair aggregate 9.1; use the recorded Season DUPR calculation, not a player's assumed current raw rating |
| Saturday SDUPR 9 | Division table p9 | Individual range 3.8–4.899; maximum pair aggregate 9.1 |
| PrimeTime PT9 | Division table p12 | Current PT9 individual range 3.4–4.899, max aggregate 9.1; a separate **Future** row says 3.8–4.899 and must not replace current PT9; age-based conditions in 6.3/6.3.2 apply |
| Normal Weekday match | 6.1.2–3 p7 | Six players/three lines/three courts; separate men's and women's competition; single games to 15/win-by-one |
| Weekday 9.1 exception | 6.1.9–6.1.9.2 p8 | Men's/women's flex divisions, initially Fridays noon, captains may modify within seven days; two lines/**four players**, two courts; round robin best two of three to 11/win-by-two |
| Weekday 9.1 scoring/points | 6.1.9.3–7 p8 | Five possible match points, tied 2–2 triggers Picklebreaker to 15/win-by-two, otherwise bonus; one timeout/game and specified end changes; player-cap wording is separate from total roster size |
| Saturday match | 6.2.2 p9; 6.2.3–5 p9–10 | Twelve gender-round players, six men/six women, additional mixed-only players allowed; four courts; this is not two men/two women with best-of-three men's/women's/mixed games |
| PrimeTime match | 6.3.2 p12 | **Four players/two lines/two courts**, age-based eligibility; no six-player roster maximum inferred |
| Overall roster and substitutes | DUPR Captains Guide, CREATE/UPDATE TEAM ROSTER p7 | Roster enough players/substitutes to field a lineup. Example: if six are needed for a match, **8–10 rostered is recommended**. This is a conditional recommendation, not a universal minimum/maximum or a recommendation for six due to heat |
| Heat-based six-person recommendation | No direct provision found in inspected active LWR sources | Not established. Do not turn the user's suggestion into policy |

9.1 is demonstrably ambiguous across leagues. LWRCC does not resolve it and must not trigger a live community query or fuzzy community mapping. The full first question has mixed and gender-game assumptions that do not match Weekday's separate men's/women's divisions. With no verified prior league context, clarify the format before asserting its player counts. Its phrase “one more clarification” is not evidence of validated prior context; the fresh replay has none and resolves as a standalone long question.

The active Rules' Weekday 9.1 passages do not establish a season-specific blanket exclusion from DUPR posting. They explicitly exclude Picklebreaker results (6.1.9.7); Captains Guide p10 gives the general upload service with named exceptions. Do not repeat a historical 9.1 posting exception without active evidence. Captains LMS Guide p10 documents modifying date/time for a flex league but does not itself assign all divisions to flex. Rule 6.1.9 governs that assignment; applicable 5.11 scheduling/reporting constraints remain intact.

### Full-question trace and all-or-nothing coverage

I: first candidate is Rules 6.2.1/6.2.2 p9 rank 1/.4853; 6.2.3 rank 2/.4812; PrimeTime 6.3.1 rank 3/.4782; normal Weekday 6.1.1 rank 4/.4646; 6.1.8 containing 6.1.9 rank 12/.4354. No selector intent. The two question clauses each require literal coverage; unsupported heat/recommendation language would force total fallback even if the format clause were fixed. Current first clause already fails, so do not attribute its whole failure only to the heat clause.

J: Rules ratings p3 rank 1/.5143; roster guide p7 rank 3/.4876; Weekday rating table rank 4/.4751; 4.6 p4 rank 5/.4690; Saturday table rank 6/.4640. Required formal facts are present, but the single long question remains one generic unit with all residual words required. “Any two,” “9.1 or less,” `LWRCC`, and “assume” are not treated as a proposition to verify. All simpler unqualified 9.1 controls also fail, and some need legitimate league clarification.

### Recommended sequencing and partial-answer contract

First implement typed league/division/phase + count/format/rating propositions and trusted structural scope. Do not implement four separate phrase patches. A pair maximum is inclusive where the official table says maximum; “under 9.1” must not silently become an exclusive cutoff. Separate fielded players, lineup pairs, whole roster capacity, and recommendation.

Then, only with explicit approval, introduce a bounded coverage plan: each proposition is `supported`, `contradicted by governing evidence`, `needs clarification`, `not established`, or `conflicting official evidence`. The user assertion is never evidence. Select at most four evidence items collectively covering supported propositions; each must independently pass scope and authority. Do not stitch unrelated fragments that match one word each. If the evidence cap cannot support all requested details, narrow/clarify rather than exceed it.

Generation may state supported pair-rating rules and explicitly ask which league determines player count. It may say the inspected evidence does not establish a heat-based six-player recommendation. It must distinguish requirement, recommendation, permission, and absence of support. Absence is not prohibition. Unknown scope that could change a proposition blocks that proposition, not necessarily unrelated universally supported information.

**Stage 7 constraint:** partial answer/clarification is a material contract decision. Existing final kinds, feedback eligibility, capture grouping, and no-source semantics must not be silently redefined. Prefer an internal coverage plan and existing externally supported response kind only if tests establish truthful semantics. If partial-insufficient reporting requires new telemetry/status behavior, defer that portion for explicit Stage 7 authorization. Simple existing-source applicability corrections can proceed independently after approval.

## 10. Shared root causes and minimum implementation set

The evidence does not support twelve unrelated patches. Four shared mechanisms explain most failures:

1. **Typed question interpretation:** distinguish document locator, procedure, factual locator/definition, substantive rule, composition/format, and proposed assumption. Retain entity/object/league/division/negation/quantities. Share bounded object inflections with the conversation detector. Do not strip meaningful entities as framing or demand every conversational word in evidence.
2. **Trusted proposition and scope extraction:** recognize label/value facts, definitions, table rows, permission alternatives, counts, and procedures; preserve numbered ancestry and complete continuations. Scope is per passage, not merely per document. Apply authority after direct applicability and completeness.
3. **Bounded recall for recognized intents:** reuse original vectors and the existing search RPC with a deterministic concept query only when necessary; bounded catalog lookup for pure document navigation; tightly constrained same-version structural context reads. No broad runtime corpus scan, new model, embedding mutation, .65 change, or unconditional retry. Search results still pass threshold, applicability, scope, and authority. The exploratory projections are not validated implementations.
4. **Coverage and response contract:** first preserve complete single-proposition answers; separately approve partial supported/unknown handling and assertion correction. Do not relax all-or-nothing checks without replacing them with explicit coverage safeguards.

Current shared weaknesses include both overly strict literal coverage and overly permissive scope/directness. Merely deleting more stopwords would help false negatives while worsening website/rally over-selection. Raising rank windows alone would not repair applicability. Broadly exempting first-person questions would weaken privacy.

Recommended implementation order: production-format fixtures → simple player-count/format, website/definition/procedure/object interpretation → trusted scope/continuation handling → bounded recall validation → deterministic document navigation → assertion/compound coverage after contract review → activation-history work as a separate change set. Gate each phase against accepted controls.

### Recall feasibility results (not implementation)

With each original vector reused, the diagnostic query projection `Saturday mixed round additional players` retrieved the genuine 6.2.2-containing chunk at rank 2/.5051; `What is the non-volley zone?` recovered 3.A.4.c rank 1/.5592; `reset password` recovered the two LMS guide reset passages at ranks 1/.3916 and 2/.3912; `PrimeTime Roster Courts` recovered 6.3.2's chunk at rank 7/.4104. `Weekday 9.1 Division Match Format` brought the 6.1.9 parent into rank 3/.4674. These establish a feasible existing-RPC route, not a generally validated rewriting algorithm or successful generated answer. They still require the original question's scope and predicate validation; projected search text cannot become evidence or silently replace user assertions. An earlier optional 80-row rank-inspection read failed; no beyond-32 rank is claimed, and the subsequent probes used the normal 32-row bound.

## 11. Manager-confirmed evidence and managed-knowledge boundaries

Use Existing Evidence confirmation as an auditable test label: original question, exact version/chunk/passage identity and hash, manager decision, later retest result. A fixture should assert that the current pipeline can independently recover and select applicable evidence. Validate whether a confirmed source is still active; preserve historical references for diagnosis. Never feed the label into production retrieval as a hidden override, force a source after a click, train on it, or auto-resolve the case. Retest and resolution stay explicit.

No Approved Answers for Rules 6.2.2, 1.1, rally mechanics, USAP NVZ, documented guides, equipment, or composition/rating rules. Possible owner-policy gaps are only the unestablished LWR apparel-color policy or heat-based six-player recommendation, after formal authority review. None was created. `.65`, managed semantic recall, related-source binding, warning workflow, material supplement preservation, historical revisions, and existing lifecycle remain unchanged.

Competing Active supplements: `chooseApprovedEvidence` currently uses `.find` in the formal-complement branch, so two eligible materially different overlapping supplements can depend on input order. Do not choose by timestamp or array order. Proposed safe behavior is explicit ambiguity/abstention for the supplement, retaining independently valid formal evidence and a manager-review diagnostic; semantically identical duplicates can be deterministically deduplicated by trusted identity/content, not merely similarity. Distinct nonoverlapping applicability can select only the applicable item. Keep this **deferred from the minimum existing-source implementation**, but require the safeguard before enabling multiple overlapping Active supplements. No scheduling revision must be activated for these regressions; use local fixtures. Zero Active managed answers is the accepted baseline supplied by the owner.

## 12. Document activation history — independent design

Production schema inspection confirms no `activated_at` or activation actor on document versions. Document metadata has generic created/updated actor fields; versions have processing actor/time. `activate_ai_document_version(document, version)` locks the document, validates ready/searchable/embedded target, changes the active pointer/status, and supersedes the previous version in one transaction. It accepts no actor and records no activation event. Document/version triggers only update `updated_at`; they do not supply authoritative activation history. Stage 7/managed-answer audit is a different domain and must not be repurposed to imply PDF activation provenance.

### Smallest prospective schema

Recommend nullable `activated_at timestamptz` and `activated_by_member_id uuid` on `ai_document_versions`, not on the document alone. Record **first successful activation for that immutable version**, preserve it on supersession, and make repeated activation of the already active version a no-op for activation provenance. Current activation rejects superseded versions; if future reactivation histories become supported, introduce append-only activation events then rather than overwrite a first activation. An event table is preferable only if repeated activation cycles must be represented now; the current request does not require that extra mechanism.

No backfill from created/uploaded/processed/updated/deployment times. New activations require an authenticated manager-derived actor; never a client-supplied arbitrary identity. If the actor record later disappears, preserve the timestamp and display actor Unknown; do not introduce a restrictive deletion behavior that breaks existing member workflows. A stable FK with approved null-on-delete policy can support this. Display names may be resolved server-side for managers; original historical display-name preservation would require a separately agreed snapshot, not invented names.

### Atomic server/RPC boundary

The existing protected documents POST route authorizes `league_manager`. Pass its trusted actor to a revised activation RPC; in that single transaction lock/validate target, set activation provenance, update active document pointer, and supersede prior version. Fail the entire activation if required provenance cannot be recorded. Remove/secure any old callable overload that could bypass recording. Restrict execution to the intended trusted role, with explicit privileges; preserve existing document/RLS rules and do not change project-wide defaults. Validate same-version retries and concurrent activations. This is a design recommendation, not SQL authored or applied.

### UI and historical truth

Add Activated and Activated by alongside active-version information and in each version-history row in AI Assistant Management. Show manager/device-local date/time using the established locale formatter, preferably with a timezone label; store UTC `timestamptz`, never local strings. The existing ApprovedAnswersPanel uses `toLocaleString(undefined, {timeZoneName: 'short'})`, providing a suitable UI convention. Superseded known values remain visible. Existing unrecorded versions show **Activated: Unknown** and **Activated by: Unknown**. No auth IDs in the UI. Processing timestamps keep their current distinct label. No forensic reconstruction was attempted.

## 13. Performance, SQL boundaries, and likely files

| Proposed component | Extra model / embedding | Expected retrieval/processing cost |
|---|---|---|
| Shared intent/object/assumption classification | 0 / 0 | Bounded deterministic token/pattern work; target low single-digit milliseconds, measure rather than promise |
| Passage scope/fact extraction | 0 / 0 | Bounded candidate text and structural checks; no unrestricted corpus scan |
| Recognized-intent recall fallback | 0 / 0 beyond original embedding | At most one shared bounded extra search with original vector; network/database latency must be measured; cannot promise no added latency |
| Verified structural continuation | 0 / 0 | At most a bounded same-version ID/ordinal lookup when needed; cache only by immutable version/identity and revalidate active status |
| Pure document navigation | 0 / 0 | Small indexed active catalog/anchor read; can bypass embedding and model entirely |
| General procedure/substantive answer | No additional answer call | Existing single generation call from selected evidence; deterministic instructions possible only with a complete trusted procedure |
| Activation display | 0 / 0 | Two selected fields plus bounded manager actor display lookup; negligible relative to existing list/detail read |

RAG design expects no SQL migration, RPC definition change, corpus processing, embedding updates, or persisted metadata change. A JavaScript query projection is a retrieval behavior change requiring implementation approval, not permission to change SQL. Scope extraction uses trusted existing text/metadata at request time. If required scope cannot be established without corpus/RPC changes, stop with that concrete limitation. Activation history alone needs a small separately reviewed additive migration and atomic RPC revision.

Likely application files after approval: `aiQuestionInterpretation.js`, `aiQuestionApplicability.js`, `aiGoverningSources.js`, `aiAnswerGeneration.js`, `aiRetrieval.js`, `aiEquipmentIntents.js`, `aiConversation.js`, `askLwrPlayerAnswer.js`; a shared bounded intent/proposition module if needed; existing official viewer/source integration for navigation; corresponding production-format fixtures/tests. Avoid editing accepted managed-answer selection unless separately approving competing-supplement safety. Activation work: documents API, AI Assistant Management UI, activation SQL migration, and security/transaction tests. Exact final file scope belongs in the implementation plan, not an unbounded refactor.

## 14. Combined regression and acceptance plan

Use all 99 exact controls in the replay as input fixtures, with active production-format passages and their real structural/table context. Freeze original ranks/scores for deterministic selector tests, and keep separate controlled read-only retrieval integration tests. Do not equate “selected anything” with pass: assert correct proposition, scope, complete conditions, rule identity, and exclusion of tangential evidence.

- Saturday: additional mixed-only permission, same-player alternative, roster/court count, unrelated Saturday negative, parent 6.2.1 versus selected 6.2.2 identity.
- Websites: club/LMS/DUPR/membership distinct; label/value facts; no wrong URL from a broad paragraph; apostrophe and online variants.
- Rally: universal mechanisms first; Weekday/Saturday/PrimeTime/9.1/Picklebreaker/freeze scope; no universal 15/win-one; no standings points as rally points; incomplete continuation rejected or safely joined; conflicting official target scores surfaced.
- NVZ: equivalence, definition, line membership, non-volley standing, volley, momentum, adaptive controls; no default 11.A.2 or adaptive leakage.
- Apparel: singular/plural explicit objects, blouse standalone and validated/absent/expired receipt sequence, ambiguous color, no invented LWR team-color rule; tournament apparel qualification preserved.
- Document navigation: all specified document families, ambiguous rules/captain guide, active/searchable enforcement, retired/missing source, valid viewer anchor, no fabricated URL; mixed navigation/substantive question keeps its answer target; zero model for pure unambiguous navigation.
- Account help: longer setup sentence and short reset/sign-in controls; correct guide procedure; membership versus LMS distinction; no reset operation/account enumeration/token/password disclosure; narrow guard protection for account identity and no false block of documented score entry.
- Equipment: accepted ball controls, possessive pickleball, wrong/made-up candidate, two clauses, pronoun context, Weekday/Saturday scope, legal specs/damage/unrelated balls; no product alias and no user assertion treated as authority.
- Composition: all I/J/K/L controls; explicit Weekday 9.1 and PrimeTime simple questions first; pair aggregate versus individual ranges and whole roster; 4/6/12 fielded distinctions; roster recommendation versus requirement; no LWRCC lookup; ambiguous 9.1 clarifies; no heat recommendation invented; four-evidence cap and explicit partial-coverage behavior if approved.
- LMS-0721: full 525-test accepted baseline, Approved Answer local lifecycle and historical revisions, `.65`, warnings and supplement preservation, source binding/sibling citations, Existing Evidence Yes/Retest/explicit Resolve, typo assistance, New Question, medical follow-up, public-email privacy and Stage 7A/B payload/capture/feedback behavior. Do not reactivate retired scheduling knowledge to test this.
- Activation migration: historical nulls, first activation and exact actor/time, failure rollback, supersession retention, idempotent retry, concurrent activation serialization, effective role/RLS privileges and forbidden bypass, manager-local display, Unknown actor, no unintended existing-table privileges.

For implementation run `npm test`, `npm run lint`, `npx tsc --noEmit --incremental false`, `npm run verify:ai-pdf-server-bundle`, `npm run build`, and `git diff --check`. Distinguish the known post-compilation cache lock from compile failure and use the established isolated build if necessary. Production acceptance requires separate deployment authorization and a bounded approved sequence; this diagnosis did not deploy or run the full application build because application code was unchanged.

## Decision requested for the next pass

Recommend **LMS-0722 / 0.1.544**, only after approval, for shared simple-intent/applicability/scope/recall hardening and deterministic document navigation, plus independent prospective activation history if explicitly included. Resolve simple Weekday 9.1/PrimeTime failures before broader partial-answer semantics. Approve partial supported/unknown answers only with their authority, feedback, and telemetry contract settled. Keep competing supplements deferred but gated before overlapping Active use. Do not use managed knowledge to conceal these existing-source defects.

Outstanding design/owner decisions are the scope of partial-answer behavior, whether activation history is in the same implementation authorization, and the genuine PrimeTime/Picklebreaker source inconsistencies. No correction has been implemented. Stop for review.

## Diagnosis artifact validation

All three JSON artifacts parse successfully; 99 normal cases and five separately labeled concept-query probes are retained. `git diff --check` passed. The application tree has no tracked or untracked changes from this diagnosis, and `app/lib/version.js` remains LMS-0721. Temporary read-only diagnostic runners were removed. Existing pre-task LMS-0721 acceptance-document edits were preserved. This pass added the five LMS-0722 documentation/evidence artifacts and updated the roadmap only; no acceptance status was changed to LMS-0722.




## Approved implementation checkpoint

LMS-0722 / 0.1.544 is implemented and locally validated, not deployed. See the [implementation report](lms-0722-implementation-report.md) and [additional cross-league boundary diagnosis](lms-0722-cross-league-diagnosis.md). The original diagnosis above remains historical. Activation history is a required deliverable: authoritative prospective actor/time, atomic activation/supersession/history, no inferred backfill, Unknown for unrecorded current and historical activations, local-time manager display, protected actor identity and effective security tests. Production acceptance must retain the legitimate future activation gate or its explicit accepted limitation. The new mandatory basic counts and paired named-league format/Picklebreaker controls require Cross-League Leakage = 0. No production mutation occurred.
