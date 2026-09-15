# LMS-0725 final benchmark matrix

Final local official-snapshot run: 63/63 routes, 45/45 generated answers reviewed, 18 zero-model cases. Exact version/chunk/ranges and citation items are in [raw results](lms-0725-final-full-model-results.json). This is not a production HTTP replay.

| Case | Question | Result | Source containers / exact items | Review |
|---|---|---|---|---|
| Q01 | Who is on my roster? | PASS (deterministic_no_model) | 0 / 0 | Deterministic route; no model or embeddings; no Live data fetched. |
| Q02 | Show me my roster. | PASS (deterministic_no_model) | 0 / 0 | Deterministic route; no model or embeddings; no Live data fetched. |
| Q03 | How many players are currently on my roster? | PASS (deterministic_no_model) | 0 / 0 | Deterministic route; no model or embeddings; no Live data fetched. |
| Q04 | Who is on the Artisan Lakes roster? | PASS (deterministic_no_model) | 0 / 0 | Deterministic route; no model or embeddings; no Live data fetched. |
| Q05 | Show the Artisan Lakes roster. | PASS (deterministic_no_model) | 0 / 0 | Deterministic route; no model or embeddings; no Live data fetched. |
| Q06 | Which players are on our roster? | PASS (deterministic_no_model) | 0 / 0 | Deterministic route; no model or embeddings; no Live data fetched. |
| Q07 | What date can I start entering my roster for weekday league | PASS (generated) | 2 / 2 | 2026 / Sept 28, applicable league(s), unlock and notification preserved; no team-state assertion. |
| Q08 | when can I start entering my players for my team | PASS (generated) | 4 / 4 | 2026 / Sept 28, applicable league(s), unlock and notification preserved; no team-state assertion. |
| Q09 | When can I start entering my roster? | PASS (generated) | 4 / 4 | 2026 / Sept 28, applicable league(s), unlock and notification preserved; no team-state assertion. |
| Q10 | What date can I start entering my roster for weekday league? | PASS (generated) | 2 / 2 | 2026 / Sept 28, applicable league(s), unlock and notification preserved; no team-state assertion. |
| Q11 | When can I add players? | PASS (generated) | 4 / 4 | 2026 / Sept 28, applicable league(s), unlock and notification preserved; no team-state assertion. |
| Q12 | When does roster entry open? | PASS (generated) | 4 / 4 | 2026 / Sept 28, applicable league(s), unlock and notification preserved; no team-state assertion. |
| Q13 | When can I start entering my PrimeTime players? | PASS (generated) | 2 / 2 | 2026 / Sept 28, applicable league(s), unlock and notification preserved; no team-state assertion. |
| Q14 | When can I start entering my Saturday roster? | PASS (generated) | 2 / 2 | 2026 / Sept 28, applicable league(s), unlock and notification preserved; no team-state assertion. |
| Q15 | When may I begin entering team players? | PASS (generated) | 4 / 4 | 2026 / Sept 28, applicable league(s), unlock and notification preserved; no team-state assertion. |
| Q16 | When can I build my roster? | PASS (generated) | 4 / 4 | 2026 / Sept 28, applicable league(s), unlock and notification preserved; no team-state assertion. |
| Q17 | When can I fill my roster? | PASS (generated) | 4 / 4 | 2026 / Sept 28, applicable league(s), unlock and notification preserved; no team-state assertion. |
| Q18 | When can I start my roster? | PASS (generated) | 4 / 4 | 2026 / Sept 28, applicable league(s), unlock and notification preserved; no team-state assertion. |
| Q19 | Can I add players to my roster yet? | PASS (generated) | 4 / 4 | 2026 / Sept 28, applicable league(s), unlock and notification preserved; no team-state assertion. |
| Q20 | When do we begin adding players to our team? | PASS (generated) | 4 / 4 | 2026 / Sept 28, applicable league(s), unlock and notification preserved; no team-state assertion. |
| Q21 | What date does player entry open for Weekday? | PASS (generated) | 2 / 2 | 2026 / Sept 28, applicable league(s), unlock and notification preserved; no team-state assertion. |
| Q22 | When can I start entering my rosterr for weekdy league? | PASS (generated) | 2 / 2 | 2026 / Sept 28, applicable league(s), unlock and notification preserved; no team-state assertion. |
| Q23 | when can i add plyers to my team | PASS (generated) | 4 / 4 | 2026 / Sept 28, applicable league(s), unlock and notification preserved; no team-state assertion. |
| Q24 | When can I enter players in the match lineup? | PASS (generated) | 1 / 1 | Match Setup, three-day deadline and subsequent changes/notification. |
| Q25 | How do I enter players on my roster? | PASS (generated) | 4 / 12 | Manage Roster workflow and supported eligibility/missing-rating handling. |
| Q26 | How do I add a player to my roster? | PASS (generated) | 4 / 12 | Manage Roster workflow and supported eligibility/missing-rating handling. |
| Q27 | How can I update my roster? | PASS (generated) | 4 / 12 | Manage Roster workflow and supported eligibility/missing-rating handling. |
| Q28 | Where do I go to build my team roster? | PASS (generated) | 4 / 12 | Where-to-go question answered with Captain Tools / Manage Roster. |
| Q29 | How do I enter match scores? | PASS (generated) | 2 / 9 | Date availability, saved setup, Submit, eligibility blocks, cancellation, opposing verification and visiting-captain prompt/weekend requirement. |
| Q30 | Does the weekday dupr league use rally scoring | PASS (generated) | 3 / 3 | Standard default and 9.1-only Picklebreaker exception; 2-2, 15, win by two. |
| Q31 | Does the Weekday DUPR League use Rally Scoring? | PASS (generated) | 3 / 3 | Standard default and 9.1-only Picklebreaker exception; 2-2, 15, win by two. |
| Q32 | What scoring method does the Weekday League use? | PASS (generated) | 3 / 3 | Standard default and 9.1-only Picklebreaker exception; 2-2, 15, win by two. |
| Q33 | Do regular Weekday games use Rally Scoring? | PASS (generated) | 3 / 3 | Standard default and 9.1-only Picklebreaker exception; 2-2, 15, win by two. |
| Q34 | Does Weekday 9.1 use Rally Scoring? | PASS (generated) | 3 / 3 | Standard default and 9.1-only Picklebreaker exception; 2-2, 15, win by two. |
| Q35 | Does the Weekday 9.1 Picklebreaker use Rally Scoring? | PASS (generated) | 3 / 3 | Standard default and 9.1-only Picklebreaker exception; 2-2, 15, win by two. |
| Q36 | Is Weekday all rally? | PASS (generated) | 3 / 3 | Standard default and 9.1-only Picklebreaker exception; 2-2, 15, win by two. |
| Q37 | Does the weekdy league use raly scoring? | PASS (generated) | 3 / 3 | Standard default and 9.1-only Picklebreaker exception; 2-2, 15, win by two. |
| Q38 | Does Saturday use Rally Scoring? | PASS (generated) | 4 / 5 | Saturday Rally format; regular 15/win-by-one and relevant Picklebreaker 12-12/25/win-by-two. |
| Q39 | Do regular Saturday games use Rally Scoring? | PASS (generated) | 4 / 5 | Saturday Rally format; regular 15/win-by-one and relevant Picklebreaker 12-12/25/win-by-two. |
| Q40 | Does the Saturday Picklebreaker use Rally Scoring? | PASS (generated) | 4 / 5 | Saturday Rally format; regular 15/win-by-one and relevant Picklebreaker 12-12/25/win-by-two. |
| Q41 | Does PrimeTime use Rally Scoring? | PASS (generated) | 4 / 4 | PrimeTime Standard default and applicable Picklebreaker-only exception; 2-2, 15/win-by-two. |
| Q42 | Do regular PrimeTime games use Rally Scoring? | PASS (generated) | 4 / 4 | PrimeTime Standard default and applicable Picklebreaker-only exception; 2-2, 15/win-by-two. |
| Q43 | Does the PrimeTime Picklebreaker use Rally Scoring? | PASS (generated) | 4 / 4 | PrimeTime Standard default and applicable Picklebreaker-only exception; 2-2, 15/win-by-two. |
| Q44 | Does Weekday 8.1 use Rally Scoring? | PASS (generated) | 2 / 2 | Standard default; no import of the 9.1 exception into 8.1. |
| Q45 | How does Rally Scoring work? | PASS (generated) | 2 / 7 | Mechanics only: service/side/point rules, freeze/unfreeze and always serving for winning point. |
| Q46 | How does Rally Scoring work in a Picklebreaker? | PASS (generated) | 2 / 7 | Mechanics only: service/side/point rules, freeze/unfreeze and always serving for winning point. |
| Q47 | Do I have to be serving to win with Rally Scoring? | PASS (generated) | 2 / 7 | Winning point while serving retained. |
| Q48 | What happens at 24 all in a game to 25 by 2? | PASS (clarification_no_model) | 0 / 0 | Clarification retained; no policy guess or model call. |
| Q49 | When do scores freeze again? | PASS (clarification_no_model) | 0 / 0 | Clarification retained; no policy guess or model call. |
| Q50 | What's my DUPR | PASS (deterministic_no_model) | 0 / 0 | Deterministic route; no model or embeddings; no Live data fetched. |
| Q51 | What is my Season DUPR? | PASS (deterministic_no_model) | 0 / 0 | Deterministic route; no model or embeddings; no Live data fetched. |
| Q52 | What is my PrimeTime Season DUPR? | PASS (deterministic_no_model) | 0 / 0 | Deterministic route; no model or embeddings; no Live data fetched. |
| Q53 | What is my current official DUPR? | PASS (deterministic_no_model) | 0 / 0 | Deterministic route; no model or embeddings; no Live data fetched. |
| Q54 | When is Season DUPR established? | PASS (generated) | 4 / 4 | Communicated pre-first-match establishment; fixed season duration; Sept 27, 2026 recording date. |
| Q55 | When is my Season DUPR established? | PASS (generated) | 4 / 4 | Communicated pre-first-match establishment; fixed season duration; Sept 27, 2026 recording date. |
| Q56 | How is my Season DUPR calculated? | PASS (generated) | 3 / 6 | Truncation, reliability <29, NR aggregate minus 0.5, age fallback, highest adjusted across divisions. |
| Q57 | When are Season DUPR ratings recorded for Saturday? | PASS (generated) | 1 / 1 | Exact Saturday recording bullet, separate league binding, Sept 27, 2026. |
| Q58 | Export all player emails | PASS (deterministic_no_model) | 0 / 0 | Deterministic route; no model or embeddings; no Live data fetched. |
| Q59 | What is my password? | PASS (deterministic_no_model) | 0 / 0 | Deterministic route; no model or embeddings; no Live data fetched. |
| Q60 | Did I save my lineup? | PASS (deterministic_no_model) | 0 / 0 | Deterministic route; no model or embeddings; no Live data fetched. |
| Q61 | Am I currently eligible for this team? | PASS (deterministic_no_model) | 0 / 0 | Deterministic route; no model or embeddings; no Live data fetched. |
| Q62 | Show my rating and tell me if I am eligible | PASS (deterministic_no_model) | 0 / 0 | Deterministic route; no model or embeddings; no Live data fetched. |
| Q63 | What is my roster and when can I add players? | PASS (deterministic_no_model) | 0 / 0 | Deterministic route; no model or embeddings; no Live data fetched. |

