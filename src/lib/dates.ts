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

export function startOfWeekSunday(iso: string): string {
  const d = parseISODateLocal(iso)
  d.setDate(d.getDate() - d.getDay())
  return formatDateISO(d)
}

export function weekDays(weekStartIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStartIso, i))
}

export function addWeeks(weekStartIso: string, delta: number): string {
  return addDays(weekStartIso, delta * 7)
}

export function formatWeekRange(weekStartIso: string): string {
  const end = addDays(weekStartIso, 6)
  const start = parseISODateLocal(weekStartIso)
  const endD = parseISODateLocal(end)
  const startLabel = start.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
  const endLabel = endD.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${startLabel} – ${endLabel}`
}

export function weekdayName(iso: string): string {
  return parseISODateLocal(iso).toLocaleDateString('he-IL', { weekday: 'long' })
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
  return weekDays(weekStartIso).filter((d) => isDateInRange(d, rangeStart, rangeEnd))
}

export function canMoveWeek(
  weekStartIso: string,
  delta: number,
  rangeStart: string,
  rangeEnd: string,
): boolean {
  const next = addWeeks(weekStartIso, delta)
  return visibleWeekDays(next, rangeStart, rangeEnd).length > 0
}

export function initialWeekStart(rangeStart: string, rangeEnd: string): string {
  const today = todayISO()
  const anchor = isDateInRange(today, rangeStart, rangeEnd) ? today : rangeStart
  return startOfWeekSunday(anchor)
}
