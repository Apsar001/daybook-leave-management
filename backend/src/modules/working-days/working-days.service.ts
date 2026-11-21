import { Injectable } from '@nestjs/common';
import {
  addCalendarDays,
  eachCalendarDate,
  isWeekend,
  normalizeDate,
  parseISODate,
} from '../../common/date.util';

@Injectable()
export class WorkingDaysService {
  /**
   * Returns every calendar date in the inclusive range that is not a Saturday,
   * Sunday or configured public holiday. Holidays on weekends are never counted
   * twice because the weekend check happens first and the holiday set is unique.
   */
  getWorkingDates(
    startDate: string | Date,
    endDate: string | Date,
    holidays: string[] = [],
  ): string[] {
    const start = normalizeDate(startDate);
    const end = normalizeDate(endDate);
    if (start > end) return [];

    const holidaySet = new Set(holidays.map(normalizeDate));
    return eachCalendarDate(start, end).filter(
      (date) => !isWeekend(date) && !holidaySet.has(date),
    );
  }

  countWorkingDays(
    startDate: string | Date,
    endDate: string | Date,
    holidays: string[] = [],
  ): number {
    return this.getWorkingDates(startDate, endDate, holidays).length;
  }

  isWorkingDate(date: string | Date, holidays: string[] = []): boolean {
    const value = normalizeDate(date);
    return (
      !isWeekend(value) && !new Set(holidays.map(normalizeDate)).has(value)
    );
  }

  /** Returns the next working date on or after the supplied date. */
  nextWorkingDate(date: string | Date, holidays: string[] = []): string {
    let cursor = normalizeDate(date);
    for (let i = 0; i < 14; i += 1) {
      if (this.isWorkingDate(cursor, holidays)) return cursor;
      cursor = addCalendarDays(cursor, 1);
    }
    throw new Error('Unable to find a working date within 14 days');
  }

  /** Returns the date after adding `count` working days to the supplied date. */
  addWorkingDays(
    date: string | Date,
    count: number,
    holidays: string[] = [],
  ): string {
    if (count <= 0) return this.nextWorkingDate(date, holidays);
    let remaining = count;
    let cursor = this.nextWorkingDate(date, holidays);
    while (remaining > 0) {
      cursor = addCalendarDays(cursor, 1);
      if (this.isWorkingDate(cursor, holidays)) remaining -= 1;
    }
    return cursor;
  }

  /** True when the date is a Saturday or Sunday (UTC, date-only semantics). */
  isWeekendDate(date: string | Date): boolean {
    return isWeekend(date);
  }

  /** Kept for consumers that need a Date object for charting. */
  toDate(date: string | Date): Date {
    return parseISODate(date);
  }
}
