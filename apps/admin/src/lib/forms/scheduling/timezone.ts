export function getLocalTimezoneOffsetMinutes(date: Date = new Date()): number {
  return date.getTimezoneOffset();
}

export function getLocalTimezoneOffsetMs(date: Date = new Date()): number {
  return getLocalTimezoneOffsetMinutes(date) * 60_000;
}
