const GENERAL_SUGGESTIONS = Object.freeze([
  "What does NR mean?",
  "How does scoring freeze work?",
  "What happens if a player can't finish a match?",
  "How does a Picklebreaker work?",
]);

const MATCH_SETUP_SUGGESTIONS = Object.freeze([
  "When does Match Setup need to be completed?",
  "How do I complete Match Setup?",
  "Can I change my lineup after submitting it?",
  "How do I print the Match Score Sheet?",
]);

const STANDINGS_SUGGESTIONS = Object.freeze([
  "How are standings determined?",
  "How are ties handled?",
  "How does scoring freeze work?",
]);

export function assistantPageContext(pathname, role) {
  const currentPath = String(pathname || "");
  const normalizedPath = currentPath.toLowerCase();
  let featureModule = "LMS";
  let suggestions = GENERAL_SUGGESTIONS;

  if (/match-setup|lineup|score-sheet/.test(normalizedPath)) {
    featureModule = "Match Setup";
    suggestions = MATCH_SETUP_SUGGESTIONS;
  } else if (/standing/.test(normalizedPath)) {
    featureModule = "Standings";
    suggestions = STANDINGS_SUGGESTIONS;
  } else if (/members/.test(normalizedPath)) {
    featureModule = "Member Administration";
  } else if (/captain/.test(normalizedPath)) {
    featureModule = "Captain tools";
    suggestions = MATCH_SETUP_SUGGESTIONS;
  } else if (/score/.test(normalizedPath)) {
    featureModule = "Score entry";
  } else if (/roster/.test(normalizedPath)) {
    featureModule = "Roster management";
  }

  if (["captain", "club_pro", "league_manager", "commissioner"].includes(role) && suggestions === GENERAL_SUGGESTIONS) suggestions = MATCH_SETUP_SUGGESTIONS;
  return Object.freeze({ currentPath, featureModule, suggestions });
}

export const ASK_LWR_INITIAL_COPY = "Ask me about LWR Pickleball Club league rules, DUPR requirements, scoring, Match Setup, Captain procedures, league formats, guides, and other information in our official documents.";

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
