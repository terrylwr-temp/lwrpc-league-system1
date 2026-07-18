export function numericRating(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function currentMemberRating(member, ratingRow, ratingType = "dupr") {
  if (ratingType === "primetime") {
    return numericRating(ratingRow?.season_primetime_rating);
  }

  if (ratingType === "self_rating") {
    return numericRating(member?.self_rating);
  }

  return numericRating(ratingRow?.season_dupr_rating);
}

export function divisionRatingIssue({
  rating,
  minRating,
  maxRating,
  ratingLabel = "rating",
  playerName = "Player",
}) {
  const currentRating = numericRating(rating);
  const minimum = numericRating(minRating);
  const maximum = numericRating(maxRating);

  if (currentRating === null) {
    return playerName + " needs a valid " + ratingLabel + " rating before being selected.";
  }

  if (minimum !== null && currentRating < minimum) {
    return playerName + "'s current " + ratingLabel + " rating of " + currentRating.toFixed(2) + " is below the division minimum of " + minimum.toFixed(2) + ".";
  }

  if (maximum !== null && currentRating > maximum) {
    return playerName + "'s current " + ratingLabel + " rating of " + currentRating.toFixed(2) + " is above the division maximum of " + maximum.toFixed(2) + ".";
  }

  return "";
}

export function divisionRatingStatus({ rating, minRating, maxRating }) {
  const currentRating = numericRating(rating);
  const minimum = numericRating(minRating);
  const maximum = numericRating(maxRating);

  if (currentRating === null) return "Rating Needed";
  if (minimum !== null && currentRating < minimum) {
    return "Below Division Minimum " + minimum.toFixed(2);
  }
  if (maximum !== null && currentRating > maximum) {
    return "Above Division Maximum " + maximum.toFixed(2);
  }

  return "";
}
