export function normalizeAppPermissions(value) {
  return Array.isArray(value) ? value : [];
}
