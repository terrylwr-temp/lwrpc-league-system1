const GENERAL_SUGGESTIONS = Object.freeze([
  "When does Match Setup need to be completed?",
  "What kind of ball are we using?",
  "Can I volley in the kitchen?",
  "What are the rules for a legal serve?",
]);

export function assistantPageContext(pathname) {
  const currentPath = String(pathname || "");
  const normalizedPath = currentPath.toLowerCase();
  let featureModule = "LMS";
  const suggestions = GENERAL_SUGGESTIONS;

  if (/match-setup|lineup|score-sheet/.test(normalizedPath)) {
    featureModule = "Match Setup";
  } else if (/standing/.test(normalizedPath)) {
    featureModule = "Standings";
  } else if (/members/.test(normalizedPath)) {
    featureModule = "Member Administration";
  } else if (/captain/.test(normalizedPath)) {
    featureModule = "Captain tools";
  } else if (/score/.test(normalizedPath)) {
    featureModule = "Score entry";
  } else if (/roster/.test(normalizedPath)) {
    featureModule = "Roster management";
  }

  return Object.freeze({ currentPath, featureModule, suggestions });
}

export const ASK_LWR_INITIAL_COPY = "Ask me about LWR leagues, rules, important dates, scoring, DUPR, Match Setup, or your authorized LMS information.";
export const ASK_LWR_HELP_GROUPS = Object.freeze([
  {title:'LWR leagues & rules',questions:["When does the Women's Weekday League start?",'Does the Weekday League use Rally Scoring?','When can I start entering my roster?','What ball are we using?']},
  {title:'My LMS information',description:"Available information depends on your LMS role and what you're authorized to access.",questions:["What's my Season DUPR?",'What team am I on?',"Who's on my roster?",'When is my next match?']},
  {title:'USA Pickleball rules',questions:['What is a kitchen violation?','Can my serve hit the net?','When can I step into the NVZ?','What happens if the ball hits a player?']},
]);

// These mirror the existing dashboard entry points. Guide browsing is separate
// from official-document retrieval eligibility and never constrains RAG.
export function visibleDashboardGuideKeys(role) {
  if (["league_manager", "commissioner"].includes(role)) return ["player_guide_pdf", "captain_guide_pdf", "admin_guide_pdf"];
  if (["captain", "club_pro"].includes(role)) return ["player_guide_pdf", "captain_guide_pdf"];
  return ["player_guide_pdf"];
}

export function canBrowseLeagueDocument(role, documentTypeKey) {
  return documentTypeKey !== "captains_guide" || ["captain", "club_pro", "league_manager", "commissioner"].includes(role);
}
