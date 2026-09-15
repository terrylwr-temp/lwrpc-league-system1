# Ask LWR help label

Owner requested and authorized implementation, testing and deployment of the label-only change: `? What can I ask?` becomes `What can I ask?`.

Only `app/components/AskLwrWelcome.js` changes relative to the deployed PBCC correction. Component SHA-256: `3f7480f132fb368f5abf2a740f42093974c8d556f203d0cce645980d71f7fa73`. [Exact package manifest](ask-help-label-production-manifest.json). All other application files preserved. No SQL, data changes, API changes, or model calls. Help behavior and accessibility handlers unchanged.

Local lint PASS (zero errors, 11 existing warnings), build PASS, diff check PASS. Production build PASS; deployment `dpl_EipkEDCWmWtEdggT87caEyc39pfH` READY at `lwrpc-admin-hri2tsqoa-terry-lwrpc.vercel.app`. Normal Commissioner dashboard loads. Production Ask LWR displays exactly `What can I ask?`; old leading-question-mark label absent. Help opens, accessible Close works, and focus returns to the triggering button. No questions submitted, SQL executed, or production data changed. Version label remains LMS-0730. Previous PBCC deployment retained for rollback; not needed.
