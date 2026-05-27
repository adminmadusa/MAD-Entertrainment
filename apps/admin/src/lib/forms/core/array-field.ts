export function appendAt<T>(items: T[], item: T): T[] {
  return [...items, item];
}

export function removeAt<T>(items: T[], index: number): T[] {
  return items.filter((_, idx) => idx !== index);
}

export function updateAt<T>(items: T[], index: number, updater: (item: T) => T): T[] {
  return items.map((item, idx) => (idx === index ? updater(item) : item));
}
