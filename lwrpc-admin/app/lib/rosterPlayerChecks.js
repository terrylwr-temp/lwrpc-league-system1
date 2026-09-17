export const ROSTER_PLAYER_ELIGIBILITY = {
  eligible: "Eligible",
  notEligible: "Not Eligible",
  ratingNeeded: "Rating Needed",
  duprIdNeeded: "DUPR ID Needed",
};

export function rosterPlayerSelectionDisabled(status) {
  return status === ROSTER_PLAYER_ELIGIBILITY.notEligible;
}

export function rosterPlayerNeedsInformationCheck(status) {
  return [
    ROSTER_PLAYER_ELIGIBILITY.ratingNeeded,
    ROSTER_PLAYER_ELIGIBILITY.duprIdNeeded,
  ].includes(status);
}

export function rosterPlayerCheckRecipientEmails(members = []) {
  const uniqueEmails = new Map();

  members.forEach((member) => {
    const email = String(member?.email || "").trim();
    if (!email) return;

    const normalizedEmail = email.toLowerCase();
    if (!uniqueEmails.has(normalizedEmail)) {
      uniqueEmails.set(normalizedEmail, email);
    }
  });

  return [...uniqueEmails.values()];
}

export function rosterPlayerCheckSelectionMessage({
  playerName,
  status,
  ratingLabel,
}) {
  const missingInformation = status === ROSTER_PLAYER_ELIGIBILITY.duprIdNeeded
    ? "a DUPR ID"
    : `a ${ratingLabel || "season rating"}`;

  return [
    `${playerName || "This player"} does not currently have ${missingInformation} entered.`,
    "",
    "You may add this player to the roster. When you do, League Management will receive a player-check alert, and a separate email will be sent to the player and this team's Captain/Co-Captain(s).",
    "",
    "League Management will review the missing information and follow up as needed.",
  ].join("\n");
}
