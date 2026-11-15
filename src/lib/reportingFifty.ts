import { countsAsOnDutyAttendanceStatus } from '../constants/statuses'
import { SHIFT_ROLES } from '../constants/shifts'
import type { AttendanceRecord, ShiftDay, Soldier } from '../types/database'
import { addDays, eachDayInRange } from './dates'
import { latestAttendancePerDate } from './onDutyAttendance'

export const REPORTING_PERIOD_DEFAULT_START = '2026-09-17'
export const REPORTING_PERIOD_DEFAULT_END = '2026-12-03'

/** Calculator period: the soldier's operational-duty dates win, defaults otherwise. */
export function reportingPeriodFor(soldier: Soldier | null): { start: string; end: string } {
  return {
    start: soldier?.operational_duty_start || REPORTING_PERIOD_DEFAULT_START,
    end: soldier?.operational_duty_end || REPORTING_PERIOD_DEFAULT_END,
  }
}

export type ReportingFiftyResult = {
  onDutyCount: number
  periodDays: number
  percent: number
  neededForFifty: number
  reached: boolean
}

/**
 * Counts on-duty attendance days in [max(arrival, periodStart), periodEnd] (inclusive,
 * latest record per day) against the full period [periodStart, periodEnd] (inclusive),
 * so the numerator can never include days outside the denominator.
 */
export function computeReportingFifty(
  records: AttendanceRecord[],
  arrival: string,
  periodStart: string,
  periodEnd: string,
): ReportingFiftyResult {
  const countFrom = arrival > periodStart ? arrival : periodStart
  const periodDays = eachDayInRange(periodStart, periodEnd).length
  const onDutyCount = latestAttendancePerDate(records).filter(
    (rec) =>
      rec.record_date >= countFrom &&
      rec.record_date <= periodEnd &&
      countsAsOnDutyAttendanceStatus(rec.status),
  ).length
  const percent = periodDays > 0 ? Math.round((onDutyCount / periodDays) * 100) : 0
  const neededForFifty = Math.max(0, Math.ceil(periodDays / 2) - onDutyCount)
  return { onDutyCount, periodDays, percent, neededForFifty, reached: neededForFifty === 0 }
}

export type ShiftProjection = {
  plannedDays: number
  projectedCount: number
  missingAfterShifts: number
}

/**
 * Projects the on-duty count using entered future shifts. Attendance always wins over shifts:
 * a date with ANY attendance record (even home) is never added from a shift. A date counts
 * once however many roles/periods the soldier holds that day. Only dates after today, from
 * max(arrival, periodStart) through periodEnd, are considered.
 */
export function projectWithShifts(
  records: AttendanceRecord[],
  shifts: Record<string, ShiftDay>,
  soldierName: string,
  result: ReportingFiftyResult,
  arrival: string,
  periodStart: string,
  periodEnd: string,
  today: string,
): ShiftProjection {
  const name = soldierName.trim()
  const from = [arrival, periodStart, addDays(today, 1)].reduce((a, b) => (a > b ? a : b))
  const reported = new Set(latestAttendancePerDate(records).map((r) => r.record_date))
  const planned = new Set<string>()
  if (name) {
    for (const day of Object.values(shifts)) {
      if (day.date < from || day.date > periodEnd || reported.has(day.date)) continue
      if (SHIFT_ROLES.some((role) => day.assignments[role.id]?.trim() === name)) {
        planned.add(day.date)
      }
    }
  }
  const projectedCount = result.onDutyCount + planned.size
  const target = Math.ceil(result.periodDays / 2)
  return {
    plannedDays: planned.size,
    projectedCount,
    missingAfterShifts: Math.max(0, target - projectedCount),
  }
}
