# LMS-0725 authorized model benchmark — case matrix

**All 63 routes checked. 42 actual model calls. This is not a 63/63 generated-answer quality pass.** Raw answers, source references and passage hashes are in `lms-0725-authorized-model-results.json`; no complete request payload was logged.

| Case | Question | Calls | Outcome / review |
|---|---|---:|---|
| Q01 | Who is on my roster? | 0 | Live/protected route boundary; no model |
| Q02 | Show me my roster. | 0 | Live/protected route boundary; no model |
| Q03 | How many players are currently on my roster? | 0 | Live/protected route boundary; no model |
| Q04 | Who is on the Artisan Lakes roster? | 0 | Live/protected route boundary; no model |
| Q05 | Show the Artisan Lakes roster. | 0 | Live/protected route boundary; no model |
| Q06 | Which players are on our roster? | 0 | Live/protected route boundary; no model |
| Q07 | What date can I start entering my roster for weekday league | 1 | Correct month/day and 2026 citation; answer prose omits the required explicit year. |
| Q08 | when can I start entering my players for my team | 1 | Generated answer/source review passes |
| Q09 | When can I start entering my roster? | 1 | Correct month/day and 2026 citation; answer prose omits the required explicit year. |
| Q10 | What date can I start entering my roster for weekday league? | 1 | Correct month/day and 2026 citation; answer prose omits the required explicit year. |
| Q11 | When can I add players? | 0 | Clarifies player-entry object instead of producing the requested roster-date variant; review intent behavior. |
| Q12 | When does roster entry open? | 1 | Correct month/day and 2026 citation; answer prose omits the required explicit year. |
| Q13 | When can I start entering my PrimeTime players? | 1 | Correct month/day and 2026 citation; answer prose omits the required explicit year. |
| Q14 | When can I start entering my Saturday roster? | 1 | Correct month/day and 2026 citation; answer prose omits the required explicit year. |
| Q15 | When may I begin entering team players? | 1 | Generated answer/source review passes |
| Q16 | When can I build my roster? | 1 | Generated answer/source review passes |
| Q17 | When can I fill my roster? | 1 | Correct month/day and 2026 citation; answer prose omits the required explicit year. |
| Q18 | When can I start my roster? | 1 | Correct month/day and 2026 citation; answer prose omits the required explicit year. |
| Q19 | Can I add players to my roster yet? | 1 | Generated answer/source review passes |
| Q20 | When do we begin adding players to our team? | 1 | Generated answer/source review passes |
| Q21 | What date does player entry open for Weekday? | 1 | Correct month/day and 2026 citation; answer prose omits the required explicit year. |
| Q22 | When can I start entering my rosterr for weekdy league? | 1 | Generated answer/source review passes |
| Q23 | when can i add plyers to my team | 1 | Generated answer/source review passes |
| Q24 | When can I enter players in the match lineup? | 1 | Generated answer/source review passes |
| Q25 | How do I enter players on my roster? | 1 | Generated answer/source review passes |
| Q26 | How do I add a player to my roster? | 1 | Generated answer/source review passes |
| Q27 | How can I update my roster? | 1 | Generated answer/source review passes |
| Q28 | Where do I go to build my team roster? | 1 | Generated answer/source review passes |
| Q29 | How do I enter match scores? | 0 | No selected evidence in saved snapshot; no model call. Saved guide pages do not include a full score-entry procedure. |
| Q30 | Does the weekday dupr league use rally scoring | 1 | Generated answer/source review passes |
| Q31 | Does the Weekday DUPR League use Rally Scoring? | 1 | Generated answer/source review passes |
| Q32 | What scoring method does the Weekday League use? | 1 | Generated answer/source review passes |
| Q33 | Do regular Weekday games use Rally Scoring? | 1 | Generated answer/source review passes |
| Q34 | Does Weekday 9.1 use Rally Scoring? | 1 | Generated answer/source review passes |
| Q35 | Does the Weekday 9.1 Picklebreaker use Rally Scoring? | 1 | Generated answer/source review passes |
| Q36 | Is Weekday all rally? | 1 | Generated answer/source review passes |
| Q37 | Does the weekdy league use raly scoring? | 1 | Generated answer/source review passes |
| Q38 | Does Saturday use Rally Scoring? | 1 | Generated answer/source review passes |
| Q39 | Do regular Saturday games use Rally Scoring? | 1 | Generated answer/source review passes |
| Q40 | Does the Saturday Picklebreaker use Rally Scoring? | 1 | Generated answer/source review passes |
| Q41 | Does PrimeTime use Rally Scoring? | 1 | Generated answer/source review passes |
| Q42 | Do regular PrimeTime games use Rally Scoring? | 1 | Generated answer/source review passes |
| Q43 | Does the PrimeTime Picklebreaker use Rally Scoring? | 1 | Generated answer/source review passes |
| Q44 | Does Weekday 8.1 use Rally Scoring? | 1 | Generated answer/source review passes |
| Q45 | How does Rally Scoring work? | 1 | Generated answer/source review passes |
| Q46 | How does Rally Scoring work in a Picklebreaker? | 0 | No selected evidence; no model call. Unscoped Picklebreaker mechanics do not pass the existing scoped selector. |
| Q47 | Do I have to be serving to win with Rally Scoring? | 1 | Generated answer/source review passes |
| Q48 | What happens at 24 all in a game to 25 by 2? | 0 | Expected scoring clarification; no model |
| Q49 | When do scores freeze again? | 0 | Expected scoring clarification; no model |
| Q50 | What's my DUPR | 0 | Live/protected route boundary; no model |
| Q51 | What is my Season DUPR? | 0 | Live/protected route boundary; no model |
| Q52 | What is my PrimeTime Season DUPR? | 0 | Live/protected route boundary; no model |
| Q53 | What is my current official DUPR? | 0 | Live/protected route boundary; no model |
| Q54 | When is Season DUPR established? | 1 | Model explicitly says selected evidence does not establish timing; grounded-answer coverage gap. |
| Q55 | When is my Season DUPR established? | 1 | Answers conditional rating assignment/use instead of WHEN the rating is established; intent/completeness failure. |
| Q56 | How is my Season DUPR calculated? | 1 | Only NR and multi-division special cases selected; general Season DUPR calculation is not established. |
| Q57 | When are Season DUPR ratings recorded for Saturday? | 1 | Legacy synthetic heading + nonadjacent bullet passed existing validator; strict exact-source audit FAIL. Model prose also omits year. |
| Q58 | Export all player emails | 0 | Live/protected route boundary; no model |
| Q59 | What is my password? | 0 | Live/protected route boundary; no model |
| Q60 | Did I save my lineup? | 0 | Live/protected route boundary; no model |
| Q61 | Am I currently eligible for this team? | 0 | Live/protected route boundary; no model |
| Q62 | Show my rating and tell me if I am eligible | 0 | Live/protected route boundary; no model |
| Q63 | What is my roster and when can I add players? | 0 | Live/protected route boundary; no model |
