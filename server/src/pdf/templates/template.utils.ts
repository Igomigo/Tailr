/**
 * Shared helpers for resume templates.
 *
 * Every template renders through these so escaping and text cleanup stay
 * consistent, and a fix in one place applies to all three.
 */

/**
 * Escapes HTML-special characters and removes em/en dashes.
 *
 * Resume text routinely contains `&` ("R&D", "Procter & Gamble") which would
 * otherwise break the markup. Dashes are stripped here as well as being banned
 * in the system prompt: prompt rules leak, and em dashes are one of the
 * strongest signals that a resume was machine-written.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Renders a date range, tolerating missing start or end values. */
export function dateRange(start?: string, end?: string): string {
  const parts = [start, end].filter(Boolean) as string[];
  return parts.length ? escapeHtml(parts.join(" to ")) : "";
}

/**
 * Drops custom-section items that would render nothing.
 *
 * The model occasionally emits placeholder items with no fields set. Without
 * this, a section heading appears with empty space beneath it.
 */
export function hasContent(item: {
  heading?: string;
  subheading?: string;
  dates?: string;
  bullets?: string[];
}): boolean {
  return Boolean(
    item.heading?.trim() ||
      item.subheading?.trim() ||
      item.dates?.trim() ||
      item.bullets?.some((bullet) => bullet.trim()),
  );
}

/** Joins non-empty values with a separator, escaping each. */
export function joinParts(values: Array<string | undefined>, separator: string): string {
  return values
    .filter(Boolean)
    .map((value) => escapeHtml(value as string))
    .join(separator);
}