## Generated answers and displayed source citations

### Q07 — What date can I start entering my roster for weekday league

For the 2026 Fall Weekday DUPR League, you can start updating/entering rosters on Monday, Sept. 28, 2026, once League Management has unlocked rosters and notified you they are available.

Official Sources:

- 2026 Fall League Important Dates — Weekday DUPR League Key Dates — Page 1 — chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`; 1 exact item(s).
- LWR Pickleball Club DUPR Captains Guide — HOW TO REGISTER YOUR TEAM (SIGNING UP YOUR TEAM) — Page 5 — chunk `a951f671-8566-4b6a-b630-8474e5b302e9`; 1 exact item(s).

### Q08 — when can I start entering my players for my team

For the 2026 Fall League, you can start updating rosters on Monday, Sept. 28, 2026, for Weekday, Saturday, and PrimeTime DUPR leagues.

You can begin adding/managing players once League Management has activated your team and then notifies you that rosters for your league have been unlocked.

Official Sources:

- 2026 Fall League Important Dates — Weekday DUPR League Key Dates — Page 1 — chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`; 1 exact item(s).
- 2026 Fall League Important Dates — Saturday DUPR League Key Dates — Page 1 — chunk `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`; 1 exact item(s).
- 2026 Fall League Important Dates — PrimeTime DUPR League Key Dates — Page 2 — chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`; 1 exact item(s).
- LWR Pickleball Club DUPR Captains Guide — HOW TO REGISTER YOUR TEAM (SIGNING UP YOUR TEAM) — Page 5 — chunk `a951f671-8566-4b6a-b630-8474e5b302e9`; 1 exact item(s).

### Q09 — When can I start entering my roster?

For the 2026 Fall League, rosters can start being updated on Monday, Sept. 28, 2026, for the Weekday, Saturday, and PrimeTime DUPR leagues.

You can begin adding/managing players once League Management has activated your team, assigned the captain/co-captain roles, and notified you that your league’s rosters have been unlocked.

Official Sources:

- 2026 Fall League Important Dates — Weekday DUPR League Key Dates — Page 1 — chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`; 1 exact item(s).
- 2026 Fall League Important Dates — Saturday DUPR League Key Dates — Page 1 — chunk `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`; 1 exact item(s).
- 2026 Fall League Important Dates — PrimeTime DUPR League Key Dates — Page 2 — chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`; 1 exact item(s).
- LWR Pickleball Club DUPR Captains Guide — HOW TO REGISTER YOUR TEAM (SIGNING UP YOUR TEAM) — Page 5 — chunk `a951f671-8566-4b6a-b630-8474e5b302e9`; 1 exact item(s).

### Q10 — What date can I start entering my roster for weekday league?

For the 2026 Fall Weekday DUPR League, you can start updating/entering rosters on Monday, Sept. 28, 2026.

You still need League Management to activate your team and notify you that rosters for your league have been unlocked before you can begin adding and managing players.

Official Sources:

- 2026 Fall League Important Dates — Weekday DUPR League Key Dates — Page 1 — chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`; 1 exact item(s).
- LWR Pickleball Club DUPR Captains Guide — HOW TO REGISTER YOUR TEAM (SIGNING UP YOUR TEAM) — Page 5 — chunk `a951f671-8566-4b6a-b630-8474e5b302e9`; 1 exact item(s).

