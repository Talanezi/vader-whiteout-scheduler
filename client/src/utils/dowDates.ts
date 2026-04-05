export const canonicalDowDates = Object.freeze([
  '2018-06-17', // Sunday
  '2018-06-18', // Monday
  '2018-06-19', // Tuesday
  '2018-06-20', // Wednesday
  '2018-06-21', // Thursday
  '2018-06-22', // Friday
  '2018-06-23', // Saturday
]);

export const canonicalDowLabels = Object.freeze([
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
]);

export function weekdayIndexToCanonicalDate(dayIndex: number): string {
  return canonicalDowDates[dayIndex];
}

export function selectedWeekdaysToCanonicalDates(selected: Record<number, true>): string[] {
  return Object.keys(selected)
    .map((k) => Number(k))
    .sort((a, b) => a - b)
    .map(weekdayIndexToCanonicalDate);
}

export function isCanonicalDowDate(dateString: string): boolean {
  return canonicalDowDates.includes(dateString);
}

export function areAllDatesCanonicalDow(dateStrings: string[]): boolean {
  return dateStrings.length > 0 && dateStrings.every(isCanonicalDowDate);
}
