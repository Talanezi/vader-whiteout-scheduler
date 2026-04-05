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


function getUtcSunday(d: Date): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() - x.getUTCDay());
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export function mapDowDateTimeToCurrentWeek(dateTimeString: string, weekOffset = 0): string {
  const date = new Date(dateTimeString);
  const anchorSunday = getUtcSunday(date);

  const curSunday = getUtcSunday(new Date());
  curSunday.setUTCDate(curSunday.getUTCDate() + 7 * weekOffset);

  const dayOffset = Math.round((curSunday.getTime() - anchorSunday.getTime()) / (1000 * 60 * 60 * 24));

  const mapped = new Date(date);
  mapped.setUTCDate(mapped.getUTCDate() + dayOffset);
  return mapped.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function mapDowDateToCurrentWeek(dateString: string, weekOffset = 0): string {
  return mapDowDateTimeToCurrentWeek(`${dateString}T00:00:00Z`, weekOffset).slice(0, 10);
}

export function hasCanonicalDowAnchorDates(dates: string[]): boolean {
  return dates.length > 0 && dates.every((d) => canonicalDowDates.includes(d));
}
