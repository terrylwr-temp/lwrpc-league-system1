## Status — September 9, 2026

**COMPLETED — LMS-0727 / 0.1.549 PRODUCTION ACCEPTED.** Both original failures and all seven targeted production cases pass using current Rule 3.5/page 2, with exact source classification and conditional personal-fact handling. Normal Commissioner/owner Captain and minimal View-As checks pass; business/security fingerprints unchanged. See [final acceptance](lms-0727-production-acceptance.md) and [local review](lms-0727-cross-community-review.md). The original deferral instructions below are historical; permanent policy/security/cost controls remain applicable.

# POST-LMS-0726 MUST-FIX — Ask LWR Cross-Community Eligibility Intent/Retrieval

Recorded September 9, 2026 by explicit owner direction. Mandatory future correction after LMS-0726; do not interrupt or expand current rescoped View-As work. No implementation, production changes or OpenAI calls now. No release number assigned.

## Observed production defect

Owner reports that “Can I play on a team in a different community?” and “Can I play in a different community?” incorrectly return insufficient official evidence.

## Governing policy and required future behavior

The owner identifies the current League Rules as permitting players to form/play on teams with members from other communities, subject to this restriction: a player may not play for another community's team if their own community already has a team in that division AND that team has availability for additional players. This records the owner's policy description, not a verified verbatim quotation. At implementation, retrieve and use the exact wording/provision from the current active Rules.

Generic policy questions must receive the useful official rule. Personal wording must also immediately explain that rule, rather than return insufficient evidence when the Rules contain it. Never simplify the policy to an unconditional same-community requirement.

A definitive personal Yes/No may require the player's community, requested division, whether their own community has a team in that division, and whether that team has availability. Use only authorized, current facts actually available. Do not invent facts or retrieve unnecessary personal data merely because a question uses “I.” If facts are unavailable, answer the policy portion and explain what determines personal eligibility. Lack of personal facts must not suppress the supported policy answer.

## Permanent acceptance controls

- Can I play on a team in a different community?
- Can I play in a different community?
- Can I play for another community?
- Can I join another community's team?
- Can players from different communities be on the same team?
- Do I have to play for my own community?
- Can I play for another community if mine has a team?
- What if my community's team is full?
- Can players play on teams in other communities?

Preserve the conjunction: own-community team existence alone is insufficient; availability also matters. Test missing personal facts, team existence with unknown availability, and full-team wording without inventing a personal conclusion.

| Actual evidence used | Required classification |
|---|---|
| Official policy only, including policy answers to personal wording | OFFICIAL RULES |
| Official policy plus authorized/current Live LMS facts actually used | LIVE LMS + OFFICIAL RULES |

Preserve Cross-League Leakage = 0, Cross-Division Leakage = 0, exact-evidence requirements, personal-data/model boundary, and [API cost policy](api-cost-policy.md). Any View-As personal facts remain effective-user scoped. Use deterministic intent/routing/evidence/classification controls first; affected generation cases only where needed. No large model benchmark without explicit authorization.

## Scope and sequencing

LMS-0726 / 0.1.548 remains active. This item does not alter its implementation, migration or acceptance requirements. Preserve the separate mandatory normal-LMS security-hardening item; this entry does not reorder it or authorize either future implementation.
