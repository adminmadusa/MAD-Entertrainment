import { EventCategory } from "@mad/shared";

export function normalizeStringArray(
  values: string[] | undefined | null,
): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((value) => String(value).trim()).filter(Boolean);
}

export function normalizeCategoryArray(
  values: EventCategory[] | undefined | null,
): EventCategory[] {
  if (!Array.isArray(values)) return [];
  return values.filter(Boolean);
}

export function normalizePagesInput(
  value: string | undefined | null,
): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((page) => page.trim())
    .filter(Boolean);
}

export function normalizeId(value: unknown): string {
  return value ? String(value).trim() : "";
}
