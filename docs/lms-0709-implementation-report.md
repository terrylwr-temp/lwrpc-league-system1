# LMS-0709 implementation report — USAP NVZ terminology and direct applicability

## Scope

LMS-0709 is a bounded retrieval and Stage 4 evidence-selection correction. It does not alter the active 2026 USA Pickleball Official Rulebook, its 666 chunks, rule IDs, searchable flags, embeddings, document metadata, or activation state. Stage 6 remains paused.

## Implementation

- Stage 3 preserves each player's original query and vector embedding. In an appropriate pickleball-rule context, the RPC adds a parallel FTS signal for `nvz | (non & volley & zone)` and makes official non-volley-zone chunks eligible for recall. It does not replace `kitchen` with another term and does not choose a rule.
- The bridge activates only when the query mentions `kitchen`, `NVZ`, or `non-volley zone` and also has a bounded playing-rule signal (`volley`, `serve`, `court`, `fault`, `step`, `momentum`, `paddle`, `ball`, or `play`), with a limited definition-question allowance for explicit NVZ/non-volley-zone wording. Ordinary kitchen questions do not activate it.
- Stage 4 canonicalizes `non-\nvolley zone` and `non- volley zone` to `nvz` for matching only. Stored chunk text and citations remain untouched.
- Stage 4 classifies the player question and the stored USAP operative language by scope, without rule-number routing:
  - a general NVZ volley question selects language stating that all volleys must begin outside the zone (Rule 11.A in the active rulebook);
  - a post-volley contact/momentum question selects language about momentum after a volley (Rule 11.A.2);
  - a before-fully-exiting question selects the exit condition (Rule 11.A.3);
  - a definition/dimensions question selects definition language (Rule 3.A.4.c).
- Standard-player questions do not retain the separate wheelchair or assistive-device variants; those remain eligible only when the question supplies adaptive-play context.
- The player-facing subtitle now says: `Get answers from official LWR PC information and USAP Rules`.

## Regression coverage

The LMS-0709 fixture uses representative full stored Rule 11 and 3.A.4.c text with production-style ranking. It verifies:

1. kitchen, NVZ, and non-volley-zone general volley questions select 11.A;
2. the production-shaped non-volley-zone case still selects 11.A when it appears only in the 12-candidate authority-review window;
3. post-volley step/contact selects 11.A.2;
4. a genuine before-fully-exiting scenario selects 11.A.3;
5. a definition question selects 3.A.4.c;
6. ordinary kitchen questions do not enable an NVZ alias;
7. generic questions do not retain contact-while-volleying or adaptive-play variants as extra USAP evidence;
8. LMS-0708 medical controls and LMS-0705 compound-selection controls remain in the suite.

## Required production order

1. Deploy the LMS-0709 application.
2. If not already installed, run `lwrpc-admin/supabase-ai-assistant-lms-0708-medical-authority-review.sql`.
3. Run `lwrpc-admin/supabase-ai-assistant-lms-0709-usap-nvz-terminology.sql` once. It reads the deployed RPC, verifies the LMS-0708 matcher and expected structure, and changes only that function definition.
4. Do not upload, reprocess, activate, or otherwise alter the active USAP version.
5. Re-run against the active corpus: the four kitchen/NVZ questions, a true Rule 11.A.3 exit scenario, `What is the non-volley zone?`, both medical controls, and the LMS-0705 compound control.
6. Review selected GPT evidence and Official Sources. LMS-0709 is not production accepted until those live checks pass. Stage 6 stays paused.
