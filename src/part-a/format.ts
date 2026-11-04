const DAY_MS = 24 * 60 * 60 * 1000;

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export const formatMoney = (cents: number) => money.format(cents / 100);

const longDate = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
export const formatDate = (iso: string) => longDate.format(new Date(iso));
export const formatShortDate = (iso: string) => shortDate.format(new Date(iso));

/** Calendar-day difference from today, so "tomorrow" means tomorrow and not "within 24h". */
export function daysFromToday(iso: string): number {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOf(new Date(iso)) - startOf(new Date())) / DAY_MS);
}

export function relativeDays(iso: string): string {
  const days = daysFromToday(iso);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}
