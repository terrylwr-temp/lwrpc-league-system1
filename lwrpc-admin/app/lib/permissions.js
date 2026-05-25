export const ROLE_LEVELS = {
  player: 1,
  captain: 2,
  club_pro: 3,
  league_manager: 4,
  commissioner: 5
};

export function hasRole(userRole, requiredRole) {
  const userLevel = ROLE_LEVELS[userRole] || 0;
  const requiredLevel = ROLE_LEVELS[requiredRole] || 0;

  return userLevel >= requiredLevel;
}

export function roleLabel(role) {
  if (role === "player") return "Player";
  if (role === "captain") return "Captain";
  if (role === "club_pro") return "Club Pro";
  if (role === "league_manager") return "League Manager";
  if (role === "commissioner") return "Commissioner";

  return "Unknown";
}

export function defaultDashboardForRole(role) {
  if (role === "captain" || role === "club_pro") return "/captain-dashboard";
  if (role === "league_manager" || role === "commissioner") return "/";

  return "/player-dashboard";
}
