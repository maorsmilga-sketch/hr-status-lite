import { countsAsOnDutyAttendanceStatus } from '../constants/statuses'
import type { AttendanceRecord } from '../types/database'
import { eachDayInRange } from './dates'

export type OnDutyDayRow = {
  date: string
  status: string
}

function recordSortTime(rec: AttendanceRecord): number {
  const raw = rec.updated_at || rec.created_at
  const t = Date.parse(raw)
  return Number.isFinite(t) ? t : 0
}

/** If multiple records exist for the same calendar day, keep the most recently updated. */
export function latestAttendancePerDate(records: AttendanceRecord[]): AttendanceRecord[] {
  const byDate = new Map<string, AttendanceRecord>()
  for (const rec of records) {
    if (!rec.record_date) continue
    const existing = byDate.get(rec.record_date)
    if (!existing || recordSortTime(rec) > recordSortTime(existing)) {
      byDate.set(rec.record_date, rec)
    }
  }
  return [...byDate.values()]
}

export function computeOnDutyThroughToday(
  records: AttendanceRecord[],
  dutyStart: string,
  dutyEnd: string,
  today: string,
): {
  onDutyDays: OnDutyDayRow[]
  onDutyCount: number
  elapsedDutyDays: number
  percent: number
} {
  const elapsedEnd = today <= dutyEnd ? today : dutyEnd
  const elapsedDutyDays =
    elapsedEnd >= dutyStart ? eachDayInRange(dutyStart, elapsedEnd).length : 0

  const onDutyDays = latestAttendancePerDate(records)
    .filter(
      (rec) =>
        rec.record_date >= dutyStart &&
        rec.record_date <= dutyEnd &&
        rec.record_date <= today &&
        countsAsOnDutyAttendanceStatus(rec.status),
    )
    .sort((a, b) => b.record_date.localeCompare(a.record_date))
    .map((rec) => ({ date: rec.record_date, status: rec.status }))

  const onDutyCount = onDutyDays.length
  const percent = elapsedDutyDays > 0 ? Math.round((onDutyCount / elapsedDutyDays) * 100) : 0

  return { onDutyDays, onDutyCount, elapsedDutyDays, percent }
}
