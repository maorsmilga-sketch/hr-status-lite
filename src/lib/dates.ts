export function formatDateISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISODateLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function eachDayInRange(startIso: string, endIso: string): string[] {
  const start = parseISODateLocal(startIso)
  const end = parseISODateLocal(endIso)
  if (end < start) return []

  const days: string[] = []
  const cur = new Date(start)
  while (cur <= end) {
    days.push(formatDateISO(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

export function formatDisplayDate(iso: string): string {
  const d = parseISODateLocal(iso)
  return d.toLocaleDateString('he-IL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function addDays(iso: string, delta: number): string {
  const d = parseISODateLocal(iso)
  d.setDate(d.getDate() + delta)
  return formatDateISO(d)
}

export function todayISO(): string {
  return formatDateISO(new Date())
}

export const DAYS_IN_VIEW = 7

export function startOfWeekSunday(iso: string): string {
  const d = parseISODateLocal(iso)
  d.setDate(d.getDate() - d.getDay())
  return formatDateISO(d)
}

export function weekDays(weekStartIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStartIso, i))
}

export function addWeeks(weekStartIso: string, delta: number): string {
  return addDays(weekStartIso, delta * DAYS_IN_VIEW)
}

export function formatDateRange(startIso: string, endIso: string): string {
  const start = parseISODateLocal(startIso)
  const endD = parseISODateLocal(endIso)
  const startLabel = start.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
  const endLabel = endD.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${startLabel} – ${endLabel}`
}

export function formatWeekRange(weekStartIso: string): string {
  return formatDateRange(weekStartIso, addDays(weekStartIso, DAYS_IN_VIEW - 1))
}

export function weekdayName(iso: string): string {
  return parseISODateLocal(iso).toLocaleDateString('he-IL', { weekday: 'long' })
}

export function weekdayShort(iso: string): string {
  return parseISODateLocal(iso).toLocaleDateString('he-IL', { weekday: 'short' })
}

export function shortDayLabel(iso: string): string {
  return parseISODateLocal(iso).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'numeric',
  })
}

export function isDateInRange(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end
}

export function visibleWeekDays(weekStartIso: string, rangeStart: string, rangeEnd: string): string[] {
  return visibleWindowDays(weekStartIso, rangeStart, rangeEnd)
}

export function canMoveWeek(
  weekStartIso: string,
  delta: number,
  rangeStart: string,
  rangeEnd: string,
): boolean {
  return canMoveWindow(weekStartIso, delta, rangeStart, rangeEnd)
}

export function initialWeekStart(rangeStart: string, rangeEnd: string): string {
  return initialWindowStart(rangeStart, rangeEnd)
}

/** Rolling 7-day window starting from today (not a Sunday–Saturday calendar week). */
export function initialWindowStart(rangeStart: string, rangeEnd: string, today = todayISO()): string {
  if (today < rangeStart) return rangeStart
  if (today > rangeEnd) {
    const lastWindow = addDays(rangeEnd, -(DAYS_IN_VIEW - 1))
    return lastWindow < rangeStart ? rangeStart : lastWindow
  }
  return today
}

export function visibleWindowDays(
  startIso: string,
  rangeStart: string,
  rangeEnd: string,
  count = DAYS_IN_VIEW,
): string[] {
  const days: string[] = []
  let cur = startIso < rangeStart ? rangeStart : startIso
  for (let i = 0; i < count; i += 1) {
    if (cur > rangeEnd) break
    days.push(cur)
    cur = addDays(cur, 1)
  }
  return days
}

export function canMoveWindow(
  startIso: string,
  delta: number,
  rangeStart: string,
  rangeEnd: string,
): boolean {
  if (delta < 0) return startIso > rangeStart
  const lastShown = visibleWindowDays(startIso, rangeStart, rangeEnd).at(-1)
  return Boolean(lastShown && lastShown < rangeEnd)
}

export function moveWindow(
  startIso: string,
  delta: number,
  rangeStart: string,
  rangeEnd: string,
): string {
  if (!canMoveWindow(startIso, delta, rangeStart, rangeEnd)) return startIso
  if (delta < 0) {
    const prev = addDays(startIso, -DAYS_IN_VIEW)
    return prev < rangeStart ? rangeStart : prev
  }
  const lastShown = visibleWindowDays(startIso, rangeStart, rangeEnd).at(-1)
  if (!lastShown) return startIso
  const next = addDays(lastShown, 1)
  return next > rangeEnd ? startIso : next
}

export function formatWindowRange(startIso: string, rangeStart: string, rangeEnd: string): string {
  const days = visibleWindowDays(startIso, rangeStart, rangeEnd)
  if (days.length === 0) return ''
  return formatDateRange(days[0], days[days.length - 1])
}
