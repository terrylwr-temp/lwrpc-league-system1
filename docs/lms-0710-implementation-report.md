# LMS-0710 implementation report — bounded Stage 4 applicability corrections

## Scope

LMS-0710 corrects two independent Stage 4 natural-language applicability gaps found during LMS-0709 production acceptance. It does not modify Stage 3 weights, thresholds, candidate limits, authority rank, retrieval RPC, the active USAP document/version, chunks, embeddings, metadata, or processing. No production action has been taken. Stage 6 remains paused.

## Production diagnosis

### Rule 11.A.3 exit/re-establishment question

For `I stepped into the kitchen, stepped back out, and then volleyed the ball before both feet were completely outside. Is that a fault?`, active production retrieval ranked stored USAP Rule 11.A.3 first at `.6898` (semantic `.6049`, keyword `.8064`, exact `.85`). It cleared `.350`, appeared in the returned eight and 12-candidate authority-review window, but Stage 4 selected nothing.

The query was preserved for embedding and retrieval, and the installed LMS-0709 additive alias was active. The failure was Stage 4 only: past-tense `volleyed`, `stepped`, and `stepped back out` did not enter the bounded NVZ scope canonicalization, so strict direct matching rejected the otherwise complete Rule 11.A.3 chunk.

### Server foot-over-court question

For `Can I serve with one foot over the court but not touching it?`, stored USAP Rule 7.A.2 ranked first at `.5224`; 7.A.2.a ranked tenth at `.4445`; both were inside the returned set and authority-review window. Rule 7.A.2 is the governing stored provision: neither server foot may be in contact with the court when the serve is hit.

LWR Rule 5.8 ranked eleventh at `.4390`. It was not directly classified as governing. Because the strict matcher did not recognize the natural-language `over ... not touching` distinction in Rule 7.A.2, no USAP direct evidence was found and Stage 4's existing local-only fallback selected the remaining LWR candidate. LMS-0710 fixes USAP applicability, rather than changing LWR Rule 5.8, authority rank, or fallback precedence.

## Implementation

- Bounded NVZ canonicalization now recognizes past-tense contact/exit language (`stepped into`, `stepped back out`, `left/leaving the kitchen`) and `volleyed`. Rule 11.A.3 applies where the question conveys an incomplete exit/re-establishment plus a subsequent volley. A fully completed exit before volley is evaluated against the same Rule 11.A.3 condition, without being treated as the prohibited condition.
- A separate bounded serving-foot scope recognizes a serve, foot, and court/playing-surface question that distinguishes non-contact/over-the-court from actual contact. It selects the stored outside-court provision for the former and the stored foot-contact fault provision for the latter. Wheelchair/assistive-device text remains separate.
- The answer-generation instruction now requires the direct affirmative or negative outcome first when the supplied evidence clearly permits or prohibits the described conduct. It is general instruction, not a question-specific response string.

## Regression coverage

The suite verifies the exact production questions, a shorter Rule 11.A.3 wording, a completed-exit negative control, serving-foot natural variants, a contact-vs-over distinction, and a genuine coaching/court-access question that retains LWR Rule 5.8. Existing LMS-0709, LMS-0708 medical, and LMS-0705 compound controls remain covered.

## Production order

1. Deploy the LMS-0710 application only. No SQL migration is required.
2. Do not reprocess, upload, or activate any USAP document/version.
3. Re-run both failed production questions, the shorter and completed-exit Rule 11.A.3 controls, the serving-foot variations, the general NVZ controls, medical Rule 5.7, the LMS-0705 compound control, and the Rule 5.8 coaching control.
4. Confirm final selected GPT evidence and Official Sources before accepting LMS-0710. Stage 6 remains paused.
