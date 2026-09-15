# LMS-0725 complete routing result matrix

Local implementation: **63/63 match, 0 routing mismatches**, compared with 18 diagnosis mismatches. Route results are classifier/guard results, not production-generated answer quality. DOCUMENT can subsequently require a bounded clarification; PROTECTED is a deliberate unsupported/privacy guard. Current official DUPR remains explicitly unavailable on the deterministic Live path.

| ID | Exact question | Expected | Actual | Scope | Result |
|---|---|---|---|---|---|
| Q01 | Who is on my roster? | LIVE | LIVE | unspecified | PASS |
| Q02 | Show me my roster. | LIVE | LIVE | unspecified | PASS |
| Q03 | How many players are currently on my roster? | LIVE | LIVE | unspecified | PASS |
| Q04 | Who is on the Artisan Lakes roster? | LIVE | LIVE | unspecified | PASS |
| Q05 | Show the Artisan Lakes roster. | LIVE | LIVE | unspecified | PASS |
| Q06 | Which players are on our roster? | LIVE | LIVE | unspecified | PASS |
| Q07 | What date can I start entering my roster for weekday league | DOCUMENT | DOCUMENT | Weekday | PASS |
| Q08 | when can I start entering my players for my team | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q09 | When can I start entering my roster? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q10 | What date can I start entering my roster for weekday league? | DOCUMENT | DOCUMENT | Weekday | PASS |
| Q11 | When can I add players? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q12 | When does roster entry open? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q13 | When can I start entering my PrimeTime players? | DOCUMENT | DOCUMENT | PrimeTime | PASS |
| Q14 | When can I start entering my Saturday roster? | DOCUMENT | DOCUMENT | Saturday | PASS |
| Q15 | When may I begin entering team players? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q16 | When can I build my roster? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q17 | When can I fill my roster? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q18 | When can I start my roster? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q19 | Can I add players to my roster yet? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q20 | When do we begin adding players to our team? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q21 | What date does player entry open for Weekday? | DOCUMENT | DOCUMENT | Weekday | PASS |
| Q22 | When can I start entering my rosterr for weekdy league? | DOCUMENT | DOCUMENT | Weekday | PASS |
| Q23 | when can i add plyers to my team | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q24 | When can I enter players in the match lineup? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q25 | How do I enter players on my roster? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q26 | How do I add a player to my roster? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q27 | How can I update my roster? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q28 | Where do I go to build my team roster? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q29 | How do I enter match scores? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q30 | Does the weekday dupr league use rally scoring | DOCUMENT | DOCUMENT | Weekday | PASS |
| Q31 | Does the Weekday DUPR League use Rally Scoring? | DOCUMENT | DOCUMENT | Weekday | PASS |
| Q32 | What scoring method does the Weekday League use? | DOCUMENT | DOCUMENT | Weekday | PASS |
| Q33 | Do regular Weekday games use Rally Scoring? | DOCUMENT | DOCUMENT | Weekday | PASS |
| Q34 | Does Weekday 9.1 use Rally Scoring? | DOCUMENT | DOCUMENT | Weekday | PASS |
| Q35 | Does the Weekday 9.1 Picklebreaker use Rally Scoring? | DOCUMENT | DOCUMENT | Weekday | PASS |
| Q36 | Is Weekday all rally? | DOCUMENT | DOCUMENT | Weekday | PASS |
| Q37 | Does the weekdy league use raly scoring? | DOCUMENT | DOCUMENT | Weekday | PASS |
| Q38 | Does Saturday use Rally Scoring? | DOCUMENT | DOCUMENT | Saturday | PASS |
| Q39 | Do regular Saturday games use Rally Scoring? | DOCUMENT | DOCUMENT | Saturday | PASS |
| Q40 | Does the Saturday Picklebreaker use Rally Scoring? | DOCUMENT | DOCUMENT | Saturday | PASS |
| Q41 | Does PrimeTime use Rally Scoring? | DOCUMENT | DOCUMENT | PrimeTime | PASS |
| Q42 | Do regular PrimeTime games use Rally Scoring? | DOCUMENT | DOCUMENT | PrimeTime | PASS |
| Q43 | Does the PrimeTime Picklebreaker use Rally Scoring? | DOCUMENT | DOCUMENT | PrimeTime | PASS |
| Q44 | Does Weekday 8.1 use Rally Scoring? | DOCUMENT | DOCUMENT | Weekday | PASS |
| Q45 | How does Rally Scoring work? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q46 | How does Rally Scoring work in a Picklebreaker? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q47 | Do I have to be serving to win with Rally Scoring? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q48 | What happens at 24 all in a game to 25 by 2? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q49 | When do scores freeze again? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q50 | What's my DUPR | LIVE | LIVE | unspecified | PASS |
| Q51 | What is my Season DUPR? | LIVE | LIVE | unspecified | PASS |
| Q52 | What is my PrimeTime Season DUPR? | LIVE | LIVE | PrimeTime | PASS |
| Q53 | What is my current official DUPR? | LIVE | LIVE | unspecified | PASS |
| Q54 | When is Season DUPR established? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q55 | When is my Season DUPR established? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q56 | How is my Season DUPR calculated? | DOCUMENT | DOCUMENT | unspecified | PASS |
| Q57 | When are Season DUPR ratings recorded for Saturday? | DOCUMENT | DOCUMENT | Saturday | PASS |
| Q58 | Export all player emails | PROTECTED | PROTECTED | unspecified | PASS |
| Q59 | What is my password? | PROTECTED | PROTECTED | unspecified | PASS |
| Q60 | Did I save my lineup? | PROTECTED | PROTECTED | unspecified | PASS |
| Q61 | Am I currently eligible for this team? | PROTECTED | PROTECTED | unspecified | PASS |
| Q62 | Show my rating and tell me if I am eligible | PROTECTED | PROTECTED | unspecified | PASS |
| Q63 | What is my roster and when can I add players? | PROTECTED | PROTECTED | unspecified | PASS |

Q48 (24-all without a scoring method) asks Standard/Rally; Q49 (freeze again without a valid referent) asks for the full question. Both stay on the document conversation path. The matching route is not a claim that an ambiguous question is answered without clarification.

[Machine-readable results and measured timing](lms-0725-implementation-benchmark.json).
