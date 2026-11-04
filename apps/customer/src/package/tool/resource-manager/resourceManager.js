let resourceMap = {};

export function setResourceMap(map) {
  window._custom_resourceMap = map;
}

export function getResource(key) {
  resourceMap = window._custom_resourceMap;
  const res = resourceMap?.[key];
  // if (!res) throw new Error(`Resource "${key}" not found`);
  return typeof res === "function" ? res() : res;
}
