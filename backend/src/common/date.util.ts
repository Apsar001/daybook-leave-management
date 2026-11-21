const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

export function normalizeDate(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (!ISO_DATE.test(value)) {
    throw new Error(`Invalid date-only value: ${value}`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`Invalid calendar date: ${value}`);
  }
  return value;
}

export function parseISODate(value: string | Date): Date {
  return new Date(`${normalizeDate(value)}T00:00:00.000Z`);
}

export function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addCalendarDays(value: string | Date, days: number): string {
  const date = parseISODate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatISODate(date);
}

export function differenceInCalendarDays(
  a: string | Date,
  b: string | Date,
): number {
  return Math.round(
    (parseISODate(a).getTime() - parseISODate(b).getTime()) / MS_PER_DAY,
  );
}

export function todayISO(): string {
  const now = new Date();
  return formatISODate(
    new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    ),
  );
}

export function currentYear(): number {
  return new Date().getUTCFullYear();
}

export function monthBounds(
  year: number,
  month: number,
): { start: string; end: string } {
  if (!Number.isInteger(year) || year < 1900 || year > 2200)
    throw new Error('Invalid year');
  if (!Number.isInteger(month) || month < 1 || month > 12)
    throw new Error('Invalid month');
  const start = formatISODate(new Date(Date.UTC(year, month - 1, 1)));
  const end = formatISODate(new Date(Date.UTC(year, month, 0)));
  return { start, end };
}

export function yearBounds(year: number): { start: string; end: string } {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function isWeekend(value: string | Date): boolean {
  const day = parseISODate(value).getUTCDay();
  return day === 0 || day === 6;
}

export function eachCalendarDate(
  start: string | Date,
  end: string | Date,
): string[] {
  const dates: string[] = [];
  const last = normalizeDate(end);
  let cursor = normalizeDate(start);
  if (cursor > last) return dates;
  while (cursor <= last) {
    dates.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }
  return dates;
}

export function isValidISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  try {
    normalizeDate(value);
    return true;
  } catch {
    return false;
  }
}

export function datesOverlap(
  aStart: string | Date,
  aEnd: string | Date,
  bStart: string | Date,
  bEnd: string | Date,
): boolean {
  return (
    normalizeDate(aStart) <= normalizeDate(bEnd) &&
    normalizeDate(bStart) <= normalizeDate(aEnd)
  );
}
