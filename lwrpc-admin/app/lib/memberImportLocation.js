// Never turn an import spelling/alias into an inferred community reassignment.
export function memberImportLocationReview(existing, importedName, locations) {
  const currentName = String(existing?.club_location || "").trim();
  const name = currentName || String(importedName || "").trim();
  const matches = (locations || []).filter(location =>
    location.is_active !== false && String(location.name || "").trim().toLowerCase() === name.toLowerCase()
  );
  const currentId = existing?.location_id;
  if (currentId) {
    const linked = (locations || []).find(location => String(location.id) === String(currentId));
    // Preserve established links, including catalog aliases. Report differences.
    if (!name) {
      return {
        patch: {},
        review: true,
        reason: "Saved and imported Location names are blank for an existing Location link.",
        linkedLocation: linked || null,
      };
    }
    if (!linked) {
      return {
        patch: {},
        review: true,
        reason: "The member's linked Location is missing from the Location catalog.",
        linkedLocation: null,
      };
    }
    if (String(linked.name || "").trim().toLowerCase() !== name.toLowerCase()) {
      return {
        patch: {},
        review: true,
        reason: "Saved Location text differs from the linked Location (possible alias or conflict).",
        linkedLocation: linked,
      };
    }
    return { patch: {}, review: false, reason: "", linkedLocation: linked };
  }
  const patch = !currentName && name ? { club_location: name } : {};
  if (name && matches.length === 1) patch.location_id = matches[0].id;
  if (!name || matches.length === 1) {
    return {
      patch,
      review: false,
      reason: "",
      linkedLocation: matches[0] || null,
    };
  }
  if (matches.length > 1) {
    return {
      patch,
      review: true,
      reason: "More than one active Location exactly matches this name.",
      linkedLocation: null,
    };
  }
  return {
    patch,
    review: true,
    reason: "No active Location exactly matches this name (possible alias or new Location).",
    linkedLocation: null,
  };
}

export function memberImportLocation(existing, importedName, locations) {
  const result = memberImportLocationReview(existing, importedName, locations);
  return { patch: result.patch, review: result.review };
}
