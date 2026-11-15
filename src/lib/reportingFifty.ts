import { countsAsOnDutyAttendanceStatus } from '../constants/statuses'
import type { AttendanceRecord, Soldier } from '../types/database'
import { eachDayInRange } from './dates'
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
