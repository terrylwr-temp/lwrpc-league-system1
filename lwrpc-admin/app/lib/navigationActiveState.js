// Exact leaf entries must not also claim a separately listed descendant route.
export function isNavigationPathActive(pathname, path, aliases = [], exact = false) {
  return [path, ...aliases].some((candidate) => {
    if (!candidate) return false;
    if (exact) return pathname === candidate || pathname === `${candidate}/`;
    return candidate === "/" ? pathname === "/" : pathname === candidate || pathname.startsWith(`${candidate}/`);
  });
}
