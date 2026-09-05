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

export const ASK_LWR_INITIAL_COPY = "Ask me about LWR Pickleball Club leagues, DUPR requirements, scoring, Match Setup, Captain procedures, league formats, and more. You also have access to the complete USA Pickleball Rulebook, so you can ask me about pickleball rules, faults, serving, the kitchen (NVZ), equipment, and other rules of play.";

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
