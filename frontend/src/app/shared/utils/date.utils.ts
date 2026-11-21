const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export interface CalendarCell {
  date: Date;
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
}

export function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map((part) => Number(part));
  if (!year || !month || !day) {
    return new Date();
  }
  return new Date(year, month - 1, day);
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function eachDayInclusive(start: string, end: string): Date[] {
  const from = parseDate(start);
  const to = parseDate(end);
  const days: Date[] = [];
  if (to.getTime() < from.getTime()) {
    return days;
  }
  let cursor = from;
  while (cursor.getTime() <= to.getTime()) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function workingDaysBetween(start: string, end: string, holidays: string[] = []): number {
  if (!start || !end) {
    return 0;
  }
  const holidaySet = new Set(holidays);
  return eachDayInclusive(start, end).filter((day) => !isWeekend(day) && !holidaySet.has(toIsoDate(day))).length;
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions): string {
  if (!value) {
    return '—';
  }
  const date = parseDate(value);
  return new Intl.DateTimeFormat('en-US', options ?? { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function formatDateRange(start: string, end: string): string {
  if (!start || !end) {
    return '—';
  }
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  if (sameMonth) {
    const from = parseDate(start);
    const to = parseDate(end);
    return `${MONTH_NAMES[from.getMonth()]} ${from.getDate()}–${to.getDate()}, ${to.getFullYear()}`;
  }
  return `${formatDate(start, { month: 'short', day: 'numeric' })} – ${formatDate(end)}`;
}

export function monthName(month: number): string {
  return MONTH_NAMES[Math.max(0, Math.min(11, month - 1))] ?? '';
}

export function monthsBetween(start: string, end: string): Array<{ year: number; month: number }> {
  if (!start || !end || parseDate(end).getTime() < parseDate(start).getTime()) {
    return [];
  }
  const from = parseDate(start);
  const to = parseDate(end);
  const months: Array<{ year: number; month: number }> = [];
  let year = from.getFullYear();
  let month = from.getMonth() + 1;
  while (year < to.getFullYear() || (year === to.getFullYear() && month <= to.getMonth() + 1)) {
    months.push({ year, month });
    const next = addMonths(year, month, 1);
    year = next.year;
    month = next.month;
  }
  return months;
}

export function buildCalendarGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month - 1, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = addDays(first, -mondayOffset);
  const today = todayIso();

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    const iso = toIsoDate(date);
    return {
      date,
      iso,
      day: date.getDate(),
      inMonth: date.getMonth() === month - 1 && date.getFullYear() === year,
      isToday: iso === today,
    };
  });
}

export function isFutureDate(value: string): boolean {
  return parseDate(value).getTime() > parseDate(todayIso()).getTime();
}
