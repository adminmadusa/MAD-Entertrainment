import { EventCategory } from "@mad/shared";

export function matchesEventId(
  eventIds: string[] | undefined,
  eventId?: string,
): boolean {
  if (!eventIds || eventIds.length === 0) return true;
  if (!eventId) return false;
  return eventIds.includes(eventId);
}

export function matchesCategory(
  categories: EventCategory[] | undefined,
  category?: EventCategory,
): boolean {
  if (!categories || categories.length === 0) return true;
  if (!category) return false;
  return categories.includes(category);
}

export function matchesPage(
  pages: string[] | undefined,
  pathname: string,
): boolean {
  if (!pages || pages.length === 0) return true;
  return pages.includes(pathname);
}