### Q11 — When can I add players?

For the 2026 Fall League, Weekday DUPR, Saturday DUPR, and PrimeTime DUPR rosters can start being updated on Monday, Sept. 28, 2026.

You can begin adding/managing players after League Management activates the team, assigns the captain/co-captain(s), and notifies you that rosters for your league have been unlocked.

Official Sources:

- 2026 Fall League Important Dates — Weekday DUPR League Key Dates — Page 1 — chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`; 1 exact item(s).
- 2026 Fall League Important Dates — Saturday DUPR League Key Dates — Page 1 — chunk `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`; 1 exact item(s).
- 2026 Fall League Important Dates — PrimeTime DUPR League Key Dates — Page 2 — chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`; 1 exact item(s).
- LWR Pickleball Club DUPR Captains Guide — HOW TO REGISTER YOUR TEAM (SIGNING UP YOUR TEAM) — Page 5 — chunk `a951f671-8566-4b6a-b630-8474e5b302e9`; 1 exact item(s).

### Q12 — When does roster entry open?

For the 2026 Fall League, roster updating opens Monday, Sept. 28, 2026, for Weekday DUPR, Saturday DUPR, and PrimeTime DUPR leagues.

Roster access is also conditional: League Management must activate the team and assign the Captain/Co-Captain(s), and League Management will notify you when rosters for your league have been unlocked and are available to add/manage players.

Official Sources:

- 2026 Fall League Important Dates — Weekday DUPR League Key Dates — Page 1 — chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`; 1 exact item(s).
- 2026 Fall League Important Dates — Saturday DUPR League Key Dates — Page 1 — chunk `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`; 1 exact item(s).
- 2026 Fall League Important Dates — PrimeTime DUPR League Key Dates — Page 2 — chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`; 1 exact item(s).
- LWR Pickleball Club DUPR Captains Guide — HOW TO REGISTER YOUR TEAM (SIGNING UP YOUR TEAM) — Page 5 — chunk `a951f671-8566-4b6a-b630-8474e5b302e9`; 1 exact item(s).

### Q13 — When can I start entering my PrimeTime players?

For the 2026 Fall PrimeTime DUPR League, you can start updating rosters on Monday, Sept. 28, 2026.

You can begin adding/managing players after League Management has activated your team, assigned the Captain/Co-Captain roles, and notified you that rosters for your league have been unlocked.

Official Sources:

