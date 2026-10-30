const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en");
const dateFmt = new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" });

export const formatCompact = (n: number) => compact.format(n);
export const formatNumber = (n: number) => full.format(n);
export const formatDate = (s: string) => (s ? dateFmt.format(new Date(s)) : "");

export function timeAgo(s: string): string {
  if (!s) return "";
  const days = Math.floor((Date.now() - new Date(s).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}
