// ============================================================
// Date/Time Utility Functions
// ============================================================
import {
  format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  subDays, subWeeks, subMonths, subYears,
  isWithinInterval, differenceInDays, eachDayOfInterval,
  eachWeekOfInterval, eachMonthOfInterval, isSameDay,
  getDay,
} from 'date-fns';

export function getCurrentDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getCurrentTime(): string {
  return format(new Date(), 'HH:mm');
}

export function formatDate(dateStr: string, formatStr: string = 'dd/MM/yyyy'): string {
  try {
    return format(parseISO(dateStr), formatStr);
  } catch {
    return dateStr;
  }
}

export function formatTime(timeStr: string, use12h: boolean = true): string {
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (use12h) {
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours % 12 || 12;
      return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
    }
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  } catch {
    return timeStr;
  }
}

export function formatRelativeDate(dateStr: string): string {
  const date = parseISO(dateStr);
  const today = startOfDay(new Date());
  const yesterday = subDays(today, 1);

  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';

  const diff = differenceInDays(today, date);
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
  if (diff < 365) return `${Math.floor(diff / 30)} months ago`;
  return `${Math.floor(diff / 365)} years ago`;
}

export type DateRange = { from: string; to: string };

export function getDateRange(period: 'today' | 'week' | 'month' | 'year' | 'custom', weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1): DateRange {
  const now = new Date();
  switch (period) {
    case 'today':
      return {
        from: format(startOfDay(now), 'yyyy-MM-dd'),
        to: format(endOfDay(now), 'yyyy-MM-dd'),
      };
    case 'week':
      return {
        from: format(startOfWeek(now, { weekStartsOn }), 'yyyy-MM-dd'),
        to: format(endOfWeek(now, { weekStartsOn }), 'yyyy-MM-dd'),
      };
    case 'month':
      return {
        from: format(startOfMonth(now), 'yyyy-MM-dd'),
        to: format(endOfMonth(now), 'yyyy-MM-dd'),
      };
    case 'year':
      return {
        from: format(startOfYear(now), 'yyyy-MM-dd'),
        to: format(endOfYear(now), 'yyyy-MM-dd'),
      };
    default:
      return {
        from: format(startOfMonth(now), 'yyyy-MM-dd'),
        to: format(endOfMonth(now), 'yyyy-MM-dd'),
      };
  }
}

export function getPreviousDateRange(
  period: 'week' | 'month' | 'year',
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1
): DateRange {
  const now = new Date();
  switch (period) {
    case 'week': {
      const prevWeekStart = subWeeks(startOfWeek(now, { weekStartsOn }), 1);
      return {
        from: format(prevWeekStart, 'yyyy-MM-dd'),
        to: format(endOfWeek(prevWeekStart, { weekStartsOn }), 'yyyy-MM-dd'),
      };
    }
    case 'month': {
      const prevMonthStart = subMonths(startOfMonth(now), 1);
      return {
        from: format(prevMonthStart, 'yyyy-MM-dd'),
        to: format(endOfMonth(prevMonthStart), 'yyyy-MM-dd'),
      };
    }
    case 'year': {
      const prevYearStart = subYears(startOfYear(now), 1);
      return {
        from: format(prevYearStart, 'yyyy-MM-dd'),
        to: format(endOfYear(prevYearStart), 'yyyy-MM-dd'),
      };
    }
  }
}

export function isDateInRange(dateStr: string, range: DateRange): boolean {
  const date = parseISO(dateStr);
  return isWithinInterval(date, {
    start: startOfDay(parseISO(range.from)),
    end: endOfDay(parseISO(range.to)),
  });
}

export function getDaysInRange(range: DateRange): string[] {
  return eachDayOfInterval({
    start: parseISO(range.from),
    end: parseISO(range.to),
  }).map(d => format(d, 'yyyy-MM-dd'));
}

export function getWeeksInRange(range: DateRange, weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1): string[] {
  return eachWeekOfInterval(
    { start: parseISO(range.from), end: parseISO(range.to) },
    { weekStartsOn }
  ).map(d => format(d, 'yyyy-MM-dd'));
}

export function getMonthsInRange(range: DateRange): string[] {
  return eachMonthOfInterval({
    start: parseISO(range.from),
    end: parseISO(range.to),
  }).map(d => format(d, 'yyyy-MM'));
}

export function getMonthName(dateStr: string): string {
  try {
    return format(parseISO(dateStr + (dateStr.length === 7 ? '-01' : '')), 'MMMM yyyy');
  } catch {
    return dateStr;
  }
}

export function getDayOfWeek(dateStr: string): number {
  return getDay(parseISO(dateStr));
}

export { format, parseISO, subDays, subMonths };
