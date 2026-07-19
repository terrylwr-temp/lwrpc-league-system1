import { hasRole } from "./permissions";

const ADMIN_SECTIONS = [
  {
    key: "people",
    title: "People And Teams",
    navLabel: "People & Teams",
    icon: "people",
    desc: "Keep player records, captains, ratings, teams, and access current.",
    cards: [
      { title: "Members", desc: "Search, edit, and review member records.", path: "/members", code: "MB", tone: "slate", role: "league_manager" },
      { title: "Season Ratings", desc: "Update DUPR and PrimeTime ratings.", path: "/ratings", code: "RT", tone: "amber", role: "league_manager" },
      { title: "Teams & Rosters", desc: "Create teams and manage rosters.", path: "/teams", code: "TR", tone: "emerald", role: "league_manager" },
      { title: "User Roles", desc: "Manage role-based access permissions.", path: "/users", code: "UR", tone: "blue", role: "commissioner" },
    ],
  },
  {
    key: "matches",
    title: "Match Operations",
    navLabel: "Match Operations",
    icon: "calendar",
    desc: "Generate, edit, publish, reset, score, and export matches.",
    cards: [
      { title: "Scheduling Admin", desc: "Rules, blackout dates, and initial schedule generation.", path: "/scheduling", code: "SA", tone: "blue", role: "league_manager" },
      { title: "Schedule Editor", desc: "Review, edit, publish, and reset matches.", path: "/schedule-editor", code: "SE", tone: "amber", role: "league_manager" },
      { title: "Matches", desc: "Open match operations and match-level details.", path: "/matches", code: "MT", tone: "slate", role: "league_manager" },
      { title: "Scoring Operations", desc: "Score reminders, verification review, and DUPR export.", path: "/scoring", code: "SC", tone: "emerald", role: "league_manager" },
    ],
  },
  {
    key: "structure",
    title: "League Structure",
    navLabel: "League Structure",
    icon: "structure",
    desc: "Set up the season framework before teams start playing.",
    cards: [
      { title: "Seasons", desc: "Create seasons and maintain season date ranges.", path: "/seasons", code: "SN", tone: "amber", role: "league_manager" },
      { title: "Leagues", desc: "Manage leagues and roster locking.", path: "/leagues", code: "LG", tone: "blue", role: "league_manager" },
      { title: "Divisions", desc: "Manage division rules, DUPR limits, and game lines.", path: "/divisions", code: "DV", tone: "emerald", role: "league_manager" },
      { title: "Locations", desc: "Maintain clubs, courts, and court availability.", path: "/locations", code: "LC", tone: "slate", role: "commissioner" },
    ],
  },
  {
    key: "system",
    title: "System Setup",
    navLabel: "System Setup",
    icon: "structure",
    desc: "Configure system-wide communication, score sheets, club settings, and controlled reset operations.",
    cards: [
      { title: "Email Options", desc: "Edit automated email templates and send test notifications.", path: "/email-options", code: "EO", tone: "blue", role: "commissioner" },
      { title: "Score Sheets", desc: "Manage printable score sheet templates.", path: "/score-sheets", code: "SS", tone: "emerald", role: "commissioner" },
      { title: "Club Setup", desc: "Configure club branding and contact defaults.", path: "/system-setup", code: "CS", tone: "amber", role: "commissioner" },
      { title: "Season Reset", desc: "Prepare one season for rollover while preserving match history.", path: "#season-reset", code: "SR", tone: "amber", role: "league_manager", dialog: "reset", hideFromSidebar: true },
      { title: "Master Reset All", desc: "Open the protected full-system operations reset.", path: "#master-reset", code: "MR", tone: "slate", role: "league_manager", dialog: "reset", hideFromSidebar: true },
    ],
  },
  {
    key: "modules",
    title: "Modules",
    navLabel: "Modules",
    icon: "modules",
    desc: "Standalone tools that share club data with the main league system.",
    cards: [
      { title: "Tournaments", desc: "Open public tournament displays and event-code tournament operations.", path: "/tourney/tpro", code: "TN", tone: "emerald", role: "league_manager" },
      { title: "PBCourtCommand", desc: "Run round robin and ladder sessions with saved players, lineups, scores, and texts.", path: "/pbcc/admin", code: "PB", tone: "blue", role: "league_manager" },
      { title: "AI League Insights", desc: "Ask LMS, weekly health, anomalies, lineup gaps, and cleanup suggestions.", path: "/ai-insights", code: "AI", tone: "amber", role: "league_manager" },
    ],
  },
];

export function adminNavigationSections(role) {
  return ADMIN_SECTIONS.map((section) => ({
    ...section,
    cards: section.cards.filter((card) => hasRole(role, card.role)),
  })).filter((section) => section.cards.length > 0);
}
