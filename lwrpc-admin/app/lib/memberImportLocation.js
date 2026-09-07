// Never turn an import spelling/alias into an inferred community reassignment.
export function memberImportLocation(existing, importedName, locations) {
  const currentName = String(existing?.club_location || "").trim();
  const name = currentName || String(importedName || "").trim();
  const matches = (locations || []).filter(location =>
    location.is_active !== false && String(location.name || "").trim().toLowerCase() === name.toLowerCase()
  );
  const currentId = existing?.location_id;
  if (currentId) {
    const linked = (locations || []).find(location => String(location.id) === String(currentId));
    // Preserve established links, including catalog aliases. Report differences.
    return { patch: {}, review: !name || !linked || String(linked.name || "").trim().toLowerCase() !== name.toLowerCase() };
  }
  const patch = !currentName && name ? { club_location: name } : {};
  if (name && matches.length === 1) patch.location_id = matches[0].id;
  return { patch, review: Boolean(name && matches.length !== 1) };
}
