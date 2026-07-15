const PLAYER_RATING_FIELD = {
  home: {
    1: "home_player_1_rating_at_play",
    2: "home_player_2_rating_at_play",
  },
  away: {
    1: "away_player_1_rating_at_play",
    2: "away_player_2_rating_at_play",
  },
};

const TEAM_RATING_FIELD = {
  home: "home_team_rating_at_play",
  away: "away_team_rating_at_play",
};

function numericRating(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function hasRatingSnapshot(line) {
  return Boolean(line?.ratings_snapshotted_at);
}

function totalRating(values) {
  const availableRatings = values.filter((value) => value !== null);
  if (availableRatings.length === 0) return null;

  return availableRatings.reduce((total, value) => total + value, 0);
}

export function formatMatchRating(value) {
  const numericValue = numericRating(value);
  return numericValue === null ? "NR" : numericValue.toFixed(2);
}

export function matchLinePlayerRatingAtPlay(line, side, playerNumber, fallbackRating) {
  const field = PLAYER_RATING_FIELD[side]?.[playerNumber];

  if (field && hasRatingSnapshot(line)) {
    return numericRating(line[field]);
  }

  return numericRating(fallbackRating);
}

export function matchLinePlayerRatingDisplay(line, side, playerNumber, fallbackRating) {
  return formatMatchRating(matchLinePlayerRatingAtPlay(line, side, playerNumber, fallbackRating));
}

export function matchLineTeamRatingDisplay(line, side, fallbackRatings = []) {
  const field = TEAM_RATING_FIELD[side];

  if (field && hasRatingSnapshot(line)) {
    return formatMatchRating(line[field]);
  }

  return formatMatchRating(totalRating(fallbackRatings.map(numericRating)));
}

export function buildMatchLineRatingSnapshot(line, ratingType, ratingForMember) {
  const homePlayer1 = numericRating(ratingForMember(line?.home_player_1));
  const homePlayer2 = numericRating(ratingForMember(line?.home_player_2));
  const awayPlayer1 = numericRating(ratingForMember(line?.away_player_1));
  const awayPlayer2 = numericRating(ratingForMember(line?.away_player_2));

  return {
    rating_type_at_play: ratingType || "dupr",
    home_player_1_rating_at_play: homePlayer1,
    home_player_2_rating_at_play: homePlayer2,
    away_player_1_rating_at_play: awayPlayer1,
    away_player_2_rating_at_play: awayPlayer2,
    home_team_rating_at_play: totalRating([homePlayer1, homePlayer2]),
    away_team_rating_at_play: totalRating([awayPlayer1, awayPlayer2]),
    ratings_snapshotted_at: new Date().toISOString(),
  };
}