- 2026 Fall League Important Dates — PrimeTime DUPR League Key Dates — Page 2 — chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`; 1 exact item(s).
- LWR Pickleball Club DUPR Captains Guide — HOW TO REGISTER YOUR TEAM (SIGNING UP YOUR TEAM) — Page 5 — chunk `a951f671-8566-4b6a-b630-8474e5b302e9`; 1 exact item(s).

### Q14 — When can I start entering my Saturday roster?

For the 2026 Fall Saturday DUPR League, you can start updating rosters on Monday, Sept. 28, 2026.

You also need to wait until League Management has activated your team and notifies you that rosters for your league are unlocked and available for adding/managing players.

Official Sources:

- 2026 Fall League Important Dates — Saturday DUPR League Key Dates — Page 1 — chunk `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`; 1 exact item(s).
- LWR Pickleball Club DUPR Captains Guide — HOW TO REGISTER YOUR TEAM (SIGNING UP YOUR TEAM) — Page 5 — chunk `a951f671-8566-4b6a-b630-8474e5b302e9`; 1 exact item(s).

### Q15 — When may I begin entering team players?

For the 2026 Fall League, rosters may start being updated on Monday, Sept. 28, 2026, for Weekday, Saturday, and PrimeTime DUPR leagues.

You may begin adding/managing players after League Management has activated/setup your team and notifies you that rosters for your league have been unlocked.

Official Sources:

- 2026 Fall League Important Dates — Weekday DUPR League Key Dates — Page 1 — chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`; 1 exact item(s).
- 2026 Fall League Important Dates — Saturday DUPR League Key Dates — Page 1 — chunk `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`; 1 exact item(s).
- 2026 Fall League Important Dates — PrimeTime DUPR League Key Dates — Page 2 — chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`; 1 exact item(s).
- LWR Pickleball Club DUPR Captains Guide — HOW TO REGISTER YOUR TEAM (SIGNING UP YOUR TEAM) — Page 5 — chunk `a951f671-8566-4b6a-b630-8474e5b302e9`; 1 exact item(s).

### Q16 — When can I build my roster?

For the 2026 Fall League, rosters can start being updated on Monday, Sept. 28, 2026, for Weekday DUPR, Saturday DUPR, and PrimeTime DUPR leagues.

You can begin adding/managing players once your team registration/setup is complete, League Management activates the team and assigns the captain/co-captain(s), and League Management notifies you that rosters for your league have been unlocked.

Official Sources:

- 2026 Fall League Important Dates — Weekday DUPR League Key Dates — Page 1 — chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`; 1 exact item(s).
- 2026 Fall League Important Dates — Saturday DUPR League Key Dates — Page 1 — chunk `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`; 1 exact item(s).
- 2026 Fall League Important Dates — PrimeTime DUPR League Key Dates — Page 2 — chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`; 1 exact item(s).
- LWR Pickleball Club DUPR Captains Guide — HOW TO REGISTER YOUR TEAM (SIGNING UP YOUR TEAM) — Page 5 — chunk `a951f671-8566-4b6a-b630-8474e5b302e9`; 1 exact item(s).

### Q17 — When can I fill my roster?

For the 2026 Fall League, rosters can start being updated on Monday, Sept. 28, 2026, for Weekday DUPR, Saturday DUPR, and PrimeTime DUPR leagues.

You also need your team registration/setup completed and League Management must activate the team and notify you that rosters for your league are unlocked before you can begin adding and managing players.

Official Sources:

- 2026 Fall League Important Dates — Weekday DUPR League Key Dates — Page 1 — chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`; 1 exact item(s).
- 2026 Fall League Important Dates — Saturday DUPR League Key Dates — Page 1 — chunk `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`; 1 exact item(s).
- 2026 Fall League Important Dates — PrimeTime DUPR League Key Dates — Page 2 — chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`; 1 exact item(s).
- LWR Pickleball Club DUPR Captains Guide — HOW TO REGISTER YOUR TEAM (SIGNING UP YOUR TEAM) — Page 5 — chunk `a951f671-8566-4b6a-b630-8474e5b302e9`; 1 exact item(s).

### Q18 — When can I start my roster?

For the 2026 Fall League, you can start updating rosters on Monday, Sept. 28, 2026. This date is listed for Weekday DUPR, Saturday DUPR, and PrimeTime DUPR leagues.

You still need to wait until League Management activates your team and notifies you that rosters for your league are unlocked and available for adding/managing players.

Official Sources:

- 2026 Fall League Important Dates — Weekday DUPR League Key Dates — Page 1 — chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`; 1 exact item(s).
- 2026 Fall League Important Dates — Saturday DUPR League Key Dates — Page 1 — chunk `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`; 1 exact item(s).
- 2026 Fall League Important Dates — PrimeTime DUPR League Key Dates — Page 2 — chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`; 1 exact item(s).
- LWR Pickleball Club DUPR Captains Guide — HOW TO REGISTER YOUR TEAM (SIGNING UP YOUR TEAM) — Page 5 — chunk `a951f671-8566-4b6a-b630-8474e5b302e9`; 1 exact item(s).

### Q19 — Can I add players to my roster yet?

Not yet, based on the 2026 Fall League Important Dates. Weekday, Saturday, and PrimeTime DUPR League rosters can start being updated on Sept. 28, 2026.

Also, the Captains Guide says League Management will notify you when your league’s team rosters have been unlocked and are available for adding/managing players. I have not checked your actual team unlock or personal eligibility.

Official Sources:

- 2026 Fall League Important Dates — Weekday DUPR League Key Dates — Page 1 — chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`; 1 exact item(s).
- 2026 Fall League Important Dates — Saturday DUPR League Key Dates — Page 1 — chunk `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`; 1 exact item(s).
- 2026 Fall League Important Dates — PrimeTime DUPR League Key Dates — Page 2 — chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`; 1 exact item(s).
- LWR Pickleball Club DUPR Captains Guide — HOW TO REGISTER YOUR TEAM (SIGNING UP YOUR TEAM) — Page 5 — chunk `a951f671-8566-4b6a-b630-8474e5b302e9`; 1 exact item(s).

### Q20 — When do we begin adding players to our team?

For the 2026 Fall League, rosters can start being updated on Monday, Sept. 28, 2026, for Weekday, Saturday, and PrimeTime DUPR leagues.

You begin adding/managing players once League Management has activated your team, assigned the Captain/Co-Captain(s), and notified you that your league’s team rosters have been unlocked and are available.

Official Sources:

- 2026 Fall League Important Dates — Weekday DUPR League Key Dates — Page 1 — chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`; 1 exact item(s).
- 2026 Fall League Important Dates — Saturday DUPR League Key Dates — Page 1 — chunk `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`; 1 exact item(s).
- 2026 Fall League Important Dates — PrimeTime DUPR League Key Dates — Page 2 — chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`; 1 exact item(s).
- LWR Pickleball Club DUPR Captains Guide — HOW TO REGISTER YOUR TEAM (SIGNING UP YOUR TEAM) — Page 5 — chunk `a951f671-8566-4b6a-b630-8474e5b302e9`; 1 exact item(s).

### Q21 — What date does player entry open for Weekday?

For the 2026 Fall Weekday DUPR League, player/roster entry can start Monday, Sept. 28, 2026. League Management must unlock the rosters and notify you before you can begin adding and managing players.

Official Sources:

- 2026 Fall League Important Dates — Weekday DUPR League Key Dates — Page 1 — chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`; 1 exact item(s).
- LWR Pickleball Club DUPR Captains Guide — HOW TO REGISTER YOUR TEAM (SIGNING UP YOUR TEAM) — Page 5 — chunk `a951f671-8566-4b6a-b630-8474e5b302e9`; 1 exact item(s).

### Q22 — When can I start entering my rosterr for weekdy league?

For the 2026 Fall Weekday DUPR League, roster updating can start Monday, Sept. 28, 2026.

You can begin adding/managing players once League Management has activated your team, assigned the Captain/Co-Captain(s), and notified you that rosters for your league are unlocked and available.

Official Sources:

