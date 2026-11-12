/** `YYYY-MM-DD` → "Oct 23, 2027" (UTC so the day never shifts). */
export function formatDate(d: string | null) {
  return d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "";
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
