export function dedupeUserInGame(list = []) {
  const map = new Map();

  list.forEach((item) => {
    const key = `${item.code}-${item.game}-${item.category}`;
    map.set(key, item);
  });

  return Array.from(map.values());
}

export function arraysHaveSameItemsByCode(arr1 = [], arr2 = []) {
  const a1 = Array.isArray(arr1) ? arr1 : [];
  const a2 = Array.isArray(arr2) ? arr2 : [];

  if (a1.length !== a2.length) return false;

  const codeSet2 = new Set(a2.map((i) => i?.code));

  return a1.every((i) => codeSet2.has(i?.code));
}