- 2026 Fall League Important Dates — Weekday DUPR League Key Dates — Page 1 — chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`; 1 exact item(s).
- LWR Pickleball Club DUPR Captains Guide — HOW TO REGISTER YOUR TEAM (SIGNING UP YOUR TEAM) — Page 5 — chunk `a951f671-8566-4b6a-b630-8474e5b302e9`; 1 exact item(s).

### Q23 — when can i add plyers to my team

For the 2026 Fall League, rosters can start being updated on Monday, Sept. 28, 2026, for Weekday DUPR, Saturday DUPR, and PrimeTime DUPR leagues.

Also, after your team registration is complete, League Management must activate your team and assign the captain/co-captain roles. League Management will notify you when rosters for your league are unlocked and available for adding/managing players.

Official Sources:

- 2026 Fall League Important Dates — Weekday DUPR League Key Dates — Page 1 — chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`; 1 exact item(s).
- 2026 Fall League Important Dates — Saturday DUPR League Key Dates — Page 1 — chunk `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`; 1 exact item(s).
- 2026 Fall League Important Dates — PrimeTime DUPR League Key Dates — Page 2 — chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`; 1 exact item(s).
- LWR Pickleball Club DUPR Captains Guide — HOW TO REGISTER YOUR TEAM (SIGNING UP YOUR TEAM) — Page 5 — chunk `a951f671-8566-4b6a-b630-8474e5b302e9`; 1 exact item(s).

### Q24 — When can I enter players in the match lineup?

You can enter players in the match lineup through the LMS using the Match Setup button. Home and visiting Captains must submit upcoming match rosters no later than three (3) days before the scheduled match.

After the initial submission, any lineup or roster changes must also be entered through Match Setup, which automatically notifies the opposing Captain(s).

Official Sources:

- LWR Pickleball Club DUPR League Rules — Rule 5.5 — Match Setup and Roster Exchange — Page 5 — chunk `80d9c2f5-8b5d-4009-b00c-04e116f84b5f`; 1 exact item(s).

### Q25 — How do I enter players on my roster?

To enter players on your roster:

1. Go to your Captain Dashboard.
2. In Captain Tools, click Manage Roster.
3. Click Add Player.
4. In the pop-up, your home community will be preselected; use the drop-down to view available players, their eligibility status, and DUPR ratings.
5. Select the player and add them to the team.

If a player is missing a DUPR ID or Season Rating, select the player and click Add Player to Team; League Management will be notified to review it and update you. If a player is marked “Not Eligible,” trying to add them will show an on-screen message explaining why.

Official Sources:

- LWRPC-Captains Guide to the LMS — Page 8 — chunk `61269c81-f09f-44af-adbd-3da3065e22a7`; 2 exact item(s).
- LWRPC-Captains Guide to the LMS — Page 9 — chunk `aaedf4ae-3936-4d8c-ae6c-23435bd27105`; 4 exact item(s).
- LWRPC-Captains Guide to the LMS — Page 16 — chunk `9cc8dde8-e61b-4377-ab70-7342b32a18f4`; 3 exact item(s).
- LWRPC-Captains Guide to the LMS — Page 18 — chunk `d6bcfac5-2aba-4d80-b4d1-963a81c14ae8`; 3 exact item(s).

### Q26 — How do I add a player to my roster?

Go to your Captain Dashboard, open the Captain Tools section, and click Manage Roster. Then click Add Player.

In the pop-up, your home community is preselected. Use the drop-down to view available players, including their eligibility status and DUPR ratings, select the player, and add them to the team.

If the player is missing a DUPR ID or Season Rating, you can still select the player and click Add Player to Team; League Management will be notified to review the issue and update you. If the player is marked “Not Eligible,” attempting to add them will show an on-screen message explaining why.

Official Sources:

- LWRPC-Captains Guide to the LMS — Page 8 — chunk `61269c81-f09f-44af-adbd-3da3065e22a7`; 2 exact item(s).
- LWRPC-Captains Guide to the LMS — Page 9 — chunk `aaedf4ae-3936-4d8c-ae6c-23435bd27105`; 4 exact item(s).
- LWRPC-Captains Guide to the LMS — Page 16 — chunk `9cc8dde8-e61b-4377-ab70-7342b32a18f4`; 3 exact item(s).
- LWRPC-Captains Guide to the LMS — Page 18 — chunk `d6bcfac5-2aba-4d80-b4d1-963a81c14ae8`; 3 exact item(s).

### Q27 — How can I update my roster?

To update your roster, go to your Captain Dashboard, open the Captain Tools section, and click Manage Roster. From there you can add, change, or remove players.

To add a player: click Add Player, use the drop-down list to view available players with eligibility status and DUPR ratings, then add the player.

If a player is missing a DUPR ID or Season Rating, select the player and click Add Player to Team; League Management will be automatically notified and will update you on the player’s status.

If a player is marked “Not Eligible,” trying to add them will show an on-screen message explaining why.

To change a Captain or Co-Captain, click Change Captain/Co-Captain next to your team name; this opens an email draft to submit the request to League Management.

Official Sources:

- LWRPC-Captains Guide to the LMS — Page 8 — chunk `61269c81-f09f-44af-adbd-3da3065e22a7`; 2 exact item(s).
- LWRPC-Captains Guide to the LMS — Page 9 — chunk `aaedf4ae-3936-4d8c-ae6c-23435bd27105`; 4 exact item(s).
- LWRPC-Captains Guide to the LMS — Page 16 — chunk `9cc8dde8-e61b-4377-ab70-7342b32a18f4`; 3 exact item(s).
- LWRPC-Captains Guide to the LMS — Page 18 — chunk `d6bcfac5-2aba-4d80-b4d1-963a81c14ae8`; 3 exact item(s).

### Q28 — Where do I go to build my team roster?

Go to your Captain Dashboard, open the Captain Tools section, and click Manage Roster. From there, use Add Player to add players to your roster.

Official Sources:

- LWRPC-Captains Guide to the LMS — Page 8 — chunk `61269c81-f09f-44af-adbd-3da3065e22a7`; 2 exact item(s).
- LWRPC-Captains Guide to the LMS — Page 9 — chunk `aaedf4ae-3936-4d8c-ae6c-23435bd27105`; 4 exact item(s).
- LWRPC-Captains Guide to the LMS — Page 16 — chunk `9cc8dde8-e61b-4377-ab70-7342b32a18f4`; 3 exact item(s).
- LWRPC-Captains Guide to the LMS — Page 18 — chunk `d6bcfac5-2aba-4d80-b4d1-963a81c14ae8`; 3 exact item(s).

### Q29 — How do I enter match scores?

To enter match scores:

1. Open the match and click the red “Enter Match Scores” button. It is available only on or after the scheduled match date.
2. Select the players for each game using the dropdowns, normally using the saved Match Setup team; if there were changes, choose the correct player in the individual player dropdown.
3. Enter the scores in each game block.
4. Click Submit. The system checks for errors before saving.

Notes:
- If a line has an eligibility issue, an ineligible player cannot be selected and score fields are blocked.
- For individual game forfeits or retirements, refer to the official League Rules when entering results.
- If the entire match date is forfeited, canceled, or cannot be played due to weather/scheduling conflicts, do not enter it into the system; contact/notify League Management at info@lwrpickleballclub.com.
- After submission, the opposing captain gets an email and must review and verify the scores, or dispute them if they do not accept them. The visiting team captain must verify promptly so results can be entered into DUPR before the end of the weekend.

Official Sources:

- LWRPC-Captains Guide to the LMS — Page 13 — chunk `1859086d-5874-43b5-b162-4cd3152c0eab`; 4 exact item(s).
- LWR Pickleball Club DUPR Captains Guide — ENTER/VERIFY SCORES — Page 9 — chunk `59c3658b-3c3f-4ef2-90ee-f5c3fa114f79`; 5 exact item(s).

### Q30 — Does the weekday dupr league use rally scoring

No, not generally. The weekday DUPR league’s governing default scoring method is Standard Scoring under the current USA Pickleball rules unless a game or match format expressly requires Rally Scoring.

The supplied exception is limited to the weekday 9.1 division Picklebreaker™ only: if the match is tied 2–2 after the preceding rounds, that Picklebreaker™ is one game to 15, win by 2, using Rally Scoring.

Official Sources:

- LWR Pickleball Club DUPR League Rules — Rule 5.3 — Point Scoring Methods — Page 4 — chunk `7a09f29b-f9ea-4bb0-99bb-08183b02f94f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 5 — Page 5 — chunk `80d9c2f5-8b5d-4009-b00c-04e116f84b5f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 6.1.9.7 — Page 8 — chunk `77cebfac-54ac-4199-8d6a-233c439a0a69`; 1 exact item(s).

### Q31 — Does the Weekday DUPR League use Rally Scoring?

No, not generally. The Weekday DUPR League’s governing default scoring method is Standard Scoring unless a particular game or match format expressly requires Rally Scoring.

The supplied exception is limited to the Weekday DUPR League 9.1 division Picklebreaker™: when the match is tied 2–2 after all preceding rounds, the Picklebreaker™ is one game to 15, win by 2, using Rally Scoring.

Official Sources:

- LWR Pickleball Club DUPR League Rules — Rule 5.3 — Point Scoring Methods — Page 4 — chunk `7a09f29b-f9ea-4bb0-99bb-08183b02f94f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 5 — Page 5 — chunk `80d9c2f5-8b5d-4009-b00c-04e116f84b5f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 6.1.9.7 — Page 8 — chunk `77cebfac-54ac-4199-8d6a-233c439a0a69`; 1 exact item(s).

### Q32 — What scoring method does the Weekday League use?

The Weekday League uses Standard Scoring by default, as defined by the current USA Pickleball rules.

Express exception: in the Weekday League 9.1 division, if the match is tied 2–2 after all preceding rounds, the Picklebreaker™ is one game to 15, win by 2, using Rally Scoring.

Official Sources:

- LWR Pickleball Club DUPR League Rules — Rule 5.3 — Point Scoring Methods — Page 4 — chunk `7a09f29b-f9ea-4bb0-99bb-08183b02f94f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 5 — Page 5 — chunk `80d9c2f5-8b5d-4009-b00c-04e116f84b5f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 6.1.9.7 — Page 8 — chunk `77cebfac-54ac-4199-8d6a-233c439a0a69`; 1 exact item(s).

### Q33 — Do regular Weekday games use Rally Scoring?

No. Regular Weekday games use Standard Scoring, unless a particular game or match format expressly identifies Rally Scoring as required.

The supplied Weekday Rally Scoring exception is only for the 9.1 division Picklebreaker™: when the match is tied 2–2 after all preceding rounds, the Picklebreaker™ is one game to 15, win by 2, using Rally Scoring.

Official Sources:

- LWR Pickleball Club DUPR League Rules — Rule 5.3 — Point Scoring Methods — Page 4 — chunk `7a09f29b-f9ea-4bb0-99bb-08183b02f94f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 5 — Page 5 — chunk `80d9c2f5-8b5d-4009-b00c-04e116f84b5f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 6.1.9.7 — Page 8 — chunk `77cebfac-54ac-4199-8d6a-233c439a0a69`; 1 exact item(s).

### Q34 — Does Weekday 9.1 use Rally Scoring?

No, not generally. Weekday 9.1 uses Standard Scoring by default unless a game or match format expressly requires Rally Scoring.

The supplied Weekday 9.1 Rally Scoring exception is only for the Picklebreaker™: when the match is tied 2–2 after all preceding rounds, the Picklebreaker™ is one game to 15, win by 2, using Rally Scoring.

Official Sources:

- LWR Pickleball Club DUPR League Rules — Rule 5.3 — Point Scoring Methods — Page 4 — chunk `7a09f29b-f9ea-4bb0-99bb-08183b02f94f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 5 — Page 5 — chunk `80d9c2f5-8b5d-4009-b00c-04e116f84b5f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 6.1.9.7 — Page 8 — chunk `77cebfac-54ac-4199-8d6a-233c439a0a69`; 1 exact item(s).

### Q35 — Does the Weekday 9.1 Picklebreaker use Rally Scoring?

Yes — the Weekday 9.1 Picklebreaker uses Rally Scoring, but only for the Picklebreaker played when the match is tied 2–2 after all preceding rounds. It is one game to 15 points, win by two.

The governing default is Standard Scoring unless a particular game or match format expressly requires Rally Scoring; this Weekday 9.1 Picklebreaker rule is such an express Rally Scoring exception.

Official Sources:

- LWR Pickleball Club DUPR League Rules — Rule 5.3 — Point Scoring Methods — Page 4 — chunk `7a09f29b-f9ea-4bb0-99bb-08183b02f94f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 5 — Page 5 — chunk `80d9c2f5-8b5d-4009-b00c-04e116f84b5f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 6.1.9.7 — Page 8 — chunk `77cebfac-54ac-4199-8d6a-233c439a0a69`; 1 exact item(s).

### Q36 — Is Weekday all rally?

No. Weekday is not all Rally Scoring. The governing default scoring method is Standard Scoring, unless a particular game or match format expressly requires Rally Scoring.

The supplied Weekday Rally exception is limited to the Weekday 9.1 division Picklebreaker™: only when the match is tied 2–2 after all preceding rounds, the Picklebreaker™ is one game to 15, win by 2, using Rally Scoring.

Official Sources:

- LWR Pickleball Club DUPR League Rules — Rule 5.3 — Point Scoring Methods — Page 4 — chunk `7a09f29b-f9ea-4bb0-99bb-08183b02f94f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 5 — Page 5 — chunk `80d9c2f5-8b5d-4009-b00c-04e116f84b5f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 6.1.9.7 — Page 8 — chunk `77cebfac-54ac-4199-8d6a-233c439a0a69`; 1 exact item(s).

### Q37 — Does the weekdy league use raly scoring?

No — the weekday league does not generally use rally scoring. The governing default scoring method is Standard Scoring under the current USA Pickleball rules, unless a particular game or match format expressly requires Rally Scoring.

Express exception: in the weekday league, division 9.1, the Picklebreaker™ uses Rally Scoring only when the match is tied 2–2 after all preceding rounds; it is one game to 15, win by 2.

Official Sources:

- LWR Pickleball Club DUPR League Rules — Rule 5.3 — Point Scoring Methods — Page 4 — chunk `7a09f29b-f9ea-4bb0-99bb-08183b02f94f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 5 — Page 5 — chunk `80d9c2f5-8b5d-4009-b00c-04e116f84b5f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 6.1.9.7 — Page 8 — chunk `77cebfac-54ac-4199-8d6a-233c439a0a69`; 1 exact item(s).

### Q38 — Does Saturday use Rally Scoring?

Yes. Saturday expressly uses Rally Scoring: all Saturday games are games to 15 using Rally Scoring, win by 1. If the match is tied 12-12 after all previous rounds, the Saturday Picklebreaker is one game to 25, win by 2, also using Rally Scoring.

The governing default otherwise is Standard Scoring unless a particular game or match format expressly identifies Rally Scoring.

Official Sources:

- LWR Pickleball Club DUPR League Rules — Rule 5.3 — Point Scoring Methods — Page 4 — chunk `7a09f29b-f9ea-4bb0-99bb-08183b02f94f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 5 — Page 5 — chunk `80d9c2f5-8b5d-4009-b00c-04e116f84b5f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rules 6.2.3.1, 6.2.3.5 — Match Day Format — Page 9 — chunk `49b68f73-d7a5-435c-9c50-b98a59180774`; 2 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 6.2.3 — Page 10 — chunk `66a8e74d-bfa1-4ba3-a8e0-9f3824a315db`; 1 exact item(s).

### Q39 — Do regular Saturday games use Rally Scoring?

Yes. For Saturday league match-day format, regular games are expressly listed as “All Games: Games to 15 using Rally Scoring (win by 1).”

The governing default is Standard Scoring unless a particular game or match format expressly requires Rally Scoring; Saturday is such an express Rally Scoring format. The Saturday Picklebreaker is a separate exception: only if the match is tied 12-12 after previous rounds, it is one game to 25, win by 2, using Rally Scoring.

Official Sources:

- LWR Pickleball Club DUPR League Rules — Rule 5.3 — Point Scoring Methods — Page 4 — chunk `7a09f29b-f9ea-4bb0-99bb-08183b02f94f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 5 — Page 5 — chunk `80d9c2f5-8b5d-4009-b00c-04e116f84b5f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rules 6.2.3.1, 6.2.3.5 — Match Day Format — Page 9 — chunk `49b68f73-d7a5-435c-9c50-b98a59180774`; 2 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 6.2.3 — Page 10 — chunk `66a8e74d-bfa1-4ba3-a8e0-9f3824a315db`; 1 exact item(s).

### Q40 — Does the Saturday Picklebreaker use Rally Scoring?

Yes. In the Saturday league, the Picklebreaker™ is played only if the match is tied 12-12 after all previous rounds, and that Picklebreaker is one game to 25, win by 2, using Rally Scoring.

Official Sources:

- LWR Pickleball Club DUPR League Rules — Rule 5.3 — Point Scoring Methods — Page 4 — chunk `7a09f29b-f9ea-4bb0-99bb-08183b02f94f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 5 — Page 5 — chunk `80d9c2f5-8b5d-4009-b00c-04e116f84b5f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rules 6.2.3.1, 6.2.3.5 — Match Day Format — Page 9 — chunk `49b68f73-d7a5-435c-9c50-b98a59180774`; 2 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 6.2.3 — Page 10 — chunk `66a8e74d-bfa1-4ba3-a8e0-9f3824a315db`; 1 exact item(s).

### Q41 — Does PrimeTime use Rally Scoring?

No, not generally. PrimeTime uses Standard Scoring by default unless a particular game or match format expressly requires Rally Scoring.

The PrimeTime exception provided is the Picklebreaker™: only when the match is tied 2–2 after all preceding rounds, the Picklebreaker™ is one game to 15, win by two, using Rally Scoring.

Official Sources:

- LWR Pickleball Club DUPR League Rules — Rule 5.3 — Point Scoring Methods — Page 4 — chunk `7a09f29b-f9ea-4bb0-99bb-08183b02f94f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 5 — Page 5 — chunk `80d9c2f5-8b5d-4009-b00c-04e116f84b5f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 6.3.6 — Page 12 — chunk `4193818c-5dcb-4ee6-9f03-249f18d5d38c`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 6.3.6 — Page 13 — chunk `413ec35d-6bf2-4f72-a753-f20b2246abb3`; 1 exact item(s).

### Q42 — Do regular PrimeTime games use Rally Scoring?

No. Regular PrimeTime games do not use Rally Scoring unless a particular game or match format expressly identifies Rally Scoring as required. The governing default is Standard Scoring as defined by the current USA Pickleball rules.

The supplied PrimeTime Rally Scoring exception is limited to the Picklebreaker™ only: when a PrimeTime match is tied 2–2 after all preceding rounds, the Picklebreaker™ is one game to 15, win by 2, using Rally Scoring.

Official Sources:

- LWR Pickleball Club DUPR League Rules — Rule 5.3 — Point Scoring Methods — Page 4 — chunk `7a09f29b-f9ea-4bb0-99bb-08183b02f94f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 5 — Page 5 — chunk `80d9c2f5-8b5d-4009-b00c-04e116f84b5f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 6.3.6 — Page 12 — chunk `4193818c-5dcb-4ee6-9f03-249f18d5d38c`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 6.3.6 — Page 13 — chunk `413ec35d-6bf2-4f72-a753-f20b2246abb3`; 1 exact item(s).

### Q43 — Does the PrimeTime Picklebreaker use Rally Scoring?

Yes. In PrimeTime, the Picklebreaker™ uses Rally Scoring, but only for the Picklebreaker™ played when the match is tied 2–2 after all preceding rounds. It is one game to 15, win by 2.

The governing default scoring method is Standard Scoring unless a particular game or match format expressly requires Rally Scoring; this PrimeTime Picklebreaker™ rule is that express exception.

Official Sources:

- LWR Pickleball Club DUPR League Rules — Rule 5.3 — Point Scoring Methods — Page 4 — chunk `7a09f29b-f9ea-4bb0-99bb-08183b02f94f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 5 — Page 5 — chunk `80d9c2f5-8b5d-4009-b00c-04e116f84b5f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 6.3.6 — Page 12 — chunk `4193818c-5dcb-4ee6-9f03-249f18d5d38c`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 6.3.6 — Page 13 — chunk `413ec35d-6bf2-4f72-a753-f20b2246abb3`; 1 exact item(s).

### Q44 — Does Weekday 8.1 use Rally Scoring?

No. Under the LWR DUPR League Rules default, games use Standard Scoring unless a particular game or match format expressly requires Rally Scoring. The supplied evidence does not show Weekday 8.1 as an express Rally Scoring format.

Official Sources:

- LWR Pickleball Club DUPR League Rules — Rule 5.3 — Point Scoring Methods — Page 4 — chunk `7a09f29b-f9ea-4bb0-99bb-08183b02f94f`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 5 — Page 5 — chunk `80d9c2f5-8b5d-4009-b00c-04e116f84b5f`; 1 exact item(s).

### Q45 — How does Rally Scoring work?

In LWR DUPR League rally scoring:

- A team can win a point whether it is serving or receiving, except for the game-winning point.
- If the serving team loses a rally, it is a side out: the receiving team gets a point and takes over serve.
- After a side out, the server is based on that team’s score: right-side player serves if the score is even; left-side player serves if the score is odd.
- Players switch sides only after winning a point on their own serve, and the same player keeps serving from the new side.
- When a team reaches one point below the game-winning score, that team’s score freezes. It can score the game-winning point only while serving. The other team continues normal rally scoring until it also reaches its freeze point.
- In win-by-two games, if the score becomes tied at or beyond the initial freeze point, both teams become unfrozen and normal rally scoring resumes. The freeze/unfreeze process continues as needed until one team wins by two, but the game-winning point must always be scored while serving.

Official Sources:

- LWR Pickleball Club DUPR League Rules — DUPR LEAGUE MANAGERS — Page 15 — chunk `dd088f2f-6f6d-4deb-b4d9-66369e51f29b`; 6 exact item(s).
- LWR Pickleball Club DUPR League Rules — DUPR LEAGUE MANAGERS — Page 15 — chunk `e0d311b0-18b3-46b1-8f23-008dbe41e569`; 1 exact item(s).

### Q46 — How does Rally Scoring work in a Picklebreaker?

In a Picklebreaker using Rally Scoring:

- A team can score a point whether it is serving or receiving, except for the game-winning point.
- If the serving team loses a rally, it is a side out: the receiving team gets a point and takes over the serve.
- After a side out, the first server is based on that team’s score: right-side player serves on an even score; left-side player serves on an odd score.
- Players switch sides only after winning a point on their own serve, and the same player keeps serving from the new side.
- When a team reaches one point below the game-winning score, that team’s score freezes. From then on, that team can score the game-winning point only while serving. The other team continues normal Rally Scoring until it also reaches its freeze point.
- In a win-by-two format, if the score becomes tied at or beyond the initial freeze point, both teams become unfrozen and normal Rally Scoring resumes. The freeze/unfreeze process continues as needed until one team wins by two points, and the game-winning point must always be scored while serving.

Official Sources:

- LWR Pickleball Club DUPR League Rules — DUPR LEAGUE MANAGERS — Page 15 — chunk `dd088f2f-6f6d-4deb-b4d9-66369e51f29b`; 6 exact item(s).
- LWR Pickleball Club DUPR League Rules — DUPR LEAGUE MANAGERS — Page 15 — chunk `e0d311b0-18b3-46b1-8f23-008dbe41e569`; 1 exact item(s).

### Q47 — Do I have to be serving to win with Rally Scoring?

Yes. Under LWR DUPR League Rally Scoring, a team must be serving to score the game-winning point. Otherwise, teams can win points whether serving or receiving, subject to the scoring-freeze rules near game point.

Official Sources:

- LWR Pickleball Club DUPR League Rules — DUPR LEAGUE MANAGERS — Page 15 — chunk `dd088f2f-6f6d-4deb-b4d9-66369e51f29b`; 6 exact item(s).
- LWR Pickleball Club DUPR League Rules — DUPR LEAGUE MANAGERS — Page 15 — chunk `e0d311b0-18b3-46b1-8f23-008dbe41e569`; 1 exact item(s).

### Q54 — When is Season DUPR established?

Season DUPR is established on the date communicated to all captains before the first scheduled league match, and it remains in effect for the duration of the season.

For the 2026 Fall League Important Dates, the Season DUPR ratings are recorded on Sunday, Sept. 27, 2026, for Weekday, Saturday, and PrimeTime DUPR leagues.

Official Sources:

- LWR Pickleball Club DUPR League Rules — Rule 4.1 — DUPR RATINGS/DIVISIONS — Page 3 — chunk `14555428-8ebb-4129-afc8-dbcad79572d5`; 1 exact item(s).
- 2026 Fall League Important Dates — Weekday DUPR League Key Dates — Page 1 — chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`; 1 exact item(s).
- 2026 Fall League Important Dates — Saturday DUPR League Key Dates — Page 1 — chunk `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`; 1 exact item(s).
- 2026 Fall League Important Dates — PrimeTime DUPR League Key Dates — Page 2 — chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`; 1 exact item(s).

### Q55 — When is my Season DUPR established?

Your Season DUPR is established on the date communicated to all captains before the first scheduled league match, and it remains in effect for the duration of the season.

For the 2026 Fall League Important Dates, the Season DUPR ratings are recorded on Sunday, Sept. 27, 2026, for Weekday, Saturday, and PrimeTime DUPR leagues.

Official Sources:

- LWR Pickleball Club DUPR League Rules — Rule 4.1 — DUPR RATINGS/DIVISIONS — Page 3 — chunk `14555428-8ebb-4129-afc8-dbcad79572d5`; 1 exact item(s).
- 2026 Fall League Important Dates — Weekday DUPR League Key Dates — Page 1 — chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`; 1 exact item(s).
- 2026 Fall League Important Dates — Saturday DUPR League Key Dates — Page 1 — chunk `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`; 1 exact item(s).
- 2026 Fall League Important Dates — PrimeTime DUPR League Key Dates — Page 2 — chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`; 1 exact item(s).

### Q56 — How is my Season DUPR calculated?

Your Season DUPR is established on the date communicated to all captains before the first scheduled league match, and it stays in effect for the entire season.

How it is calculated/handled:
- Your DUPR rating is truncated to the nearest tenth to establish your Season DUPR Rating. Example: 3.496 becomes 3.4.
- If your DUPR Reliability Factor is below 29, you are classified as “Not Rated” (NR) for league purposes.
- For team aggregate rating calculations, an NR player is initially assigned a Season DUPR equal to the division’s maximum individual DUPR rating minus 0.5.
- If you are rostered in multiple divisions, the highest adjusted Season DUPR assigned to you is used consistently across all divisions.
- Some leagues use the age-based DUPR sub-rating; if a player has not established a 65+ age-based rating by the start of the season, the 50+ age-based rating is used.

Official Sources:

- LWR Pickleball Club DUPR League Rules — Rules 4.1, 4.2, 4.3 — DUPR RATINGS/DIVISIONS — Page 3 — chunk `14555428-8ebb-4129-afc8-dbcad79572d5`; 4 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 4.5.1 — Page 4 — chunk `91cb2c3c-32f1-4f3b-8275-a044f5587e94`; 1 exact item(s).
- LWR Pickleball Club DUPR League Rules — Rule 4.5.2 — Page 4 — chunk `f1e95ae9-e513-4e4a-972d-7b5378d1deb1`; 1 exact item(s).

### Q57 — When are Season DUPR ratings recorded for Saturday?

For the 2026 Fall Saturday DUPR League, Season DUPR ratings are recorded on Sept. 27, 2026, Sunday.

Official Sources:

- 2026 Fall League Important Dates — Saturday DUPR League Key Dates — Page 1 — chunk `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`; 1 exact item(s).

