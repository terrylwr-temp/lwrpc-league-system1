# LMS-0725 correction: local benchmark coverage

September 8, 2026. Version 0.1.547. **63/63 routing + selected-evidence validation tests pass; this is not 63 successful generated answers or production acceptance.**

The saved official-source snapshot is used with constant fixture scores. Every selected document source is passed through the real active-version/chunk/excerpt validator. This is not a semantic retrieval or provider replay. 44 cases have selected sources, 10 take Live routes, 6 are protected, and 3 have no selected sources in this fixture. Q48 requires scoring-method clarification. Q29 and Q46 need actual retrieval/generation verification before a full answer-quality pass can be claimed.

| Case | Question | Route | Source containers | Source validation |
|---|---|---|---:|---|
| Q01 | Who is on my roster? | LIVE | 0 | No document path |
| Q02 | Show me my roster. | LIVE | 0 | No document path |
| Q03 | How many players are currently on my roster? | LIVE | 0 | No document path |
| Q04 | Who is on the Artisan Lakes roster? | LIVE | 0 | No document path |
| Q05 | Show the Artisan Lakes roster. | LIVE | 0 | No document path |
| Q06 | Which players are on our roster? | LIVE | 0 | No document path |
| Q07 | What date can I start entering my roster for weekday league | DOCUMENT | 2 | PASS |
| Q08 | when can I start entering my players for my team | DOCUMENT | 4 | PASS |
| Q09 | When can I start entering my roster? | DOCUMENT | 4 | PASS |
| Q10 | What date can I start entering my roster for weekday league? | DOCUMENT | 2 | PASS |
| Q11 | When can I add players? | DOCUMENT | 4 | PASS |
| Q12 | When does roster entry open? | DOCUMENT | 4 | PASS |
| Q13 | When can I start entering my PrimeTime players? | DOCUMENT | 2 | PASS |
| Q14 | When can I start entering my Saturday roster? | DOCUMENT | 2 | PASS |
| Q15 | When may I begin entering team players? | DOCUMENT | 4 | PASS |
| Q16 | When can I build my roster? | DOCUMENT | 4 | PASS |
| Q17 | When can I fill my roster? | DOCUMENT | 4 | PASS |
| Q18 | When can I start my roster? | DOCUMENT | 4 | PASS |
| Q19 | Can I add players to my roster yet? | DOCUMENT | 4 | PASS |
| Q20 | When do we begin adding players to our team? | DOCUMENT | 4 | PASS |
| Q21 | What date does player entry open for Weekday? | DOCUMENT | 2 | PASS |
| Q22 | When can I start entering my rosterr for weekdy league? | DOCUMENT | 2 | PASS |
| Q23 | when can i add plyers to my team | DOCUMENT | 4 | PASS |
| Q24 | When can I enter players in the match lineup? | DOCUMENT | 1 | PASS |
| Q25 | How do I enter players on my roster? | DOCUMENT | 2 | PASS |
| Q26 | How do I add a player to my roster? | DOCUMENT | 2 | PASS |
| Q27 | How can I update my roster? | DOCUMENT | 2 | PASS |
| Q28 | Where do I go to build my team roster? | DOCUMENT | 2 | PASS |
| Q29 | How do I enter match scores? | DOCUMENT | 0 | Pending actual retrieval/generation |
| Q30 | Does the weekday dupr league use rally scoring | DOCUMENT | 3 | PASS |
| Q31 | Does the Weekday DUPR League use Rally Scoring? | DOCUMENT | 3 | PASS |
| Q32 | What scoring method does the Weekday League use? | DOCUMENT | 3 | PASS |
| Q33 | Do regular Weekday games use Rally Scoring? | DOCUMENT | 3 | PASS |
| Q34 | Does Weekday 9.1 use Rally Scoring? | DOCUMENT | 3 | PASS |
| Q35 | Does the Weekday 9.1 Picklebreaker use Rally Scoring? | DOCUMENT | 3 | PASS |
| Q36 | Is Weekday all rally? | DOCUMENT | 3 | PASS |
| Q37 | Does the weekdy league use raly scoring? | DOCUMENT | 3 | PASS |
| Q38 | Does Saturday use Rally Scoring? | DOCUMENT | 4 | PASS |
| Q39 | Do regular Saturday games use Rally Scoring? | DOCUMENT | 4 | PASS |
| Q40 | Does the Saturday Picklebreaker use Rally Scoring? | DOCUMENT | 4 | PASS |
| Q41 | Does PrimeTime use Rally Scoring? | DOCUMENT | 4 | PASS |
| Q42 | Do regular PrimeTime games use Rally Scoring? | DOCUMENT | 4 | PASS |
| Q43 | Does the PrimeTime Picklebreaker use Rally Scoring? | DOCUMENT | 4 | PASS |
| Q44 | Does Weekday 8.1 use Rally Scoring? | DOCUMENT | 2 | PASS |
| Q45 | How does Rally Scoring work? | DOCUMENT | 1 | PASS |
| Q46 | How does Rally Scoring work in a Picklebreaker? | DOCUMENT | 0 | Pending actual retrieval/generation |
| Q47 | Do I have to be serving to win with Rally Scoring? | DOCUMENT | 1 | PASS |
| Q48 | What happens at 24 all in a game to 25 by 2? | DOCUMENT | 0 | Expected clarification |
| Q49 | When do scores freeze again? | DOCUMENT | 1 | PASS |
| Q50 | What's my DUPR | LIVE | 0 | No document path |
| Q51 | What is my Season DUPR? | LIVE | 0 | No document path |
| Q52 | What is my PrimeTime Season DUPR? | LIVE | 0 | No document path |
| Q53 | What is my current official DUPR? | LIVE | 0 | No document path |
| Q54 | When is Season DUPR established? | DOCUMENT | 2 | PASS |
| Q55 | When is my Season DUPR established? | DOCUMENT | 2 | PASS |
| Q56 | How is my Season DUPR calculated? | DOCUMENT | 2 | PASS |
| Q57 | When are Season DUPR ratings recorded for Saturday? | DOCUMENT | 1 | PASS |
| Q58 | Export all player emails | PROTECTED | 0 | No document path |
| Q59 | What is my password? | PROTECTED | 0 | No document path |
| Q60 | Did I save my lineup? | PROTECTED | 0 | No document path |
| Q61 | Am I currently eligible for this team? | PROTECTED | 0 | No document path |
| Q62 | Show my rating and tell me if I am eligible | PROTECTED | 0 | No document path |
| Q63 | What is my roster and when can I add players? | PROTECTED | 0 | No document path |
