export function formatDateTime(iso: string | null | undefined, timeZone = "Asia/Dubai"): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function formatDate(iso: string | null | undefined, timeZone = "Asia/Dubai"): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function relativeTo(targetIso: string | null, nowIso: string): string {
  if (!targetIso) return "no deadline";
  const diff = new Date(targetIso).getTime() - new Date(nowIso).getTime();
  const abs = Math.abs(diff);
  const hours = Math.round(abs / 3_600_000);
  const label =
    hours < 1
      ? `${Math.max(1, Math.round(abs / 60_000))} min`
      : hours < 48
        ? `${hours} h`
        : `${Math.round(hours / 24)} d`;
  return diff >= 0 ? `due in ${label}` : `${label} overdue`;
}

export function humanize(value: string): string {
  return value.replace(/_/g, " ");
}

export function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInputValue(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}
